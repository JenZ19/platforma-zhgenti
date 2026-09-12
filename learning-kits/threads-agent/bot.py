"""Интерактивный бот threads-agent (aiogram long polling)."""
from __future__ import annotations

import asyncio
import html
import sys

from aiogram import Bot, Dispatcher, F
from aiogram import BaseMiddleware
from aiogram.exceptions import TelegramRetryAfter
from aiogram.filters import Command, CommandStart
from aiogram.types import (CallbackQuery, InlineKeyboardButton,
                           InlineKeyboardMarkup, Message, TelegramObject)

import config as cfgmod
import kb
import pipeline

CFG: cfgmod.Config | None = None
CONN = None
bot: Bot | None = None
dp = Dispatcher()

# Держим ссылки на фоновые генерации: без этого GC может убить таск,
# созданный fire-and-forget через asyncio.create_task.
_BG_TASKS: set[asyncio.Task] = set()


class OwnerOnlyMiddleware(BaseMiddleware):
    """Единая fail-closed защита всех messages и callbacks.

    Проверяет Telegram user ID автора, а не chat ID: в группе это разные ID.
    """

    def __init__(self, owner_user_id: int):
        self.owner_user_id = int(owner_user_id)

    async def __call__(self, handler, event: TelegramObject, data: dict):
        user = getattr(event, "from_user", None)
        if self.owner_user_id <= 0 or user is None or int(user.id) != self.owner_user_id:
            return None
        return await handler(event, data)


def _spawn(coro) -> asyncio.Task:
    t = asyncio.create_task(coro)
    _BG_TASKS.add(t)
    t.add_done_callback(_BG_TASKS.discard)
    return t


def is_authorized(stored, chat_id: int) -> bool:
    return stored is not None and str(stored) == str(chat_id)


def parse_callback(data: str) -> tuple[str, str, int]:
    parts = data.split(":")
    action = parts[0]
    channel = parts[1] if len(parts) > 1 else ""
    n = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 0
    return action, channel, n


def _kb_from_buttons(buttons: list | None) -> InlineKeyboardMarkup | None:
    if not buttons:
        return None
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=t, callback_data=c) for (t, c) in row] for row in buttons
    ])


async def _send(chat_id: int, html: str, buttons: list | None = None) -> None:
    reply_markup = _kb_from_buttons(buttons)
    try:
        await bot.send_message(chat_id, html, parse_mode="HTML", disable_web_page_preview=True,
                               reply_markup=reply_markup)
    except TelegramRetryAfter as e:
        # flood control: ждём сколько велено и ретраим ровно один раз.
        # Если и повторная попытка упрётся во флуд-контроль — пробрасываем
        # выше (вызывающий код, напр. pipeline.run_channel/_run, уже логирует).
        await asyncio.sleep(e.retry_after)
        await bot.send_message(chat_id, html, parse_mode="HTML", disable_web_page_preview=True,
                               reply_markup=reply_markup)


def _batch_kb(channel: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🔄 Перегенерить", callback_data=f"regen:{channel}"),
        InlineKeyboardButton(text="➕ Ещё 5", callback_data=f"more:{channel}:5"),
    ]])


def _guard(chat_id: int) -> bool:
    return is_authorized(kb.get_meta(CONN, CFG.admin_key), chat_id)


def _fact_allowed(msg) -> bool:
    # Факт можно сохранять из целевого чата ИЛИ из любой личики — чтобы
    # кормить базу знаний в личке, когда доставка веток идёт в группу.
    return _guard(msg.chat.id) or msg.chat.type == "private"


async def _offer_fact(msg: Message, text: str) -> None:
    if len(CFG.channels) == 1:
        # У бота с одним каналом (напр. Виктория) не спрашиваем — сохраняем сразу.
        channel = next(iter(CFG.channels))
        kb.add_fact(CONN, channel, text)
        await msg.answer("Сохранил в базу знаний ✅")
        return
    msg_id = msg.message_id
    kbrd = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=k, callback_data=f"fact:{k}:{msg_id}") for k in CFG.channels
    ]])
    # Ключ несёт msg_id: два форварда подряд не должны затирать pending друг друга.
    kb.set_meta(CONN, f"pending_fact:{msg.chat.id}:{msg_id}", text)
    await msg.answer("В какой канал сохранить как факт?", reply_markup=kbrd)


async def _run(channel_key: str, chat_id: int, *, mode: str = "daily", count=None) -> None:
    channel = CFG.channels.get(channel_key)
    if not channel:
        await _send(chat_id, f"⚠️ Неизвестный канал: {channel_key}")
        return
    try:
        # run_channel сам репортит свои ошибки через send() изнутри; сюда
        # исключение долетает только при двойном сбое (например, флуд-контроль
        # ударил повторно и на самой alert-отправке) — не должно ронять
        # фоновую задачу молча («Task exception was never retrieved»).
        await pipeline.run_channel(CONN, channel, CFG, chat_id, _send, mode=mode, count=count)
    except Exception as e:  # noqa: BLE001
        print(f"bot._run({channel_key}): pipeline.run_channel упал: {e}", file=sys.stderr)
    # Хвостовая отправка тоже не должна превращаться в необработанное исключение.
    try:
        await bot.send_message(chat_id, "Готово 👆", reply_markup=_batch_kb(channel_key))
    except Exception as e:  # noqa: BLE001
        print(f"bot._run({channel_key}): не удалось отправить «Готово»: {e}", file=sys.stderr)


@dp.message(CommandStart())
async def on_start(msg: Message):
    stored = kb.get_meta(CONN, CFG.admin_key)
    if stored is None:
        kb.set_meta(CONN, CFG.admin_key, msg.chat.id)
        await msg.answer("Привет! Запомнил этот чат, буду присылать ветки утром.")
    elif is_authorized(stored, msg.chat.id):
        await msg.answer("Уже на связи: /now, /regen, /more, /sources, /add.")
    # чужой chat_id молча игнорируем


@dp.message(Command("here"))
async def on_here(msg: Message):
    kb.set_meta(CONN, CFG.admin_key, msg.chat.id)
    await msg.answer("Готово — буду присылать ветки сюда.")


@dp.message(Command("now"))
async def on_now(msg: Message):
    if not _guard(msg.chat.id):
        return
    arg = msg.text.split(maxsplit=1)
    if len(arg) > 1:
        keys = [arg[1].strip()]
        for k in keys:
            _spawn(_run(k, msg.chat.id))
    else:
        keys = [k for k, c in CFG.channels.items() if c.enabled]
        chat_id = msg.chat.id

        async def _run_all_channels() -> None:
            for k in keys:
                try:
                    await _run(k, chat_id)
                except Exception as e:  # noqa: BLE001 — сбой одного канала не
                    # должен останавливать остальные (тот же паттерн, что
                    # в generate.py: run() по каналам).
                    print(f"bot.on_now: канал {k} — сбой: {e}", file=sys.stderr)

        _spawn(_run_all_channels())
    await msg.answer(f"Запустил генерацию: {', '.join(keys)}")


@dp.message(Command("regen"))
async def on_regen(msg: Message):
    if not _guard(msg.chat.id):
        return
    arg = msg.text.split(maxsplit=1)
    if len(arg) < 2:
        await msg.answer("Формат: /regen <канал>")
        return
    _spawn(_run(arg[1].strip(), msg.chat.id, mode="regen"))
    await msg.answer("Перегенерирую…")


@dp.message(Command("more"))
async def on_more(msg: Message):
    if not _guard(msg.chat.id):
        return
    parts = msg.text.split()
    if len(parts) < 2:
        await msg.answer("Формат: /more <канал> [N]")
        return
    channel = parts[1]
    n = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 5
    _spawn(_run(channel, msg.chat.id, mode="more", count=n))
    await msg.answer(f"Добавляю {n}…")


@dp.message(Command("sources"))
async def on_sources(msg: Message):
    if not _guard(msg.chat.id):
        return
    lines = []
    for key, ch in CFG.channels.items():
        # parse_mode="HTML" ниже — имена/URL источников экранируем, иначе
        # спецсимволы в них ломают разметку сообщения.
        srcs = ", ".join(html.escape(s.name) for s in ch.sources) or "(нет)"
        lines.append(f"<b>{html.escape(key)}</b>: {srcs}")
    await msg.answer("\n".join(lines), parse_mode="HTML")


@dp.message(Command("add"))
async def on_add(msg: Message):
    if not _guard(msg.chat.id):
        return
    parts = msg.text.split(maxsplit=2)
    if len(parts) < 3:
        await msg.answer("Формат: /add <канал> <t.me/... | URL>")
        return
    channel, raw = parts[1], parts[2]
    if channel not in CFG.channels:
        await msg.answer(f"Неизвестный канал: {channel}")
        return
    src = cfgmod.add_source(cfgmod.ROOT, channel, raw)
    if src not in CFG.channels[channel].sources:
        CFG.channels[channel].sources.append(src)
    await msg.answer(f"Добавил {src.kind}: {src.name} → {channel}")


@dp.message(Command("fact"))
async def on_fact_cmd(msg: Message):
    if not _fact_allowed(msg):
        return
    parts = (msg.text or "").split(maxsplit=1)
    text = parts[1].strip() if len(parts) > 1 else ""
    if not text:
        await msg.answer("Формат: /fact <текст факта>")
        return
    await _offer_fact(msg, text)


@dp.message(F.forward_origin)
async def on_forward(msg: Message):
    if not _fact_allowed(msg):
        return
    text = (msg.text or msg.caption or "").strip()
    if not text:
        return
    await _offer_fact(msg, text)


@dp.callback_query(F.data.startswith("fact:"))
async def on_fact(cb: CallbackQuery):
    if not (is_authorized(kb.get_meta(CONN, CFG.admin_key), cb.message.chat.id)
            or cb.message.chat.type == "private"):
        return
    _, channel, msg_id = parse_callback(cb.data)
    key = f"pending_fact:{cb.message.chat.id}:{msg_id}"
    text = kb.get_meta(CONN, key)
    if not text:
        # Устаревшая/повторная кнопка — молча не спасаем несуществующий факт.
        await cb.answer("факт не найден", show_alert=False)
        return
    kb.add_fact(CONN, channel, text)
    kb.set_meta(CONN, key, "")
    await cb.message.edit_text(f"Сохранил факт в {channel} ✅")
    await cb.answer()


@dp.callback_query(F.data.startswith("regen:"))
async def on_regen_cb(cb: CallbackQuery):
    if not is_authorized(kb.get_meta(CONN, CFG.admin_key), cb.message.chat.id):
        return
    _, channel, _n = parse_callback(cb.data)
    _spawn(_run(channel, cb.message.chat.id, mode="regen"))
    await cb.answer("Перегенерирую…")


@dp.callback_query(F.data.startswith("more:"))
async def on_more_cb(cb: CallbackQuery):
    if not is_authorized(kb.get_meta(CONN, CFG.admin_key), cb.message.chat.id):
        return
    _, channel, n = parse_callback(cb.data)
    _spawn(_run(channel, cb.message.chat.id, mode="more", count=n or 5))
    await cb.answer(f"Добавляю {n or 5}…")


@dp.callback_query(F.data.startswith("drop:"))
async def on_drop(cb: CallbackQuery):
    parts = cb.data.split(":")   # ["drop", action, hid?]
    action = parts[1] if len(parts) > 1 else "skip"
    hid = parts[2] if len(parts) > 2 else None
    if hid and hid.isdigit():
        kb.set_history_status(CONN, int(hid), "posted" if action == "done" else "skipped")
    try:
        await cb.message.delete()
    except Exception:
        await cb.answer("Не удалось удалить (сообщение старше 48ч)")
        return
    await cb.answer("Отметил как выложенное ✅" if action == "done" else "Убрал ❌")


async def main() -> None:
    global CFG, CONN, bot
    CFG = cfgmod.load_config()
    if not CFG.allow_live_mode:
        raise RuntimeError("Live-режим выключен: снача настройте свои ключи и ALLOW_LIVE_MODE=true")
    if CFG.owner_user_id <= 0:
        raise RuntimeError("OWNER_USER_ID не задан: бот не запускается без владельца")
    owner_guard = OwnerOnlyMiddleware(CFG.owner_user_id)
    dp.message.outer_middleware(owner_guard)
    dp.callback_query.outer_middleware(owner_guard)
    CONN = kb.connect(CFG.db_path)
    bot = Bot(CFG.bot_token)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
