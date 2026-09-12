"""Контакты клиента: нормализация телефона, сборка кликабельных ссылок
WhatsApp/Telegram. Чистые функции — используются и синхронизатором
(sync_contacts.py), и карточкой в Telegram (tg_bridge.py).

Данные берутся из GetCourse (выгрузка через API, см. sync_contacts.py) и лежат
в локальном кэше `contacts` (faq_store). Здесь — только преобразования, без БД.
"""
from __future__ import annotations

import re

_DIGITS = re.compile(r"\D+")
# Telegram username: буквы/цифры/подчёркивание, 5–32 символа (правило Telegram).
_TG_RE = re.compile(r"^[A-Za-z0-9_]{5,32}$")


def normalize_phone(raw: str | None) -> str:
    """Телефон → только цифры в международном формате (без плюса), пригодные
    для wa.me. Российские варианты приводим к 7XXXXXXXXXX:
      +7 903…/8 903…/903… → 79030000000.
    Пустая/мусорная строка → ''.
    """
    d = _DIGITS.sub("", str(raw or ""))  # str(): API обычно шлёт строки, но не рискуем
    if not d:
        return ""
    if len(d) == 11 and d[0] == "8":
        d = "7" + d[1:]
    elif len(d) == 10 and d[0] == "9":  # мобильный без кода страны
        d = "7" + d
    return d


def wa_link(phone: str | None) -> str:
    """Кликабельная ссылка WhatsApp (открывает чат с номером). '' если номер
    слишком короткий/пустой."""
    d = normalize_phone(phone)
    return f"https://wa.me/{d}" if len(d) >= 10 else ""


def pretty_phone(phone: str | None) -> str:
    """Человекочитаемый номер для показа в карточке: +7 903 432-97-95.
    Возвращает '' для слишком коротких/мусорных значений (тот же порог, что и
    wa_link, len>=10) — чтобы в карточке не появлялся телефон, на который нет
    кликабельной кнопки (напр. обрывок '+1')."""
    d = normalize_phone(phone)
    if len(d) < 10:
        return ""
    if len(d) == 11 and d[0] == "7":
        return f"+7 {d[1:4]} {d[4:7]}-{d[7:9]}-{d[9:11]}"
    return "+" + d


def tg_username_clean(raw: str | None) -> str:
    """Приводит telegram-ник к валидному username без @ ('' если не подходит —
    напр. пусто, слишком коротко, кириллица или это ссылка t.me/joinchat)."""
    u = (raw or "").strip()
    if not u:
        return ""
    u = u.rsplit("/", 1)[-1]        # если прислали ссылку t.me/nick
    u = u.lstrip("@").strip()
    return u if _TG_RE.match(u) else ""


def tg_link(username: str | None) -> str:
    """Кликабельная ссылка на telegram-профиль по нику. '' если ник невалиден."""
    u = tg_username_clean(username)
    return f"https://t.me/{u}" if u else ""
