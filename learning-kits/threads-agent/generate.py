"""CLI-вход утреннего пайплайна threads-agent."""
from __future__ import annotations

import argparse
import asyncio
import sys

import httpx

import kb
import pipeline
from config import load_config

BOT_API = "https://api.telegram.org/bot{token}/sendMessage"


class SendError(Exception):
    pass


def _scrub(text: str, token: str) -> str:
    """Убирает ботовый токен из текста ошибки (URL Bot API его содержит)."""
    return text.replace(token, "***") if token else text


def _parse_retry_after(response: httpx.Response, default: float = 1.0) -> float:
    """Читает Retry-After из тела 429-ответа Bot API (parameters.retry_after)."""
    try:
        data = response.json()
        return float(data["parameters"]["retry_after"])
    except (ValueError, KeyError, TypeError):
        return default


def _make_sender(token: str, dry_run: bool, client: httpx.AsyncClient | None = None):
    async def send(chat_id: int, html: str, buttons: list | None = None) -> None:
        if dry_run:
            print("=" * 60)
            print(html)
            return
        url = BOT_API.format(token=token)
        payload = {
            "chat_id": chat_id,
            "text": html,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }
        if buttons:
            payload["reply_markup"] = {
                "inline_keyboard": [
                    [{"text": t, "callback_data": c} for (t, c) in row] for row in buttons
                ]
            }
        # Текст последней ошибки формируем САМИ: str(HTTPStatusError)
        # содержит полный URL с токеном — сырое исключение
        # интерполировать нельзя (утечёт в алерт/stderr).
        last: str | None = None
        attempt = 0        # счётчик попыток для 5xx/сети (макс. 3 попытки всего)
        retries_429 = 0    # отдельный счётчик для 429 (макс. 5 попыток всего)
        while True:
            try:
                r = await client.post(url, json=payload)
                r.raise_for_status()
                return
            except httpx.HTTPStatusError as e:
                status = e.response.status_code
                if status == 429:
                    # flood control: не «клиентская ошибка» в обычном смысле —
                    # Telegram сам говорит, сколько ждать, и это надо уважать.
                    retries_429 += 1
                    if retries_429 >= 5:
                        desc = f"Telegram HTTP 429: {e.response.text[:200]}"
                        raise SendError(_scrub(
                            f"sendMessage провалился после 5 попыток (429): {desc}", token
                        )) from None
                    retry_after = _parse_retry_after(e.response)
                    await asyncio.sleep(retry_after)
                    continue
                desc = f"Telegram HTTP {status}: {e.response.text[:200]}"
                # 4xx (кроме 429): клиентская ошибка (плохой chat_id/токен и т.п.) — не ретраим.
                # from None: цепочка __cause__ тоже содержит URL с токеном
                if status < 500:
                    raise SendError(_scrub(desc, token)) from None
                # 5xx — временная проблема на стороне Telegram, ретраим
                last = desc
                attempt += 1
                if attempt >= 3:
                    # from None: __context__ HTTPStatusError содержит URL с токеном
                    raise SendError(_scrub(f"sendMessage провалился после 3 попыток: {last}", token)) from None
                await asyncio.sleep(2 ** (attempt - 1))
            except httpx.TransportError as e:
                # сеть/таймаут — ретраим; в str(TransportError) URL нет
                # (проверено: сообщение — только текст ошибки транспорта),
                # но скрабим для подстраховки
                last = f"{type(e).__name__}: {e}"
                attempt += 1
                if attempt >= 3:
                    # from None: не тянуть исходное исключение в traceback-цепочку
                    raise SendError(_scrub(f"sendMessage провалился после 3 попыток: {last}", token)) from None
                await asyncio.sleep(2 ** (attempt - 1))

    return send


async def run(args) -> int:
    cfg = load_config()
    if not cfg.allow_live_mode:
        print("Live-режим выключен: сначала настройте свои ключи и ALLOW_LIVE_MODE=true", file=sys.stderr)
        return 2
    conn = kb.connect(cfg.db_path)
    chat_id_raw = kb.get_meta(conn, cfg.admin_key)
    if not args.dry_run and not chat_id_raw:
        print("admin_chat_id не задан — сначала /start боту", file=sys.stderr)
        return 1
    chat_id = int(chat_id_raw) if chat_id_raw else 0

    # Один AsyncClient на весь прогон вместо одного на каждый send — избегаем
    # пересоздания TCP/TLS-соединения на каждое сообщение.
    client = httpx.AsyncClient(timeout=30.0) if not args.dry_run else None
    try:
        send = _make_sender(cfg.bot_token, args.dry_run, client=client)

        if args.channel:
            keys = [args.channel]
        else:
            keys = [k for k, c in cfg.channels.items() if c.enabled]

        mode = "regen" if args.regen else ("more" if args.more else "daily")
        count = args.more if args.more else None

        had_failure = False
        for key in keys:
            channel = cfg.channels.get(key)
            if not channel:
                await send(chat_id, f"⚠️ Неизвестный канал: {key}")
                continue
            try:
                await pipeline.run_channel(
                    conn, channel, cfg, chat_id, send, count=count, mode=mode
                )
            except Exception as e:  # noqa: BLE001 — сбой одного канала не должен
                # прерывать залп по остальным (например, упавший send алерта
                # при полном сетевом отказе внутри run_channel); но процесс
                # должен завершиться ненулевым кодом, раз что-то сломалось.
                print(f"⚠️ Канал {key}: сбой пайплайна — {e}", file=sys.stderr)
                had_failure = True
                continue
        return 1 if had_failure else 0
    finally:
        if client is not None:
            await client.aclose()


def main() -> None:
    p = argparse.ArgumentParser(description="threads-agent daily generator")
    g = p.add_mutually_exclusive_group()
    g.add_argument("--all", action="store_true", help="все включённые каналы")
    g.add_argument("--channel", help="один канал по ключу")
    p.add_argument("--dry-run", action="store_true", help="печать в stdout, без отправки")
    p.add_argument("--regen", action="store_true", help="перегенерация (антиповтор)")
    p.add_argument("--more", type=int, metavar="N", help="добавить N веток")
    args = p.parse_args()
    raise SystemExit(asyncio.run(run(args)))


if __name__ == "__main__":
    main()
