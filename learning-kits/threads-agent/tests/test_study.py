from __future__ import annotations

import json
import asyncio
from types import SimpleNamespace
import subprocess
import sys
from pathlib import Path


KIT = Path(__file__).resolve().parents[1]


def test_study_check_uses_original_rules_and_storage_without_network(tmp_path):
    result = subprocess.run(
        [sys.executable, str(KIT / "study_check.py"), "--work-dir", str(tmp_path)],
        cwd=KIT,
        check=False,
        capture_output=True,
        text=True,
        timeout=20,
    )

    assert result.returncode == 0, result.stderr
    report = json.loads(result.stdout)
    assert report == {
        "channel": "study_channel",
        "draft_kind": "fixed educational example, not AI-generated",
        "history_rows": 1,
        "hook": "Мы сократили подготовку еженедельного плана с 50 до 20 минут.",
        "network_calls": 0,
        "status": "ok",
    }
    assert (tmp_path / "study.sqlite3").is_file()


def test_safe_defaults_are_single_channel_sources_off_and_manual_only():
    channels = (KIT / "channels.yml").read_text(encoding="utf-8")
    sources = (KIT / "sources.yml").read_text(encoding="utf-8")
    env_example = (KIT / ".env.example").read_text(encoding="utf-8")

    assert channels.count("study_channel:") == 1
    assert "enabled: false" in channels
    assert sources.strip() == "study_channel: {}"
    assert "ALLOW_LIVE_MODE=false" in env_example
    assert "AUTO_SEND" not in env_example
    assert "OWNER_USER_ID=0" in env_example
    assert "BOT_TOKEN=" in env_example
    assert "OPENROUTER_API_KEY=" in env_example


def test_original_live_runtime_is_present_but_explicitly_gated():
    runtime = ["bot.py", "generate.py", "ingest.py", "llm.py", "pipeline.py"]
    for name in runtime:
        assert (KIT / name).is_file(), name

    config = (KIT / "config.py").read_text(encoding="utf-8")
    bot = (KIT / "bot.py").read_text(encoding="utf-8")
    generate = (KIT / "generate.py").read_text(encoding="utf-8")
    assert 'env.get("ALLOW_LIVE_MODE", "false")' in config
    assert "CFG.allow_live_mode" in bot
    assert "cfg.allow_live_mode" in generate


def test_study_check_never_overwrites_existing_database(tmp_path):
    db = tmp_path / "study.sqlite3"
    db.write_bytes(b"do-not-touch")
    result = subprocess.run(
        [sys.executable, str(KIT / "study_check.py"), "--work-dir", str(tmp_path)],
        cwd=KIT,
        capture_output=True,
        text=True,
        timeout=20,
    )
    assert result.returncode != 0
    assert db.read_bytes() == b"do-not-touch"


def test_config_ignores_inherited_live_environment(monkeypatch):
    sys.path.insert(0, str(KIT))
    try:
        import config

        monkeypatch.setenv("ALLOW_LIVE_MODE", "true")
        monkeypatch.setenv("DB_PATH", "/tmp/private-production.sqlite3")
        cfg = config.load_config(KIT)
        assert cfg.allow_live_mode is False
        assert Path(cfg.db_path).resolve().is_relative_to(KIT.resolve())
    finally:
        sys.path.remove(str(KIT))


def test_owner_middleware_fails_closed_and_rejects_other_user():
    sys.path.insert(0, str(KIT))
    try:
        import bot

        calls = []

        async def handler(event, data):
            calls.append((event, data))
            return "handled"

        missing_owner = bot.OwnerOnlyMiddleware(owner_user_id=0)
        ownerless_event = SimpleNamespace(from_user=SimpleNamespace(id=101))
        assert asyncio.run(missing_owner(handler, ownerless_event, {})) is None

        guarded = bot.OwnerOnlyMiddleware(owner_user_id=101)
        stranger_message = SimpleNamespace(from_user=SimpleNamespace(id=202))
        stranger_callback = SimpleNamespace(from_user=SimpleNamespace(id=303))
        assert asyncio.run(guarded(handler, stranger_message, {})) is None
        assert asyncio.run(guarded(handler, stranger_callback, {})) is None
        assert calls == []
    finally:
        sys.path.remove(str(KIT))


def test_owner_middleware_allows_owner_without_sending_anything():
    sys.path.insert(0, str(KIT))
    try:
        import bot

        calls = []

        async def handler(event, data):
            calls.append(event.from_user.id)
            return "handled"

        guarded = bot.OwnerOnlyMiddleware(owner_user_id=101)
        owner_event = SimpleNamespace(from_user=SimpleNamespace(id=101))
        assert asyncio.run(guarded(handler, owner_event, {})) == "handled"
        assert calls == [101]
    finally:
        sys.path.remove(str(KIT))
