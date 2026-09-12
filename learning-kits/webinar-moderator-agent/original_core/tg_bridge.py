"""Telegram-мост (aiogram v3): пересылка вопросов владельцу с кнопками,
приём ответов и постинг их в чат вебинара, команды управления.

Всё ограничено OWNER_ID — это id ЧАТА (не обязательно пользователя): если
там личка с владелицей, OWNER_ID совпадает с её user_id (в Telegram для
приватных чатов chat.id == user_id, поэтому раньше проверка «от кого» и
«из какого чата» давали один результат). Если добавить бота в групповой
чат с командой и вписать в OWNER_ID id этой группы (см. команду /chatid,
она без ограничений специально для этого) — отвечать смогут все в группе,
проверка идёт по чату, а не по конкретному пользователю.

Маппинг «tg-сообщение → куда постить» лежит в sqlite (reply_map / cb_action),
поэтому переживает рестарт и различает параллельные вебинары: цель постинга
берётся из сохранённой строки, а не из «текущего эфира».

Пути ответа (все ведут в чат нужного вебинара с префиксом имени):
  (a) кнопка «✍️ Ответить» → ForceReply → ответ приходит как reply_to_message
      → тот же обработчик, что и свайп-ответ (можно скопировать черновик
      из карточки и подправить перед отправкой);
  (b) обычный свайп-ответ на карточку;
  (c) кнопка «✅ Отправить черновик» — черновик LLM как есть, без правок;
  (d) кнопка «📋 Шаблон» → меню из top-3 утверждённых шаблонов → тап отправляет.

Черновик/шаблон в карточке — в HTML-блоке <pre> (parse_mode='HTML'): Telegram
показывает такой блок с копированием одним тапом, без ручного выделения текста.
Все остальные подставляемые значения (имя, текст вопроса, название вебинара)
экранируются через _esc — иначе символы вроде "<" в вопросе зрителя сломали бы
HTML-разметку сообщения.

Обучение на ручных ответах: когда команда отвечает СВОИМ текстом (путь a/b) или
принимает черновик LLM как есть (путь c), пара вопрос→ответ уходит в
faq_store.auto_learn — следующий похожий вопрос сразу предложит тот же
проверенный ответ (pipeline._try_reuse_learned), а не новый вызов LLM. Ответы
из УЖЕ утверждённых шаблонов (путь d) в это обучение не попадают — они и так
кодифицированы в knowledge/templates.yaml, а текст шаблона уже содержит имя
конкретного зрителя (испортил бы обучение для будущих вопросов от других людей).
"""
from __future__ import annotations

import html
import logging
import time
from datetime import datetime
from zoneinfo import ZoneInfo

from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command
from aiogram.types import (
    CallbackQuery,
    ForceReply,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)

import contacts as contactlib
import faq_store as store
from context import (
    App,
    ChatMessage,
    MODE_OBSERVE,
    MODES,
    MODE_HELP,
    render_template,
)
from responder import top_templates

log = logging.getLogger("tg")

# Время в карточках — по Москве, независимо от часового пояса машины (см.
# такой же комментарий в scheduler.py — на сервере системные часы могут быть UTC).
MSK = ZoneInfo("Europe/Moscow")

# Сентинел webinar_id для reply_map: пометка «это ответ для утверждения FAQ».
FAQ_SENTINEL = "__faq__"

# Ярлыки категорий берём из pipeline (единый источник), но импортируем лениво
# внутри функций, чтобы не создавать цикл на уровне модуля.


def _label(cat: str) -> str:
    from pipeline import CATEGORY_LABEL
    return CATEGORY_LABEL.get(cat, "⚪️ Прочее")


def _short_name(author: str) -> str:
    a = (author or "").strip()
    return a if a else "Зритель"


def _esc(text) -> str:
    """HTML-экранирование для parse_mode='HTML' (карточки с копируемым
    черновиком) — без этого "<"/"&" в вопросе зрителя сломали бы разметку."""
    return html.escape(str(text or ""), quote=False)


def _copyable(text: str) -> str:
    """Оборачивает текст в Telegram code-block (<pre>) — моноширинный блок,
    Telegram копирует его одним тапом (без ручного выделения)."""
    return f"<pre>{_esc(text)}</pre>"


def _contact_of(app: App, msg: ChatMessage):
    """Контакт зрителя из локального кэша (ночная выгрузка GetCourse) по
    author_id == data-user-id. None, если id нет или контакт не найден."""
    uid = getattr(msg, "author_id", "") or ""
    if not uid:
        return None
    try:
        return store.get_contact(app.db, uid)
    except Exception:  # noqa: BLE001 — кэш не критичен, карточка уйдёт и без него
        return None


def _contact_line(contact) -> str:
    """Строка с контактами для тела карточки (телефон + tg-ник, если есть).
    Пустая строка, если контакта/данных нет."""
    if not contact:
        return ""
    parts: list[str] = []
    phone = contactlib.pretty_phone(contact["phone"])
    if phone:
        parts.append(f"📱 {_esc(phone)}")
    tg = contactlib.tg_username_clean(contact["tg_username"])
    if tg:
        parts.append(f"✈️ @{_esc(tg)}")
    return "   ".join(parts)


def _card_text(app: App, watcher, msg: ChatMessage, cat: str,
               extra: str = "", contact=None) -> str:
    """Формат карточки (HTML, parse_mode='HTML'):
    🟠 Цена/рассрочка · «Вайбкодинг» 19:00\n👤 Мария И.: текст
    (+ строка контактов, если нашли). extra уже подготовлен вызывающей
    стороной (draft/preview обёрнуты в <pre> через _copyable)."""
    hhmm = datetime.now(MSK).strftime("%H:%M")
    head = f"{_label(cat)} · «{_esc(watcher.webinar.name)}» {hhmm}"
    body = f"👤 {_esc(_short_name(msg.author))}: {_esc(msg.text)}"
    out = f"{head}\n{body}"
    cline = _contact_line(contact)
    if cline:
        out += f"\n{cline}"
    if extra:
        out += f"\n\n{extra}"
    return out


# --- Пересылка владельцу ------------------------------------------------------

async def forward_to_owner(app: App, watcher, msg: ChatMessage, cat: str,
                           draft: str | None = None,
                           draft_label: str = "💡 Черновик ответа (проверьте!):") -> None:
    """pricing/objection/content/personal/other → карточка с кнопками.
    draft_label отличается, когда draft — не свежий LLM-черновик, а реальный
    ответ, который команда уже давала на похожий вопрос (см.
    pipeline._try_reuse_learned). Текст черновика — в <pre> (см. _copyable),
    чтобы скопировать одним тапом в Telegram."""
    extra = f"{draft_label}\n{_copyable(draft)}" if draft else ""
    contact = _contact_of(app, msg)
    text = _card_text(app, watcher, msg, cat, extra=extra, contact=contact)
    kb = _reply_keyboard(app, watcher, msg, with_template=False, draft=draft,
                         contact=contact)
    sent = await app.bot.send_message(app.settings.owner_id, text, reply_markup=kb,
                                      parse_mode="HTML")
    store.add_reply_map(
        app.db, tg_message_id=sent.message_id, webinar_id=watcher.wid,
        viewer_name=_short_name(msg.author), src_msg_hash=msg.hash, src_text=msg.text,
        kind="card", author_id=getattr(msg, "author_id", ""),
    )


async def forward_with_template(app: App, watcher, msg: ChatMessage, cat: str,
                                tm) -> None:
    """tech/org → карточка с пометкой «предлагаю шаблон» и кнопкой отправки.
    Текст шаблона — в <pre> (см. _copyable), чтобы скопировать одним тапом."""
    extra = ""
    if tm and tm.template_id and tm.answer_preview:
        extra = (f"📋 Предлагаю шаблон «{_esc(tm.template_id)}» ({tm.confidence:.0%}):\n"
                f"{_copyable(tm.answer_preview)}")
    contact = _contact_of(app, msg)
    text = _card_text(app, watcher, msg, cat, extra=extra, contact=contact)
    kb = _reply_keyboard(app, watcher, msg, with_template=True, suggested=tm,
                         contact=contact)
    sent = await app.bot.send_message(app.settings.owner_id, text, reply_markup=kb,
                                      parse_mode="HTML")
    store.add_reply_map(
        app.db, tg_message_id=sent.message_id, webinar_id=watcher.wid,
        viewer_name=_short_name(msg.author), src_msg_hash=msg.hash, src_text=msg.text,
        kind="card", author_id=getattr(msg, "author_id", ""),
    )


async def forward_spam_flag(app: App, watcher, msg: ChatMessage) -> None:
    text = (f"🚫 Спам в «{watcher.webinar.name}» от {_short_name(msg.author)}:\n"
            f"{msg.text[:200]}")
    await app.bot.send_message(app.settings.owner_id, text)


# --- Клавиатуры ---------------------------------------------------------------

def _contact_buttons(contact) -> list[InlineKeyboardButton]:
    """Кликабельные URL-кнопки WhatsApp/Telegram по контакту зрителя.
    URL-кнопкам callback_data не нужен — просто открывают ссылку одним тапом.
    Пустой список, если контакта нет."""
    if not contact:
        return []
    btns: list[InlineKeyboardButton] = []
    wa = contactlib.wa_link(contact["phone"])
    if wa:
        btns.append(InlineKeyboardButton(text="📱 WhatsApp", url=wa))
    tg = contactlib.tg_link(contact["tg_username"])
    if tg:
        btns.append(InlineKeyboardButton(text="✈️ Telegram", url=tg))
    return btns


def _reply_keyboard(app: App, watcher, msg: ChatMessage, *,
                    with_template: bool, suggested=None,
                    draft: str | None = None,
                    contact=None) -> InlineKeyboardMarkup:
    """Кнопки под карточкой. В callback_data кладём только int id из cb_action.

    draft — черновик LLM (content/pricing/personal/objection): если есть,
    добавляем кнопку «✅ Отправить черновик» (отправить как есть) — раньше
    для этих категорий единственным путём было писать ответ с нуля вручную.
    """
    # cb_action для «✍️ Ответить» (без шаблона) — draft_text кладём и сюда,
    # чтобы подсказать в промпте «можно скопировать черновик выше».
    reply_id = store.add_cb_action(
        app.db, webinar_id=watcher.wid, viewer_name=_short_name(msg.author),
        src_msg_hash=msg.hash, src_text=msg.text, template_id=None,
        draft_text=draft,
    )
    row1 = [InlineKeyboardButton(text="✍️ Ответить", callback_data=f"r:{reply_id}")]

    if suggested is not None and getattr(suggested, "template_id", None):
        # Быстрая кнопка «отправить предложенный шаблон».
        send_id = store.add_cb_action(
            app.db, webinar_id=watcher.wid, viewer_name=_short_name(msg.author),
            src_msg_hash=msg.hash, src_text=msg.text, template_id=suggested.template_id,
        )
        row1.append(InlineKeyboardButton(
            text="✅ Отправить шаблон", callback_data=f"p:{send_id}"))

    if draft:
        # Быстрая кнопка «отправить черновик как есть» — правки делаются через
        # «✍️ Ответить» (скопировать черновик из текста карточки и подправить).
        draft_send_id = store.add_cb_action(
            app.db, webinar_id=watcher.wid, viewer_name=_short_name(msg.author),
            src_msg_hash=msg.hash, src_text=msg.text, draft_text=draft,
        )
        row1.append(InlineKeyboardButton(
            text="✅ Отправить черновик", callback_data=f"d:{draft_send_id}"))

    row2 = []
    if with_template:
        # Меню шаблонов (top-3) — только для tech/org, для черновиков не нужно.
        menu_id = store.add_cb_action(
            app.db, webinar_id=watcher.wid, viewer_name=_short_name(msg.author),
            src_msg_hash=msg.hash, src_text=msg.text, template_id=None,
        )
        row2.append(InlineKeyboardButton(text="📋 Шаблон", callback_data=f"m:{menu_id}"))

    skip_id = store.add_cb_action(
        app.db, webinar_id=watcher.wid, viewer_name=_short_name(msg.author),
        src_msg_hash=msg.hash, src_text=msg.text, template_id=None,
    )
    faq_id = store.add_cb_action(
        app.db, webinar_id=watcher.wid, viewer_name=_short_name(msg.author),
        src_msg_hash=msg.hash, src_text=msg.text, template_id=None,
    )
    row2.append(InlineKeyboardButton(text="🚫 Пропустить", callback_data=f"s:{skip_id}"))
    row2.append(InlineKeyboardButton(text="➕ В FAQ", callback_data=f"f:{faq_id}"))

    rows = [row1, row2]

    # Кликабельные контакты зрителя (WhatsApp/Telegram) из карточки клиента —
    # отдельным рядом, если контакт нашли в кэше GetCourse.
    contact_row = _contact_buttons(contact)
    if contact_row:
        rows.append(contact_row)

    # Кнопка-ссылка «Открыть вебинар» — ведёт на страницу модерации (или комнату),
    # где оставлен комментарий. URL-кнопке callback_data не нужен, просто ссылка.
    link_url = getattr(watcher, "link_url", None) or getattr(
        getattr(watcher, "webinar", None), "url", None)
    if link_url and str(link_url).startswith(("http://", "https://")):
        rows.append([InlineKeyboardButton(text="🔗 Открыть вебинар", url=str(link_url))])

    return InlineKeyboardMarkup(inline_keyboard=rows)


# --- Постинг ответа в вебинар -------------------------------------------------

def _webinar_name(app: App, webinar_id: str) -> str:
    w = app.watchers.get(webinar_id)
    return getattr(getattr(w, "webinar", None), "name", "вебинар")


def _posted_confirm(app: App, webinar_id: str, posted: str) -> str:
    """Понятное ЛАСТИНГ-подтверждение (не исчезающий тост): что и куда ушло."""
    return (f"✅ Готово — этот ответ появился в чате вебинара «{_webinar_name(app, webinar_id)}»:\n"
            f"«{posted}»")


def _learn_from_answer(app: App, question: str, answer: str) -> None:
    """Запоминает пару вопрос→ответ как проверенную командой (см. модуль-докстринг
    выше — «Обучение на ручных ответах»). Не критично для доставки ответа
    зрителю, поэтому ошибки только логируем, не пробрасываем."""
    try:
        store.auto_learn(app.db, question, "other", answer)
    except Exception:
        log.exception("Не удалось обучить бота на ответе")


async def _post_to_webinar(app: App, webinar_id: str, viewer_name: str,
                           answer: str, *, is_auto: bool = False) -> tuple[bool, str, str]:
    """Единая точка постинга. Цель — из сохранённой строки, не из «текущего эфира».
    Возвращает (ok, причина_отказа, итоговый_текст_как_в_чате).
    """
    w = app.watchers.get(webinar_id)
    if not w or not getattr(w, "is_running", False):
        return False, "вебинар уже завершился — отвечать некуда", ""
    prefix = f"{viewer_name}, " if viewer_name and viewer_name != "Зритель" else ""
    text = f"{prefix}{answer}".strip()
    ok, reason = await w.post(text, is_auto=is_auto)
    return ok, reason, text


async def _handle_owner_answer(app: App, message: Message, row) -> None:
    """Общий обработчик для свайп-ответа и ForceReply (пути a и b)."""
    if app.mode == MODE_OBSERVE:
        await message.reply("Сейчас режим наблюдения — /mode чтобы включить ответы.")
        return
    answer = (message.text or "").strip()
    if not answer:
        await message.reply("Отправьте, пожалуйста, текст ответа.")
        return
    ok, reason, posted = await _post_to_webinar(
        app, row["webinar_id"], row["viewer_name"], answer, is_auto=False)
    if ok:
        store.set_message_answer(app.db, row["webinar_id"], row["src_msg_hash"],
                                 "owner_answered", answer)
        _learn_from_answer(app, row["src_text"], answer)
        await message.reply(_posted_confirm(app, row["webinar_id"], posted))
    else:
        await message.reply(f"⚠️ Не отправилось: {reason}")


# =============================================================================
# Регистрация хендлеров
# =============================================================================

def register(dp: Dispatcher, app: App) -> None:
    owner = app.settings.owner_id

    # --- Свайп-ответ / ForceReply-ответ (пути a и b + утверждение FAQ) --------
    @dp.message(F.reply_to_message, F.chat.id == owner)
    async def on_reply(message: Message) -> None:
        row = store.get_reply_map(app.db, message.reply_to_message.message_id)
        if not row:
            # Не наш reply — возможно, ответ на что-то другое; молча пропускаем.
            log.info("Reply без маппинга: msg_id=%s",
                     message.reply_to_message.message_id)
            return
        if row["webinar_id"] == FAQ_SENTINEL:
            # Это ответ-текст для утверждения FAQ-кластера.
            answer = (message.text or "").strip()
            if not answer:
                await message.reply("Отправьте, пожалуйста, текст ответа.")
                return
            try:
                cid = int(row["src_msg_hash"])
            except (TypeError, ValueError):
                return
            store.approve_faq(app.db, cid, answer)
            await message.reply(
                f"✅ FAQ #{cid} утверждён. Экспорт в шаблоны — при перезапуске.")
            return
        await _handle_owner_answer(app, message, row)

    # --- Кнопка «✍️ Ответить» → ForceReply -----------------------------------
    @dp.callback_query(F.data.startswith("r:"), F.message.chat.id == owner)
    async def on_reply_btn(cq: CallbackQuery) -> None:
        cb = store.get_cb_action(app.db, int(cq.data.split(":", 1)[1]))
        if not cb:
            await cq.answer("Устарело", show_alert=False)
            return
        if app.mode == MODE_OBSERVE:
            await cq.answer("Сейчас режим наблюдения — /mode чтобы включить ответы.",
                            show_alert=True)
            return
        hint = ("\nЧерновик можно скопировать из карточки выше и подправить."
                if cb["draft_text"] else "")
        prompt = await cq.message.answer(
            f"✍️ Напишите ответ прямо в поле ниже (оно уже открыто на «ответ» на "
            f"это сообщение) и отправьте — я передам его в чат вебинара "
            f"«{_webinar_name(app, cb['webinar_id'])}» как ответ для "
            f"{cb['viewer_name']}.{hint}",
            # selective=False — В ГРУППЕ selective=True НЕ открывает окно ответа
            # у нажавшего (Telegram таргетит только @упомянутых), из-за чего ответ
            # уходил обычным сообщением и терялся (у бота включён privacy mode —
            # обычные сообщения он не видит, только reply на свои). selective=False
            # надёжно открывает «ответ» → сообщение приходит как reply → бот его
            # получает и постит. Проверено: это была причина «нажала, а не ушло».
            reply_markup=ForceReply(selective=False),
        )
        # Ключуем reply_map по id промпта — ответ придёт как reply на него.
        store.add_reply_map(
            app.db, tg_message_id=prompt.message_id, webinar_id=cb["webinar_id"],
            viewer_name=cb["viewer_name"], src_msg_hash=cb["src_msg_hash"],
            src_text=cb["src_text"], kind="forceprompt",
        )
        await cq.answer()

    # --- Кнопка «📋 Шаблон» → меню top-3 -------------------------------------
    @dp.callback_query(F.data.startswith("m:"), F.message.chat.id == owner)
    async def on_template_menu(cq: CallbackQuery) -> None:
        cb = store.get_cb_action(app.db, int(cq.data.split(":", 1)[1]))
        if not cb:
            await cq.answer("Устарело", show_alert=False)
            return
        # Категорию не храним в cb — подбираем по обеим tech/org, берём лучшее.
        tops = []
        for cat in ("tech", "org"):
            tops += await top_templates(cb["src_text"], cat, app.templates,
                                        cb["viewer_name"], k=3)
        # Уникализируем по id, максимум 3.
        seen, uniq = set(), []
        for t in tops:
            if t.id not in seen:
                seen.add(t.id)
                uniq.append(t)
            if len(uniq) >= 3:
                break
        if not uniq:
            await cq.answer("Нет утверждённых шаблонов", show_alert=True)
            return
        rows = []
        for t in uniq:
            send_id = store.add_cb_action(
                app.db, webinar_id=cb["webinar_id"], viewer_name=cb["viewer_name"],
                src_msg_hash=cb["src_msg_hash"], src_text=cb["src_text"],
                template_id=t.id,
            )
            preview = render_template(t.answer, cb["viewer_name"])[:60]
            rows.append([InlineKeyboardButton(
                text=f"{t.id}: {preview}…", callback_data=f"p:{send_id}")])
        await cq.message.answer(
            "Выберите шаблон для отправки:",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))
        await cq.answer()

    # --- Кнопка отправки шаблона (путь c) ------------------------------------
    @dp.callback_query(F.data.startswith("p:"), F.message.chat.id == owner)
    async def on_send_template(cq: CallbackQuery) -> None:
        cb = store.get_cb_action(app.db, int(cq.data.split(":", 1)[1]))
        if not cb or not cb["template_id"]:
            await cq.answer("Устарело", show_alert=False)
            return
        if app.mode == MODE_OBSERVE:
            await cq.answer("Сейчас режим наблюдения — /mode чтобы включить ответы.",
                            show_alert=True)
            return
        tpl = app.template_by_id(cb["template_id"])
        if not tpl:
            await cq.answer("Шаблон не найден", show_alert=True)
            return
        answer = render_template(tpl.answer, cb["viewer_name"])
        # Здесь имя уже в тексте шаблона — постим без повторного префикса.
        ok, reason, posted = await _post_to_webinar(
            app, cb["webinar_id"], "", answer, is_auto=False)
        if ok:
            store.set_message_answer(app.db, cb["webinar_id"], cb["src_msg_hash"],
                                     "template_sent", answer)
            await cq.answer("Отправлено ✅", show_alert=False)
            await cq.message.reply(_posted_confirm(app, cb["webinar_id"], posted))
        else:
            await cq.answer(f"Не отправил: {reason}", show_alert=True)

    # --- Кнопка «✅ Отправить черновик» (LLM-черновик как есть) --------------
    @dp.callback_query(F.data.startswith("d:"), F.message.chat.id == owner)
    async def on_send_draft(cq: CallbackQuery) -> None:
        cb = store.get_cb_action(app.db, int(cq.data.split(":", 1)[1]))
        if not cb or not cb["draft_text"]:
            await cq.answer("Устарело", show_alert=False)
            return
        if app.mode == MODE_OBSERVE:
            await cq.answer("Сейчас режим наблюдения — /mode чтобы включить ответы.",
                            show_alert=True)
            return
        answer = cb["draft_text"]
        # В отличие от шаблона, в черновике имени зрителя нет — префикс добавит
        # _post_to_webinar сам (передаём viewer_name как есть).
        ok, reason, posted = await _post_to_webinar(
            app, cb["webinar_id"], cb["viewer_name"], answer, is_auto=False)
        if ok:
            store.set_message_answer(app.db, cb["webinar_id"], cb["src_msg_hash"],
                                     "owner_answered", answer)
            _learn_from_answer(app, cb["src_text"], answer)
            await cq.answer("Отправлено ✅", show_alert=False)
            await cq.message.reply(_posted_confirm(app, cb["webinar_id"], posted))
        else:
            await cq.answer(f"Не отправил: {reason}", show_alert=True)

    # --- Кнопка «🚫 Пропустить» -----------------------------------------------
    @dp.callback_query(F.data.startswith("s:"), F.message.chat.id == owner)
    async def on_skip(cq: CallbackQuery) -> None:
        await cq.answer("Пропущено")

    # --- Кнопка «➕ В FAQ» -----------------------------------------------------
    @dp.callback_query(F.data.startswith("f:"), F.message.chat.id == owner)
    async def on_add_faq(cq: CallbackQuery) -> None:
        cb = store.get_cb_action(app.db, int(cq.data.split(":", 1)[1]))
        if not cb:
            await cq.answer("Устарело", show_alert=False)
            return
        store.upsert_faq(app.db, cb["src_text"], "other")
        await cq.answer("Добавлено в кандидаты FAQ ➕")

    # --- Команды --------------------------------------------------------------
    _register_commands(dp, app)


def _register_commands(dp: Dispatcher, app: App) -> None:
    owner = app.settings.owner_id

    # Без ограничения по чату (нарочно) — иначе нельзя узнать id ГРУППЫ,
    # в которую только что добавили бота: она ещё не совпадает с OWNER_ID.
    # Шаг переноса в командный чат: добавить бота в группу -> написать там
    # /chatid -> вписать полученное число в OWNER_ID -> перезапустить бота.
    @dp.message(Command("chatid"))
    async def cmd_chatid(message: Message) -> None:
        await message.answer(f"id этого чата: {message.chat.id}")

    @dp.message(Command("start", "help"), F.chat.id == owner)
    async def cmd_help(message: Message) -> None:
        await message.answer(
            "🤖 Бот-модератор автовебинаров.\n\n"
            "Я читаю чат вебинара, отвечаю на техвопросы из утверждённых шаблонов, "
            "а важные вопросы (цена, возражения, по теме) пересылаю сюда — ваш ответ "
            "уходит прямо в чат вебинара.\n\n"
            "Ответить зрителю: свайп-ответом на карточку, кнопкой «✍️ Ответить» или "
            "«✅ Отправить черновик/шаблон», если он есть на карточке.\n\n"
            "Команды:\n"
            "/status — режим, активные вебинары, возраст сессии, счётчики за сутки\n"
            "/mode — переключить режим (наблюдение / ассист / авто)\n"
            "/watch <url> [минуты] — начать слежку вручную\n"
            "/stopwatch — остановить ручную слежку\n"
            "/faq — утверждённые FAQ\n"
            "/candidates — кандидаты в FAQ (с кнопкой одобрить)\n"
            "/digest — дайджест по активным вебинарам сейчас\n"
            "/staff — список сотрудников (их комментарии не пересылаю); "
            "ответьте /staff add на карточку, чтобы добавить\n"
            "/test <текст> — как бот классифицирует сообщение\n"
            "/chatid — id текущего чата (пригодится, если решите перенести "
            "уведомления в групповой чат с командой)\n"
        )

    @dp.message(Command("staff"), F.chat.id == owner)
    async def cmd_staff(message: Message) -> None:
        arg = (message.text or "").split(maxsplit=1)
        sub = arg[1].strip() if len(arg) > 1 else ""

        # /staff add — ответом на карточку сотрудника: ловим по стабильному id.
        if sub.lower().startswith("add") and message.reply_to_message:
            row = store.get_reply_map(app.db, message.reply_to_message.message_id)
            if row:
                label = row["viewer_name"] or "сотрудник"
                uid = row["author_id"] if "author_id" in row.keys() else ""
                ok = store.add_staff(app.db, label, user_id=uid or "")
                how = f"по id {uid}" if uid else "по имени"
                await message.reply(
                    f"{'✅ Добавлен' if ok else 'Уже в списке'} сотрудник «{label}» ({how}). "
                    "Его комментарии больше не пересылаю." if ok else
                    f"«{label}» уже в списке сотрудников.")
                return

        # /staff add <имя> — вручную по имени.
        if sub.lower().startswith("add"):
            name = sub[3:].strip()
            if not name:
                await message.reply(
                    "Как добавить сотрудника:\n"
                    "• ответьте на его карточку командой /staff add — поймаю по id (надёжнее);\n"
                    "• или /staff add Имя Фамилия — по точному имени.")
                return
            ok = store.add_staff(app.db, name)
            await message.reply(
                f"✅ Добавлен «{name}» — его комментарии больше не пересылаю."
                if ok else f"«{name}» уже в списке.")
            return

        # /staff del <имя или id>
        if sub.lower().startswith("del"):
            needle = sub[3:].strip()
            if not needle:
                await message.reply("Укажите имя или id: /staff del Имя Фамилия")
                return
            n = store.del_staff(app.db, needle)
            await message.reply(f"Удалено записей: {n}." if n else "Не нашёл такого в списке.")
            return

        # /staff — просто список.
        rows = store.list_staff(app.db)
        if not rows:
            await message.reply("Список сотрудников пуст. Добавить: ответьте /staff add на карточку сотрудника.")
            return
        lines = "\n".join(
            f"• {r['label']}" + (f" (id {r['user_id']})" if r['user_id'] else " (по имени)")
            for r in rows)
        await message.reply(
            "🚫 Сотрудники (их комментарии не пересылаю):\n" + lines +
            "\n\nДобавить: ответьте /staff add на карточку. Убрать: /staff del Имя.")

    @dp.message(Command("status"), F.chat.id == owner)
    async def cmd_status(message: Message) -> None:
        counts = store.today_counts(app.db)
        age = int(time.time() - app.started_at) if app.started_at else 0
        active = ", ".join(w.webinar.name for w in app.watchers.values()) or "нет"
        sess = _session_age_str()
        await message.answer(
            f"Режим: {app.mode} ({MODE_HELP[app.mode]})\n"
            f"Активные вебинары: {active}\n"
            f"Сессия GetCourse: {sess}\n"
            f"Аптайм бота: {age // 3600}ч {age % 3600 // 60}м\n"
            f"За сутки: всего {counts['total']}, авто-ответов {counts['auto']}, "
            f"переслано {counts['forwarded']}"
        )

    @dp.message(Command("mode"), F.chat.id == owner)
    async def cmd_mode(message: Message) -> None:
        rows = [[InlineKeyboardButton(text=m, callback_data=f"mode:{m}")] for m in MODES]
        await message.answer(
            f"Текущий режим: {app.mode}. Выберите новый:",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))

    @dp.callback_query(F.data.startswith("mode:"), F.message.chat.id == owner)
    async def on_mode_set(cq: CallbackQuery) -> None:
        new = cq.data.split(":", 1)[1]
        if new not in MODES:
            await cq.answer("Неизвестный режим", show_alert=True)
            return
        app.mode = new
        await cq.message.edit_text(f"✅ Режим: {new} — {MODE_HELP[new]}")
        await cq.answer()

    @dp.message(Command("watch"), F.chat.id == owner)
    async def cmd_watch(message: Message) -> None:
        parts = (message.text or "").split()
        if len(parts) < 2:
            await message.answer("Использование: /watch <url> [минуты]")
            return
        url = parts[1]
        minutes = 60
        if len(parts) >= 3:
            try:
                minutes = int(parts[2])
            except ValueError:
                pass
        if app.scheduler is None:
            await message.answer("Планировщик не готов.")
            return
        try:
            name = await app.scheduler.watch_adhoc(url, minutes)  # type: ignore[attr-defined]
            await message.answer(f"👀 Слежу за «{name}» ~{minutes} мин.")
        except Exception as e:
            await message.answer(f"Не удалось запустить слежку: {e}")

    @dp.message(Command("stopwatch"), F.chat.id == owner)
    async def cmd_stopwatch(message: Message) -> None:
        if app.scheduler is None:
            await message.answer("Планировщик не готов.")
            return
        stopped = await app.scheduler.stop_manual()  # type: ignore[attr-defined]
        if stopped:
            await message.answer(f"⏹ Остановлено: {', '.join(stopped)}")
        else:
            await message.answer("Нет ручных слежек.")

    @dp.message(Command("faq"), F.chat.id == owner)
    async def cmd_faq(message: Message) -> None:
        rows = store.list_faq(app.db, approved_only=True, limit=30)
        if not rows:
            await message.answer("Утверждённых FAQ пока нет. /candidates — кандидаты.")
            return
        lines = [f"• ({r['count']}×) {r['canonical']}" for r in rows]
        await message.answer("📚 Утверждённые FAQ:\n" + "\n".join(lines))

    @dp.message(Command("candidates"), F.chat.id == owner)
    async def cmd_candidates(message: Message) -> None:
        rows = store.list_candidates(app.db, limit=20)
        if not rows:
            await message.answer("Кандидатов в FAQ пока нет.")
            return
        for r in rows[:10]:
            kb = InlineKeyboardMarkup(inline_keyboard=[[
                InlineKeyboardButton(text="✅ Одобрить",
                                     callback_data=f"faqok:{r['id']}"),
            ]])
            await message.answer(
                f"❓ ({r['count']}×) {r['canonical']}\n"
                f"Категория: {r['category']}", reply_markup=kb)

    @dp.callback_query(F.data.startswith("faqok:"), F.message.chat.id == owner)
    async def on_faq_approve(cq: CallbackQuery) -> None:
        cid = int(cq.data.split(":", 1)[1])
        prompt = await cq.message.answer(
            f"Пришлите текст утверждённого ответа для FAQ #{cid} "
            "в поле ниже (оно открыто на «ответ»).",
            reply_markup=ForceReply(selective=False))  # см. коммент в on_reply_btn
        # Тот же механизм, что и для ответов зрителям: пишем reply_map по id
        # промпта, но с сентинелом webinar_id='__faq__' и cluster id в src_msg_hash.
        # Ответ придёт как reply на промпт → единый обработчик on_reply разрулит.
        store.add_reply_map(
            app.db, tg_message_id=prompt.message_id, webinar_id=FAQ_SENTINEL,
            viewer_name="", src_msg_hash=str(cid), src_text="", kind="faq")
        await cq.answer()

    @dp.message(Command("digest"), F.chat.id == owner)
    async def cmd_digest(message: Message) -> None:
        active = [w for w in app.watchers.values()
                  if getattr(w, "started_ts", None) is not None]
        if not active:
            await message.answer("Сейчас нет активных вебинаров для дайджеста.")
            return
        closed = [(w.wid, w.webinar.name, int(w.started_ts)) for w in active]
        text = build_combined_digest(app, closed) or "Пока вопросов нет."
        await message.answer(text)

    @dp.message(Command("test"), F.chat.id == owner)
    async def cmd_test(message: Message) -> None:
        from classifier import classify
        text = (message.text or "").split(maxsplit=1)
        if len(text) < 2:
            await message.answer("Использование: /test <текст сообщения>")
            return
        sample = text[1]
        cls = await classify(sample, [], app.settings.deepseek_api_key,
                             app.settings.deepseek_model)
        route = _routing_hint(cls.category)
        await message.answer(
            f"Текст: {sample}\n"
            f"Категория: {cls.category} ({cls.confidence:.0%}, {cls.by})\n"
            f"Маршрут: {route}")


def _routing_hint(cat: str) -> str:
    if cat in ("greeting", "reaction"):
        return "игнор (только лог)"
    if cat == "spam":
        return "лог + флаг спама"
    if cat in ("tech", "org"):
        return "подбор шаблона → авто-ответ или предложение вам"
    return "переслать вам"


def _session_age_str() -> str:
    from pathlib import Path
    p = Path(__file__).resolve().parent / "data" / "gc_storage_state.json"
    if not p.exists():
        return "нет (запустите python tools/login.py)"
    age = int(time.time() - p.stat().st_mtime)
    return f"есть, обновлена {age // 3600}ч назад"


# --- Дайджест -----------------------------------------------------------------

# Категории, которые НЕ считаем «вопросами» для итогов эфира (приветствия,
# реакции, спам — по ним отчитываться нечего).
_NON_QUESTION_CATS = {"greeting", "reaction", "spam"}


def build_combined_digest(app: App, closed: list[tuple[str, str, int]]) -> str | None:
    """ОДИН сводный отчёт по пачке закрывшихся вебинаров.

    closed: список (webinar_id, name, since_ts).
    Возвращает текст ОДНОГО сообщения (или None, если и отчитываться не о чем
    — например пустой список). Вебинары без единого реального вопроса в отчёт
    не попадают отдельными секциями (не мусорим «Всего сообщений: 0»).
    FAQ-кандидаты в авто-отчёт НЕ включаем — они глобальные, дублировались бы;
    смотреть их отдельно командой /candidates.
    """
    if not closed:
        return None

    sections: list[str] = []
    for wid, name, since in closed:
        s = store.digest_stats(app.db, wid, since)
        questions = sum(
            v for k, v in s["by_category"].items() if k not in _NON_QUESTION_CATS
        )
        if questions <= 0:
            continue  # только приветствия/тишина — в отчёт не тащим
        head = (f"• «{name}» — вопросов: {questions}, "
                f"ответили вы: {s['owner_answered']}, авто: {s['auto_answered']}")
        if s["top_unanswered"]:
            unans = "\n".join(f"    ◦ {q}" for q in s["top_unanswered"])
            head += "\n" + unans
        sections.append(head)

    n = len(closed)
    if not sections:
        # Ни одного реального вопроса ни в одном эфире.
        word = "эфир" if n == 1 else "эфиров"
        return f"🔚 Завершено {n} {word}. Вопросов от зрителей не было."

    return "📊 Итоги эфиров\n\n" + "\n\n".join(sections)
