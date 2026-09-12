"""Общий контекст приложения (App) и разделяемые типы.

Вынесено в отдельный модуль, чтобы watcher/tg_bridge/scheduler импортировали
App без циклических зависимостей. Состояние живёт здесь, а не в глобалках.
"""
from __future__ import annotations

import asyncio
import sqlite3
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:  # только для аннотаций — избегаем циклических импортов в рантайме
    from aiogram import Bot, Dispatcher
    from config import Settings, Template, WebinarConfig
    from knowledge import Doc
    from watcher import Watcher

# Допустимые режимы работы.
MODE_OBSERVE = "observe"
MODE_ASSIST = "assist"
MODE_AUTO = "auto"
MODES = (MODE_OBSERVE, MODE_ASSIST, MODE_AUTO)

MODE_HELP = {
    MODE_OBSERVE: "наблюдение — только читаю и пересылаю вам, в чат вебинара ничего не пишу",
    MODE_ASSIST: "ассист — ваши ответы из Telegram отправляю в чат вебинара",
    MODE_AUTO: "авто — плюс сам отвечаю на техвопросы из утверждённых шаблонов",
}


@dataclass
class ChatMessage:
    """Одно сообщение из чата вебинара."""
    hash: str
    author: str
    text: str
    ts: float
    ordinal: int = 0
    raw: str = ""
    author_id: str = ""   # id пользователя GetCourse (для фильтра сотрудников)


@dataclass
class App:
    """Разделяемое состояние процесса. Передаётся в хендлеры через dp['app']."""
    bot: "Bot"
    dp: "Dispatcher"
    db: sqlite3.Connection
    settings: "Settings"
    webinars: list["WebinarConfig"]
    templates: list["Template"]
    knowledge: list["Doc"] = field(default_factory=list)  # документы базы знаний (для черновиков)
    mode: str = MODE_OBSERVE                  # текущий режим (меняется /mode)
    watchers: dict[str, "Watcher"] = field(default_factory=dict)
    scheduler: Optional[object] = None        # WebinarScheduler; object чтобы не тянуть импорт
    started_at: float = 0.0
    # Сколько раз комнату «лечили» перелогином: wid → (счётчик, начало окна).
    # Живёт в App, а НЕ в Watcher, потому что при лечении наблюдатель
    # пересоздаётся — счётчик на нём обнулялся бы, и потолок попыток не работал
    # бы вовсе (см. watcher.run_loop, ветка login-lost).
    heal_attempts: dict[str, tuple[int, float]] = field(default_factory=dict)
    # ОДИН chromium на весь процесс, общий для всех наблюдателей.
    # Раньше каждый Watcher поднимал СВОЙ браузер: в 12:00 и 19:00 одновременно
    # идут 8-9 комнат, это 8-9 копий chromium на VPS с 3.8 ГБ, общем с продом.
    # 27-31.08.2026 сервер уходил в OOM, chromium убивало, и комнаты падали в
    # TargetClosedError — снаружи это выглядело как «не вижу ни сообщений, ни
    # поля ответа», хотя сессия GetCourse была живой. Теперь браузер один, а на
    # комнату приходится только свой context+page (изоляция кук сохраняется).
    # Типы — object, чтобы context.py не тянул playwright (см. scheduler выше).
    pw: Optional[object] = None
    browser: Optional[object] = None
    browser_lock: Optional[object] = None

    # --- удобные помощники ---
    def is_owner_chat(self, chat_id: int | None) -> bool:
        """OWNER_ID — id ЧАТА (личка или групповой чат команды), не пользователя."""
        return chat_id is not None and chat_id == self.settings.owner_id

    def template_by_id(self, tid: str) -> Optional["Template"]:
        for t in self.templates:
            if t.id == tid:
                return t
        return None

    def webinar_by_id(self, wid: str) -> Optional["WebinarConfig"]:
        for w in self.webinars:
            if webinar_id(w) == wid:
                return w
        return None


# Карта тем и продуктов приватна для каждой школы. В starter она намеренно пуста.
TOPIC_TO_COURSE: dict[str, str] = {}


def course_hint_for_webinar(webinar_name: str) -> str | None:
    """Профильный курс этого эфира по имени вебинара («Сайты · 12:00» /
    «Повтор · Сайты» -> курс «AI Web Creator»). None — если тема неизвестна
    (например «Лагерь» — по нему пока нет материалов в базе знаний)."""
    for topic, course in TOPIC_TO_COURSE.items():
        if topic in webinar_name:
            return course
    return None


def webinar_id(w: "WebinarConfig") -> str:
    """Стабильный id вебинара из его конфига (имя + url)."""
    import hashlib
    raw = f"{w.name}|{w.url}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:10]


def render_template(answer: str, viewer_name: str) -> str:
    """Подставляет имя в шаблон. Если имени нет — убирает {name} без «висящей» запятой."""
    name = (viewer_name or "").strip()
    if "{name}" not in answer:
        return answer
    if name:
        return answer.replace("{name}", name)
    # Убираем «{name}, » / «{name} » в начале и одиночный {name}.
    out = answer.replace("{name}, ", "").replace("{name} ", "").replace("{name},", "").replace("{name}", "")
    out = out.strip()
    return out[:1].upper() + out[1:] if out else out
