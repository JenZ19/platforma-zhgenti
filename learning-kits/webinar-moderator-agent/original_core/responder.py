"""Подбор ответов на вопросы зрителей чата вебинара.

Два независимых сценария:
  1. tech/org-вопросы — сверяем с УТВЕРЖДЁННЫМИ (approved) шаблонами из
     knowledge/templates.yaml. Только такой шаблон можно когда-либо
     отправить автоматически (см. match_template). Отдельно top_templates
     отдаёт короткий список кандидатов для ручного выбора модератором
     (кнопка «📋 Шаблон») — без обращения к LLM, чистая эвристика.
  2. content/pricing/personal-вопросы — шаблонов нет, поэтому
     draft_content_answer просит LLM набросать короткий черновик ответа
     на основе релевантных кусков базы знаний (knowledge.select_relevant),
     который владелец правит и шлёт сам.

Как и классификатор: без DEEPSEEK_API_KEY или при сбое сети — тихий,
безопасный fallback (None / TemplateMatch с by="none"), никаких исключений
наружу.
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass

import httpx

from config import Template
from context import render_template
from knowledge import Doc, select_relevant

log = logging.getLogger("responder")

# Токен, которым LLM должен ответить, если выдержки не покрывают вопрос.
NO_ANSWER_TOKEN = "НЕТ_ОТВЕТА_В_БАЗЕ"

# Прямой API DeepSeek — см. подробности в classifier.py.
URL = "https://api.deepseek.com/chat/completions"


# --- Результат подбора шаблона -----------------------------------------------

@dataclass
class TemplateMatch:
    """Итог сопоставления вопроса зрителя с утверждённым шаблоном."""
    template_id: str | None
    confidence: float
    answer_preview: str       # уже отрендеренный текст (render_template)
    by: str                   # "llm" | "heuristic" | "none"


# --- Вызовы LLM ---------------------------------------------------------------

async def _call_llm(system: str, user: str, api_key: str, model: str) -> dict | None:
    """JSON-вариант вызова LLM (как в classifier.py). None — если LLM недоступен."""
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "thinking": {"type": "disabled"},  # см. classifier.py — без этого лишние токены на "размышление"
    }
    try:
        async with httpx.AsyncClient(timeout=30) as cli:
            r = await cli.post(URL, headers=headers, json=payload)
            r.raise_for_status()
            content = r.json()["choices"][0]["message"]["content"]
            m = re.search(r"\{.*\}", content, re.S)
            return json.loads(m.group(0) if m else content)
    except Exception as e:
        log.warning("LLM недоступен: %s", e)
        return None


async def _call_llm_text(system: str, user: str, api_key: str, model: str) -> str | None:
    """Текстовый (не-JSON) вариант вызова LLM — для черновика ответа по контенту."""
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0,
        # см. комментарий в _call_llm выше — без provider-фильтра
    }
    try:
        async with httpx.AsyncClient(timeout=30) as cli:
            r = await cli.post(URL, headers=headers, json=payload)
            r.raise_for_status()
            content = r.json()["choices"][0]["message"]["content"]
            return content.strip()
    except Exception as e:
        log.warning("LLM недоступен: %s", e)
        return None


# --- Эвристика подсчёта релевантности ----------------------------------------

def _score(question: str, template: Template) -> int:
    """Грубый скор релевантности шаблона вопросу: срабатывания триггеров +
    лёгкое пересечение токенов. Чем больше — тем лучше подходит шаблон.
    """
    low_q = question.lower()
    hits = 0

    # Основной сигнал — сколько триггеров шаблона встречается в тексте вопроса.
    for trig in template.triggers:
        trig = trig.strip().lower()
        if trig and trig in low_q:
            hits += 1

    # Лёгкая добавка — пересечение слов вопроса со словами самого ответа шаблона
    # (когда в триггерах не всё предусмотрено, а формулировка вопроса близка
    # к теме шаблона).
    q_tokens = {w for w in re.findall(r"[а-яёa-z0-9]+", low_q) if len(w) > 3}
    a_tokens = {w for w in re.findall(r"[а-яёa-z0-9]+", template.answer.lower()) if len(w) > 3}
    overlap = len(q_tokens & a_tokens)
    if overlap:
        hits += 1 if overlap < 3 else 2

    return hits


# --- Публичное API -------------------------------------------------------------

async def match_template(
    question: str,
    category: str,
    templates: list[Template],
    viewer_name: str,
    api_key: str,
    model: str,
) -> TemplateMatch:
    """Подбирает ОДИН утверждённый шаблон под вопрос — единственный источник
    для авто-ответа (mode=auto). Если подходящего нет — TemplateMatch(None, ...).
    """
    candidates = [t for t in templates if t.category == category and t.approved]
    if not candidates:
        return TemplateMatch(None, 0.0, "", "none")

    # --- Пробуем LLM, если есть ключ ---
    if api_key:
        system = (
            "Ты помогаешь модератору вебинара. Дан вопрос зрителя и список "
            "утверждённых шаблонов ответов (id + примеры вопросов + текст). "
            "Выбери ОДИН шаблон, который точно и уместно отвечает на вопрос, "
            "либо none, если ни один не подходит по смыслу. Не выбирай шаблон "
            "«на всякий случай».\n"
            'Ответь СТРОГО JSON: {"template_id": "..."|null, "confidence": 0.0-1.0}'
        )
        compact = [
            {"id": t.id, "triggers": t.triggers, "answer": t.answer}
            for t in candidates
        ]
        user = (
            f"Вопрос зрителя:\n«{question[:1500]}»\n\n"
            f"Утверждённые шаблоны (JSON):\n{json.dumps(compact, ensure_ascii=False)}"
        )
        data = await _call_llm(system, user, api_key, model)
        if data is not None:
            raw_id = data.get("template_id")
            tid = str(raw_id).strip() if raw_id else ""
            conf = float(data.get("confidence", 0.0) or 0.0)
            chosen = next((t for t in candidates if t.id == tid), None) if tid else None
            if chosen is not None:
                preview = render_template(chosen.answer, viewer_name)
                return TemplateMatch(chosen.id, conf, preview, "llm")
            return TemplateMatch(None, 0.0, "", "none")
        # data is None → LLM недоступен, падаем в эвристику ниже.

    # --- Эвристический fallback (нет ключа или сбой LLM) ---
    best: Template | None = None
    best_hits = 0
    for t in candidates:
        hits = _score(question, t)
        if hits > best_hits:
            best_hits = hits
            best = t

    if best is None or best_hits == 0:
        return TemplateMatch(None, 0.0, "", "none")

    confidence = min(0.9, 0.4 + 0.2 * best_hits)
    preview = render_template(best.answer, viewer_name)
    return TemplateMatch(best.id, confidence, preview, "heuristic")


async def top_templates(
    question: str,
    category: str,
    templates: list[Template],
    viewer_name: str,
    k: int = 3,
) -> list[Template]:
    """До k лучших утверждённых шаблонов категории для меню «📋 Шаблон»
    (ручной выбор модератором). Без LLM — чистая эвристика по _score.
    """
    approved = [t for t in templates if t.category == category and t.approved]
    if not approved:
        return []

    ranked = sorted(approved, key=lambda t: _score(question, t), reverse=True)
    top = ranked[:k]

    # Если approved-шаблонов в категории меньше k — добираем оставшимися
    # утверждёнными шаблонами той же категории (без повторов).
    if len(top) < k:
        chosen_ids = {t.id for t in top}
        for t in approved:
            if len(top) >= k:
                break
            if t.id not in chosen_ids:
                top.append(t)
                chosen_ids.add(t.id)

    return top


async def draft_content_answer(
    question: str,
    docs: list[Doc],
    viewer_name: str,
    api_key: str,
    model: str,
    category: str = "content",
    course_hint: str | None = None,
) -> str | None:
    """Черновик ответа на вопрос (по теме вебинара, цене/рассрочке, возражение
    или личный) на основе базы знаний (docs). Только предложение для владельца
    — не для авто-отправки. None, если нечем отвечать, база не покрывает
    вопрос или LLM недоступен.

    category — влияет на CTA: у objection следующий шаг — заявка в Службу
    Заботы (а не общий «узнайте больше»), у остальных — мягкая продажа.
    course_hint — профильный курс ЭТОГО эфира (см. context.course_hint_for_webinar),
    чтобы черновик ссылался на конкретный курс, а не на школу вообще.
    """
    if not api_key or not docs:
        return None

    excerpts = select_relevant(question, docs)
    if not excerpts.strip():
        return None

    if category == "objection":
        cta_rule = (
            "Зритель сомневается/возражает. Ответь с уважением к его сомнению — "
            "не спорь и не дави, признай, что опасение обосновано, и мягко сними "
            "его фактом из выдержек. Следующий шаг — предложи оставить заявку "
            "в Службу Заботы, чтобы разобрать его ситуацию персонально (без "
            "нажима, одной фразой)."
        )
    else:
        cta_rule = (
            "Ответ не должен быть чисто справочным — после честного ответа по "
            "существу ОДНИМ коротким предложением мягко, без нажима подведи к "
            "следующему шагу (заявка, тариф, демо-доступ — только если это "
            "реально есть в выдержках)."
        )

    course_line = (
        f"Этот вебинар — про курс {course_hint}: если уместно, ссылайся именно "
        f"на него, а не на школу вообще.\n"
        if course_hint else ""
    )

    system = (
        "Ты — помощник модератора вебинара онлайн-школы SUBMARINE. Твоя задача — "
        "набросать КОРОТКИЙ черновик ответа (2-4 предложения) на вопрос зрителя.\n"
        "Общайся очень уважительно и по-доброму, как с новичком, который только "
        "начинает разбираться в теме — без снисходительности и без сложного "
        "жаргона, простыми словами.\n"
        "Опирайся ТОЛЬКО на предоставленные ниже выдержки из базы знаний. "
        "НИКОГДА не выдумывай факты, которых нет в выдержках.\n"
        f"{course_line}"
        f"{cta_rule} Никакой искусственной срочности, скидок или сроков, которых "
        "нет в выдержках — продажа должна звучать как совет, а не как реклама.\n"
        f"Если выдержки не покрывают вопрос — ответь ровно одним словом: "
        f"{NO_ANSWER_TOKEN} (без пояснений и кавычек). Помни: это черновик, "
        "который владелец проверит и может отредактировать перед отправкой, "
        "а не готовый ответ зрителю."
    )
    user = (
        f"Вопрос зрителя:\n«{question[:1500]}»\n\n"
        f"Выдержки из базы знаний:\n{excerpts}"
    )

    try:
        draft = await _call_llm_text(system, user, api_key, model)
        if not draft:
            return None
        if NO_ANSWER_TOKEN in draft:
            return None
        return draft
    except Exception as e:
        log.warning("Не удалось получить черновик ответа: %s", e)
        return None
