"""Хранилище на sqlite3 (stdlib): все сообщения, решения, ответы, FAQ-кластеры,
маппинг Telegram-ответов и dedup-хэши.

Одно соединение на процесс (app.db). WAL + synchronous=NORMAL, check_same_thread=False.
Запросы вызываем прямо в цикле — при паре записей на опрос это доли миллисекунды.
"""
from __future__ import annotations

import hashlib
import logging
import re
import sqlite3
import time
from pathlib import Path

log = logging.getLogger("faq")

HERE = Path(__file__).resolve().parent
DB_PATH = HERE / "data" / "moderator.db"

SCHEMA = """
-- Все сообщения чата вебинара + вердикт классификатора + принятое решение.
CREATE TABLE IF NOT EXISTS messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    webinar_id   TEXT    NOT NULL,
    hash         TEXT    NOT NULL,        -- синтетический стабильный id сообщения
    author       TEXT    NOT NULL DEFAULT '',
    text         TEXT    NOT NULL,
    category     TEXT    NOT NULL DEFAULT 'other',
    confidence   REAL    NOT NULL DEFAULT 0,
    decision     TEXT    NOT NULL DEFAULT '',   -- ignored|forwarded|auto_answered|suggested|spam
    answer       TEXT,                          -- что отправили в чат (если отправили)
    created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_messages_webinar ON messages(webinar_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS ux_messages_hash ON messages(webinar_id, hash);

-- Хэши уже виденных сообщений (dedup, переживает рестарт).
CREATE TABLE IF NOT EXISTS seen_hash (
    webinar_id   TEXT    NOT NULL,
    hash         TEXT    NOT NULL,
    created_at   INTEGER NOT NULL,
    PRIMARY KEY (webinar_id, hash)
);

-- Маппинг: на какое tg-сообщение владелец отвечает → куда постить.
CREATE TABLE IF NOT EXISTS reply_map (
    tg_message_id  INTEGER PRIMARY KEY,
    webinar_id     TEXT    NOT NULL,
    viewer_name    TEXT    NOT NULL DEFAULT '',
    src_msg_hash   TEXT    NOT NULL DEFAULT '',
    src_text       TEXT    NOT NULL DEFAULT '',
    kind           TEXT    NOT NULL DEFAULT 'card',   -- card | forceprompt
    created_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_reply_map_created ON reply_map(created_at);

-- Полезная нагрузка inline-кнопок (в callback_data кладём только int id).
CREATE TABLE IF NOT EXISTS cb_action (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    webinar_id   TEXT    NOT NULL,
    viewer_name  TEXT    NOT NULL DEFAULT '',
    src_msg_hash TEXT    NOT NULL DEFAULT '',
    src_text     TEXT    NOT NULL DEFAULT '',
    template_id  TEXT,
    draft_text   TEXT,                      -- черновик LLM (кнопка «Отправить черновик»)
    created_at   INTEGER NOT NULL
);

-- FAQ-кластеры: канонический вопрос + счётчик + (опц.) утверждённый ответ.
CREATE TABLE IF NOT EXISTS faq_cluster (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    canonical    TEXT    NOT NULL,          -- канонический вопрос кластера
    norm         TEXT    NOT NULL,          -- нормализованная форма (для похожести)
    category     TEXT    NOT NULL DEFAULT 'other',
    answer       TEXT,                       -- утверждённый ответ (если есть)
    approved     INTEGER NOT NULL DEFAULT 0, -- 0/1: одобрен ли как шаблон
    count        INTEGER NOT NULL DEFAULT 1,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_faq_norm ON faq_cluster(norm);

-- Сотрудники школы: их комментарии в чате НЕ пересылаются как вопросы зрителей.
-- Матчим по user_id (стабильный id из вёрстки GetCourse — надёжнее) ИЛИ по
-- нормализованному имени. Управляется командой /staff.
CREATE TABLE IF NOT EXISTS staff (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT,                       -- id пользователя GetCourse (может быть пустым)
    name_norm    TEXT    NOT NULL DEFAULT '',-- нормализованное имя (может быть пустым, если по id)
    label        TEXT    NOT NULL DEFAULT '',-- как показывать владельцу
    created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_staff_uid ON staff(user_id);
CREATE INDEX IF NOT EXISTS ix_staff_name ON staff(name_norm);

-- Кэш контактов учеников из GetCourse (ночная выгрузка через API, см.
-- sync_contacts.py). Джойним по user_id == data-user-id комментария → в карточке
-- кликабельный WhatsApp по телефону и Telegram по нику (если школа его собирает).
-- Только контактные поля; PII не разглашается — используется командой для связи
-- с уже задавшим вопрос зрителем.
CREATE TABLE IF NOT EXISTS contacts (
    user_id     TEXT    PRIMARY KEY,           -- id GetCourse (== data-user-id)
    phone       TEXT    NOT NULL DEFAULT '',   -- цифры в межд. формате (для wa.me)
    tg_username TEXT    NOT NULL DEFAULT '',   -- telegram-ник без @ (часто пусто)
    name        TEXT    NOT NULL DEFAULT '',
    updated_at  INTEGER NOT NULL
);
"""


# --- Инициализация -----------------------------------------------------------

def connect(path: Path | None = None) -> sqlite3.Connection:
    path = path or DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.executescript(SCHEMA)
    conn.commit()
    _migrate(conn)
    log.info("БД готова: %s", path)
    return conn


def _migrate(conn: sqlite3.Connection) -> None:
    """Точечные ALTER TABLE для баз, созданных до появления новых колонок.
    CREATE TABLE IF NOT EXISTS не добавляет колонки в уже существующую таблицу."""
    for sql in (
        "ALTER TABLE cb_action ADD COLUMN draft_text TEXT",
        "ALTER TABLE reply_map ADD COLUMN author_id TEXT DEFAULT ''",
    ):
        try:
            conn.execute(sql)
            conn.commit()
        except sqlite3.OperationalError:
            pass  # колонка уже есть — нормально
    _seed_staff(conn)


# Учебный starter не содержит имён и ID сотрудников. Свой список добавляют позже.
_STAFF_SEED: list[tuple[str | None, str]] = []


def _seed_staff(conn: sqlite3.Connection) -> None:
    """Заполняет staff начальными сотрудниками ТОЛЬКО если таблица пуста —
    чтобы не перетирать то, что команда добавила через /staff."""
    n = conn.execute("SELECT COUNT(*) c FROM staff").fetchone()["c"]
    if n:
        return
    ts = now_ts()
    for uid, label in _STAFF_SEED:
        conn.execute(
            "INSERT INTO staff(user_id, name_norm, label, created_at) VALUES (?,?,?,?)",
            (uid, normalize(label), label, ts),
        )
    conn.commit()
    log.info("staff: засеяно %d сотрудников", len(_STAFF_SEED))


def now_ts() -> int:
    return int(time.time())


# --- Dedup / сообщения -------------------------------------------------------

def synth_hash(author: str, text: str, bucket: str) -> str:
    """Стабильный хэш сообщения: автор + текст + позиционный ключ."""
    raw = f"{author}\x1f{text}\x1f{bucket}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def load_seen(conn: sqlite3.Connection, webinar_id: str, limit: int = 500) -> set[str]:
    rows = conn.execute(
        "SELECT hash FROM seen_hash WHERE webinar_id=? ORDER BY created_at DESC LIMIT ?",
        (webinar_id, limit),
    ).fetchall()
    return {r["hash"] for r in rows}


def last_seen_ts(conn: sqlite3.Connection, webinar_id: str) -> int:
    """Когда по этому вебинару в последний раз отмечали виденное сообщение
    (unix ts). 0 — если никогда. Нужно, чтобы отличить ПЕРЕПОДКЛЮЧЕНИЕ после
    рестарта (видели секунды/минуты назад) от ПЕРВОГО захода на свежий эфир."""
    row = conn.execute(
        "SELECT MAX(created_at) m FROM seen_hash WHERE webinar_id=?", (webinar_id,)
    ).fetchone()
    return int(row["m"]) if row and row["m"] is not None else 0


def mark_seen(conn: sqlite3.Connection, webinar_id: str, hashes: list[str]) -> None:
    if not hashes:
        return
    ts = now_ts()
    conn.executemany(
        "INSERT OR IGNORE INTO seen_hash(webinar_id, hash, created_at) VALUES (?,?,?)",
        [(webinar_id, h, ts) for h in hashes],
    )
    conn.commit()


def record_message(
    conn: sqlite3.Connection,
    *,
    webinar_id: str,
    hash: str,
    author: str,
    text: str,
    category: str,
    confidence: float,
    decision: str,
    answer: str | None = None,
) -> int:
    cur = conn.execute(
        """INSERT OR IGNORE INTO messages
           (webinar_id, hash, author, text, category, confidence, decision, answer, created_at)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (webinar_id, hash, author, text, category, confidence, decision, answer, now_ts()),
    )
    conn.commit()
    return cur.lastrowid or 0


def set_message_answer(conn: sqlite3.Connection, webinar_id: str, hash: str,
                       decision: str, answer: str) -> None:
    conn.execute(
        "UPDATE messages SET decision=?, answer=? WHERE webinar_id=? AND hash=?",
        (decision, answer, webinar_id, hash),
    )
    conn.commit()


# --- reply_map ---------------------------------------------------------------

def add_reply_map(conn: sqlite3.Connection, *, tg_message_id: int, webinar_id: str,
                  viewer_name: str, src_msg_hash: str, src_text: str,
                  kind: str = "card", author_id: str = "") -> None:
    conn.execute(
        """INSERT OR REPLACE INTO reply_map
           (tg_message_id, webinar_id, viewer_name, src_msg_hash, src_text, kind, author_id, created_at)
           VALUES (?,?,?,?,?,?,?,?)""",
        (tg_message_id, webinar_id, viewer_name, src_msg_hash, src_text, kind, author_id, now_ts()),
    )
    conn.commit()


def get_reply_map(conn: sqlite3.Connection, tg_message_id: int) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM reply_map WHERE tg_message_id=?", (tg_message_id,)
    ).fetchone()


# --- cb_action ---------------------------------------------------------------

def add_cb_action(conn: sqlite3.Connection, *, webinar_id: str, viewer_name: str,
                  src_msg_hash: str, src_text: str,
                  template_id: str | None = None,
                  draft_text: str | None = None) -> int:
    cur = conn.execute(
        """INSERT INTO cb_action
           (webinar_id, viewer_name, src_msg_hash, src_text, template_id, draft_text, created_at)
           VALUES (?,?,?,?,?,?,?)""",
        (webinar_id, viewer_name, src_msg_hash, src_text, template_id, draft_text, now_ts()),
    )
    conn.commit()
    return cur.lastrowid or 0


def get_cb_action(conn: sqlite3.Connection, cb_id: int) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM cb_action WHERE id=?", (cb_id,)).fetchone()


# --- FAQ-кластеры ------------------------------------------------------------

_norm_re = re.compile(r"[^\w\s]", re.U)
_ws_re = re.compile(r"\s+")

# Служебные слова, вычищаем при нормализации — иначе короткие вопросы вида
# «У вас есть скидка?» и «У вас есть запись?» ложно матчатся ДРУГ С ДРУГОМ
# только по общим у/вас/есть, а не по смыслу (поймано ревью 2026-07-09 —
# нашли конкретный сценарий, где так подставился бы чужой ответ в чат).
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
    """Грубая нормализация для эвристической похожести вопросов (без
    стоп-слов — см. _STOPWORDS)."""
    t = _norm_re.sub(" ", (text or "").lower())
    t = _ws_re.sub(" ", t).strip()
    tokens = [w for w in t.split() if w not in _STOPWORDS]
    return " ".join(tokens)


def _similar(a: str, b: str) -> float:
    """Жаккар по словам — дешёвый fallback без LLM."""
    sa, sb = set(a.split()), set(b.split())
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def upsert_faq(conn: sqlite3.Connection, question: str, category: str,
               threshold: float = 0.6, bump_count: bool = True) -> tuple[int, bool]:
    """Находит похожий кластер (эвристикой) и +1 к счётчику, либо создаёт новый.

    bump_count=False — если ЭТО ЖЕ физическое сообщение уже посчитано другим
    вызовом (см. auto_learn: пайплайн уже увеличил count на входе, второй раз
    считать не нужно — иначе один и тот же вопрос задваивался бы в счётчике).
    На создание НОВОГО кластера (первое появление) не влияет — там count
    всегда начинается с 1, это первый и единственный раз, когда его считают.

    Возвращает (cluster_id, is_new).
    """
    norm = normalize(question)
    if not norm:
        return 0, False
    best_id, best_score = None, 0.0
    for row in conn.execute("SELECT id, norm FROM faq_cluster").fetchall():
        s = _similar(norm, row["norm"])
        if s > best_score:
            best_id, best_score = row["id"], s

    ts = now_ts()
    if best_id is not None and best_score >= threshold:
        if bump_count:
            conn.execute(
                "UPDATE faq_cluster SET count=count+1, updated_at=? WHERE id=?",
                (ts, best_id),
            )
        else:
            conn.execute("UPDATE faq_cluster SET updated_at=? WHERE id=?", (ts, best_id))
        conn.commit()
        return best_id, False

    cur = conn.execute(
        """INSERT INTO faq_cluster (canonical, norm, category, count, created_at, updated_at)
           VALUES (?,?,?,1,?,?)""",
        (question.strip(), norm, category, ts, ts),
    )
    conn.commit()
    return cur.lastrowid or 0, True


def approve_faq(conn: sqlite3.Connection, cluster_id: int, answer: str) -> None:
    conn.execute(
        "UPDATE faq_cluster SET answer=?, approved=1, updated_at=? WHERE id=?",
        (answer, now_ts(), cluster_id),
    )
    conn.commit()


def list_faq(conn: sqlite3.Connection, approved_only: bool = True,
             limit: int = 30) -> list[sqlite3.Row]:
    q = "SELECT * FROM faq_cluster"
    if approved_only:
        q += " WHERE approved=1"
    q += " ORDER BY count DESC, updated_at DESC LIMIT ?"
    return conn.execute(q, (limit,)).fetchall()


def auto_learn(conn: sqlite3.Connection, question: str, category: str,
               answer: str) -> int:
    """Запоминает вопрос+ответ КАК УЖЕ ПРОВЕРЕННЫЙ (approved=1) — вызывается
    после каждого ответа, который команда написала САМА или приняла как есть
    (черновик LLM), отправляя его в чат вебинара руками. В отличие от
    /candidates (там нужно явное «➕ В FAQ» + утверждение), одобрение здесь уже
    состоялось самим фактом отправки в чат. Кластеризация — та же, что и у
    фоновых upsert_faq (Жаккар по словам, см. _similar).

    bump_count=False: это сообщение УЖЕ посчитано пайплайном на входе
    (pipeline._handle, шаг 6, FAQ_CATEGORIES) — второй раз считать не нужно
    (см. ревью 2026-07-09: без этого частые вопросы задваивались в счётчике).

    Если похожий кластер уже ОДОБРЕН чужим ответом — не перезаписываем его
    молча (см. ревью 2026-07-09: нечёткое совпадение по словам может свести
    два РАЗНЫХ вопроса в один кластер, и тихая перезапись стёрла бы верный
    проверенный ответ на первый вопрос ответом на второй). Обучаемся только
    на новых или ещё не одобренных кластерах — осознанно консервативно.

    Возвращает id кластера (0, если question/answer пустые)."""
    if not (question or "").strip() or not (answer or "").strip():
        return 0
    cluster_id, is_new = upsert_faq(conn, question, category, bump_count=False)
    if not cluster_id:
        return cluster_id
    if not is_new:
        row = conn.execute(
            "SELECT approved, answer FROM faq_cluster WHERE id=?", (cluster_id,)
        ).fetchone()
        if row and row["approved"] and (row["answer"] or "") != answer:
            return cluster_id  # чужой уже одобренный ответ — не трогаем
    approve_faq(conn, cluster_id, answer)
    return cluster_id


def find_similar_approved(conn: sqlite3.Connection, question: str,
                          threshold: float = 0.6,
                          min_shared_tokens: int = 2) -> sqlite3.Row | None:
    """Лучший ОДОБРЕННЫЙ faq-кластер, похожий на question. Позволяет
    переиспользовать реальный ответ команды вместо нового вызова LLM/шаблона.

    min_shared_tokens — доп. страховка сверх обычного Жаккар-порога: короткие
    вопросы (2-3 слова) могут случайно набрать высокий Жаккар-скор всего на
    1 общем слове (числитель и знаменатель оба маленькие). Требуем реальное
    пересечение содержательных слов, а не только высокий процент. None, если
    нет достаточно похожего."""
    norm = normalize(question)
    if not norm:
        return None
    q_tokens = set(norm.split())
    if not q_tokens:
        return None
    best_row, best_score = None, 0.0
    for row in conn.execute(
        "SELECT * FROM faq_cluster WHERE approved=1 AND answer IS NOT NULL AND answer!=''"
    ).fetchall():
        r_tokens = set((row["norm"] or "").split())
        shared = q_tokens & r_tokens
        if len(shared) < min_shared_tokens:
            continue
        s = len(shared) / len(q_tokens | r_tokens)
        if s > best_score:
            best_row, best_score = row, s
    return best_row if best_row is not None and best_score >= threshold else None


def list_candidates(conn: sqlite3.Connection, limit: int = 20) -> list[sqlite3.Row]:
    """Неутверждённые кластеры — кандидаты в FAQ, по убыванию частоты."""
    return conn.execute(
        "SELECT * FROM faq_cluster WHERE approved=0 ORDER BY count DESC, updated_at DESC LIMIT ?",
        (limit,),
    ).fetchall()


# --- Сотрудники (фильтр «не пересылать их комментарии») ----------------------

def is_staff(conn: sqlite3.Connection, author: str, user_id: str = "") -> bool:
    """True — если автор комментария сотрудник (по user_id ИЛИ точному имени).
    Матч по имени — ТОЛЬКО точное совпадение нормализованных форм (не подстрока),
    чтобы случайно не отфильтровать зрителя с похожим именем."""
    uid = (user_id or "").strip()
    if uid:
        row = conn.execute("SELECT 1 FROM staff WHERE user_id=? LIMIT 1", (uid,)).fetchone()
        if row:
            return True
    nm = normalize(author)
    if nm:
        row = conn.execute(
            "SELECT 1 FROM staff WHERE name_norm=? AND name_norm!='' LIMIT 1", (nm,)
        ).fetchone()
        if row:
            return True
    return False


def list_staff(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute("SELECT * FROM staff ORDER BY label").fetchall()


def add_staff(conn: sqlite3.Connection, label: str, user_id: str = "") -> bool:
    """Добавляет сотрудника. Возвращает True, если что-то реально изменилось.
    Логика:
      - если такой user_id уже есть → False (дубль);
      - если есть запись с этим ИМЕНЕМ, но БЕЗ id, а мы принесли id → дописываем
        id к ней (усиливаем: имя может смениться, id — нет) → True;
      - если уже матчится по имени/id → False;
      - иначе вставляем новую запись → True.
    """
    label = (label or "").strip()
    uid = (user_id or "").strip() or None
    nm = normalize(label)
    if not uid and not nm:
        return False

    if uid:
        exists = conn.execute("SELECT 1 FROM staff WHERE user_id=? LIMIT 1", (uid,)).fetchone()
        if exists:
            return False
        if nm:
            # Есть запись с этим именем без id? Допишем id к ней.
            row = conn.execute(
                "SELECT id FROM staff WHERE name_norm=? AND (user_id IS NULL OR user_id='') LIMIT 1",
                (nm,)).fetchone()
            if row:
                conn.execute("UPDATE staff SET user_id=? WHERE id=?", (uid, row["id"]))
                conn.commit()
                return True

    if is_staff(conn, label, uid or ""):
        return False

    conn.execute(
        "INSERT INTO staff(user_id, name_norm, label, created_at) VALUES (?,?,?,?)",
        (uid, nm, label or uid, now_ts()),
    )
    conn.commit()
    return True


def del_staff(conn: sqlite3.Connection, needle: str) -> int:
    """Удаляет сотрудника по точному имени (нормализ.) или по user_id. Возвращает
    число удалённых строк."""
    needle = (needle or "").strip()
    nm = normalize(needle)
    cur = conn.execute(
        "DELETE FROM staff WHERE user_id=? OR (name_norm=? AND name_norm!='')",
        (needle, nm),
    )
    conn.commit()
    return cur.rowcount


# --- Контакты учеников (кэш из GetCourse) ------------------------------------

def upsert_contact(conn: sqlite3.Connection, user_id: str, *, phone: str = "",
                   tg_username: str = "", name: str = "") -> None:
    uid = (user_id or "").strip()
    if not uid:
        return
    conn.execute(
        """INSERT INTO contacts(user_id, phone, tg_username, name, updated_at)
           VALUES (?,?,?,?,?)
           ON CONFLICT(user_id) DO UPDATE SET
               phone=excluded.phone, tg_username=excluded.tg_username,
               name=excluded.name, updated_at=excluded.updated_at""",
        (uid, phone or "", tg_username or "", name or "", now_ts()),
    )
    conn.commit()


def upsert_contacts_many(conn: sqlite3.Connection,
                         rows: list[tuple[str, str, str, str]]) -> int:
    """Пакетный апсерт. rows: (user_id, phone, tg_username, name). Пустые id
    пропускаются. Возвращает число обработанных строк."""
    ts = now_ts()
    data = [(uid.strip(), ph or "", tg or "", nm or "", ts)
            for (uid, ph, tg, nm) in rows if (uid or "").strip()]
    if not data:
        return 0
    conn.executemany(
        """INSERT INTO contacts(user_id, phone, tg_username, name, updated_at)
           VALUES (?,?,?,?,?)
           ON CONFLICT(user_id) DO UPDATE SET
               phone=excluded.phone, tg_username=excluded.tg_username,
               name=excluded.name, updated_at=excluded.updated_at""",
        data,
    )
    conn.commit()
    return len(data)


def get_contact(conn: sqlite3.Connection, user_id: str) -> sqlite3.Row | None:
    uid = (user_id or "").strip()
    if not uid:
        return None
    return conn.execute("SELECT * FROM contacts WHERE user_id=?", (uid,)).fetchone()


def contacts_count(conn: sqlite3.Connection) -> int:
    return conn.execute("SELECT COUNT(*) c FROM contacts").fetchone()["c"]


# --- Дайджест / статистика ---------------------------------------------------

def digest_stats(conn: sqlite3.Connection, webinar_id: str,
                 since_ts: int) -> dict:
    """Собирает цифры для дайджеста по одному вебинару с момента since_ts."""
    rows = conn.execute(
        "SELECT category, decision, text, author FROM messages "
        "WHERE webinar_id=? AND created_at>=?",
        (webinar_id, since_ts),
    ).fetchall()

    by_cat: dict[str, int] = {}
    auto = answered = 0
    unanswered: list[str] = []
    for r in rows:
        by_cat[r["category"]] = by_cat.get(r["category"], 0) + 1
        if r["decision"] == "auto_answered":
            auto += 1
        if r["decision"] in ("owner_answered", "template_sent"):
            answered += 1
        if r["decision"] in ("forwarded", "suggested") and r["category"] in (
            "pricing", "objection", "content", "personal", "other",
        ):
            unanswered.append(f"{r['author'] or '—'}: {r['text'][:80]}")

    return {
        "total": len(rows),
        "by_category": by_cat,
        "auto_answered": auto,
        "owner_answered": answered,
        "top_unanswered": unanswered[:5],
    }


def today_counts(conn: sqlite3.Connection) -> dict:
    """Счётчики за последние сутки — для /status."""
    since = now_ts() - 86400
    row = conn.execute(
        "SELECT COUNT(*) c, "
        "SUM(decision='auto_answered') auto, "
        "SUM(decision IN ('forwarded','suggested')) fwd "
        "FROM messages WHERE created_at>=?",
        (since,),
    ).fetchone()
    return {
        "total": row["c"] or 0,
        "auto": row["auto"] or 0,
        "forwarded": row["fwd"] or 0,
    }


def prune(conn: sqlite3.Connection, older_than_hours: int = 48) -> None:
    """Чистим маппинги и dedup-хэши старше N часов."""
    cutoff = now_ts() - older_than_hours * 3600
    conn.execute("DELETE FROM reply_map WHERE created_at<?", (cutoff,))
    conn.execute("DELETE FROM cb_action WHERE created_at<?", (cutoff,))
    conn.execute("DELETE FROM seen_hash WHERE created_at<?", (cutoff,))
    conn.commit()
