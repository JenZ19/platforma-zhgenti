"""Playwright-наблюдатель за чатом вебинара GetCourse.

Два способа читать чат (см. WebinarConfig.capture):
  - "room"            — публичная страница комнаты вебинара, чат встроен в неё;
  - "admin_comments"  — админ-страница со сводкой комментариев (часто стабильнее,
                         т.к. агрегирует изолированные чаты автовебинарных сессий).

Реальная вёрстка GetCourse заранее неизвестна, поэтому все DOM-селекторы берутся
из selectors.yaml и могут ничего не находить. Наблюдатель НЕ падает в этом
случае: он деградирует — один раз пишет в лог и шлёт владельцу сообщение о
необходимости калибровки, а сам продолжает опрашивать страницу вхолостую (вдруг
селекторы поправят «на лету», процесс перезапускать не нужно).

Лимиты постинга в чат вебинара (защита от дублей/спама/лишнего авто-трафика)
реализованы в PostGuard: минимальный интервал между постами, запрет повторов
одного и того же текста, потолок на число авто-ответов за сессию.
"""
from __future__ import annotations

import asyncio
import logging
import re
import time
from abc import ABC, abstractmethod
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any
from urllib.parse import urljoin

from playwright.async_api import Browser, BrowserContext, Page, async_playwright

from context import ChatMessage, webinar_id
from faq_store import last_seen_ts, load_seen, mark_seen, synth_hash

if TYPE_CHECKING:  # только для аннотаций — избегаем циклических импортов в рантайме
    from config import WebinarConfig
    from context import App

log = logging.getLogger("watcher")

HERE = Path(__file__).resolve().parent
STORAGE_STATE = HERE / "data" / "gc_storage_state.json"

# Потолок «лечений» одной комнаты перелогином: настоящая протухшая сессия
# лечится с первого раза, а вот комната, которую увело на лендинг по другой
# причине (эфир не идёт, у модератора нет доступа), лечиться не станет никогда —
# без потолка это был бы бесконечный цикл переоткрытий с запуском chromium
# каждые 30с. Счётчик живёт в App.heal_attempts (наблюдатель пересоздаётся).
_MAX_HEALS_PER_HOUR = 2
_HEAL_WINDOW_SEC = 3600.0


async def shared_browser(app: "App") -> Browser:
    """Общий на весь процесс chromium: поднимаем при первом обращении.

    Зачем: раньше Watcher.create поднимал ОТДЕЛЬНЫЙ браузер на каждую комнату.
    В 12:00 и 19:00 одновременно открыто 8-9 комнат — это 8-9 процессов
    chromium (~200 МБ каждый) на VPS с 3.8 ГБ, где рядом крутится прод.
    27-31.08.2026 сервер регулярно уходил в OOM: chromium убивало, страницы
    падали в TargetClosedError, и комната переставала видеть и сообщения, и
    поле ответа — то есть выглядела ровно как «слетела сессия», хотя куки
    GetCourse были действительны ещё месяц.

    Изоляция между комнатами не теряется: у каждой свой BrowserContext со
    своими куками и своим storage_state — общий только сам процесс браузера.

    Если браузер всё-таки умер (тот же OOM, падение драйвера) — поднимаем
    заново: is_connected() отличает живой от закрытого. Лок нужен, потому что
    планировщик открывает комнаты пачкой и без него мы бы стартовали несколько
    браузеров разом — ровно то, от чего уходим.
    """
    if app.browser_lock is None:
        app.browser_lock = asyncio.Lock()

    async with app.browser_lock:  # type: ignore[union-attr]
        browser = app.browser
        if browser is not None and browser.is_connected():  # type: ignore[union-attr]
            return browser  # type: ignore[return-value]

        if browser is not None:
            log.warning("общий браузер закрыт (вероятно, OOM) — поднимаю заново")
            try:
                await browser.close()  # type: ignore[union-attr]
            except Exception:
                pass

        if app.pw is None:
            app.pw = await async_playwright().start()

        app.browser = await app.pw.chromium.launch(  # type: ignore[union-attr]
            headless=app.settings.headless
        )
        log.info("общий chromium запущен")
        return app.browser  # type: ignore[return-value]


def _session_file_mtime(path: Path) -> float | None:
    """Время последнего изменения файла сессии. None — если файла нет."""
    try:
        return path.stat().st_mtime
    except OSError:
        return None

# Сколько последних content-хэшей храним как «хвостовой отпечаток» рендера
# (нужно для различения append vs. re-render — см. Watcher._dedup_and_build).
_TAIL_FINGERPRINT_CAP = 400

# Если по вебинару что-то видели не дольше этого назад — считаем, что это
# ПЕРЕПОДКЛЮЧЕНИЕ после рестарта (тот же эфир), а не первый заход на свежий.
# Эфиры одной комнаты идут с интервалом в часы, а рестарт-переподключение —
# секунды/минуты, так что 30 мин надёжно разделяет эти случаи (и заодно
# позволяет досылать вопросы, если бот падал на несколько минут).
_RECONNECT_WINDOW_SEC = 30 * 60

# Сколько ПОДРЯД пустых опросов (0 сообщений в DOM вообще) считать признаком
# поломки селекторов, а не просто тихим чатом. ПРОВЕРЕНО 2026-07-04 вживую:
# со старым порогом (3 опроса ≈ 15 сек при POLL_INTERVAL=5) бот дважды поднял
# ложную тревогу «нужна калибровка» на реальных вебинарах, где селекторы были
# рабочими (в соседнем вебинаре теми же селекторами ловились настоящие
# сообщения) — просто в конкретной комнате 15 секунд никто не писал. 10 минут
# полного молчания — гораздо более осмысленный сигнал именно поломки.
_EMPTY_POLLS_BEFORE_CALIBRATION_WARNING = 120


# =============================================================================
# ChatSource — чтение/запись DOM чата
# =============================================================================

class ChatSource(ABC):
    """Базовый класс для источника сообщений чата вебинара.

    Подклассы отличаются ТОЛЬКО тем, какой под-словарь селекторов (room или
    admin_comments) они читают — вся остальная логика общая и живёт здесь.
    """

    #: переопределяется в подклассах: 'room' | 'admin_comments'
    scope_key: str = ""

    def __init__(self, page: Page, sel: dict[str, Any], webinar_id: str) -> None:
        self.page = page
        self.sel = sel
        self.webinar_id = webinar_id
        # Становится True после первого удачного fetch_raw (>=1 сообщение).
        # Пока False — считаем селекторы непроверенными/возможно неверными.
        self.is_calibrated: bool = False
        # Латч «предупреждение о пустом chat_input уже отправлено» — чтобы не
        # спамить лог на каждый вызов post_reply.
        self._warned_no_input = False

    @property
    def scope(self) -> dict[str, Any]:
        """Под-словарь селекторов для текущей стратегии (room/admin_comments)."""
        return dict(self.sel.get(self.scope_key) or {})

    async def fetch_raw(self) -> list[dict[str, str]]:
        """Снимок текущих сообщений в DOM-порядке: [{"author","text","id","html"}, ...].

        # CALIBRATION: реальная вёрстка GetCourse неизвестна — вся логика ниже
        # опирается на CSS-селекторы из selectors.yaml. Если контейнер/элемент
        # сообщения не найден — возвращаем [] (не бросаем исключение), чтобы
        # Watcher мог включить деградацию с предупреждением владельцу.
        """
        scope = self.scope
        container_sel = str(scope.get("chat_container") or "")
        item_sel = str(scope.get("message_item") or "")
        author_sel = str(scope.get("message_author") or "")
        author_attr = str(scope.get("author_attr") or "")
        text_sel = str(scope.get("message_text") or "")
        id_attr = str(scope.get("message_id_attr") or "")

        # CALIBRATION: селекторы вида "xpath=..." не поддерживаются в v1 —
        # querySelectorAll их не понимает. Пропускаем как «не сматчилось».
        if item_sel.startswith("xpath=") or container_sel.startswith("xpath="):
            log.warning(
                "CALIBRATION: селектор в формате xpath= для «%s» пока не поддержан в v1 "
                "(нужен CSS-эквивалент в selectors.yaml)", self.scope_key,
            )
            return []

        if not item_sel:
            # Нет селектора сообщения — читать нечего.
            return []

        js = """
        (args) => {
            // CALIBRATION: вся эта функция — предположение о структуре DOM
            // чата GetCourse. Каждый шаг обёрнут в try/защиту, чтобы отсутствие
            // или несовпадение одного селектора не роняло весь сбор сообщений.
            const {containerSel, itemSel, authorSel, authorAttr, textSel, idAttr} = args;

            function safeQueryAll(root, sel) {
                if (!sel) return [];
                try {
                    return Array.from(root.querySelectorAll(sel));
                } catch (e) {
                    return [];
                }
            }

            function safeText(node, sel) {
                if (!node) return "";
                try {
                    if (!sel) return (node.innerText || node.textContent || "").trim();
                    const found = node.querySelector(sel);
                    if (!found) return "";
                    return (found.innerText || found.textContent || "").trim();
                } catch (e) {
                    return "";
                }
            }

            function safeAttr(node, attr) {
                if (!node || !attr) return "";
                try {
                    return node.getAttribute(attr) || "";
                } catch (e) {
                    return "";
                }
            }

            function safeOuterHtml(node) {
                try {
                    return (node.outerHTML || "").slice(0, 300);
                } catch (e) {
                    return "";
                }
            }

            let roots = [];
            if (containerSel) {
                try {
                    roots = Array.from(document.querySelectorAll(containerSel));
                } catch (e) {
                    roots = [];
                }
            }
            // Если контейнер не задан/не найден — ищем сообщения по всему документу.
            if (roots.length === 0) {
                roots = [document];
            }

            const items = [];
            for (const root of roots) {
                for (const node of safeQueryAll(root, itemSel)) {
                    items.push(node);
                }
            }

            // ПРОВЕРЕНО 2026-07-05: в классе обёртки .gc-comment зашит стабильный
            // числовой id пользователя GetCourse — gc-comment-auto-1_<UID>_...
            // (у одного человека одинаковый во всех его комментариях). Нужен для
            // надёжного фильтра сотрудников (по id, не по легко меняющемуся имени).
            function userId(node) {
                try {
                    const wrap = node.closest('.gc-comment');
                    const cls = wrap ? (wrap.className || "") : "";
                    const m = cls.match(/gc-comment-auto-\\d+_(\\d+)_/);
                    return m ? m[1] : "";
                } catch (e) { return ""; }
            }

            // ПРОВЕРЕНО 2026-07-05: на обёртке .gc-comment есть data-created —
            // мс-таймстамп создания комментария. Нужен, чтобы на первом заходе
            // отличить старый бэклог (до подключения) от новых сообщений (после).
            function createdMs(node) {
                try {
                    const wrap = node.closest('.gc-comment');
                    const dc = wrap ? wrap.getAttribute('data-created') : null;
                    const n = dc ? parseInt(dc, 10) : 0;
                    return Number.isFinite(n) ? n : 0;
                } catch (e) { return 0; }
            }

            return items.map((node) => ({
                // Имя автора: сначала атрибут узла (data-user-name — надёжно, на
                // странице модерации имя ТОЛЬКО там; в .title лежит лишь время),
                // и только если пусто — текст под-селектора authorSel.
                author: (safeAttr(node, authorAttr) || safeText(node, authorSel)),
                text: textSel ? safeText(node, textSel) : (node.innerText || node.textContent || "").trim(),
                id: safeAttr(node, idAttr),
                user_id: userId(node),
                created_ms: createdMs(node),
                html: safeOuterHtml(node),
            }));
        }
        """
        try:
            result = await self.page.evaluate(
                js,
                {
                    "containerSel": container_sel,
                    "itemSel": item_sel,
                    "authorSel": author_sel,
                    "authorAttr": author_attr,
                    "textSel": text_sel,
                    "idAttr": id_attr,
                },
            )
        except Exception:
            log.exception("Ошибка page.evaluate при чтении чата (%s)", self.scope_key)
            return []

        if not isinstance(result, list):
            return []
        return [
            {
                "author": str(item.get("author", "")),
                "text": str(item.get("text", "")),
                "id": str(item.get("id", "")),
                "user_id": str(item.get("user_id", "")),
                "created_ms": int(item.get("created_ms") or 0),
                "html": str(item.get("html", "")),
            }
            for item in result
            if isinstance(item, dict)
        ]

    async def post_reply(self, text: str) -> bool:
        """Печатает и отправляет ответ в чат вебинара. True — если удалось отправить.

        # CALIBRATION: селектор chat_input — предположение. Если он ничего не
        # находит, возвращаем False (Watcher/PostGuard сообщат об этом дальше).
        """
        scope = self.scope
        input_sel = str(scope.get("chat_input") or "")
        send_button_sel = str(scope.get("chat_send_button") or "")

        if not input_sel:
            if not self._warned_no_input:
                log.warning(
                    "CALIBRATION: chat_input не задан для «%s» — не могу отправить ответ",
                    self.scope_key,
                )
                self._warned_no_input = True
            return False

        try:
            locator = self.page.locator(input_sel).first
            if await locator.count() == 0:
                if not self._warned_no_input:
                    log.warning(
                        "CALIBRATION: chat_input «%s» ничего не нашёл на странице (%s)",
                        input_sel, self.scope_key,
                    )
                    self._warned_no_input = True
                return False

            # Поле ввода бывает textarea/input (page.fill работает) ИЛИ
            # contenteditable div (page.fill бросает — печатаем через клавиатуру).
            try:
                await locator.fill(text)
            except Exception:
                await locator.click()
                await self.page.keyboard.type(text)

            await self.page.keyboard.press("Enter")

            # CALIBRATION: если Enter ненадёжен (например, нужен явный клик по
            # кнопке отправки) — дополнительно жмём chat_send_button, если задан.
            if send_button_sel:
                try:
                    send_locator = self.page.locator(send_button_sel).first
                    if await send_locator.count() > 0:
                        await send_locator.click()
                except Exception:
                    log.debug("Клик по chat_send_button не удался (%s)", self.scope_key)

            return True
        except Exception:
            log.exception("Ошибка при отправке ответа в чат (%s)", self.scope_key)
            return False

    async def detect_login_lost(self) -> bool:
        """True — если сессия слетела (редирект на логин или видна форма входа)."""
        login_sel = dict(self.sel.get("login") or {})
        markers = list(login_sel.get("login_url_markers") or [])
        login_form_sel = str(login_sel.get("login_form") or "")

        try:
            current_url = self.page.url
            if any(marker in current_url for marker in markers):
                return True

            if login_form_sel:
                try:
                    node = await self.page.query_selector(login_form_sel)
                    if node is not None:
                        return True
                except Exception:
                    pass
            return False
        except Exception:
            log.exception("Ошибка при проверке detect_login_lost")
            return False

    async def page_healthy(self) -> bool:
        """True — страница чата/модерации загружена корректно (виден «якорь»),
        даже если сообщений сейчас 0. Отличает «пусто, но всё цело» (норма для
        admin_comments — сценарный шум в модерацию не попадает, реальных
        вопросов может не быть) от «селекторы сломались / не та страница».

        Если presence_anchor не задан — возвращаем False (ведём себя как
        раньше: пустой ответ считается за возможную поломку селекторов).
        """
        anchor = str(self.scope.get("presence_anchor") or "")
        if not anchor:
            return False
        try:
            return await self.page.locator(anchor).count() > 0
        except Exception:
            return False


class RoomChatSource(ChatSource):
    """Чат в публичной комнате вебинара (capture: room)."""
    scope_key = "room"


class AdminCommentsChatSource(ChatSource):
    """Сводка комментариев в админке GetCourse (capture: admin_comments)."""
    scope_key = "admin_comments"


def _make_source(page: Page, sel: dict[str, Any], wid: str, capture: str) -> ChatSource:
    if capture == "admin_comments":
        return AdminCommentsChatSource(page, sel, wid)
    return RoomChatSource(page, sel, wid)


# =============================================================================
# PostGuard — гейты на отправку сообщений в чат
# =============================================================================

@dataclass
class PostGuard:
    """Ограничители постинга: троттлинг, запрет дублей, потолок авто-ответов."""

    last_post_ts: float = 0.0
    recent: deque[tuple[str, float]] = field(default_factory=lambda: deque(maxlen=50))
    auto_count: int = 0

    MIN_INTERVAL_SEC: float = 4.0
    DUPLICATE_WINDOW_SEC: float = 600.0
    AUTO_LIMIT: int = 30

    def check(self, text: str, *, is_auto: bool) -> tuple[bool, str]:
        """Проверяет, можно ли отправить text. Возвращает (можно?, причина отказа)."""
        now = time.time()

        if now - self.last_post_ts < self.MIN_INTERVAL_SEC:
            return False, "слишком часто (минимум 4 секунды между сообщениями)"

        for prev_text, prev_ts in self.recent:
            if prev_text == text and (now - prev_ts) < self.DUPLICATE_WINDOW_SEC:
                return False, "такой текст уже отправляли недавно (в пределах 10 минут)"

        if is_auto and self.auto_count >= self.AUTO_LIMIT:
            return False, "лимит авто-ответов (30)"

        return True, ""

    def commit(self, text: str, *, is_auto: bool) -> None:
        """Фиксирует факт отправки — вызывать ТОЛЬКО после реально успешной отправки."""
        now = time.time()
        self.last_post_ts = now
        self.recent.append((text, now))
        if is_auto:
            self.auto_count += 1


# =============================================================================
# Watcher — управляет playwright-страницей одного вебинара
# =============================================================================

class Watcher:
    """Наблюдатель одного вебинара: держит браузер, опрашивает чат, шлёт ответы."""

    def __init__(
        self,
        app: "App",
        webinar: "WebinarConfig",
        *,
        close_at: float,
        manual: bool = False,
    ) -> None:
        self.app = app
        self.webinar = webinar
        self.wid = webinar_id(webinar)
        self.close_at = close_at
        self.manual = manual

        self.page_lock = asyncio.Lock()
        self.guard = PostGuard()
        self.is_running = False
        self.started_ts = time.time()   # момент старта наблюдения (для дайджеста)
        # Онлайн-зрителей сейчас. None пока не пришёл первый updateUserCount из
        # вебсокета GetCourse (обычно ~25-30с после захода, потом обновляется).
        self.online_count: int | None = None

        self.source: ChatSource | None = None
        self._calib_warned = False
        self._empty_polls = 0
        # Версия файла сессии, с которой стартовали (проставляется в create).
        self._session_mtime: float | None = None

        # Дедуп-состояние (см. _dedup_and_build).
        self.rendered_count: int = 0
        self.seen: set[str] = set()
        self.tail_fingerprint: list[str] = []
        # Первый опрос новой сессии наблюдения. Что с ним делать — зависит от
        # self._is_reconnect (вычисляется в create по last_seen_ts):
        #   ПЕРВЫЙ заход на свежий эфир → берём текущий чат за ТОЧКУ ОТСЧЁТА и
        #     не пересылаем (иначе завалим владелицу старой историей автовебинара);
        #   ПЕРЕПОДКЛЮЧЕНИЕ после рестарта (тот же эфир) → НЕ обнуляем, а досылаем
        #     сообщения, которые появились, но ещё не были отмечены виденными —
        #     иначе рестарт молча проглатывает вопросы, заданные прямо перед ним
        #     (так сегодня потерялся вопрос «Когда старт курса?» Наталии Сиченковой).
        self._baseline_done: bool = False
        self._is_reconnect: bool = False

        # URL для кнопки «🔗 Открыть вебинар» в карточке (см. tg_bridge).
        # По умолчанию — страница комнаты из конфига; если capture=admin_comments
        # и найдётся страница модерации, в create() перезапишем на неё (там сам
        # комментарий и кнопки ответа — удобнее команде).
        self.link_url: str = webinar.url

        self._page: Page | None = None
        self._context: BrowserContext | None = None
        # Ссылка на ОБЩИЙ браузер процесса (не наш — не закрываем, см. close).
        self._browser: Browser | None = None
        self.task: asyncio.Task[None] | None = None

    @classmethod
    async def create(
        cls,
        app: "App",
        webinar: "WebinarConfig",
        *,
        close_at: float,
        manual: bool = False,
    ) -> "Watcher":
        """Строит Watcher: запускает playwright/chromium, открывает страницу вебинара."""
        from config import load_selectors  # локальный импорт — избегаем циклов на уровне модуля

        self = cls(app, webinar, close_at=close_at, manual=manual)

        # Браузер общий на процесс (см. shared_browser) — свой на комнату
        # поднимать нельзя, сервер не переживает 8-9 копий chromium разом.
        self._browser = await shared_browser(app)

        storage_state = str(STORAGE_STATE) if STORAGE_STATE.exists() else None
        # Запоминаем ВЕРСИЮ сессии, с которой стартовали: если потом окажется,
        # что вход «удался», но файл не стал новее — переоткрываться бессмысленно
        # (см. _handle_login_lost, грабля №1).
        self._session_mtime = _session_file_mtime(STORAGE_STATE)
        self._context = await self._browser.new_context(storage_state=storage_state)
        self._page = await self._context.new_page()

        # Слушаем вебсокет GetCourse (ДО захода — ws открывается на странице):
        # он шлёт updateUserCount со счётчиком онлайн-зрителей. ПРОВЕРЕНО
        # 2026-07-05: фреймы приходят и на странице модерации, которую бот и так
        # держит, — значит доп. страниц/соединений не нужно, просто читаем.
        self._page.on("websocket", self._attach_ws_counter)

        await self._page.goto(webinar.url, wait_until="domcontentloaded", timeout=60000)

        sel = load_selectors()

        if webinar.capture == "admin_comments":
            # ПРОВЕРЕНО (2026-07-04): у каждого вебинара свой url страницы
            # модерации с уникальным hash — угадать/захардкодить нельзя, поэтому
            # находим ссылку «Модерация комментариев» прямо на странице комнаты
            # (куда только что зашли) и переходим по ней.
            mod_url = await self._discover_moderation_url(sel)
            if mod_url:
                await self._page.goto(mod_url, wait_until="domcontentloaded", timeout=60000)
                self.link_url = mod_url  # кнопка «Открыть вебинар» ведёт прямо в модерацию
                log.info("«%s»: перешёл на страницу модерации", webinar.name)
            else:
                log.warning(
                    "CALIBRATION: не нашёл ссылку «Модерация комментариев» на "
                    "странице «%s» — остаюсь в комнате вебинара (moderation_link "
                    "в selectors.yaml мог устареть)",
                    webinar.name,
                )

        self.source = _make_source(self._page, sel, self.wid, webinar.capture)

        self.seen = load_seen(app.db, self.wid)
        # Недавно тут что-то видели → это переподключение после рестарта того же
        # эфира (а не первый заход на новый) → на первом опросе досылаем
        # пропущенное вместо обнуления. Иначе — точка отсчёта (см. _dedup_and_build).
        last = last_seen_ts(app.db, self.wid)
        self._is_reconnect = bool(last) and (time.time() - last) < _RECONNECT_WINDOW_SEC

        log.info("наблюдение запущено «%s» (capture=%s, %s)", webinar.name, webinar.capture,
                 "переподключение" if self._is_reconnect else "первый заход")
        return self

    async def _discover_moderation_url(self, sel: dict[str, Any]) -> str | None:
        """Ищет на текущей (уже открытой) странице комнаты ссылку «Модерация
        комментариев в новом окне» и возвращает её абсолютный URL. None, если
        селектор не задан/ничего не нашёл — вызывающий код тогда останется на
        странице комнаты вместо падения.
        """
        link_sel = str((sel.get("admin_comments") or {}).get("moderation_link") or "")
        if not link_sel or self._page is None:
            return None
        try:
            href = await self._page.locator(link_sel).first.get_attribute(
                "href", timeout=5000
            )
        except Exception:
            return None
        if not href:
            return None
        return urljoin(self._page.url, href)

    async def run_loop(self) -> None:
        """Основной цикл: опрашивает чат до close_at, передаёт новые сообщения в pipeline."""
        self.is_running = True
        backoff = 1.0
        try:
            while time.time() < self.close_at:
                try:
                    if self.source is not None and await self.source.detect_login_lost():
                        await self._handle_login_lost()
                        break

                    msgs = await self._poll_once()

                    for m in msgs:
                        try:
                            # Ленивый импорт — pipeline.py импортирует watcher (App/Watcher),
                            # поэтому импортируем здесь, чтобы не ловить цикл на уровне модуля.
                            from pipeline import handle_message
                            await handle_message(self.app, self, m)
                        except ImportError:
                            log.warning(
                                "pipeline.py недоступен — сообщение получено, но не обработано "
                                "(watcher работает автономно)"
                            )
                        except Exception:
                            log.exception("Ошибка обработки сообщения в pipeline (hash=%s)", m.hash)

                    backoff = 1.0
                    await asyncio.sleep(self.app.settings.poll_interval)
                except asyncio.CancelledError:
                    raise
                except Exception:
                    log.exception("Ошибка в цикле наблюдения «%s»", self.webinar.name)
                    await asyncio.sleep(backoff)
                    backoff = min(backoff * 2, 30.0)
        finally:
            await self.close()

    async def _poll_once(self) -> list[ChatMessage]:
        """Один опрос: снимает DOM, включает/выключает деградацию, возвращает НОВЫЕ сообщения."""
        if self.source is None:
            return []

        async with self.page_lock:
            raw = await self.source.fetch_raw()

        if not raw:
            # Пустой список — ДВА разных состояния, которые раньше путались:
            #  (1) страница цела, но реальных вопросов сейчас нет — НОРМА для
            #      admin_comments (сценарный шум автовебинара в модерацию не
            #      попадает, живые вопросы приходят редко/пачками);
            #  (2) селекторы сломались / не та страница — РЕАЛЬНАЯ проблема.
            # Различаем по «якорю здоровья» (presence_anchor). ПРОВЕРЕНО
            # 2026-07-04: раньше 5 вечерних комнат подряд слали ложную
            # «нужна калибровка», хотя страница модерации была исправна,
            # просто пуста (в комнате 41 сценарное сообщение, в модерации 0).
            async with self.page_lock:
                healthy = await self.source.page_healthy()
            if healthy:
                # Пусто, но структура подтверждена — калибровка НЕ нужна.
                self.source.is_calibrated = True
                self._empty_polls = 0
                self._calib_warned = False
                return []
            self._empty_polls += 1
            if self._empty_polls >= _EMPTY_POLLS_BEFORE_CALIBRATION_WARNING and not self._calib_warned:
                self._calib_warned = True
                self.source.is_calibrated = False
                log.warning(
                    "не вижу сообщений в чате «%s» после %d опросов подряд — нужна калибровка selectors.yaml",
                    self.webinar.name, self._empty_polls,
                )
                await self.alert_owner(
                    f"⚠️ Вебинар «{self.webinar.name}»: не вижу ни сообщений, ни поля ответа — "
                    f"возможно, слетела сессия или изменилась вёрстка. Проверьте python tools/login.py."
                )
            return []

        if not self.source.is_calibrated:
            self.source.is_calibrated = True
            self._calib_warned = False
            self._empty_polls = 0

        return self._dedup_and_build(raw)

    def _dedup_and_build(self, raw: list[dict[str, str]]) -> list[ChatMessage]:
        """Определяет новые сообщения и строит из них ChatMessage. Обновляет dedup-состояние.

        Два сценария смены DOM между опросами:
          - APPEND (обычный случай): список сообщений просто вырос, старые остались
            на месте. Новые = raw[prev:] — по ИНДЕКСУ, не по хэшу. Это важно: два
            разных зрителя, написавших одно и то же (например "+"), дадут ОДИНАКОВЫЙ
            content-хэш, но оба обязаны попасть в результат — здесь это гарантируется
            тем, что мы берём их по позиции, а не проверяем seen.
          - RE-RENDER (сброс/прокрутка/перерисовка виджета): список короче предыдущего
            ИЛИ элемент на границе (индекс prev-1) изменился — в этом случае индексам
            верить нельзя, дедуп идёт по content-хэшу через self.seen.
        """
        canonical_hashes: list[str] = []
        for item in raw:
            item_id = item.get("id", "")
            if item_id:
                canonical_hashes.append(f"id:{item_id}")
            else:
                canonical_hashes.append(synth_hash(item.get("author", ""), item.get("text", ""), ""))

        # Первый опрос этой сессии наблюдения (см. self._baseline_done в __init__).
        if not self._baseline_done:
            self._baseline_done = True
            self.rendered_count = len(raw)
            self.tail_fingerprint = canonical_hashes[-_TAIL_FINGERPRINT_CAP:]

            if self._is_reconnect:
                # Переподключение после рестарта того же эфира: НЕ обнуляем —
                # досылаем то, что появилось, но ещё не отмечено виденным.
                fresh = [(raw[i], canonical_hashes[i], i)
                         for i in range(len(raw)) if canonical_hashes[i] not in self.seen]
                new_hashes = [h for _, h, _ in fresh]
                if new_hashes:
                    self.seen.update(new_hashes)
                    mark_seen(self.app.db, self.wid, new_hashes)
                    log.info("«%s»: переподключение — досылаю %d пропущенных за рестарт",
                             self.webinar.name, len(fresh))
                now = time.time()
                return [
                    ChatMessage(hash=h, author=item.get("author", ""),
                                text=item.get("text", ""), ts=now, ordinal=ordinal,
                                raw=item.get("html", ""), author_id=item.get("user_id", ""))
                    for item, h, ordinal in fresh
                ]

            # Первый заход на свежий эфир: пропускаем СТАРЫЙ бэклог (появившийся
            # ДО подключения — по data-created), но НЕ теряем сообщения, что
            # пришли уже после нас. Раньше терялся первый вопрос эфира, если
            # бот подключился к пустому чату за 10 мин до старта, а вопрос
            # появился позже (так пропал «Когда старт курса?»).
            cutoff_ms = int((self.started_ts - 120) * 1000)  # 2 мин запаса от рассинхрона часов
            fresh: list[tuple[dict, str, int]] = []
            baseline_n = 0
            for i in range(len(raw)):
                created = int(raw[i].get("created_ms") or 0)
                h = canonical_hashes[i]
                # Новое (после подключения) и ещё не виденное — пересылаем.
                # Без метки времени (created==0) считаем бэклогом (пропускаем).
                if created >= cutoff_ms and created > 0 and h not in self.seen:
                    fresh.append((raw[i], h, i))
                else:
                    baseline_n += 1
            self.seen.update(canonical_hashes)
            if canonical_hashes:
                mark_seen(self.app.db, self.wid, canonical_hashes)
            if baseline_n:
                log.info("«%s»: первый заход — %d старых взято за точку отсчёта",
                         self.webinar.name, baseline_n)
            if fresh:
                log.info("«%s»: первый заход — %d свежих (после подключения) пересылаю",
                         self.webinar.name, len(fresh))
            now = time.time()
            return [
                ChatMessage(hash=h, author=item.get("author", ""),
                            text=item.get("text", ""), ts=now, ordinal=ordinal,
                            raw=item.get("html", ""), author_id=item.get("user_id", ""))
                for item, h, ordinal in fresh
            ]

        prev = self.rendered_count
        is_append = len(raw) >= prev
        if is_append and prev > 0 and self.tail_fingerprint:
            # Дополнительно проверяем «границу»: хэш элемента на индексе prev-1
            # должен совпадать с тем, что мы видели в прошлый опрос на этом же индексе.
            # Если нет — это на самом деле re-render, а не чистый append.
            boundary_idx = min(prev - 1, len(canonical_hashes) - 1, len(self.tail_fingerprint) - 1)
            if boundary_idx >= 0 and canonical_hashes[boundary_idx] != self.tail_fingerprint[boundary_idx]:
                is_append = False

        new_items: list[tuple[dict[str, str], str, int]] = []  # (raw_item, hash, ordinal)

        if is_append:
            # Append-ветка: новые определяются ИНДЕКСОМ (>= prev), а не по seen —
            # так распознаём законные повторы разных людей ("+", "+1" и т.п.).
            for ordinal in range(prev, len(raw)):
                new_items.append((raw[ordinal], canonical_hashes[ordinal], ordinal))
        else:
            # Re-render/сброс: индексам не доверяем, фильтруем по content-хэшу.
            for ordinal, item in enumerate(raw):
                h = canonical_hashes[ordinal]
                if h not in self.seen:
                    new_items.append((item, h, ordinal))

        # Обновляем dedup-состояние.
        self.rendered_count = len(raw)
        new_hashes = [h for _, h, _ in new_items]
        if new_hashes:
            self.seen.update(new_hashes)
            mark_seen(self.app.db, self.wid, new_hashes)

        # Отпечаток для следующего опроса (капаем размер, чтобы не расти бесконечно).
        self.tail_fingerprint = canonical_hashes[-_TAIL_FINGERPRINT_CAP:]

        now = time.time()
        return [
            ChatMessage(
                hash=h,
                author=item.get("author", ""),
                text=item.get("text", ""),
                ts=now,
                ordinal=ordinal,
                raw=item.get("html", ""),
                author_id=item.get("user_id", ""),
            )
            for item, h, ordinal in new_items
        ]

    async def post(self, text: str, *, is_auto: bool) -> tuple[bool, str]:
        """Пробует отправить text в чат вебинара с учётом гейтов PostGuard."""
        ok, reason = self.guard.check(text, is_auto=is_auto)
        if not ok:
            log.info("пост отклонён гейтом («%s»): %s", self.webinar.name, reason)
            return False, reason

        if self.source is None:
            return False, "поле ввода не найдено (нужна калибровка)"

        async with self.page_lock:
            sent = await self.source.post_reply(text)

        if sent:
            self.guard.commit(text, is_auto=is_auto)
            return True, ""
        return False, "поле ввода не найдено (нужна калибровка)"

    async def _handle_login_lost(self) -> None:
        """Реакция на «сессия слетела»: пробуем перевойти сами и вернуть комнату
        в строй. Раньше бот просто звал человека и глушил слежку до ручного
        рестарта (2026-08-04 «Креатор» так молчал больше часа идущего эфира).

        ⚠️ Здесь легко сделать хуже, чем было — три грабли, все закрыты ниже:

        1. `detect_login_lost` срабатывает НЕ только на протухшей сессии: он
           считает признаком входа любое поле пароля на странице, а его несёт и
           публичный лендинг, куда уводит незапущенная/чужая комната. Такое
           перелогином НЕ чинится. Поэтому «вход удался» ≠ «комната ожила»:
           снимаемся с учёта, только если файл сессии стал РЕАЛЬНО новее того,
           с которым мы стартовали (значит нам есть смысл переоткрыться).
        2. Без потолка попыток комната с нечинибельным редиректом крутила бы
           цикл «лечение → переоткрытие» каждые 30с: это запуск chromium
           (~215 МБ) на сервере, общем с продом, и полная тишина для команды.
           Отсюда _MAX_HEALS_PER_HOUR и честное сообщение владелице, когда
           лимит выбран.
        3. Ручную слежку (/watch) планировщик НЕ знает — сняв её с учёта, мы
           потеряли бы её навсегда и молча. Для неё лечение не переоткрывает
           комнату, а честно сообщает владелице.
        """
        from session import refresh_session, STORAGE_STATE as SESSION_FILE

        self.is_running = False
        log.warning("«%s»: похоже, слетела сессия — пробую перевойти",
                    self.webinar.name)

        before_mtime = self._session_mtime
        healed = await refresh_session(headless=self.app.settings.headless)

        if not healed:
            # Не справились сами (капча, сменили пароль, GetCourse не пустил).
            # С учёта НЕ снимаемся — иначе крутились бы по кругу каждые 30с.
            await self.alert_owner(
                "Сессия GetCourse слетела, и войти автоматически не получилось — "
                "запустите python tools/login.py"
            )
            return

        # Вход удался. Но помогло ли это ИМЕННО НАМ? Если файл сессии не стал
        # новее нашего (например, refresh_session вернул True «сессия и так
        # свежая»), то переоткрытие с той же сессией ничего не изменит — это
        # прямой путь в бесконечный цикл.
        after_mtime = _session_file_mtime(SESSION_FILE)
        if after_mtime is None or (before_mtime is not None
                                   and after_mtime <= before_mtime):
            log.warning("«%s»: сессия не обновилась (мы уже стартовали с самой "
                        "свежей) — дело не в ней, переоткрываться не буду",
                        self.webinar.name)
            await self.alert_owner(
                f"«{self.webinar.name}»: страница просит войти, хотя сессия "
                f"свежая. Похоже, дело не в сессии — проверьте, идёт ли этот "
                f"эфир и есть ли у модератора доступ к комнате."
            )
            return

        if self.manual:
            # Планировщик переоткрывает только комнаты из webinars.yaml.
            await self.alert_owner(
                f"Сессия обновилась, но ручную слежку «{self.webinar.name}» "
                f"нужно запустить заново: /watch {self.webinar.url}"
            )
            return

        # Потолок попыток на комнату — счётчик живёт в App, т.к. сам наблюдатель
        # при лечении пересоздаётся.
        n, since = self.app.heal_attempts.get(self.wid, (0, time.time()))
        if time.time() - since > _HEAL_WINDOW_SEC:
            n, since = 0, time.time()
        n += 1
        self.app.heal_attempts[self.wid] = (n, since)
        if n > _MAX_HEALS_PER_HOUR:
            log.warning("«%s»: %d-е лечение за час — прекращаю, дело не в сессии",
                        self.webinar.name, n)
            await self.alert_owner(
                f"«{self.webinar.name}»: перевход удаётся, но комната всё равно "
                f"просит войти ({n} раза подряд). Дело не в сессии — проверьте, "
                f"идёт ли этот эфир и открывается ли комната у модератора."
            )
            return

        # Всё сходится: сессия реально свежая, лимит не выбран → снимаемся с
        # учёта, и планировщик на ближайшем тике (≤30с) откроет комнату заново
        # уже с новой сессией. Без снятия наблюдатель висел бы в app.watchers
        # как «работающий», и комната молчала бы до конца эфира.
        self.app.watchers.pop(self.wid, None)
        log.info("«%s»: сессия обновлена (попытка %d) — переоткрываюсь",
                 self.webinar.name, n)

    async def alert_owner(self, text: str) -> None:
        """Шлёт владельцу сообщение в Telegram. Ошибки отправки только логируем."""
        try:
            await self.app.bot.send_message(self.app.settings.owner_id, text)
        except Exception:
            log.exception("Не удалось отправить уведомление владельцу")

    def _attach_ws_counter(self, ws) -> None:
        """Вешает на вебинарный вебсокет чтение updateUserCount (счётчик онлайн)."""
        try:
            if "webinar" in (ws.url or ""):
                ws.on("framereceived", self._on_ws_frame)
        except Exception:
            pass

    def _on_ws_frame(self, payload) -> None:
        """Из фрейма вида 42[\"updateUserCount\",{\"count\":46}] берём число онлайн."""
        try:
            s = payload if isinstance(payload, str) else ""
            if "updateUserCount" in s:
                m = re.search(r'"count":(\d+)', s)
                if m:
                    self.online_count = int(m.group(1))
        except Exception:
            pass

    async def close(self) -> None:
        """Аккуратно закрывает playwright-ресурсы (каждый шаг независим от прочих)."""
        self.is_running = False

        if self._page is not None:
            try:
                await self._page.close()
            except Exception:
                log.exception("Ошибка при закрытии page («%s»)", self.webinar.name)

        if self._context is not None:
            try:
                await self._context.close()
            except Exception:
                log.exception("Ошибка при закрытии context («%s»)", self.webinar.name)

        # Браузер и playwright НЕ трогаем: они общие на процесс и нужны
        # остальным комнатам. Закрываются один раз в bot.shutdown.

        log.info("наблюдение закрыто «%s»", self.webinar.name)
