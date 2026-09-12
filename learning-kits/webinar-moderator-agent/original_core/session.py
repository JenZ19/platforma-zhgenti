"""Самовосстановление сессии GetCourse.

Зачем: сессия сотрудника-модератора живёт долго (в наблюдениях — около месяца),
но однажды всё равно протухает. Раньше бот в этот момент только слал владелице
«Сессия GetCourse слетела — запустите python tools/login.py» и глушил слежку до
ручного вмешательства (реальный случай 2026-08-04: комната «Креатор» умерла в
11:51 и не читала чат больше часа идущего эфира). Здесь — тот же вход, что и в
tools/login.py, но вызываемый САМИМ ботом, без человека.

Три предохранителя, чтобы лечение не стало хуже болезни:
  • single-flight: одновременный вызов из нескольких наблюдателей делает ОДИН
    вход (asyncio.Lock), остальные просто дожидаются его результата;
  • «свежесть»: если сессию обновили только что (SUCCESS_TTL), повторный вход не
    делаем — считаем, что уже вылечились;
  • пауза после неудачи (FAIL_COOLDOWN): не долбим форму входа в цикле, если
    пароль сменили или появилась капча.

Капчу НЕ решаем и не обходим: если она появилась — честно возвращаем неудачу,
дальше владелица заходит руками (tools/login.py умеет видимое окно).
"""
from __future__ import annotations

import asyncio
import logging
import time
from pathlib import Path

from playwright.async_api import async_playwright

log = logging.getLogger("session")

HERE = Path(__file__).resolve().parent
STORAGE_STATE = HERE / "data" / "gc_storage_state.json"

# Сессию, обновлённую меньше этого времени назад, считаем свежей — второй вход
# не нужен (несколько наблюдателей замечают потерю почти одновременно).
SUCCESS_TTL = 120.0
# Пауза после неудачной попытки — чтобы не молотить вход по кругу.
FAIL_COOLDOWN = 900.0

_lock = asyncio.Lock()
_last_success: float = 0.0
_last_failure: float = 0.0


def storage_age_seconds() -> float | None:
    """Возраст файла сессии в секундах. None — если файла нет."""
    try:
        return time.time() - STORAGE_STATE.stat().st_mtime
    except OSError:
        return None


async def refresh_session(headless: bool = True) -> bool:
    """Логинится в GetCourse и перезаписывает файл сессии. True — получилось.

    Никогда не бросает исключений наружу: вызывается из цикла наблюдения, где
    падение означало бы потерю эфира.
    """
    global _last_success, _last_failure

    async with _lock:
        now = time.time()
        # Кто-то уже обновил сессию только что — лечиться повторно не нужно.
        if now - _last_success < SUCCESS_TTL:
            log.info("сессия обновлена %.0fс назад — повторный вход не нужен",
                     now - _last_success)
            return True
        if now - _last_failure < FAIL_COOLDOWN:
            log.warning("недавняя попытка входа не удалась (%.0fс назад) — жду",
                        now - _last_failure)
            return False

        ok = await _do_login(headless=headless)
        if ok:
            _last_success = time.time()
        else:
            _last_failure = time.time()
        return ok


async def _do_login(*, headless: bool) -> bool:
    """Сам вход: та же логика, что в tools/login.py (селекторы из selectors.yaml,
    Enter в поле пароля, затем клик по «Войти» как запасной путь)."""
    from config import _env, load_selectors

    login_url = _env("GC_LOGIN_URL")
    email = _env("GC_MODERATOR_EMAIL")
    password = _env("GC_MODERATOR_PASSWORD")
    if not (login_url and email and password):
        log.warning("нет GC_LOGIN_URL/EMAIL/PASSWORD в .env — авто-вход невозможен")
        return False

    sel = (load_selectors() or {}).get("login", {}) or {}
    email_sel = sel.get("email_input") or "input[name='email']"
    pw_sel = sel.get("password_input") or "input[name='password'], input[type='password']"
    submit_sel = sel.get("submit_button") or "button:has-text('Войти')"
    captcha_sel = (
        "iframe[src*='captcha' i], iframe[src*='recaptcha' i], "
        "[class*='captcha' i], [id*='captcha' i]"
    )

    browser = None
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=headless)
            ctx = await browser.new_context()
            page = await ctx.new_page()
            # ⚠️ НЕ ждём networkidle: с 03.09.2026 страница входа GetCourse
            # держит постоянное соединение (виджет/аналитика), «тишины в сети»
            # не наступает никогда — goto падал по таймауту, и профилактическое
            # обновление сессии три ночи подряд заканчивалось ложной тревогой
            # «запустите tools/login.py». Ждём разметку, а готовность формы —
            # по самому полю ввода.
            await page.goto(login_url, wait_until="domcontentloaded", timeout=45_000)
            try:
                await page.locator(email_sel).first.wait_for(state="visible",
                                                             timeout=20_000)
            except Exception:
                log.warning("поле входа не появилось на «%s» — авто-вход прекращён",
                            login_url)
                return False

            if await page.locator(captcha_sel).count() > 0:
                log.warning("на странице входа капча — авто-вход прекращён")
                return False

            await page.locator(email_sel).first.fill(email, timeout=15_000)
            await page.locator(pw_sel).first.fill(password, timeout=15_000)

            if await page.locator(captcha_sel).count() > 0:
                log.warning("капча появилась после ввода данных — прекращаю")
                return False

            await page.locator(pw_sel).first.press("Enter")
            if not await _wait_logged_in(page, pw_sel, captcha_sel):
                # Форма могла проигнорировать Enter — пробуем явную кнопку.
                try:
                    await page.locator(submit_sel).first.click(timeout=5_000)
                except Exception:
                    pass
                if not await _wait_logged_in(page, pw_sel, captcha_sel):
                    log.warning("вход не подтвердился (форма входа осталась)")
                    return False

            # ⚠️ «Ушли со страницы входа» — СЛАБЫЙ признак успеха: GetCourse может
            # отдать промежуточную страницу (подтверждение устройства и т.п.), где
            # тоже нет поля пароля. Если поверить ей на слово, мы перезапишем
            # РАБОЧУЮ сессию нерабочей и обрушим сразу все комнаты. Поэтому
            # проверяем делом: заходим в настоящую комнату и убеждаемся, что нас
            # не увело на публичный лендинг (именно так выглядит «не залогинен»).
            if not await _verify_room_access(page):
                log.warning("вход выглядел успешным, но комната недоступна — "
                            "СТАРУЮ сессию не трогаю")
                return False

            STORAGE_STATE.parent.mkdir(parents=True, exist_ok=True)
            await ctx.storage_state(path=str(STORAGE_STATE))
            log.info("сессия GetCourse обновлена автоматически (доступ к комнате проверен)")
            return True
    except Exception:
        log.exception("авто-вход в GetCourse не удался")
        return False
    finally:
        if browser is not None:
            try:
                await browser.close()
            except Exception:
                pass


async def _verify_room_access(page) -> bool:
    """Проверяем вход ДЕЛОМ: открываем реальную комнату вебинара и смотрим, не
    увело ли нас на публичный лендинг. Признак «залогинены» — остались на
    `/pl/webinar` (у гостя GetCourse редиректит на маркетинговую страницу вроде
    `/neiro-photo`, проверено вживую 2026-08-04). True — доступ есть.

    Если комнат в конфиге нет или проверка сорвалась технически — возвращаем
    True (не блокируем обновление сессии из-за самой проверки), но такой случай
    логируем: лучше обновить сессию, чем не обновить из-за пустого webinars.yaml.
    """
    try:
        from config import load_webinars
        rooms = [w for w in (load_webinars() or []) if getattr(w, "url", "")]
        if not rooms:
            log.info("нет комнат в webinars.yaml — проверку доступа пропускаю")
            return True
        url = rooms[0].url
        await page.goto(url, wait_until="domcontentloaded", timeout=45_000)
        await page.wait_for_timeout(2_000)
        ok = "/pl/webinar" in page.url
        if not ok:
            log.warning("после входа комната увела на «%s» — похоже, не залогинены",
                        page.url)
        return ok
    except Exception:
        log.exception("проверка доступа к комнате сорвалась технически — "
                      "считаю вход состоявшимся")
        return True


async def _wait_logged_in(page, pw_sel: str, captcha_sel: str,
                          attempts: int = 20) -> bool:
    """Ждём признак успеха: ушли со страницы входа И поле пароля пропало."""
    for _ in range(attempts):
        await page.wait_for_timeout(750)
        try:
            if await page.locator(captcha_sel).count() > 0:
                return False
            pw_count = await page.locator(pw_sel).count()
            pw_visible = (
                await page.locator(pw_sel).first.is_visible() if pw_count else False
            )
            if "login" not in page.url.lower() and not pw_visible:
                return True
        except Exception:
            # Страница может перерисовываться прямо во время проверки — не беда.
            continue
    return False
