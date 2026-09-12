"""Фоны через Qwen (DashScope, международный эндпоинт).

Картинку рисует модель, текст поверх — наш генератор: типографика и русские
надписи остаются нашими, модель отвечает только за фон.
"""

import os
import time
import asyncio
import logging
import tempfile

import requests

logger = logging.getLogger(__name__)

DEFAULT_BASE = "https://dashscope-intl.aliyuncs.com"
DEFAULT_MODEL = "qwen-image-3.0"

# бесплатная квота на Model Studio считается по каждой модели отдельно:
# если у одной она кончилась (403 FreeTierOnly) — пробуем следующую
FALLBACK_MODELS = ["qwen-image-3.0", "qwen-image-2.0", "z-image-turbo", "qwen-image-3.0-pro"]

SIZE_CAROUSEL = "1080*1350"
SIZE_VERTICAL = "1080*1920"

# сколько картинок генерим одновременно (на бесплатном тарифе лимит жёсткий)
CONCURRENCY = 2
TIMEOUT = 180
RETRY_429 = 2          # повторы при «слишком часто»
RETRY_PAUSE = 8

# причина последней неудачи — бот показывает её пользователю
_last_error = ""

# модели, у которых кончилась квота в этом запуске — не дёргаем повторно
_dead_models = set()


def last_error() -> str:
    return _last_error


def _explain(code: str, message: str) -> str:
    if code == "AllocationQuota.FreeTierOnly":
        return ("закончилась бесплатная квота Qwen на всех моделях — привяжи оплату "
                "в консоли Model Studio (или выключи режим «use free tier only»)")
    if code.startswith("Throttling"):
        return "Qwen ограничил частоту запросов — попробуй через пару минут"
    if code in ("InvalidApiKey", "invalid_api_key"):
        return "ключ Qwen не принят — проверь QWEN_API_KEY"
    return (message or code or "Qwen не ответил")[:200]


def _key() -> str:
    # читаем лениво: load_dotenv() в bot.py срабатывает после импорта модуля
    return (os.getenv("QWEN_API_KEY") or "").strip()


def _endpoint() -> str:
    base = (os.getenv("QWEN_BASE_URL") or DEFAULT_BASE).rstrip("/")
    return f"{base}/api/v1/services/aigc/multimodal-generation/generation"


def _models() -> list:
    """Список моделей по порядку: сначала выбранная, потом запасные."""
    first = os.getenv("QWEN_IMAGE_MODEL") or DEFAULT_MODEL
    return [first] + [m for m in FALLBACK_MODELS if m != first]


def enabled() -> bool:
    return bool(_key())


# ── промпты ─────────────────────────────────────────────────────────────────

NO_TEXT = (
    "без текста, без надписей, без букв, без цифр, без логотипов, "
    "no text, no letters, no watermark"
)

BASE_LOOK = (
    "фотографический фон для слайда соцсетей, минимализм, мягкий естественный свет, "
    "много свободного пространства в центре, малая глубина резкости, "
    "приглушённые тона, тонкая фактура, без коллажей и рамок"
)


def _palette_hint(colors: dict) -> str:
    bg = colors.get("bg", "#F6F0E4")
    accent = colors.get("accent", "#C2693E")
    return f"доминирующий цвет {bg}, акценты {accent}"


def carousel_bg_prompt(slide: dict, colors: dict) -> str:
    topic = (slide.get("topic") or "").strip()
    title = (slide.get("title") or "").strip()
    subject = ", ".join(x for x in (topic, title) if x) or "спокойная рабочая атмосфера"
    return (
        "Атмосферная предметная фотография для фона слайда: спокойная сцена "
        "(рабочий стол, свет из окна, ткань, интерьер, растения, бумага), "
        f"настроение по теме «{subject}» — передай атмосферу, а не буквальный предмет из названия. "
        f"{BASE_LOOK}, {_palette_hint(colors)}. {NO_TEXT}."
    )


def cover_bg_prompt(topic: str, colors: dict) -> str:
    subject = (topic or "").strip()[:200] or "яркая тема для рилса"
    return (
        f"Вертикальный кинематографичный фон для обложки Reels по теме: {subject}. "
        f"эффектный свет, контраст, крупный простой сюжет, место для крупного заголовка сверху и снизу, "
        f"{_palette_hint(colors)}. {NO_TEXT}."
    )


def story_bg_prompt(slide: dict, colors: dict) -> str:
    hint = (slide.get("bg_prompt") or "").strip()
    if not hint:
        hint = (slide.get("title") or slide.get("text") or "").strip()[:200]
    return (
        f"Вертикальный фон для сторис: {hint or 'спокойная атмосферная сцена'}. "
        f"{BASE_LOOK}, {_palette_hint(colors)}. {NO_TEXT}."
    )


# ── генерация ───────────────────────────────────────────────────────────────

def generate_image(prompt: str, size: str = SIZE_CAROUSEL) -> str | None:
    """Синхронно рисует картинку и возвращает путь к временному PNG."""
    global _last_error
    key = _key()
    if not key:
        _last_error = "не задан QWEN_API_KEY"
        return None
    data = None
    try:
        for model in _models():
            if model in _dead_models:
                continue
            payload = {
                "model": model,
                "input": {"messages": [{"role": "user", "content": [{"text": prompt}]}]},
                "parameters": {
                    "size": size,
                    "n": 1,
                    "prompt_extend": True,
                    "watermark": False,
                },
            }
            for attempt in range(RETRY_429 + 1):
                r = requests.post(
                    _endpoint(),
                    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                    json=payload,
                    timeout=TIMEOUT,
                )
                if r.status_code == 429 and attempt < RETRY_429:
                    time.sleep(RETRY_PAUSE)
                    continue
                break

            if r.status_code == 200:
                data = r.json()
                break

            logger.error(f"Qwen image [{model}] HTTP {r.status_code}: {r.text[:300]}")
            try:
                err = r.json()
            except Exception:
                err = {}
            code = err.get("code", "")
            _last_error = _explain(code, err.get("message", ""))
            # квота модели кончилась / модель не подходит — больше её не дёргаем
            if code in ("AllocationQuota.FreeTierOnly", "InvalidParameter", "ModelNotFound"):
                _dead_models.add(model)
                continue
            return None

        if data is None:
            return None

        url = None
        for choice in data.get("output", {}).get("choices", []):
            for part in choice.get("message", {}).get("content", []):
                if part.get("image"):
                    url = part["image"]
                    break
        if not url:
            logger.error(f"Qwen image: нет картинки в ответе: {str(data)[:300]}")
            _last_error = "Qwen вернул ответ без картинки"
            return None

        img = requests.get(url, timeout=TIMEOUT)
        img.raise_for_status()
        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        tmp.write(img.content)
        tmp.close()
        _last_error = ""
        return tmp.name
    except Exception as e:
        logger.error(f"Qwen image error: {e}")
        _last_error = f"сбой связи с Qwen: {e}"
        return None


async def generate_image_async(prompt: str, size: str = SIZE_CAROUSEL) -> str | None:
    return await asyncio.to_thread(generate_image, prompt, size)


async def generate_many(prompts: list, size: str = SIZE_CAROUSEL, on_done=None) -> list:
    """Параллельно рисует список фонов. Порядок результата = порядок промптов,
    None — если конкретный фон не получился (слайд просто нарисуется без фото)."""
    sem = asyncio.Semaphore(CONCURRENCY)
    done = 0
    total = len([p for p in prompts if p])

    async def one(prompt):
        nonlocal done
        if not prompt:
            return None
        async with sem:
            path = await generate_image_async(prompt, size)
        done += 1
        if on_done:
            try:
                await on_done(done, total)
            except Exception:
                pass
        return path

    return await asyncio.gather(*(one(p) for p in prompts))
