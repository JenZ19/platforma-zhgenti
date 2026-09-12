"""Классификатор сообщений чата вебинара.

Двухступенчатый (как в reviews-bot):
  1. Эвристика (без сети) — мгновенно отсекает приветствия, реакции, спам.
  2. Если задан DEEPSEEK_API_KEY — спорное классифицирует LLM (один вызов,
     temperature 0, ответ строго JSON). Без ключа/при сбое — безопасный
     fallback «other» (то есть переслать владельцу, ничего не потерять).

Категории:
  tech      — звук/видео/запись/доступ (технические проблемы)
  org       — расписание, материалы, «как купить» БЕЗ вопроса о цене
  pricing   — цена, рассрочка, тарифы, стоимость
  objection — сомнения: «дорого», «не получится», «не уверен»
  content   — вопрос по теме вебинара
  personal  — личная ситуация зрителя
  spam      — реклама, ссылки, мусор
  greeting  — приветствие, город («привет», «добрый вечер», «Москва»)
  reaction  — голая реакция («+», «спасибо», эмодзи, «огонь»)
  other     — всё прочее / fallback при сбое LLM
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass

import httpx

log = logging.getLogger("classifier")

# Прямой API DeepSeek (не через OpenRouter). ПРОВЕРЕНО 2026-07-04 живым вызовом
# с реальным ключом: base_url без /v1, путь /chat/completions, авторизация
# Bearer — как у OpenAI. Источник спецификации: api-docs.deepseek.com.
URL = "https://api.deepseek.com/chat/completions"

# Категории, которые обрабатывает эвристика без LLM.
CAT_GREETING = "greeting"
CAT_REACTION = "reaction"
CAT_SPAM = "spam"
CAT_OTHER = "other"

ALL_CATEGORIES = (
    "tech", "org", "pricing", "objection", "content",
    "personal", "spam", "greeting", "reaction", "other",
)


@dataclass
class Classification:
    category: str
    confidence: float
    by: str            # "heuristic" | "llm" | "fallback"


# --- Эвристика ---------------------------------------------------------------

_GREETING_RE = re.compile(
    r"^(привет\w*|здрав\w*|добр(ый|ое|ого)\s+(день|вечер|утро)|доброго|хай|"
    r"всем\s+привет|доброе|здравствуйте|салют)\b",
    re.I,
)

# Голая реакция: только «+», эмодзи, короткая благодарность/восторг.
_REACTION_EXACT = {
    "+", "++", "+++", "спасибо", "спс", "благодарю", "класс", "огонь",
    "супер", "топ", "круто", "ясно", "понятно", "да", "нет", "ок", "окей",
    "🔥", "👍", "❤️", "👏", "🙏", "💥", "✨", "😍", "🥰",
}
_EMOJI_ONLY_RE = re.compile(
    r"^[\s\W_]*[\U0001F000-\U0001FAFF☀-➿←-⇿⬀-⯿]+[\s\W_]*$"
)
_PLUS_ONLY_RE = re.compile(r"^[\s+]+$")
_THANKS_RE = re.compile(r"^(спасибо|спс|благодар\w*|класс|огонь|супер|топ)[\s!.)+🔥👍❤️👏🙏]*$", re.I)

# Спам: ссылки, телега-каналы, явная реклама.
_SPAM_RE = re.compile(
    r"(https?://|www\.|t\.me/|@[a-z0-9_]{4,}|подпис\w*\s+на\s+(мой|наш)|"
    r"зараб\w+\s+от\s+\d|казино|ставк\w+\s+на\s+спорт|заработок\s+в\s+интернете)",
    re.I,
)

# Явные подсказки для «уверенных» технических/ценовых слов (ускоряют, но НЕ
# заменяют LLM — только помечают, что сообщение точно не приветствие/реакция).
_CITY_ONLY_RE = re.compile(
    r"^[\s,]*(москва|спб|санкт-петербург|питер|екатеринбург|новосибирск|"
    r"казань|краснодар|сочи|минск|киев|алматы|ташкент|тбилиси|из\s+\w+)[\s,!.]*$",
    re.I,
)


def heuristic(text: str) -> Classification | None:
    """Возвращает Classification, если эвристика уверена; иначе None (→ LLM)."""
    t = (text or "").strip()
    if not t:
        return Classification(CAT_REACTION, 1.0, "heuristic")

    low = t.lower()

    # Голые реакции.
    if low in _REACTION_EXACT or _PLUS_ONLY_RE.match(t) or _EMOJI_ONLY_RE.match(t) \
            or _THANKS_RE.match(t):
        return Classification(CAT_REACTION, 0.98, "heuristic")

    # Спам/ссылки.
    if _SPAM_RE.search(t):
        return Classification(CAT_SPAM, 0.9, "heuristic")

    # Приветствия и «город одним словом» (типичная просьба ведущего).
    if _GREETING_RE.match(t) or _CITY_ONLY_RE.match(t):
        # Но если в приветствии есть ещё и вопрос — пусть решает LLM.
        if "?" not in t and len(t) < 40:
            return Classification(CAT_GREETING, 0.95, "heuristic")

    # Очень короткое не-вопросное сообщение без содержания — реакция.
    if len(t) < 4 and "?" not in t:
        return Classification(CAT_REACTION, 0.8, "heuristic")

    return None


# --- LLM-классификация -------------------------------------------------------

_SYSTEM = (
    "Ты — модератор чата на онлайн-вебинаре онлайн-школы нейросетей SUBMARINE. "
    "Определи категорию сообщения зрителя, чтобы понять, как на него реагировать.\n"
    "Категории:\n"
    "- tech — техническая проблема: не слышно, не видно, звук/видео, запись, доступ, не грузит.\n"
    "- org — организационный вопрос: когда начало, сколько идёт, где материалы, будет ли запись, "
    "как задать вопрос, КАК КУПИТЬ/оставить заявку (но БЕЗ вопроса о конкретной цене).\n"
    "- pricing — вопрос о деньгах: цена, стоимость, сколько стоит, рассрочка, тарифы, скидка.\n"
    "- objection — сомнение или возражение: «дорого», «а вдруг не получится», «нет времени», "
    "«не уверен, что подойдёт», «уже пробовал — не вышло».\n"
    "- content — вопрос по теме вебинара (по сути того, что рассказывает спикер).\n"
    "- personal — личная ситуация зрителя, просьба совета под себя.\n"
    "- spam — реклама, ссылки на сторонние ресурсы, мусор.\n"
    "- greeting — приветствие или ответ ведущему (город, «привет», «здравствуйте»).\n"
    "- reaction — короткая реакция без вопроса: «+», «спасибо», «огонь», эмодзи.\n"
    "- other — всё, что не подошло.\n"
    "Учитывай контекст последних сообщений (даю ниже). Отвечай про ПОСЛЕДНЕЕ сообщение.\n"
    'Ответь СТРОГО JSON: {"category": "...", "confidence": 0.0-1.0}'
)


async def _llm_classify(
    text: str, context: list[str], api_key: str, model: str,
) -> Classification | None:
    """None — если LLM недоступен (решает fallback)."""
    ctx = "\n".join(f"- {c}" for c in context[-5:]) or "(нет предыдущих сообщений)"
    user = (
        f"Последние сообщения чата (контекст):\n{ctx}\n\n"
        f"КЛАССИФИЦИРУЙ ЭТО сообщение:\n«{text[:1500]}»"
    )
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": user},
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"},
        # ПРОВЕРЕНО 2026-07-04 живым вызовом: без этого флага deepseek-v4-flash
        # по умолчанию включает «размышление» (в ответе появляется
        # reasoning_content, +150-200 лишних токенов на каждую классификацию —
        # дороже и медленнее, а для простой категоризации не нужно).
        "thinking": {"type": "disabled"},
    }
    try:
        async with httpx.AsyncClient(timeout=30) as cli:
            r = await cli.post(URL, headers=headers, json=payload)
            r.raise_for_status()
            content = r.json()["choices"][0]["message"]["content"]
            m = re.search(r"\{.*\}", content, re.S)
            data = json.loads(m.group(0) if m else content)
            cat = str(data.get("category", CAT_OTHER)).lower().strip()
            conf = float(data.get("confidence", 0.5))
            if cat not in ALL_CATEGORIES:
                cat = CAT_OTHER
            return Classification(cat, conf, "llm")
    except Exception as e:
        log.warning("LLM-классификатор недоступен, fallback→other: %s", e)
        return None


async def classify(
    text: str,
    context: list[str],
    api_key: str,
    model: str,
) -> Classification:
    """Итоговая классификация одного сообщения.

    context — до 5 предыдущих сообщений чата (для LLM).
    """
    h = heuristic(text)
    if h is not None:
        return h

    if api_key:
        verdict = await _llm_classify(text, context, api_key, model)
        if verdict is not None:
            return verdict

    # Без ключа или при сбое — безопасно пересылаем владельцу.
    return Classification(CAT_OTHER, 0.3, "fallback")
