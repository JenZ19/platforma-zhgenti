"""Точка входа бота-модератора автовебинаров GetCourse.

Один процесс, один asyncio-цикл: параллельно крутятся
  - aiogram polling (Telegram-мост, tg_bridge);
  - WebinarScheduler (открывает/закрывает окна наблюдения по расписанию).
Каждый — под супервайзером supervised(): падение одного не роняет другой.

Запуск:  python bot.py     (режим берётся из .env: MODE=observe по умолчанию)
Настройка и калибровка — см. README.md.
"""
from __future__ import annotations

import asyncio
import logging
import signal
import time
from pathlib import Path

from aiogram import Bot, Dispatcher

import faq_store as store
import tg_bridge
from config import Settings, _env, load_templates, load_webinars
from context import App
from knowledge import load_docs
from scheduler import WebinarScheduler, supervised

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("moderator")

HERE = Path(__file__).resolve().parent


# --- Сборка приложения -------------------------------------------------------

async def build_app() -> App:
    if _env("ENABLE_LIVE_INTEGRATIONS") != "I_UNDERSTAND":
        raise SystemExit(
            "Живой runtime заблокирован: сначала настройте свои доступы и "
            "явно задайте ENABLE_LIVE_INTEGRATIONS=I_UNDERSTAND."
        )
    settings = Settings.load()
    if not settings.bot_token:
        raise SystemExit("Не задан BOT_TOKEN (см. .env.example)")

    bot = Bot(settings.bot_token)
    dp = Dispatcher()
    db = store.connect()
    store.prune(db)  # подчистить старые маппинги/хэши при старте

    app = App(
        bot=bot,
        dp=dp,
        db=db,
        settings=settings,
        webinars=load_webinars(),
        templates=load_templates(),
        knowledge=load_docs(HERE, settings.knowledge_dir),
        mode=settings.mode,
        started_at=time.time(),
    )
    app.scheduler = WebinarScheduler(app)

    # Регистрируем все Telegram-хендлеры.
    tg_bridge.register(dp, app)

    me = await bot.get_me()
    log.info("Запущен @%s | режим=%s | вебинаров=%d | шаблонов=%d",
             me.username, app.mode, len(app.webinars), len(app.templates))
    if settings.auto_answer and app.mode == "auto":
        log.info("Авто-ответы ВКЛЮЧЕНЫ (только утверждённые шаблоны).")
    else:
        log.info("Авто-ответы выключены (посты в чат только по вашей команде).")
    return app


async def shutdown(app: App) -> None:
    log.info("Останавливаюсь…")
    try:
        if app.scheduler is not None:
            await app.scheduler.shutdown()  # type: ignore[attr-defined]
    except Exception:
        log.exception("Ошибка при остановке наблюдателей")
    # Общий на процесс chromium закрываем ОДИН раз здесь: наблюдатели его
    # больше не закрывают (он не их, см. watcher.shared_browser).
    try:
        if app.browser is not None:
            await app.browser.close()  # type: ignore[union-attr]
        if app.pw is not None:
            await app.pw.stop()  # type: ignore[union-attr]
    except Exception:
        log.exception("Ошибка при закрытии общего браузера")
    try:
        await app.bot.session.close()
    except Exception:
        pass
    try:
        app.db.close()
    except Exception:
        pass


async def main() -> None:
    app = await build_app()

    tasks = [
        asyncio.create_task(
            supervised("aiogram",
                       lambda: app.dp.start_polling(app.bot, handle_signals=False,
                                                    allowed_updates=["message", "callback_query"]),
                       restart=True),
            name="aiogram"),
        asyncio.create_task(
            supervised("scheduler", app.scheduler.run, restart=True),  # type: ignore[attr-defined]
            name="scheduler"),
    ]

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for s in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(s, stop.set)
        except NotImplementedError:  # на некоторых платформах недоступно
            pass

    await stop.wait()
    for t in tasks:
        t.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    await shutdown(app)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
