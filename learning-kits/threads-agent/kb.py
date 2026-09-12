"""SQLite-база знаний threads-agent (WAL)."""
from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    source TEXT NOT NULL,
    url TEXT NOT NULL,
    published_at TEXT,
    fetched_at TEXT NOT NULL,
    title TEXT,
    text TEXT,
    own INTEGER NOT NULL DEFAULT 0,
    kind TEXT NOT NULL,
    used_at TEXT,
    UNIQUE(channel, url)
);
CREATE TABLE IF NOT EXISTS facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    text TEXT NOT NULL,
    added_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    hook TEXT NOT NULL,
    full_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent'
);
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
);
CREATE INDEX IF NOT EXISTS idx_items_channel ON items(channel);
CREATE INDEX IF NOT EXISTS idx_history_channel ON history(channel);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_column(conn, table, column, decl) -> None:
    """Идемпотентная миграция: добавляет колонку, если её ещё нет. Нужна для
    боевых БД, созданных до появления колонки в SCHEMA (CREATE TABLE IF NOT
    EXISTS не трогает уже существующие таблицы)."""
    cols = [r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")


def _migrate_items_unique(conn) -> bool:
    """Старая схема держала UNIQUE на одном url: пост из общего источника
    Один общий источник раньше доставался ПЕРВОМУ каналу, остальные
    его не видели. Пересобираем таблицу на UNIQUE(channel, url)."""
    row = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='items'").fetchone()
    if not row or "UNIQUE(channel, url)" in row[0]:
        return False
    conn.executescript("""
        BEGIN;
        CREATE TABLE items_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel TEXT NOT NULL,
            source TEXT NOT NULL,
            url TEXT NOT NULL,
            published_at TEXT,
            fetched_at TEXT NOT NULL,
            title TEXT,
            text TEXT,
            own INTEGER NOT NULL DEFAULT 0,
            kind TEXT NOT NULL,
            used_at TEXT,
            UNIQUE(channel, url)
        );
        INSERT INTO items_new(id,channel,source,url,published_at,fetched_at,title,text,own,kind,used_at)
            SELECT id,channel,source,url,published_at,fetched_at,title,text,own,kind,used_at FROM items;
        DROP TABLE items;
        ALTER TABLE items_new RENAME TO items;
        CREATE INDEX IF NOT EXISTS idx_items_channel ON items(channel);
        COMMIT;
    """)
    return True


def connect(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript(SCHEMA)
    _ensure_column(conn, "history", "status", "TEXT NOT NULL DEFAULT 'sent'")
    # used_at — отметка, что материал уже ушёл в генерацию (нужна очереди
    # сценариев из Google-таблицы: каждый сценарий берём ровно один раз).
    _ensure_column(conn, "items", "used_at", "TEXT")
    _migrate_items_unique(conn)
    conn.commit()
    return conn


def add_item(conn, *, channel, source, url, published_at, title, text, own, kind) -> bool:
    try:
        conn.execute(
            "INSERT INTO items(channel,source,url,published_at,fetched_at,title,text,own,kind)"
            " VALUES(?,?,?,?,?,?,?,?,?)",
            (channel, source, url, published_at, _now(), title, text, 1 if own else 0, kind),
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError as e:
        # Возвращаем False только для дубля (UNIQUE constraint по channel+url;
        # в старых базах — по одному url)
        if "UNIQUE" in str(e) and "items.url" in str(e):
            return False
        # Остальные ошибки (NOT NULL, etc.) — re-raise для видимости в коде вызывающего
        raise


def has_item(conn, url, channel=None) -> bool:
    """Есть ли материал. Без channel — по всей базе (старое поведение),
    с channel — в рамках канала: один и тот же пост живёт в каждом канале свой."""
    if channel is None:
        row = conn.execute("SELECT 1 FROM items WHERE url=?", (url,)).fetchone()
    else:
        row = conn.execute("SELECT 1 FROM items WHERE url=? AND channel=?",
                           (url, channel)).fetchone()
    return row is not None


def get_fresh_items(conn, channel, hours=48) -> list[dict]:
    """Свежие материалы для новостных веток. Сценарии из таблицы (kind='sheet')
    сюда НЕ попадают: у них своя очередь (get_scripts), они не новости и не
    протухают через 48 часов."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    rows = conn.execute(
        "SELECT channel,source,url,published_at,title,text,own,kind FROM items"
        " WHERE channel=? AND kind!='sheet' AND COALESCE(published_at, fetched_at) >= ?"
        " ORDER BY COALESCE(published_at, fetched_at) DESC",
        (channel, cutoff),
    ).fetchall()
    return [dict(r) for r in rows]


def get_scripts(conn, channel, limit=20) -> list[dict]:
    """Очередь неиспользованных сценариев из Google-таблицы, старые первыми."""
    rows = conn.execute(
        "SELECT id,channel,source,url,published_at,title,text,own,kind FROM items"
        " WHERE channel=? AND kind='sheet' AND used_at IS NULL"
        " ORDER BY id ASC LIMIT ?",
        (channel, int(limit)),
    ).fetchall()
    return [dict(r) for r in rows]


def mark_items_used(conn, ids) -> int:
    """Пометить материалы использованными (идемпотентно: повтор не считаем)."""
    ids = [int(i) for i in ids]
    if not ids:
        return 0
    q = ",".join("?" * len(ids))
    cur = conn.execute(
        f"UPDATE items SET used_at=? WHERE id IN ({q}) AND used_at IS NULL",
        [_now(), *ids],
    )
    conn.commit()
    return cur.rowcount


def count_scripts(conn, channel) -> tuple[int, int]:
    """(сколько сценариев в очереди, сколько всего) по каналу."""
    row = conn.execute(
        "SELECT SUM(used_at IS NULL) AS free, COUNT(*) AS total FROM items"
        " WHERE channel=? AND kind='sheet'",
        (channel,),
    ).fetchone()
    return int(row["free"] or 0), int(row["total"] or 0)


def add_fact(conn, channel, text) -> None:
    conn.execute("INSERT INTO facts(channel,text,added_at) VALUES(?,?,?)",
                 (channel, text, _now()))
    conn.commit()


def get_facts(conn, channel) -> list[dict]:
    rows = conn.execute(
        "SELECT id,channel,text,added_at FROM facts WHERE channel=? ORDER BY id DESC",
        (channel,),
    ).fetchall()
    return [dict(r) for r in rows]


def add_history(conn, channel, hook, full_text) -> int:
    cur = conn.execute("INSERT INTO history(channel,sent_at,hook,full_text) VALUES(?,?,?,?)",
                       (channel, _now(), hook, full_text))
    conn.commit()
    return cur.lastrowid


def set_history_status(conn, history_id: int, status: str) -> None:
    conn.execute("UPDATE history SET status=? WHERE id=?", (status, history_id))
    conn.commit()


def get_recent_hooks(conn, channel, days=60) -> list[str]:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    rows = conn.execute(
        "SELECT DISTINCT hook FROM history WHERE channel=? AND (sent_at>=? OR status='posted')"
        " ORDER BY sent_at DESC",
        (channel, cutoff),
    ).fetchall()
    return [r["hook"] for r in rows]


def set_meta(conn, key, value) -> None:
    conn.execute(
        "INSERT INTO meta(key,value) VALUES(?,?) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, str(value)),
    )
    conn.commit()


def get_meta(conn, key, default=None):
    row = conn.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
    return row["value"] if row else default


def purge_old_items(conn, days=90) -> int:
    """Чистка старых материалов. Неиспользованные сценарии из таблицы не трогаем:
    очередь может быть длиннее 90 дней, а выкинутый сценарий пропадёт навсегда."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    cur = conn.execute(
        "DELETE FROM items WHERE fetched_at < ?"
        " AND NOT (kind='sheet' AND used_at IS NULL)", (cutoff,))
    conn.commit()
    return cur.rowcount
