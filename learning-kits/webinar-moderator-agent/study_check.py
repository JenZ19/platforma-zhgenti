"""Безопасная офлайн-проверка учебного комплекта."""
from __future__ import annotations

import argparse
import asyncio
import json
import socket
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

from original_core.classifier import classify
from original_core.faq_rules import find_similar_approved

HERE = Path(__file__).resolve().parent


def _deny_network(*_args, **_kwargs):
    raise RuntimeError("Сеть заблокирована в study_check.py")


@contextmanager
def offline_network_guard():
    """Блокирует и высокоуровневые, и прямые TCP-подключения внутри учебного прогона."""
    with patch.object(socket, "create_connection", _deny_network), \
            patch.object(socket.socket, "connect", _deny_network), \
            patch.object(socket.socket, "connect_ex", _deny_network):
        yield


async def build_report() -> dict:
    with offline_network_guard():
        questions = json.loads((HERE / "examples" / "questions.json").read_text(encoding="utf-8"))
        faq = json.loads((HERE / "examples" / "faq.json").read_text(encoding="utf-8"))
        messages = []
        context: list[str] = []
        for item in questions:
            verdict = await classify(item["text"], context, api_key="", model="")
            messages.append({
                **item,
                "category": verdict.category,
                "confidence": verdict.confidence,
                "classified_by": verdict.by,
            })
            context.append(item["text"])

    return {
        "mode": "observe",
        "network_calls": 0,
        "live_integrations_started": False,
        "messages": messages,
        "faq_matches": [
            {"question": "Будет ли запись вебинара?",
             "matched": find_similar_approved("Будет ли запись вебинара?", faq) is not None},
            {"question": "Какой цвет фона?",
             "matched": find_similar_approved("Какой цвет фона?", faq) is not None},
        ],
        "limitation": (
            "Спорные вопросы без AI-ключа честно помечаются other/fallback; "
            "GetCourse, Telegram, комнаты, polling и webhook не запускаются."
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    report = asyncio.run(build_report())
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return
    print("Офлайн-проверка пройдена.")
    for item in report["messages"]:
        print(f'- {item["text"]!r}: {item["category"]} ({item["classified_by"]})')
    print(report["limitation"])


if __name__ == "__main__":
    main()
