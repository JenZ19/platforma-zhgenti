"""Очищенная учебная выдержка из faq_store.py оригинального бота.

Сохраняет нормализацию, Жаккарово сходство и защиту от совпадения
по одному общему слову. SQLite, контакты и приватные seed-данные не
перенесены: учебной проверке нужны только чистые правила.
"""
from __future__ import annotations

import re

_norm_re = re.compile(r"[^\w\s]", re.U)
_ws_re = re.compile(r"\s+")

_STOPWORDS = {
    "у", "вас", "вам", "вы", "мы", "нас", "нам", "я", "мне", "меня", "он", "она", "они",
    "а", "и", "или", "но", "да", "нет", "не", "ли", "же", "то", "это", "этот", "эта", "эти",
    "в", "во", "на", "с", "со", "к", "ко", "по", "из", "за", "от", "до", "для",
    "о", "об", "обо", "при", "про", "над", "под", "между",
    "что", "как", "какой", "какая", "какие", "каком", "когда", "где", "куда", "кто", "чей",
    "есть", "будет", "был", "была", "были", "быть", "можно", "нужно", "надо",
    "просто", "уже", "ещё", "еще", "тоже", "также", "только", "именно",
}


def normalize(text: str) -> str:
    t = _norm_re.sub(" ", (text or "").lower())
    t = _ws_re.sub(" ", t).strip()
    return " ".join(word for word in t.split() if word not in _STOPWORDS)


def similarity(a: str, b: str) -> float:
    left, right = set(a.split()), set(b.split())
    if not left or not right:
        return 0.0
    return len(left & right) / len(left | right)


def find_similar_approved(question: str, faq: list[dict], threshold: float = 0.6,
                          min_shared_tokens: int = 2) -> dict | None:
    normalized = normalize(question)
    question_tokens = set(normalized.split())
    best, best_score = None, 0.0
    for row in faq:
        if not row.get("approved") or not row.get("answer"):
            continue
        row_tokens = set(normalize(str(row.get("question", ""))).split())
        shared = question_tokens & row_tokens
        if len(shared) < min_shared_tokens:
            continue
        score = len(shared) / len(question_tokens | row_tokens)
        if score > best_score:
            best, best_score = row, score
    return best if best is not None and best_score >= threshold else None
