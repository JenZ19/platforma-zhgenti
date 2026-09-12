"""Конфигурация бота-модератора: .env + YAML-файлы → типизированные dataclass'ы.

Ничего не печатает и не логирует секреты. Загружается один раз при старте
(App.load) и передаётся по коду через объект App (см. bot.py), без глобалок.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import yaml
from dotenv import dotenv_values

HERE = Path(__file__).resolve().parent
# Только собственный .env комплекта. Переменные shell и родительские .env не наследуются.
_LOCAL_ENV = {k: str(v) for k, v in dotenv_values(HERE / ".env").items() if v is not None}


# --- Вспомогательные парсеры -------------------------------------------------

def _env(name: str, default: str = "") -> str:
    return _LOCAL_ENV.get(name, default).strip()


def _env_bool(name: str, default: bool = False) -> bool:
    raw = _LOCAL_ENV.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "да", "on")


def _env_int(name: str, default: int) -> int:
    try:
        return int(_LOCAL_ENV.get(name, str(default)).strip())
    except (TypeError, ValueError):
        return default


# Русские и английские сокращения дней недели → weekday() (пн=0 … вс=6).
_WEEKDAYS: dict[str, int] = {
    "пн": 0, "вт": 1, "ср": 2, "чт": 3, "пт": 4, "сб": 5, "вс": 6,
    "mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6,
}


# --- Датаклассы конфигурации -------------------------------------------------

@dataclass
class Settings:
    """Значения из .env."""
    bot_token: str
    owner_id: int             # id ЧАТА для уведомлений — личка владелицы ИЛИ групповой чат команды (см. /chatid)
    deepseek_api_key: str
    deepseek_model: str
    gc_login_url: str
    mode: str                 # observe | assist | auto  (стартовый режим)
    auto_answer: bool
    flag_spam: bool
    headless: bool
    poll_interval: int
    knowledge_dir: str

    @classmethod
    def load(cls) -> "Settings":
        mode = _env("MODE", "observe").lower()
        if mode not in ("observe", "assist", "auto"):
            mode = "observe"
        return cls(
            bot_token=_env("BOT_TOKEN"),
            owner_id=_env_int("OWNER_ID", 0),
            deepseek_api_key=_env("DEEPSEEK_API_KEY"),
            deepseek_model=_env("DEEPSEEK_MODEL", "deepseek-v4-flash"),
            gc_login_url=_env("GC_LOGIN_URL"),
            mode=mode,
            auto_answer=_env_bool("AUTO_ANSWER", False),
            flag_spam=_env_bool("FLAG_SPAM", True),
            headless=_env_bool("HEADLESS", True),
            poll_interval=_env_int("POLL_INTERVAL", 5),
            knowledge_dir=_env("KNOWLEDGE_DIR", ""),
        )


@dataclass
class ScheduleWindow:
    """Одно повторяющееся окно эфира из webinars.yaml."""
    weekday: int              # 0..6 (пн..вс)
    start_hh: int
    start_mm: int
    duration_minutes: int


@dataclass
class WebinarConfig:
    """Один вебинар из webinars.yaml."""
    name: str
    url: str
    capture: str              # room | admin_comments
    lead_minutes: int = 10
    tail_minutes: int = 15
    schedule: list[ScheduleWindow] = field(default_factory=list)


@dataclass
class Template:
    """Шаблон авто-ответа из knowledge/templates.yaml."""
    id: str
    category: str             # tech | org
    answer: str
    triggers: list[str] = field(default_factory=list)
    approved: bool = False
    source: str = "manual"    # manual | from_faq


# --- Загрузчики YAML ---------------------------------------------------------

def load_selectors(path: Path | None = None) -> dict:
    """Селекторы DOM. При отсутствии файла — пустой dict (всё уйдёт в калибровку)."""
    path = path or (HERE / "selectors.yaml")
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_webinars(path: Path | None = None) -> list[WebinarConfig]:
    path = path or (HERE / "webinars.yaml")
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}

    result: list[WebinarConfig] = []
    for item in (raw.get("webinars") or []):
        windows: list[ScheduleWindow] = []
        for w in (item.get("schedule") or []):
            wd = _WEEKDAYS.get(str(w.get("day", "")).strip().lower())
            start = str(w.get("start", "")).strip()
            if wd is None or ":" not in start:
                continue
            hh, mm = start.split(":", 1)
            try:
                windows.append(ScheduleWindow(
                    weekday=wd,
                    start_hh=int(hh),
                    start_mm=int(mm),
                    duration_minutes=int(w.get("duration_minutes", 90)),
                ))
            except ValueError:
                continue
        result.append(WebinarConfig(
            name=str(item.get("name", "Вебинар")),
            url=str(item.get("url", "")).strip(),
            capture=str(item.get("capture", "room")).strip().lower(),
            lead_minutes=int(item.get("lead_minutes", 10)),
            tail_minutes=int(item.get("tail_minutes", 15)),
            schedule=windows,
        ))
    return result


def load_templates(path: Path | None = None) -> list[Template]:
    """Читает templates.yaml (секции templates + from_faq)."""
    path = path or (HERE / "knowledge" / "templates.yaml")
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}

    templates: list[Template] = []
    for src_key, source in (("templates", "manual"), ("from_faq", "from_faq")):
        for t in (raw.get(src_key) or []):
            tid = str(t.get("id", "")).strip()
            answer = str(t.get("answer", "")).strip()
            if not tid or not answer:
                continue
            templates.append(Template(
                id=tid,
                category=str(t.get("category", "org")).strip().lower(),
                answer=answer,
                triggers=[str(x) for x in (t.get("triggers") or [])],
                approved=bool(t.get("approved", False)),
                source=source,
            ))
    return templates
