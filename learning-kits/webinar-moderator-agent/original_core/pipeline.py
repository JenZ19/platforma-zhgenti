"""Конвейер обработки одного сообщения чата вебинара.

Вызывается наблюдателем (watcher.run_loop) для каждого НОВОГО сообщения:
  1. dedupe по (webinar_id, hash) — уникальный индекс в sqlite;
  2. эвристики → категория reaction/greeting/spam (без LLM);
  3. иначе LLM-классификация (classifier.classify) с контекстом последних 5;
  4. маршрутизация по категории (кроме greeting/reaction/spam) СНАЧАЛА
     проверяет, нет ли уже похожего вопроса, отвеченного командой РУКАМИ
     (_try_reuse_learned/faq_store.find_similar_approved) — если есть,
     предлагаем тот же реальный ответ вместо нового LLM/шаблона; иначе:
       greeting/reaction → игнор (только лог);
       spam             → лог (+ флаг владельцу, если FLAG_SPAM);
       tech/org         → подбор утверждённого шаблона (responder):
                            conf>=0.75 и mode==auto и AUTO_ANSWER → авто-ответ,
                            иначе переслать владельцу с кнопкой «предлагаю шаблон»;
       pricing/objection/content/personal/other → переслать владельцу;
       для content/pricing/personal — добавить «💡 Черновик ответа» из базы
       знаний (если она покрывает вопрос);
  5. всё (сообщение, категория, решение, ответ) → sqlite;
  6. вопросы копим в FAQ-кластеры; ответы, отправленные командой руками
     (свой текст или принятый черновик), автоматически обучают faq_store
     (см. tg_bridge._handle_owner_answer/on_send_draft → store.auto_learn).
"""
from __future__ import annotations

import logging

import faq_store as store
from classifier import classify
from context import App, ChatMessage, MODE_AUTO, course_hint_for_webinar, render_template, webinar_id
from responder import draft_content_answer, match_template

log = logging.getLogger("pipeline")

# Порог уверенности для авто-ответа шаблоном.
AUTO_CONFIDENCE = 0.75

# Категории, которые копим в FAQ (осмысленные вопросы).
FAQ_CATEGORIES = {"tech", "org", "pricing", "objection", "content", "personal"}

# Категории, которые всегда пересылаем владельцу.
FORWARD_CATEGORIES = {"pricing", "objection", "content", "personal", "other"}

# Категории, для которых пробуем набросать черновик ответа из базы знаний
# (сам ответ всё равно только пересылается владельцу — ничего не постится сам).
# objection теперь тоже с черновиком: владелица попросила, чтобы на
# возражения бот вёл к заявке в Службу Заботы (см. responder.draft_content_answer).
DRAFT_CATEGORIES = {"content", "pricing", "personal", "objection"}

# Человекочитаемые ярлыки категорий (для карточек в Telegram).
CATEGORY_LABEL = {
    "tech": "🔧 Техвопрос",
    "org": "🗂 Организация",
    "pricing": "🟠 Цена/рассрочка",
    "objection": "🟡 Возражение",
    "content": "🔵 По теме",
    "personal": "🟣 Личный вопрос",
    "spam": "🚫 Спам",
    "other": "⚪️ Прочее",
    "greeting": "👋 Приветствие",
    "reaction": "➕ Реакция",
}

# Небольшой контекст последних сообщений на вебинар (для LLM). Живёт в рантайме.
_context: dict[str, list[str]] = {}


def _push_context(wid: str, text: str, limit: int = 5) -> list[str]:
    buf = _context.setdefault(wid, [])
    buf.append(text)
    if len(buf) > limit:
        del buf[:-limit]
    return list(buf)


async def handle_message(app: App, watcher, msg: ChatMessage) -> None:
    """Основная точка входа. Никогда не бросает исключение наружу."""
    try:
        await _handle(app, watcher, msg)
    except Exception:
        log.exception("Ошибка обработки сообщения %s", msg.hash)


async def _handle(app: App, watcher, msg: ChatMessage) -> None:
    wid = watcher.wid
    text = (msg.text or "").strip()
    if not text:
        return

    # (1) dedupe: если уже есть такая запись — выходим.
    already = app.db.execute(
        "SELECT 1 FROM messages WHERE webinar_id=? AND hash=?", (wid, msg.hash)
    ).fetchone()
    if already:
        return

    # (1.5) Сотрудник школы? Его комментарии (ответы зрителям и т.п.) НЕ
    # пересылаем как вопросы и НЕ копим в FAQ — только лог. Матч по стабильному
    # user_id из вёрстки ИЛИ по точному имени (управляется командой /staff).
    if store.is_staff(app.db, msg.author, msg.author_id):
        log.info("[%s] сотрудник %s (id=%s) — пропускаю: %s",
                 watcher.webinar.name, msg.author, msg.author_id, text[:50])
        store.record_message(
            app.db, webinar_id=wid, hash=msg.hash, author=msg.author, text=text,
            category="staff", confidence=1.0, decision="staff_ignored", answer=None,
        )
        return

    # Контекст последних сообщений (до классификации — включает текущее).
    context = _push_context(wid, text)

    # (2)+(3) классификация.
    cls = await classify(
        text, context[:-1], app.settings.deepseek_api_key, app.settings.deepseek_model
    )
    cat = cls.category
    log.info("[%s] %s (%.2f, %s): %s",
             watcher.webinar.name, cat, cls.confidence, cls.by, text[:60])

    # Запишем сообщение сразу (decision уточним ниже).
    decision = "logged"
    answer_sent: str | None = None

    # (6) FAQ-накопление для осмысленных вопросов.
    if cat in FAQ_CATEGORIES:
        try:
            store.upsert_faq(app.db, text, cat)
        except Exception:
            log.exception("Не удалось обновить FAQ-кластер")

    # (4) маршрутизация.
    if cat in ("greeting", "reaction"):
        decision = "ignored"

    elif cat == "spam":
        decision = "spam"
        if app.settings.flag_spam:
            await _safe_forward_spam(app, watcher, msg)

    elif cat in ("tech", "org"):
        if await _try_reuse_learned(app, watcher, msg, cat):
            decision = "suggested"
        else:
            decision, answer_sent = await _route_tech_org(app, watcher, msg, cat)

    elif cat in FORWARD_CATEGORIES:
        if await _try_reuse_learned(app, watcher, msg, cat):
            decision = "suggested"
        else:
            decision = await _route_forward(app, watcher, msg, cat, cls.confidence)

    else:
        if await _try_reuse_learned(app, watcher, msg, cat):
            decision = "suggested"
        else:
            decision = await _route_forward(app, watcher, msg, cat, cls.confidence)

    # (5) сохраняем итог.
    store.record_message(
        app.db,
        webinar_id=wid,
        hash=msg.hash,
        author=msg.author,
        text=text,
        category=cat,
        confidence=cls.confidence,
        decision=decision,
        answer=answer_sent,
    )


async def _try_reuse_learned(app: App, watcher, msg: ChatMessage, cat: str) -> bool:
    """Если похожий вопрос уже отвечали РУКАМИ (faq_store.auto_learn — см.
    tg_bridge._handle_owner_answer/on_send_draft), сразу предлагаем ту же
    формулировку вместо нового вызова LLM/подбора шаблона: дешевле и это
    реальный, проверенный командой текст. True — если предложили, вызывающий
    код тогда пропускает свой обычный путь (LLM-черновик/шаблон)."""
    from tg_bridge import forward_to_owner
    try:
        row = store.find_similar_approved(app.db, msg.text)
    except Exception:
        log.exception("Ошибка поиска обученного ответа")
        return False
    if not row:
        return False
    await forward_to_owner(app, watcher, msg, cat, draft=row["answer"],
                           draft_label="🔁 Похожий вопрос уже отвечали:")
    return True


async def _route_tech_org(app: App, watcher, msg: ChatMessage, cat: str):
    """tech/org → подбор шаблона. Возвращает (decision, answer_sent|None)."""
    from tg_bridge import forward_with_template  # ленивый импорт против циклов

    tm = await match_template(
        msg.text, cat, app.templates, msg.author,
        app.settings.deepseek_api_key, app.settings.deepseek_model,
    )

    can_auto = (
        app.mode == MODE_AUTO
        and app.settings.auto_answer
        and tm.template_id is not None
        and tm.confidence >= AUTO_CONFIDENCE
    )

    if can_auto:
        tpl = app.template_by_id(tm.template_id)
        if tpl and tpl.approved:
            text = render_template(tpl.answer, msg.author)
            ok, reason = await watcher.post(text, is_auto=True)
            if ok:
                log.info("[%s] авто-ответ шаблоном %s", watcher.webinar.name, tpl.id)
                return "auto_answered", text
            log.warning("[%s] авто-ответ не отправлен: %s", watcher.webinar.name, reason)

    # Иначе — пересылаем владельцу с предложением шаблона (кнопка отправит).
    await forward_with_template(app, watcher, msg, cat, tm)
    return "suggested", None


async def _route_forward(app: App, watcher, msg: ChatMessage, cat: str,
                         confidence: float) -> str:
    """pricing/objection/content/personal/other → карточка владельцу."""
    from tg_bridge import forward_to_owner

    draft: str | None = None
    if cat in DRAFT_CATEGORIES and app.knowledge:
        draft = await draft_content_answer(
            msg.text, app.knowledge, msg.author,
            app.settings.deepseek_api_key, app.settings.deepseek_model,
            category=cat, course_hint=course_hint_for_webinar(watcher.webinar.name),
        )

    await forward_to_owner(app, watcher, msg, cat, draft=draft)
    return "forwarded"


async def _safe_forward_spam(app: App, watcher, msg: ChatMessage) -> None:
    from tg_bridge import forward_spam_flag
    try:
        await forward_spam_flag(app, watcher, msg)
    except Exception:
        log.exception("Не удалось отправить флаг спама")
