"""Офлайн-проверка оригинальных правил формата и SQLite-хранилища."""
from __future__ import annotations

import argparse
import json
import socket
from pathlib import Path

import compose
import kb

KIT_ROOT = Path(__file__).resolve().parent


FIXED_MODEL_RESPONSE = json.dumps(
    {
        "threads": [
            {
                "text": (
                    "Мы сократили подготовку еженедельного плана с 50 до 20 минут.\n\n"
                    "Для учебного примера мы сначала записали три задачи, а затем "
                    "собрали их в один черновик. Это фиксированный текст, а не ответ ИИ."
                )
            }
        ]
    },
    ensure_ascii=False,
)


def run(work_dir: Path) -> dict:
    work_dir.mkdir(parents=True, exist_ok=True)
    db_path = work_dir / "study.sqlite3"
    if db_path.exists():
        raise FileExistsError(f"Не перезаписываю существующую базу: {db_path}")

    original_socket = socket.socket

    def _network_forbidden(*_args, **_kwargs):
        raise RuntimeError("Сеть заблокирована в study_check")

    socket.socket = _network_forbidden
    try:
        return _run_offline(db_path)
    finally:
        socket.socket = original_socket


def _run_offline(db_path: Path) -> dict:

    parsed = compose.parse_threads(FIXED_MODEL_RESPONSE)
    draft = parsed[0]
    rendered = compose.format_thread(draft)

    conn = kb.connect(str(db_path))
    try:
        history_id = kb.add_history(conn, "study_channel", draft["hook"], rendered)
        kb.set_history_status(conn, history_id, "draft")
        history_rows = conn.execute("SELECT COUNT(*) FROM history").fetchone()[0]
    finally:
        conn.close()

    return {
        "channel": "study_channel",
        "draft_kind": "fixed educational example, not AI-generated",
        "history_rows": history_rows,
        "hook": draft["hook"],
        "network_calls": 0,
        "status": "ok",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--work-dir", type=Path, default=KIT_ROOT / "study-data")
    args = parser.parse_args()
    print(json.dumps(run(args.work_dir), ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
