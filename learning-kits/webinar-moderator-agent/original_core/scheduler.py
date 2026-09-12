"""Планировщик окон наблюдения.

Открывает наблюдателя за (start - lead) и закрывает в (end + tail); по закрытии
шлёт дайджест. Плюс ручной запуск /watch <url> [минуты] и /stopwatch.

Единый источник правды об активных вебинарах — app.watchers (dict по webinar_id).
Планировщик — единственный, кто открывает плановые окна (один цикл, без гонок).
"""
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from config import ScheduleWindow, WebinarConfig
from context import App, webinar_id

log = logging.getLogger("scheduler")

# ПРОВЕРЕНО 2026-07-04: расписание в webinars.yaml — время по Москве (так
# сказала владелица). Раньше сравнивали по datetime.now() (наивное, по часам
# ХОСТА) — работало на маке только случайно, потому что там стоял московский
# пояс; при переезде на сервер (UTC) все окна съехали бы на 3 часа. Теперь
# везде явно MSK, независимо от часового пояса машины, где крутится бот.
MSK = ZoneInfo("Europe/Moscow")

SCHED_TICK = 30            # как часто проверять окна, секунд
# Это НЕ бизнес-ограничение — просто предохранитель от исчерпания памяти
# (headless chromium ~215 МБ на наблюдателя, проверено вживую 2026-07-04).
# Текущий реальный максимум владелицы — 9 разом (6 тем в 12:00 + до 3
# повторов в выходные). Ставим щедрый потолок с большим запасом на будущее
# (новые темы), а не убираем совсем — иначе случайная ошибка в расписании
# (например, задвоенные окна) могла бы уронить весь мак разом, открыв
# сотни вкладок без предупреждения.
MAX_CONCURRENT = 30

# Срез «сколько онлайн во всех комнатах» — в ФИКСИРОВАННОЕ московское время
# (по просьбе владелицы 2026-07-05). Одно сводное сообщение на все активные
# эфиры. Раньше был относительный heartbeat (+1ч/+2ч от старта) — заменён на
# эти часовые слоты (:15 каждого часа, покрывают дневные 12:00 и вечерние
# 17:00/19:00 эфиры; 16:15 пропущен — в 16:00 ничего не идёт).
REPORT_TIMES_MSK = [(12, 15), (13, 15), (14, 15), (15, 15),
                    (17, 15), (18, 15), (19, 15), (20, 15), (21, 15), (22, 15)]

# Профилактика сессии GetCourse: раз в сутки в тихое время (до эфиров) проверяем
# возраст сохранённой сессии и обновляем её, если старовата. Сессия живёт около
# месяца, но протухает молча и, если это случается посреди эфира, комната глохнет
# (реальный случай 2026-08-04 — см. session.py). Дешевле обновлять заранее.
SESSION_CHECK_MSK = (5, 30)
SESSION_MAX_AGE_SEC = 7 * 24 * 3600


async def supervised(name: str, factory, *, restart: bool,
                     base_backoff: float = 2.0, max_backoff: float = 60.0) -> None:
    """Обёртка: ловит всё, кроме CancelledError. При restart=True перезапускает."""
    backoff = base_backoff
    while True:
        try:
            await factory()
            if not restart:
                return
            backoff = base_backoff
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("[%s] упал", name)
            if not restart:
                return
        await asyncio.sleep(backoff)
        backoff = min(backoff * 2, max_backoff)


@dataclass
class _Occurrence:
    open_at: datetime
    close_at: datetime


def _occurrences_for_window(win: ScheduleWindow, wc: WebinarConfig,
                            now: datetime) -> list[_Occurrence]:
    """Конкретные окна [open, close] для этого правила на вчера/сегодня/завтра.

    Смотрим ±1 день, чтобы корректно обработать lead до полуночи и
    длительность/tail, переходящие через полночь.
    """
    result: list[_Occurrence] = []
    for delta in (-1, 0, 1):
        day = (now + timedelta(days=delta)).date()
        # weekday(): пн=0 … вс=6 — как в config._WEEKDAYS.
        if day.weekday() != win.weekday:
            continue
        start = datetime(day.year, day.month, day.day, win.start_hh, win.start_mm, tzinfo=MSK)
        end = start + timedelta(minutes=win.duration_minutes)
        result.append(_Occurrence(
            open_at=start - timedelta(minutes=wc.lead_minutes),
            close_at=end + timedelta(minutes=wc.tail_minutes),
        ))
    return result


def _active_occurrence(wc: WebinarConfig, now: datetime) -> _Occurrence | None:
    for win in wc.schedule:
        for occ in _occurrences_for_window(win, wc, now):
            if occ.open_at <= now <= occ.close_at:
                return occ
    return None


class WebinarScheduler:
    def __init__(self, app: App) -> None:
        self.app = app
        self._closing: set[str] = set()
        # Слоты онлайн-среза, уже отправленные сегодня («ГГГГ-ММ-ДД ЧЧ:ММ»),
        # чтобы не дублировать в пределах минуты. См. _report_slot_tick.
        self._reported_slots: set[str] = set()
        # Начало ТЕКУЩЕГО окна эфира: wid → (close_at, since_ts). Нужно, чтобы
        # переоткрытие комнаты посреди эфира (самолечение сессии) не обнуляло
        # точку отсчёта дайджеста — иначе в «Итогах» пропали бы все вопросы,
        # заданные до лечения.
        self._window_since: dict[str, tuple[float, float]] = {}

    # --- Основной цикл --------------------------------------------------------

    async def run(self) -> None:
        log.info("Планировщик запущен (проверка каждые %sс)", SCHED_TICK)
        while True:
            try:
                await self._tick()
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("Ошибка в цикле планировщика")
            await asyncio.sleep(SCHED_TICK)

    async def _tick(self) -> None:
        now = datetime.now(MSK)
        closed: list[tuple[str, str, int]] = []

        # Плановые окна: открыть/закрыть. Открытие больше не анонсируется
        # отдельным сообщением (владелица попросила убрать «🟢 На связи» —
        # он приходил в 11:50, за lead_minutes до старта комнат в 12:00, и
        # дублировал онлайн-срез в 12:15). Слежка продолжает открываться как
        # обычно, просто тихо; что реально идёт — видно из среза REPORT_TIMES_MSK.
        for wc in self.app.webinars:
            if not wc.url or not wc.schedule:
                continue
            wid = webinar_id(wc)
            occ = _active_occurrence(wc, now)
            running = wid in self.app.watchers
            if occ and not running:
                await self._open(wc, close_at=occ.close_at.timestamp())
            elif not occ and running and not self.app.watchers[wid].manual:
                info = await self._close(wid)
                if info:
                    closed.append(info)

        # Ручные слежки: закрыть по истечении close_at.
        for wid, w in list(self.app.watchers.items()):
            if w.manual and time.time() >= w.close_at:
                info = await self._close(wid)
                if info:
                    closed.append(info)

        # Сводные уведомления — ОДНО сообщение на пачку, а не по одному на комнату.
        if closed:
            await self._report_closed(closed)
        await self._report_slot_tick(now)
        await self._session_maintenance_tick(now)

    @staticmethod
    def _fmt_watcher(w: object) -> str:
        """«Название (N онлайн)» или просто «Название», если счётчик ещё не пришёл."""
        name = getattr(getattr(w, "webinar", None), "name", "?")
        cnt = getattr(w, "online_count", None)
        return f"{name} ({cnt} онлайн)" if cnt is not None else name

    async def _report_closed(self, closed: list[tuple[str, str, int]]) -> None:
        from tg_bridge import build_combined_digest
        try:
            text = build_combined_digest(self.app, closed)
        except Exception:
            log.exception("Не удалось собрать сводный дайджест")
            return
        if text:
            await self._alert(text)

    def _active_watchers(self) -> list[object]:
        """Реальные наблюдатели (без _Placeholder — у него нет started_ts)."""
        return [w for w in self.app.watchers.values()
                if getattr(w, "started_ts", None) is not None]

    async def _report_slot_tick(self, now: datetime) -> None:
        """В фиксированное московское время (REPORT_TIMES_MSK) шлём ОДИН срез:
        сколько онлайн во всех активных эфирах. now — уже в MSK."""
        slot = None
        for (h, m) in REPORT_TIMES_MSK:
            # Ловим слот в окне [время; время+2 мин) — чтобы не промахнуться
            # между тиками и не выстрелить задним числом при старте среди дня.
            if now.hour == h and m <= now.minute < m + 2:
                slot = f"{now:%Y-%m-%d} {h:02d}:{m:02d}"
                break
        if slot is None or slot in self._reported_slots:
            return
        self._reported_slots.add(slot)
        # чистим старые слоты, чтобы set не рос (храним только сегодняшние)
        today = f"{now:%Y-%m-%d}"
        self._reported_slots = {s for s in self._reported_slots if s.startswith(today)}

        active = self._active_watchers()
        if not active:
            return  # нет эфиров — срез не шлём
        await self._alert(
            f"📊 Онлайн на {now:%H:%M}:\n"
            + "\n".join("• " + self._fmt_watcher(w) for w in active))

    async def _session_maintenance_tick(self, now: datetime) -> None:
        """Раз в сутки в SESSION_CHECK_MSK обновляем сессию GetCourse, если она
        старше SESSION_MAX_AGE_SEC. Тихо: пишем владелице только если не вышло
        (тогда нужен ручной вход). now — уже в MSK."""
        h, m = SESSION_CHECK_MSK
        if not (now.hour == h and m <= now.minute < m + 2):
            return
        # Ключ НАЧИНАЕТСЯ с даты — так его переживает дневная чистка
        # _reported_slots в _report_slot_tick (она оставляет только сегодняшние).
        slot = f"{now:%Y-%m-%d} session-refresh"
        if slot in self._reported_slots:
            return
        self._reported_slots.add(slot)

        from session import storage_age_seconds, refresh_session
        age = storage_age_seconds()
        if age is not None and age < SESSION_MAX_AGE_SEC:
            log.info("сессия GetCourse свежая (%.1f дней) — обновление не нужно",
                     age / 86400)
            return

        log.info("профилактика: обновляю сессию GetCourse (возраст %s)",
                 f"{age / 86400:.1f} дней" if age is not None else "файла нет")
        if not await refresh_session(headless=self.app.settings.headless):
            await self._alert(
                "⚠️ Не удалось обновить сессию GetCourse автоматически — "
                "запустите python tools/login.py, иначе бот перестанет читать чаты."
            )

    # --- Открытие / закрытие --------------------------------------------------

    async def _open(self, wc: WebinarConfig, *, close_at: float,
                    manual: bool = False) -> "object | None":
        wid = webinar_id(wc)
        if wid in self.app.watchers:
            return self.app.watchers[wid]
        if len(self.app.watchers) >= MAX_CONCURRENT:
            log.warning("Достигнут лимит одновременных вебинаров (%s)", MAX_CONCURRENT)
            await self._alert(f"⚠️ Достигнут лимит одновременных вебинаров ({MAX_CONCURRENT}), "
                              f"«{wc.name}» не открыт.")
            return None

        from watcher import Watcher  # ленивый импорт (playwright тяжёлый)
        # Резервируем ключ сразу, чтобы два тика не открыли дважды.
        self.app.watchers[wid] = _Placeholder(wc, close_at, manual)
        try:
            w = await Watcher.create(self.app, wc, close_at=close_at, manual=manual)
        except Exception:
            log.exception("Не удалось открыть наблюдателя «%s»", wc.name)
            self.app.watchers.pop(wid, None)
            await self._alert(f"⚠️ Не удалось открыть вебинар «{wc.name}» "
                              f"(проверьте сессию: python tools/login.py).")
            return None

        # Точка отсчёта для дайджеста. Если комнату переоткрыли ВНУТРИ того же
        # окна (самолечение сессии), берём прежнее начало — иначе «Итоги» учли бы
        # только вопросы после переоткрытия.
        now_ts = time.time()
        prev = self._window_since.get(wid)
        if prev is not None and prev[0] == close_at:
            w.started_ts = prev[1]
        else:
            w.started_ts = now_ts
            self._window_since[wid] = (close_at, now_ts)
        self.app.watchers[wid] = w
        w.task = asyncio.create_task(
            supervised(f"watch:{wid}", w.run_loop, restart=False))
        log.info("Открыто наблюдение «%s» (manual=%s)", wc.name, manual)
        return w

    async def _close(self, wid: str) -> tuple[str, str, int] | None:
        """Закрывает наблюдателя. Возвращает (wid, name, since_ts) для сводного
        отчёта — САМ дайджест не шлёт (это делает _report_closed одной пачкой).
        None — если наблюдателя уже нет.
        """
        if wid in self._closing:
            return None
        self._closing.add(wid)
        try:
            w = self.app.watchers.get(wid)
            if w is None:
                return None
            name = getattr(getattr(w, "webinar", None), "name", wid)
            since = int(getattr(w, "started_ts", time.time() - 3600))

            task = getattr(w, "task", None)
            if task is not None:
                task.cancel()
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass
            close = getattr(w, "close", None)
            if close is not None:
                try:
                    await close()
                except Exception:
                    log.exception("Ошибка при закрытии наблюдателя «%s»", name)

            self.app.watchers.pop(wid, None)
            # Окно эфира действительно закончилось — забываем его точку отсчёта
            # и счётчик лечений, чтобы следующий эфир начинался с чистого листа.
            self._window_since.pop(wid, None)
            self.app.heal_attempts.pop(wid, None)
            log.info("Закрыто наблюдение «%s»", name)
            return (wid, name, since)
        finally:
            self._closing.discard(wid)

    async def _alert(self, text: str) -> None:
        try:
            await self.app.bot.send_message(self.app.settings.owner_id, text)
        except Exception:
            log.exception("Не удалось отправить уведомление владельцу")

    # --- Ручное управление (вызывается из tg_bridge) --------------------------

    async def watch_adhoc(self, url: str, minutes: int) -> str:
        """Запуск слежки вручную. Возвращает имя вебинара."""
        # Если URL уже отслеживается — просто продлеваем.
        for wid, w in self.app.watchers.items():
            if getattr(getattr(w, "webinar", None), "url", None) == url:
                w.close_at = max(w.close_at, time.time() + minutes * 60)
                return getattr(w.webinar, "name", "вебинар")

        wc = WebinarConfig(
            name=f"Ручной вебинар ({url.split('//')[-1][:24]})",
            url=url,
            capture="room",
            lead_minutes=0,
            tail_minutes=0,
            schedule=[],
        )
        w = await self._open(wc, close_at=time.time() + minutes * 60, manual=True)
        if w is None:
            raise RuntimeError("не удалось открыть (лимит или ошибка входа)")
        return wc.name

    async def stop_manual(self) -> list[str]:
        """Останавливает все ручные слежки. Возвращает имена остановленных;
        сводный дайджест по ним шлёт одним сообщением."""
        stopped: list[str] = []
        closed: list[tuple[str, str, int]] = []
        for wid, w in list(self.app.watchers.items()):
            if getattr(w, "manual", False):
                stopped.append(getattr(getattr(w, "webinar", None), "name", wid))
                info = await self._close(wid)
                if info:
                    closed.append(info)
        if closed:
            await self._report_closed(closed)
        return stopped

    async def shutdown(self) -> None:
        """Закрыть всех наблюдателей при остановке бота (без дайджеста)."""
        for wid in list(self.app.watchers.keys()):
            await self._close(wid)


@dataclass
class _Placeholder:
    """Заглушка в app.watchers на время запуска настоящего наблюдателя."""
    webinar: WebinarConfig
    close_at: float
    manual: bool
    is_running: bool = False

    async def post(self, text: str, *, is_auto: bool) -> tuple[bool, str]:
        return False, "вебинар ещё открывается"
