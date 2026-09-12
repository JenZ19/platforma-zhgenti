"""База знаний бота: загрузка файлов и лёгкий подбор релевантных кусков.

Источники:
  - `knowledge/база/` — основная база, все *.md и *.txt файлы (владелица
    сама кладёт туда файлы с любыми именами, бот перечитывает при старте);
  - KNOWLEDGE_DIR (.env) — необязательная legacy-папка со старыми
    конспектами `Конспект_*.md` (можно оставить пустым, чтобы отключить).

select_relevant() — простой офлайн-подбор кусков текста под вопрос зрителя,
без внешних зависимостей (эмбеддингов и т.п.): бьём документы на чанки по
заголовкам/абзацам и скорим пересечение токенов с вопросом.
"""
from __future__ import annotations

import logging
import math
import re
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger("knowledge")

# Ограничения на общий объём загрузки (НЕ промпта — в промпт всегда попадает
# только top-N кусков из select_relevant(), не больше max_chars). Это просто
# защита от совсем уж бесконтрольного роста папки; сырые транскрипты
# вебинаров (200-350k символов каждый) должны помещаться целиком.
PER_FILE_CAP = 500_000
TOTAL_CAP = 2_000_000

_PRIMARY_SUBDIR = ("knowledge", "база")


@dataclass
class Doc:
    """Один загруженный документ базы знаний."""
    source: str   # человекочитаемое имя (для пометки "[из ...]" в промпте)
    text: str


# --- Загрузка файлов ---------------------------------------------------------

def _read_capped(path: Path, cap: int) -> str | None:
    try:
        txt = path.read_text(encoding="utf-8")
    except Exception:
        log.warning("Не удалось прочитать файл базы знаний: %s", path)
        return None
    return txt[:cap]


def _load_dir(base: Path, patterns: tuple[str, ...]) -> list[Doc]:
    """Читает файлы по паттернам из одной папки (не рекурсивно), сортируя по имени."""
    if not base.exists() or not base.is_dir():
        return []
    files: list[Path] = []
    for pattern in patterns:
        files.extend(base.glob(pattern))
    seen: set[Path] = set()
    docs: list[Doc] = []
    for f in sorted(files, key=lambda p: p.name):
        if f in seen or not f.is_file():
            continue
        seen.add(f)
        if f.stem.upper().startswith("README"):
            continue
        txt = _read_capped(f, PER_FILE_CAP)
        if txt and txt.strip():
            docs.append(Doc(source=f.stem, text=txt))
    return docs


def load_docs(base_dir: Path, extra_dir: str | None) -> list[Doc]:
    """Собирает всю базу знаний: основная папка + (опционально) legacy-конспекты.

    base_dir — корень проекта (относительно него ищем `knowledge/база/`).
    extra_dir — путь к папке с legacy `Конспект_*.md` (может быть пустым/не
    существовать — тогда просто пропускаем).
    """
    docs: list[Doc] = []

    primary = base_dir.joinpath(*_PRIMARY_SUBDIR)
    docs.extend(_load_dir(primary, ("*.md", "*.txt")))

    if extra_dir:
        extra_path = Path(extra_dir)
        if not extra_path.is_absolute():
            extra_path = (base_dir / extra_dir).resolve()
        if extra_path.exists() and extra_path.is_dir():
            docs.extend(_load_dir(extra_path, ("Конспект_*.md",)))

    # Общий предел суммарного объёма.
    capped: list[Doc] = []
    total = 0
    for d in docs:
        if total >= TOTAL_CAP:
            break
        remaining = TOTAL_CAP - total
        text = d.text[:remaining]
        capped.append(Doc(source=d.source, text=text))
        total += len(text)

    if capped:
        log.info("База знаний загружена: %d файлов, %d символов", len(capped), total)
    else:
        log.info("База знаний пуста (knowledge/база/ и KNOWLEDGE_DIR не дали файлов)")
    return capped


# --- Подбор релевантных кусков -----------------------------------------------

# Заголовки markdown уровня 1-3 — по ним режем документ на секции.
_HEADER_RE = re.compile(r"^#{1,3}\s+.+$", re.MULTILINE)
_WORD_RE = re.compile(r"[а-яёa-z0-9]+", re.IGNORECASE)

_CHUNK_MIN = 300
_CHUNK_MAX = 1200
# Куски крупнее этого (например, абзац из сырого транскрипта без пустых строк
# внутри) режем ещё мельче — иначе один гигантский кусок искусственно выигрывает
# скоринг (больше слов — больше шанс пересечься с вопросом) и займёт весь
# max_chars бюджет в select_relevant, вытеснив более точные куски других файлов.
# Равен _CHUNK_MAX (не больше), чтобы чанки из сырых транскриптов и из
# курированных файлов были примерно одного порядка размера — иначе даже с
# нормализацией скора ниже длинные куски всё равно немного в выигрыше.
_HARD_CEILING = _CHUNK_MAX


def _split_oversized(text: str, limit: int) -> list[str]:
    """Режет большой кусок помельче: сперва по одиночным переносам строк
    (реплики транскрипта обычно на своих строках), копя до limit; если и
    отдельная строка длиннее limit — режем её на равные окна."""
    if len(text) <= limit:
        return [text]

    lines = [ln for ln in text.split("\n") if ln.strip()]
    if not lines:
        return [text[i:i + limit] for i in range(0, len(text), limit)]

    pieces: list[str] = []
    buf = ""
    for line in lines:
        candidate = f"{buf}\n{line}" if buf else line
        if len(candidate) > limit:
            if buf:
                pieces.append(buf)
            if len(line) > limit:
                pieces.extend(line[i:i + limit] for i in range(0, len(line), limit))
                buf = ""
            else:
                buf = line
        else:
            buf = candidate
    if buf:
        pieces.append(buf)
    return pieces


def _split_into_chunks(text: str) -> list[str]:
    """Режет текст документа на чанки: сперва по заголовкам, иначе по пустым
    строкам (абзацы). Соседние мелкие куски склеиваются до целевого размера.
    """
    raw_parts: list[str] = []

    if _HEADER_RE.search(text):
        # Разбиваем так, чтобы заголовок остался в начале следующего куска.
        indices = [m.start() for m in _HEADER_RE.finditer(text)]
        bounds = [0] + indices if indices[0] != 0 else indices
        bounds = sorted(set(bounds))
        for i, start in enumerate(bounds):
            end = bounds[i + 1] if i + 1 < len(bounds) else len(text)
            part = text[start:end].strip()
            if part:
                raw_parts.append(part)
    else:
        raw_parts = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]

    if not raw_parts:
        raw_parts = [text.strip()] if text.strip() else []

    # Раздутые куски (сплошной транскрипт почти без пустых строк) режем мельче.
    expanded: list[str] = []
    for part in raw_parts:
        expanded.extend(_split_oversized(part, _HARD_CEILING))
    raw_parts = expanded

    # Склеиваем мелкие соседние куски до целевого диапазона размера.
    merged: list[str] = []
    buf = ""
    for part in raw_parts:
        candidate = f"{buf}\n\n{part}" if buf else part
        if len(buf) >= _CHUNK_MIN or len(candidate) > _CHUNK_MAX:
            if buf:
                merged.append(buf)
            buf = part
        else:
            buf = candidate
    if buf:
        merged.append(buf)

    return merged


def _tokenize(text: str) -> list[str]:
    return [w.lower() for w in _WORD_RE.findall(text)]


def _crop(token: str) -> str:
    """Лёгкий стемминг для русского: длинные токены обрезаем до первых 5 букв,
    чтобы «курсе»/«курса»/«курсу» и т.п. схлопывались в один «токен»."""
    return token[:5] if len(token) > 5 else token


def _score_chunk(question_tokens_cropped: list[str], question_tokens_full: set[str],
                  chunk: str) -> float:
    chunk_tokens = [t for t in _tokenize(chunk) if len(t) > 3]
    if not chunk_tokens:
        return 0.0
    chunk_cropped = [_crop(t) for t in chunk_tokens]
    chunk_full = set(chunk_tokens)

    raw = 0.0
    q_cropped_counter = question_tokens_cropped
    for cropped in chunk_cropped:
        if cropped in q_cropped_counter:
            raw += 1
    for full in chunk_full:
        if full in question_tokens_full:
            raw += 0.5

    # Нормировка по объёму куска: без неё длинные куски (сырые транскрипты)
    # выигрывают у коротких точных (курированная база) просто за счёт большего
    # числа слов — больше шансов случайно пересечься с вопросом, даже если по
    # теме кусок размыт. sqrt — мягкая нормировка: кусок с реально высокой
    # плотностью совпадений всё ещё побеждает, но объём сам по себе перестаёт
    # быть преимуществом.
    return raw / math.sqrt(len(chunk_tokens))


def select_relevant(question: str, docs: list[Doc], max_chars: int = 8000) -> str:
    """Подбирает наиболее релевантные вопросу куски из документов базы знаний.

    Простая офлайн-эвристика (без эмбеддингов): режем документы на чанки,
    считаем пересечение "обрезанных" (лёгкий стемминг) токенов вопроса и
    чанка + бонус за точное совпадение полного токена. Берём чанки с лучшим
    скором, пока не наберём max_chars, каждый с пометкой источника.

    Если ни один чанк не набрал скор >0 — отдаём начало первого документа
    (лучше что-то, чем пустой промпт).
    """
    if not docs:
        return ""

    q_tokens_all = [t for t in _tokenize(question) if len(t) > 3]
    q_tokens_cropped = [_crop(t) for t in q_tokens_all]
    q_tokens_full = set(q_tokens_all)

    scored: list[tuple[float, str, str]] = []  # (score, source, chunk_text)
    for doc in docs:
        for chunk in _split_into_chunks(doc.text):
            score = _score_chunk(q_tokens_cropped, q_tokens_full, chunk)
            scored.append((score, doc.source, chunk))

    if not scored:
        return ""

    scored.sort(key=lambda x: x[0], reverse=True)

    if scored[0][0] <= 0:
        # Ничего не совпало по смыслу — берём начало первого документа.
        first = docs[0]
        text = first.text[:max_chars]
        return f"[из {first.source}]\n{text}" if text else ""

    out: list[str] = []
    total = 0
    for score, source, chunk in scored:
        if score <= 0:
            break
        piece = f"[из {source}]\n{chunk}"
        if total and total + len(piece) + 2 > max_chars:
            continue
        if len(piece) > max_chars and not out:
            piece = piece[:max_chars]
        elif total + len(piece) + 2 > max_chars:
            break
        out.append(piece)
        total += len(piece) + 2
        if total >= max_chars:
            break

    return "\n\n".join(out)
