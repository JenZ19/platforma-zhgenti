"""Оркестрация одного канала: ingest → generate → send → history."""
from __future__ import annotations

import asyncio
import html
import sys
from typing import Awaitable, Callable, Optional

import compose
import ingest
import kb
import llm
from config import Channel, Config

# 3-й параметр (buttons) необязательный: список строк из пар (текст, callback_data)
# либо None. Реализации send() (bot.py/generate.py) сами переводят его в свой формат.
SendFn = Callable[[int, str, Optional[list]], Awaitable[None]]
SEND_PAUSE = 1.1        # пауза между сообщениями в личке (анти-флуд)
GROUP_SEND_PAUSE = 3.2  # в группе лимит жёстче: ~20 сообщений в минуту
BATCH_SCRIPTS = 5       # сколько сценариев отдаём модели за один вызов
BATCH_NEWS = 10         # столько же для новостных/вечнозелёных веток
LLM_TIMEOUT = 180.0     # пачка веток пишется дольше, чем дефолтные 90 с


async def _generate(channel: Channel, cfg: Config, items, facts, hooks, *,
                    count: int, mode: str, scripts: list[dict] | None = None) -> list[dict]:
    messages = compose.build_prompt(channel, items, facts, hooks, count=count, mode=mode,
                                    scripts=scripts)
    content = await llm.chat(messages, model=cfg.model, api_key=cfg.openrouter_api_key,
                             base_url=getattr(cfg, "api_url", None),
                             json_mode=True, temperature=0.9, timeout=LLM_TIMEOUT)
    try:
        return compose.parse_threads(content)
    except compose.ComposeError as e:
        retry = messages + [
            {"role": "assistant", "content": content},
            {"role": "user", "content": f"Ответ невалиден: {e}. Верни СТРОГО корректный JSON "
                                         "по описанной схеме, без markdown и лишнего текста."},
        ]
        content2 = await llm.chat(retry, model=cfg.model, api_key=cfg.openrouter_api_key,
                                  base_url=getattr(cfg, "api_url", None),
                                  json_mode=True, temperature=0.7, timeout=LLM_TIMEOUT)
        return compose.parse_threads(content2)


def _chunk(seq: list, size: int) -> list[list]:
    return [seq[i:i + size] for i in range(0, len(seq), size)]


def _plan(scripts: list[dict], news_count: int) -> list[tuple[str, object]]:
    """Дневной залп режем на пачки: модель не должна выдавать 15 веток одним
    JSON — это и дольше, и рвётся посередине. Каждая пачка — отдельный вызов,
    упавшая пачка не уносит остальные."""
    jobs: list[tuple[str, object]] = [("scripts", ch) for ch in _chunk(scripts, BATCH_SCRIPTS)]
    left = news_count
    while left > 0:
        n = min(left, BATCH_NEWS)
        jobs.append(("news", n))
        left -= n
    return jobs


async def run_channel(conn, channel: Channel, cfg: Config, chat_id: int, send: SendFn, *,
                      count: int | None = None, mode: str = "daily",
                      do_ingest: bool | None = None) -> None:
    if count is None:
        count = channel.total
    if do_ingest is None:
        do_ingest = (mode == "daily")
    try:
        if do_ingest:
            counts = await ingest.ingest_channel(conn, channel, cfg)
            bad = [k for k, v in counts.items() if v == -1]
            if bad:
                print(f"[warn] {channel.key}: источники с ошибкой: {', '.join(bad)}",
                     file=sys.stderr)
        # news_count: 0 — канал новости не публикует вообще. Свежие материалы в
        # промпт не кладём: пока они там лежат, модель берёт их и в вечнозелёные
        # посты тоже (робот Unitree и мёртвый краб в канале для новичков).
        items = (kb.get_fresh_items(conn, channel.key, hours=48)
                 if channel.news_count else [])
        facts = kb.get_facts(conn, channel.key)
        hooks = kb.get_recent_hooks(conn, channel.key, days=60)

        # Очередь сценариев из Google-таблицы: /more — это добавка к уже
        # присланному, сценарии туда не тянем.
        scripts: list[dict] = []
        if channel.scripts_count and mode != "more":
            scripts = kb.get_scripts(conn, channel.key,
                                     limit=min(channel.scripts_count, count))
        news_count = max(count - len(scripts), 0)
        script_urls = {s["url"] for s in scripts}

        # Ссылки даём только на настоящие http(s)-URL; синтетические trend:// —
        # это внутренний маркер трендвотчера, ни в CTA, ни в «Источник» не идёт.
        def _linkable(it) -> bool:
            u = it.get("url") or ""
            return u.startswith(("http://", "https://"))
        own_urls = {it["url"] for it in items if it.get("own") and _linkable(it)}
        foreign_urls = {it["url"] for it in items if not it.get("own") and _linkable(it)}

        first_send = True
        # В группе Telegram лимит ~20 сообщений в минуту: при залпе на 15 веток
        # обычной паузы мало, упрёмся во флуд-контроль.
        pause = GROUP_SEND_PAUSE if chat_id < 0 else SEND_PAUSE

        async def _paced_send(text: str, buttons: Optional[list] = None) -> None:
            nonlocal first_send
            if not first_send:
                await asyncio.sleep(pause)
            first_send = False
            await send(chat_id, text, buttons)

        planned = len(scripts) + news_count
        tail = f" (из них {len(scripts)} по сценариям)" if scripts else ""
        header = (f"<b>{html.escape(str(channel.handle))}</b> — "
                  f"{planned} веток на сегодня{tail}")
        sent_any = False
        errors: list[Exception] = []

        for kind, payload in _plan(scripts, news_count):
            batch = payload if kind == "scripts" else []
            try:
                threads = await _generate(
                    channel, cfg, items, facts, hooks,
                    count=(len(batch) if kind == "scripts" else int(payload)),
                    mode=mode, scripts=(batch or None))
            except Exception as e:  # noqa: BLE001 — упавшая пачка не отменяет залп
                print(f"[warn] {channel.key}: пачка {kind} не сгенерилась: {e}", file=sys.stderr)
                errors.append(e)
                continue
            # Шапку шлём перед первой удачной пачкой: если не получилось
            # вообще ничего, канал отчитается одним сообщением «без идей».
            if not sent_any:
                await _paced_send(header)
                sent_any = True
            if kind == "scripts":
                # Сценарии считаем израсходованными сразу после удачной генерации:
                # иначе завтра приедут те же самые.
                kb.mark_items_used(conn, [s["id"] for s in batch])
            for t in threads:
                hid = kb.add_history(conn, channel.key, t["hook"], compose.format_thread(t))
                btns = compose.thread_buttons(hid)
                src = t.get("source", "")
                if src in script_urls and channel.cta_link:
                    chunks = compose.format_thread_message(t, cta_link=channel.cta_link)
                elif src in own_urls:
                    chunks = compose.format_thread_message(t, cta_link=src)
                elif src in foreign_urls:
                    chunks = compose.format_thread_message(t, source_link=src)
                else:
                    chunks = compose.format_thread_message(t)
                for i, msg in enumerate(chunks):
                    await _paced_send(msg, buttons=(btns if i == len(chunks) - 1 else None))
                hooks.append(t["hook"])

        if not sent_any:
            # Ни одна пачка не сгенерилась — отдаём наружу как общий сбой канала.
            raise errors[-1] if errors else RuntimeError("нет веток")
        if errors:
            await _paced_send(f"⚠️ Не получилось пачек: {len(errors)}. "
                              f"Последняя причина: {html.escape(str(errors[-1]))}")
    except Exception as e:  # noqa: BLE001
        await send(chat_id, f"⚠️ Канал <b>{html.escape(str(channel.key))}</b> сегодня без идей. "
                            f"Причина: {html.escape(str(e))}")
