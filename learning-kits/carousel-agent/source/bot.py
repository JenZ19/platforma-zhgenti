import os
import re
import json
import asyncio
import base64
import random
import shutil
import tempfile
import uuid
import logging
from pathlib import Path
from dotenv import dotenv_values

KIT_ROOT = Path(__file__).resolve().parent.parent
CONFIG_NAMES = {
    "TELEGRAM_TOKEN", "OPENAI_API_KEY", "ALLOWED_USER_IDS", "ALLOWED_CHAT_IDS",
    "PUBLIC_TELEGRAM_LINK", "CAROUSEL_STATE_DIR", "QWEN_API_KEY",
    "QWEN_IMAGE_MODEL", "QWEN_BASE_URL", "TRANSCRIBE_API_KEY",
    "TRANSCRIBE_BASE_URL", "TRANSCRIBE_MODEL", "TRANSCRIBE_TIDY_MODEL",
}
# Никогда не наследуем ключи рабочего бота или родительской оболочки.
for name in CONFIG_NAMES:
    os.environ.pop(name, None)
kit_config = dotenv_values(KIT_ROOT / ".env") if (KIT_ROOT / ".env").is_file() else {}
for name in CONFIG_NAMES:
    value = kit_config.get(name)
    if value:
        os.environ[name] = value

from telegram import Update, InputMediaPhoto, InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    CallbackQueryHandler, filters, ContextTypes, TypeHandler,
)
from openai import OpenAI
from carousel_generator import CarouselGenerator, STYLES, get_theme
import qwen_bg
import transcribe
from access_control import configured_ids, is_allowed, safe_state_dir

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
generator = CarouselGenerator()

# модели: карусель — gpt-4o; кликбейт-обложка — умнее (при ошибке откат на gpt-4o)
CAROUSEL_MODEL = "gpt-4o"
COVER_MODEL = "gpt-4o"

# Собственная публичная ссылка ученицы; исходное личное значение удалено.
TELEGRAM_LINK = os.getenv("PUBLIC_TELEGRAM_LINK", "")

sessions: dict = {}

# сессии переживают перезапуск: launchd рестартует бота, а мастер продолжается
STATE_DIR = safe_state_dir(Path(os.getenv("CAROUSEL_STATE_DIR") or KIT_ROOT / "runtime-data"), KIT_ROOT)
SESSIONS_FILE = STATE_DIR / "sessions.json"


def _session_to_json(s: dict) -> dict:
    out = {}
    for k, v in s.items():
        if k == "photo_selection":
            out[k] = sorted(v)
        elif k in ("lib_photos", "screen_photos"):
            out[k] = {str(kk): vv for kk, vv in (v or {}).items()}
        elif k == "pending_screens":
            out[k] = [list(x) for x in (v or [])]
        else:
            try:
                json.dumps(v)
            except TypeError:
                continue
            out[k] = v
    return out


def save_sessions():
    try:
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        data = {str(uid): _session_to_json(s) for uid, s in sessions.items()}
        tmp = SESSIONS_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False))
        tmp.replace(SESSIONS_FILE)
    except Exception as e:
        logger.error(f"Не сохранила сессии: {e}")


def _alive(path) -> bool:
    return bool(path) and os.path.exists(path)


def load_sessions():
    if not SESSIONS_FILE.exists():
        return
    try:
        data = json.loads(SESSIONS_FILE.read_text())
    except Exception as e:
        logger.error(f"Не прочитала сессии: {e}")
        return
    for uid, s in data.items():
        s["photo_selection"] = set(s.get("photo_selection") or [])
        for key in ("lib_photos", "screen_photos"):
            s[key] = {int(k): v for k, v in (s.get(key) or {}).items() if _alive(v)}
        s["pending_screens"] = [tuple(x) for x in (s.get("pending_screens") or [])]
        # временные файлы могли не пережить перезапуск — выкидываем пропавшие
        s["photos"] = [p for p in (s.get("photos") or []) if _alive(p.get("path"))]
        s["pending_rest_photos"] = [p for p in (s.get("pending_rest_photos") or []) if _alive(p)]
        if not _alive(s.get("pending_cover_photo")):
            s["pending_cover_photo"] = None
        try:
            sessions[int(uid)] = s
        except ValueError:
            continue
    logger.info(f"Восстановлено сессий: {len(sessions)}")

THEME_NAMES = {
    "warm":       "🤎 Крем",
    "terracotta": "🧱 Терракота",
    "olive":      "🫒 Олива",
    "mocha":      "☕ Мокко",
    "blush":      "🌸 Пудра",
}

# арт-дирекшены из генератора + режим-сюрприз
SURPRISE = "surprise"
STYLE_NAMES = {SURPRISE: "🎲 Сюрприз", **{k: v["label"] for k, v in STYLES.items()}}


def resolve_theme(s) -> str:
    """Стиль → конкретная палитра. Сюрприз не повторяет последние стили,
    палитра внутри стиля тоже чередуется."""
    style = s.get("style", SURPRISE)
    if style == SURPRISE:
        history = s.setdefault("style_history", [])
        pool = [k for k in STYLES if k != "classic" and k not in history[-3:]]
        style_pick = random.choice(pool)
        history.append(style_pick)
        if len(history) > 12:
            del history[:-6]
    else:
        style_pick = style
    palettes = STYLES[style_pick]["palettes"]
    fresh = [p for p in palettes if p != s.get("theme")] or palettes
    s["theme"] = random.choice(fresh)
    s["resolved_style"] = style_pick
    return style_pick

# шаги мастера
STEP_IDLE = "idle"
STEP_MODE = "await_mode"
STEP_TEXT = "await_text"
STEP_PHOTO = "await_photo"
STEP_CTA = "await_cta"
STEP_THEME = "await_theme"
STEP_PHOTO_SELECT = "await_photo_select"
STEP_STORY_SOURCE = "await_story_source"
STEP_ENGINE = "await_engine"
STEP_LIBRARY = "await_library"
STEP_SCREENS = "await_screens"
STEP_TRANSCRIBE = "await_reel"   # ждём ссылку на рилс или видеофайл
STEP_DONE = "done"


# ── база изображений: бот сам подбирает фото к слайдам ──────────────────────

LIB_DIR = STATE_DIR / "library"
LIB_INDEX = LIB_DIR / "library.json"

VISION_PROMPT = """Опиши фото для каталога изображений в одну строку по-русски.
Верни ТОЛЬКО JSON: {"description": "что на фото, 5-12 слов", "tags": ["3-6 тегов"], "kind": "portrait|scene|object|screenshot"}
kind: portrait — есть человек/лицо крупно; scene — обстановка/место; object — предмет/деталь; screenshot — скриншот экрана."""

MATCH_PROMPT = """Подбери фотографии из базы к слайдам Instagram-карусели.

База (id → описание):
{library}

Слайды и какая картинка им нужна:
{wishes}

Верни ТОЛЬКО JSON вида {{"<номер слайда>": "<id фото>" или null}}.
Правила: одно фото — максимум одному слайду; подбирай только если фото реально подходит по смыслу, иначе null.
Для слайда 1 (обложка) подходит только выразительное фото с человеком (kind portrait) или атмосферная сцена."""


def lib_load() -> list:
    try:
        return json.loads(LIB_INDEX.read_text())
    except Exception:
        return []


def lib_save(items: list):
    LIB_DIR.mkdir(exist_ok=True)
    LIB_INDEX.write_text(json.dumps(items, ensure_ascii=False, indent=1))


def lib_describe(path: str) -> dict:
    """gpt-4o vision: описание + теги для фото."""
    b64 = base64.b64encode(open(path, "rb").read()).decode()
    resp = client.chat.completions.create(
        model=CAROUSEL_MODEL,
        max_tokens=200,
        messages=[{"role": "user", "content": [
            {"type": "text", "text": VISION_PROMPT},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "low"}},
        ]}],
    )
    raw = resp.choices[0].message.content
    if not raw:  # отказ/пустой ответ — сохраняем с нейтральным описанием
        logger.warning("lib_describe: empty/refused vision response")
        return {"description": "фото без описания", "tags": [], "kind": "scene"}
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    try:
        return json.loads(raw)
    except Exception:
        return {"description": raw[:80], "tags": [], "kind": "scene"}


def lib_add(src_path: str) -> dict:
    """Описывает фото и кладёт его в базу. Возвращает запись."""
    meta = lib_describe(src_path)
    LIB_DIR.mkdir(exist_ok=True)
    item_id = uuid.uuid4().hex[:8]
    dst = LIB_DIR / f"{item_id}.jpg"
    shutil.copyfile(src_path, dst)
    item = {
        "id": item_id,
        "file": dst.name,
        "description": meta.get("description", ""),
        "tags": meta.get("tags", []),
        "kind": meta.get("kind", "scene"),
    }
    items = lib_load()
    items.append(item)
    lib_save(items)
    return item


def lib_match(slides: list) -> dict:
    """Подбирает фото базы к слайдам по image_hint. Возвращает {slide_num: path}."""
    items = lib_load()
    if not items:
        return {}
    wishes = []
    for sl in slides:
        hint = sl.get("image_hint")
        # фото не предлагаем слайдам с содержательным визуалом (таблицы/схемы/списки):
        # фото вытеснило бы визуал вместе с его текстом
        has_visual = sl.get("visual_type") not in ("none", "", None)
        if hint and not (has_visual and sl.get("slide_number", 1) != 1):
            wishes.append(f'слайд {sl.get("slide_number")}: {hint}')
    if not wishes:
        return {}
    lib_desc = "\n".join(
        f'{it["id"]}: {it["description"]} [{it["kind"]}; {", ".join(it.get("tags", []))}]'
        for it in items
    )
    try:
        resp = client.chat.completions.create(
            model=CAROUSEL_MODEL,
            max_tokens=300,
            messages=[{"role": "user", "content": MATCH_PROMPT.format(
                library=lib_desc, wishes="\n".join(wishes))}],
        )
        raw = resp.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        picks = json.loads(raw)
    except Exception as e:
        logger.error(f"lib_match error: {e}")
        return {}
    by_id = {it["id"]: str(LIB_DIR / it["file"]) for it in items}
    result = {}
    used = set()
    for sn, pid in picks.items():
        if pid and pid in by_id and pid not in used:
            try:
                result[int(sn)] = by_id[pid]
                used.add(pid)
            except ValueError:
                pass
    return result


def get_session(user_id: int) -> dict:
    if user_id not in sessions:
        sessions[user_id] = {
            "step": STEP_IDLE,
            "mode": "carousel",     # carousel | reels
            "cover_manual": False,  # для reels: True — заголовок пишет пользователь
            "texts": [],
            "photos": [],   # [{path}]  — режим бот выбирает сам
            "style": SURPRISE,      # арт-дирекшен (или сюрприз)
            "style_history": [],
            "theme": "warm",        # конкретная палитра (резолвится из стиля)
            "username": "@my_project",
            "cta_text": "Сохрани, чтобы не потерять",
            "cta_subtext": "",
            "cta_auto": False,
            "engine": None,      # free | qwen — чем рисуем картинки
        }
    return sessions[user_id]


def reset_session(s: dict, mode: str = None):
    if mode:
        s["mode"] = mode
    s["step"] = STEP_TEXT
    s["cover_manual"] = False
    s["texts"] = []
    s["photos"] = []
    s["lib_photos"] = {}
    s["screen_photos"] = {}
    s["pending_screens"] = []
    s["engine"] = None


MAIN_KEYBOARD = ReplyKeyboardMarkup(
    [[KeyboardButton("▶️ Старт")]],
    resize_keyboard=True,
    input_field_placeholder="Нажми Старт или /start",
)


def mode_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("📲 Карусель", callback_data="mode:carousel")],
        [InlineKeyboardButton("🔥 Кликбейт-обложка для Reels", callback_data="mode:reels")],
        [InlineKeyboardButton("📱 Серия сториз", callback_data="mode:story")],
        [InlineKeyboardButton("🎬 Рилс → текст", callback_data="mode:transcribe")],
        [InlineKeyboardButton("✍️ Подпись к посту", callback_data="mode:caption")],
        [InlineKeyboardButton(f"🗂 База фото ({len(lib_load())})", callback_data="mode:library")],
    ])


def screens_keyboard(last: bool = False):
    rows = [[InlineKeyboardButton("⏭ Пропустить этот скрин", callback_data="screen:skip")]]
    if not last:
        rows.append([InlineKeyboardButton("⏩ Пропустить все, рисуем", callback_data="screen:skipall")])
    return InlineKeyboardMarkup(rows)


def story_source_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🎨 Сгенерировать фоны (DALL-E)", callback_data="story:ai")],
        [InlineKeyboardButton("📷 Свои фото", callback_data="story:photos")],
    ])


def caption_type_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🎠 Карусель", callback_data="captype:carousel")],
        [InlineKeyboardButton("🎬 Reels / Shorts", callback_data="captype:reels")],
        [InlineKeyboardButton("🖼 Обычный пост", callback_data="captype:feed")],
    ])


def cover_source_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("✨ Придумает бот", callback_data="cover:ai")],
        [InlineKeyboardButton("✍️ Напишу сам", callback_data="cover:manual")],
    ])


def parse_manual_headline(text: str):
    """Ручной заголовок → части обложки. Главную фразу пользователь выделяет *звёздочками*:
    'Забудьте всё о *генерации видео* — это тренд' → lead / punch / tail."""
    m = re.search(r"\*(.+?)\*", text)
    if m:
        punch = m.group(1).strip()
        lead = text[:m.start()].replace("*", "").strip(" —-,.")
        tail = text[m.end():].replace("*", "").strip(" —-,.")
    else:
        # без звёздочек — весь текст идёт крупной фразой
        punch = text.replace("*", "").strip()
        lead = tail = ""
    return {"kicker": "", "lead": lead, "punch": punch, "tail": tail}


def skip_photo_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("➡️ Без фото, к выбору стиля", callback_data="wiz:skip_photo")],
    ])


def photo_next_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("✅ Хватит фото, дальше", callback_data="wiz:to_theme")],
    ])


def photo_select_keyboard(slides, selected: set, photos_left: int):
    """Клавиатура выбора слайдов для фото. selected — set(slide_number)."""
    rows = []
    for sl in slides:
        sn = sl.get("slide_number", 0)
        if sn == 1:
            continue  # обложка уже с фото
        title = sl.get("title", f"Слайд {sn}")[:28]
        mark = "✅" if sn in selected else "◻️"
        rows.append([InlineKeyboardButton(
            f"{mark} {sn:02d} — {title}",
            callback_data=f"phslide:{sn}"
        )])
    chosen = len(selected)
    rows.append([InlineKeyboardButton(
        f"🎨 Готово — выбрано {chosen} из {photos_left} фото",
        callback_data="phslide:confirm"
    )])
    return InlineKeyboardMarkup(rows)


def engine_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🆓 Бесплатно", callback_data="engine:free")],
        [InlineKeyboardButton("✨ ИИ-фоны через Qwen", callback_data="engine:qwen")],
    ])


ENGINE_QUESTION = {
    "carousel": (
        "Как рисуем слайды?\n\n"
        "🆓 Бесплатно — фирменные фоны и фактуры бота.\n"
        "✨ Qwen — под каждый слайд ИИ рисует свой фон, текст сверху остаётся нашим "
        "(платно, ~1 ₽ за слайд, дольше на минуту)."
    ),
    "reels": (
        "Как рисуем обложку?\n\n"
        "🆓 Бесплатно — фон из палитры стиля.\n"
        "✨ Qwen — ИИ нарисует фон под тему рилса (платно)."
    ),
    "story": (
        "Чем рисуем фоны сторизам?\n\n"
        "🆓 Бесплатно — как раньше: твои фото, остальным DALL·E.\n"
        "✨ Qwen — фоны рисует Qwen (платно)."
    ),
}


def cta_keyboard():
    presets = [
        ("💾 Сохрани, чтобы не потерять", "Сохрани, чтобы не потерять"),
        ("👯 Поделись с подругой", "Поделись с подругой"),
        ("💌 Напиши мне в директ", "Напиши мне в директ"),
        ("🙋 Пиши — разберём твою задачу", "Пиши — разберём твою задачу"),
    ]
    return InlineKeyboardMarkup(
        [[InlineKeyboardButton(label, callback_data=f"cta:{val}")] for label, val in presets]
        + [[InlineKeyboardButton("✏️ Свой вариант", callback_data="cta:__custom__")]]
        + [[InlineKeyboardButton("🤖 Пусть GPT придумает по тексту", callback_data="cta:__auto__")]]
    )


def theme_keyboard(current: str, with_restart: bool = False):
    """Клавиатура выбора стиля (арт-дирекшена)."""
    rows = []
    items = list(STYLE_NAMES.items())
    for i in range(0, len(items), 2):
        row = []
        for key, label in items[i:i+2]:
            mark = "✓ " if key == current else ""
            row.append(InlineKeyboardButton(mark + label, callback_data=f"style:{key}"))
        rows.append(row)
    if with_restart:
        rows.append([InlineKeyboardButton("🔁 Ещё вариант этого стиля", callback_data="style:__reroll__")])
        rows.append([InlineKeyboardButton("🆕 Новая карусель", callback_data="wiz:restart")])
    return InlineKeyboardMarkup(rows)


# число вместе с единицей: «40», «40%», «40 минут» — это разные вещи
_NUM_RE = re.compile(r"\d+(?:[.,]\d+)?\s*(?:%|×|x|k|к|тыс)?", re.IGNORECASE)


def _numbers(value) -> list:
    return [m.replace(" ", "").lower() for m in _NUM_RE.findall(str(value or "")) if m.strip()]


def drop_invented_numbers(slides: list, source: str):
    """Цифры в визуале должны стоять в тексте автора. Выдуманные — снимаем визуал,
    иначе бот подписывает автору цифры, которых тот не говорил."""
    have = set(_numbers(source))
    for sl in slides:
        vt = sl.get("visual_type")
        vd = sl.get("visual_data") or {}
        if vt not in ("progress_bar", "big_stat", "number"):
            continue
        if vt == "progress_bar":
            used = _numbers(vd.get("value_before")) + _numbers(vd.get("value_after"))
            fallback = [x for x in (vd.get("label_before"), vd.get("label_after")) if x]
        elif vt == "big_stat":
            used = [n for st in (vd.get("stats") or []) for n in _numbers(st.get("number"))]
            fallback = [st.get("label") for st in (vd.get("stats") or []) if st.get("label")]
        else:
            used = _numbers(vd.get("big_number"))
            fallback = [vd.get("caption")] if vd.get("caption") else []
        if used and all(n in have for n in used):
            continue
        logger.info("Визуал %s на слайде %s снят: цифр нет в тексте автора",
                    vt, sl.get("slide_number"))
        sl["visual_type"], sl["visual_data"] = "none", {}
        if not sl.get("body_lines") and fallback:
            sl["body_lines"] = [str(x) for x in fallback]


STRUCTURE_PROMPT = """Ты — ВЁРСТЩИК Instagram-каруселей. Ты НЕ редактор, НЕ копирайтер, НЕ сокращатель.
Тебе дают готовый текст автора. Твоя работа — КРАСИВО РАЗЛОЖИТЬ его по слайдам, сохранив КАЖДОЕ слово.

Верни JSON-массив слайдов (ТОЛЬКО JSON, без объяснений):

[
  {{
    "slide_number": 1,
    "total_slides": N,
    "topic": "2-3 СЛОВА",
    "label": "КАТЕГОРИЯ",
    "title": "Заголовок",
    "accent_word": "слово",
    "body_lines": ["строка 1", "строка 2"],
    "visual_type": "none",
    "visual_data": {{}}
  }}
]

🚫 СТРОГО ЗАПРЕЩЕНО:
- ставить символы-маркеры и emoji в начало пунктов и строк (•, ▪, –, *, ✅, 🔹) — маркеры и галочки бот рисует сам. Пункты списков и body_lines начинай сразу со слова.
- сокращать текст, «делать короче», ужимать
- перефразировать, заменять слова автора своими
- выбрасывать предложения, детали, мысли
- придумывать текст, которого нет в оригинале

✅ ГЛАВНОЕ ПРАВИЛО:
Весь текст автора должен попасть в карусель ДОСЛОВНО. Если склеить все body_lines всех слайдов подряд — должен получиться исходный текст целиком, без потерь. Проверь это перед ответом.

КАК РАСКЛАДЫВАТЬ:
- Раздели текст на логические куски (абзац / законченная мысль) — это и есть слайды
- 4–10 слайдов; текста много → делай больше слайдов И/ИЛИ больше строк на слайде. Не теряй ничего.
- body_lines = ДОСЛОВНЫЕ предложения автора, разбитые по строкам (одно предложение = одна строка)
- title — короткий заголовок слайда (3–7 слов). Заголовки ты ПРИДУМЫВАЕШЬ сам — это НЕ нарушает правило сохранения текста, ведь весь текст автора всё равно целиком идёт в body_lines. Заголовок только подписывает кусок.
  Заголовок обязан быть КОНКРЕТНЫМ — по содержанию именно этого куска: предмет, действие, цифра, результат.
  ЗАПРЕЩЕНЫ пустые ярлыки: «Новая стратегия», «Мой опыт», «Что изменилось», «Попробуй сам», «Итог», «Выводы», «Полезное». Такой заголовок = провал слайда.
  Плохо → хорошо: «Новая стратегия» → «Минута вместо вечера»; «Попробуй сам» → «Собери один пост и сравни»; «Что изменилось» → «Три вещи, которые я перестала делать руками».
  Пиши заголовок живой фразой — с глаголом, цифрой или деталью, а не отглагольным существительным:
  «Изменение процесса вёрстки» → «Верстает бот, а не я»; «Страх однотипности» → «Боялась, что выйдет по-роботски».
  Заголовки не должны повторять друг друга и не должны дословно повторять первую строку body_lines.
- Последний слайд — финальная мысль/вывод автора (+ можно cta_pill)

🎣 ЗАГОЛОВОК 1-ГО СЛАЙДА — ЭТО ХУК (самое важное в карусели!):
Первый заголовок решает, остановится человек или пролистает. Сделай его ВИРУСНЫМ, цепляющим и ТОЧНО ПО ТЕМЕ поста (он должен отражать суть именно этого текста, а не быть общим).
Правила хука:
- 3–8 слов, бьёт прямо в тему и в интерес/боль аудитории
- создаёт интригу ИЛИ обещает конкретную пользу/результат — чтобы невозможно было не открыть
- ЗАПРЕЩЕНЫ общие пустые фразы («Моя история», «Полезный пост», «Несколько советов», «Делюсь опытом») — это провал
- в хуке обязана быть КОНКРЕТИКА из текста: число, срок, предмет, результат или узнаваемая боль. Общий вопрос вроде «Как сократить время на контент?» — слабо; «Карусель за минуту вместо вечера в Канве» — сильно
- приёмы: число, прямой вопрос, провокация, обещание трансформации, недосказанность, обращение к читателю (ты/вы)
- accent_word 1-го слайда — самое сильное слово хука
- body_lines 1-го слайда: 0–1 короткая строка-подводка (основной текст автора уходит на следующие слайды, ничего не теряем)
Рабочие формулы (адаптируй под тему, не копируй буквально):
• «Как [результат] за [срок] / без [усилия]» → Как собрать карусель за вечер без дизайнера
• «[Число] [ошибок/причин/способов], из-за которых…» → 5 ошибок, из-за которых карусели не читают
• «Никто не говорит, что…» / «Вот что на самом деле…» → интрига
• «Если ты тоже [боль]…» → Если ты тоже залипаешь в Canva на час
• «Забудь про X — делай Y» → провокация
• «Почему [привычное] не работает» → вызов

🎨 РАЗНООБРАЗИЕ ОФОРМЛЕНИЯ (но НИКОГДА ценой текста):
- Кусок выглядит как список из слов автора → bullet_list / numbered_list, используя ЭТИ ЖЕ слова автора как пункты
- В тексте есть «было/стало», противопоставление → comparison или two_col словами автора
- В тексте есть шаги/этапы → timeline словами автора
- В тексте есть конкретная цифра-результат → можешь добавить big_stat или progress_bar (текст вокруг всё равно в body_lines)
  🔢 ЦИФРЫ НЕ ВЫДУМЫВАЙ: любое число в визуале (progress_bar, big_stat, number, comparison) должно ДОСЛОВНО стоять в тексте автора.
  Нет в тексте пары «было/стало» с двумя числами — progress_bar брать НЕЛЬЗЯ. Придуманная цифра = ложь в посте автора, это хуже пустого слайда.
- Яркая мысль/вывод автора → quote (дословно)
- Если красивый визуал не получается без выкидывания слов → ставь visual_type "none" и просто аккуратно выложи весь текст в body_lines
Меняй тип слайдов, чтобы было интересно смотреть — но проверка одна: ни одно слово автора не потеряно.

⚠️ НЕ ДУБЛИРУЙ ТЕКСТ: если текст слайда лежит внутри визуала (quote.text, bullet_list.items, numbered_list, checklist, timeline, table и т.п.), НЕ копируй эти же слова ещё и в body_lines. На таком слайде body_lines = [] (пусто) ИЛИ короткая подводка ДРУГИМИ словами. Одна и та же фраза не должна появляться на слайде дважды.

✨ ВЫДЕЛЯЙ ГЛАВНОЕ в body_lines: самую важную мысль строки (цифру, результат, ключевой вывод) оберни в **двойные звёздочки** — на слайде это станет жирным и цветным. 1-2 выделения на слайд, по 2-5 слов, слова автора не меняй. НЕ выделяй целые предложения. Звёздочки используй ТОЛЬКО в body_lines, в других полях — никогда.

Остальное:
- accent_word: одно слово из заголовка для акцента (или null)
- topic: МАКСИМУМ 2-3 слова (например "МОЙ ОПЫТ", "ЛАЙФХАК")
- label: 1-2 слова (например "РЕЗУЛЬТАТ")

{photo_instructions}

visual_type варианты (НЕ используй photo_text — фото добавляются автоматически как фон):
• "none" — только текст
• "table" — visual_data: {{"rows": [{{"label": "...", "value": "...", "accent": false}}]}}
• "cards" — visual_data: {{"cards": [{{"number": "01", "title": "...", "text": "..."}}]}}
• "comparison" — visual_data: {{"left": {{"title": "...", "items": ["..."], "result": "×5"}}, "right": {{"title": "...", "items": ["..."], "result": "×1"}}}}
• "checklist" — visual_data: {{"title": "...", "items": [{{"text": "...", "done": true, "tag": "OK", "tag_color": "#6A8C6A"}}]}}
• "numbered_list" — visual_data: {{"items": [{{"number": 1, "text": "..."}}]}}
• "bullet_list" — visual_data: {{"items": ["...", "..."]}}
• "progress_bar" — visual_data: {{"label_before": "было", "value_before": "40 мин", "label_after": "стало", "value_after": "10 мин"}}
• "big_stat" — visual_data: {{"stats": [{{"number": "40%", "label": "сэкономила времени"}}]}}
• "number" — ОДНА огромная цифра-герой во весь слайд. visual_data: {{"big_number": "17", "caption": "лет — и первый миллион"}}. Используй для яркой цифры/возраста/результата.
• "quote" — visual_data: {{"text": "цитата", "author": null}}. СТРОГО: цитата — только ЗАКОНЧЕННАЯ самостоятельная мысль (полное предложение, минимум 5 слов), взятая дословно. НИКОГДА не обрезай предложение посередине и не бери обрывок фразы. Если такой цельной фразы в тексте нет — не используй quote. На слайде с короткой цитатой body_lines НЕ должен быть пустым.
• "timeline" — visual_data: {{"steps": [{{"number": 1, "title": "Шаг", "text": "пояснение"}}]}}
• "two_col" — visual_data: {{"left_title": "БЫЛО", "left_items": ["..."], "right_title": "СТАЛО", "right_items": ["..."]}}
• "compare_table" — двухколоночная таблица «проблема → ответ» с моноширинными тегами в скобках [ ... ]. visual_data: {{"left_header": "СТРАХ", "right_header": "на каждый есть ответ", "rows": [{{"left": "Вдруг что-то сломает", "right": "read-only"}}]}}. Идеально для «страх→ответ», «миф→правда», «было→стало». 2-4 строки. Правый тег короткий (1-3 слова).
• "number_cards" — вертикальные карточки: цветной кружок-номер 01/02/03 + заголовок + подпись мелким шрифтом. visual_data: {{"items": [{{"number": "01", "title": "Подключаешь нужную базу", "text": "только на чтение, ничего лишнего"}}], "footer_pill": "ничего не копировала вручную"}}. Для шагов/сценариев. footer_pill опционален (плашка ✓ внизу). 2-3 карточки.
• "flow_diagram" — СХЕМА доступа/связей: блок-источник → стрелка → видимый элемент в рамке + затемнённые элементы с замками. visual_data: {{"header": "БАЗА ДАННЫХ", "badge": "В SCOPE: 1 / 4", "source": "connector", "in_scope": ["видимое"], "out_scope": ["скрыто","скрыто","скрыто"], "in_label": "видно", "out_label": "не видно"}}. Для визуализации «что видит/не видит система», прав доступа, scope. Используй когда в тексте речь про доступ/видимость/ограничения.

Дополнительно (опционально):
• "right_label": "ПОДТЕМА" — текст справа в шапке (1-2 слова)
• "cta_pill": "текст кнопки →" — кнопка внизу
• Фон у каждого слайда подбирается автоматически (сетка/линии/свечение/большая цифра) — про фон думать не нужно.

📷 ЖИВЫЕ ФОТО И СКРИНШОТЫ (поля на каждом слайде):
• "image_hint": "какое живое фото усилит слайд, 3-6 слов" или null. Ставь там, где уместна фотография (человек, рабочее место, телефон, атмосфера). Не больше чем на половине слайдов; слайдам с плотным визуалом (таблицы, схемы, списки) — null.
• "needs_screenshot": true + "screenshot_hint": "что должно быть на скрине, коротко" — ТОЛЬКО если в тексте упоминается конкретный результат/статистика/переписка/интерфейс, который убедительнее показать НАСТОЯЩИМ скриншотом автора. Максимум 2 слайда на карусель. Если скрин не нужен — поле не ставь.

Текст пользователя:
{text}"""


CTA_AUTO_PROMPT = """Ты пишешь финальный слайд-призыв Instagram-карусели в стиле Нейронатали.
По тексту поста придумай короткий цепляющий призыв к действию для последнего слайда.

Верни ТОЛЬКО JSON (без объяснений):
{{"cta": "главная фраза 2-5 слов", "subtext": "короткая добивка 4-8 слов или \\"\\""}}

Правила:
- cta — императив или обещание: «Сохрани, чтобы не потерять», «Забери чек-лист», «Пиши — разберём задачу». 2–5 слов.
- subtext — одна короткая строка пояснения ПОД призывом (зачем сохранять / что получишь). Можно "".
- По-русски, живо, по теме поста. ЗАПРЕЩЕНЫ пустые штампы («полезная информация»).

Текст поста:
{text}"""


COVER_PROMPT = """Ты — мастер ВИРУСНЫХ кликбейтных обложек для Reels/Shorts в стиле Нейронатали.
По теме/тексту придумай ОДНУ обложку, которая мгновенно останавливает листание и заставляет нажать.

Обложка строится из ТРЁХ частей с РАЗНЫМ размером шрифта (это важно — не делай всё одинаковым):
- lead — короткая подводка ПЕРЕД главной фразой, мелким шрифтом (например «Забудьте всё, что вы знали о»). Можно "".
- punch — ГЛАВНАЯ ключевая фраза, 1–3 слова, САМЫЙ крупный текст, выделяется цветом. Смысловой центр обложки.
- tail — короткая добивка/обещание ПОСЛЕ главной фразы, средним шрифтом (например «теперь это в тренде»). Можно "".

Верни ТОЛЬКО JSON (без объяснений):
{{"kicker": "...", "lead": "...", "punch": "...", "tail": "..."}}

Правила:
- Вместе lead + punch + tail должны читаться как одна цельная цепляющая фраза.
- punch — короткий и мощный (1–3 слова), это якорь обложки. НЕ запихивай в punch длинное предложение.
- Кликбейт-приёмы: «ты делаешь это неправильно», «никто не говорит», числа/деньги, «секрет», «никогда», «вот почему», незакрытый цикл, прямое обращение.
- kicker — верхняя плашка 1–3 слова ("СМОТРИ ДО КОНЦА", "ШОК", "ВАЖНО") или "".
- По-русски, живо, дерзко. ЗАПРЕЩЕНЫ скучные формулировки («полезная информация», «моя история»).

Тема/текст рилса:
{text}"""


CAPTION_PROMPT = """Ты — копирайтер для Instagram-проекта пользователя. Пишешь подписи, которые останавливают прокрутку, помогают сохранить полезный материал и привлекают выбранную целевую аудиторию.

Тип поста: {post_type}
Тема/текст: {text}

Создай подпись по структуре:

1. ХУК (первые 1-2 строки — до "читать ещё") — самое важное. Должен останавливать. Используй: боль, интригу, провокацию, обещание результата, вопрос в лоб.
2. ТЕЛО — раскрой ценность, 3-5 ключевых тезисов (можно списком или коротко по-человечески). Не лей воду.
3. CTA — конкретный призыв: задай вопрос читателям, попроси сохранить/поделиться, напиши что в посте/карусели.
4. ХЭШТЕГИ — 5-8 штук, релевантных теме. Смешай высоко- и среднечастотные. Отдельной строкой.

Правила:
- Живой разговорный язык, как будто пишет реальный человек
- Абзацы с пробелом между ними — для читаемости
- Никакого канцелярита, официоза, перечислений ради перечислений
- Эмодзи уместно, но не больше 2-3 и только по смыслу
- Длина: 700-1200 символов (тело), хэштеги отдельно

Верни готовый текст подписи (без объяснений, без «вот подпись»)."""


THREADS_PROMPT = """Ты пишешь пост для Threads от имени автора проекта. Его тема, факты и голос должны быть заданы самим пользователем.

Тема: {text}

Threads — это как Twitter, но на русском. Правила жанра:
- 1-5 коротких абзацев, каждый = одна мысль
- Первая строка = крючок. Должна цеплять без контекста — её видят в ленте.
- Обрыв на полуслове, парадокс, провокация, цифра, личный опыт — всё, что заставляет дочитать
- Разговорный стиль, прямо и честно
- Заканчивай вопросом ИЛИ неожиданным выводом — провоцируй ответы
- Никаких хэштегов (в Threads они не работают)
- Длина: 150-400 символов (короткие посты работают лучше)

Верни только текст поста."""


# ── шаг 1: /start — выбор режима ────────────────────────────────────────────

STORY_PROMPT = """Ты — ВЁРСТЩИК Instagram Stories. Тебе дают готовый текст автора. Твоя работа — РАЗБИТЬ его на серию сторис, сохранив слова автора. Ты НЕ копирайтер, НЕ сокращаешь, НЕ переписываешь.

Верни ТОЛЬКО JSON (без объяснений):
{{
  "slides": [
    {{
      "slide_number": 1,
      "title": "короткий заголовок сторис (2-4 слова) или пусто",
      "text": "кусок текста автора для этой сторис — дословно или с минимальной правкой",
      "bg_prompt": "atmospheric vertical photo background for Instagram story: [scene, mood, colors, lighting — in English, NO text in image]"
    }}
  ]
}}

ГЛАВНОЕ ПРАВИЛО:
- Раздели весь текст автора по сторис ПОСЛЕДОВАТЕЛЬНО, сохраняя его слова. Склей все text подряд — должен получиться исходный текст почти без потерь.
- НЕ сокращай, НЕ выкидывай мысли, НЕ заменяй слова автора своими. Можно лишь подправить пунктуацию/связки на стыках.

КАК ДЕЛИТЬ:
- Одна сторис = одна законченная мысль / 1-3 предложения. НЕ слишком много текста на одну сторис (он должен помещаться крупно по центру).
- Обычно получается 3-8 сторис. Длинный текст → больше сторис.
- text: 1-3 коротких предложения. Если предложение длинное — оставь как есть, но не клади больше ~40 слов на сторис.
- title: короткий ёмкий заголовок этой сторис (2-4 слова). ВАЖНО: title — это ОТДЕЛЬНОЕ поле, НЕ дублируй и НЕ приклеивай его к text. В text не должно быть заголовка. Если заголовок не нужен — оставь "".

ВЫДЕЛЕНИЕ ГЛАВНОГО:
- В text выдели САМОЕ важное (1-4 слова: цифра, сумма, ключевой результат, главная мысль) — оберни в *звёздочки*. Например: "готовы платить от *50 000 до 150 000 рублей* за проект".
- Ровно одно выделение на сторис (можно без выделения, если нечего подчеркнуть). НЕ выделяй целые предложения — только ключевую фразу.

bg_prompt:
- по-английски, описывает вертикальный фон для DALL-E (атмосфера, цвет, свет). БЕЗ текста в кадре.
- Подбирай по смыслу куска. Стиль: чистый, эстетичный, под бренд эксперта по нейросетям.

Текст автора:
{text}"""


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    s = get_session(update.effective_user.id)

    # в группе: публикуем кнопку-старт и закрепляем; на сообщения без неё бот молчит
    if update.effective_chat.type != "private":
        msg = await update.message.reply_text(
            "🎠 Карусель Сабмарин\n\n"
            "Жми кнопку — и я соберу карусель из твоего текста.\n"
            "Без кнопки я в группе молчу и никому не мешаю.",
            reply_markup=InlineKeyboardMarkup(
                [[InlineKeyboardButton("🚀 Собрать карусель", callback_data="wiz:groupstart")]]
            ),
        )
        try:
            await context.bot.pin_chat_message(
                update.effective_chat.id, msg.message_id, disable_notification=True
            )
        except Exception:
            await update.message.reply_text(
                "Закрепить сообщение сама не смогла (нужны права админа) — закрепи его вручную 📌"
            )
        return

    s["step"] = STEP_MODE
    await update.message.reply_text(
        "Привет! Что делаем? 💫",
        reply_markup=MAIN_KEYBOARD,
    )
    await update.message.reply_text(
        "Выбери формат:",
        reply_markup=mode_keyboard(),
    )



# ── расшифровка рилсов ──────────────────────────────────────────────────────

TRANSCRIBE_ASK = (
    "🎬 Рилс → текст\n\n"
    "Пришли ссылку на ролик (Instagram, TikTok, YouTube Shorts, VK) "
    "или само видео файлом — до 20 МБ, столько отдаёт телеграм.\n\n"
    "Расшифрую речь, приведу в порядок — и из этого текста соберём карусель."
)

MAX_TG_VIDEO = 20 * 1024 * 1024


def transcript_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("📲 Собрать карусель", callback_data="tr:carousel")],
        [InlineKeyboardButton("📱 Серия сториз", callback_data="tr:story")],
        [InlineKeyboardButton("✍️ Подпись к посту", callback_data="tr:caption")],
        [InlineKeyboardButton("🎬 Ещё один ролик", callback_data="tr:more")],
    ])


async def _send_long(message, text: str, reply_markup=None):
    """Телеграм не берёт больше 4096 знаков — длинную расшифровку шлём частями."""
    limit = 3800
    parts = []
    rest = text
    while len(rest) > limit:
        cut = rest.rfind("\n\n", 0, limit)
        if cut < limit // 2:
            cut = rest.rfind(" ", 0, limit)
        if cut <= 0:
            cut = limit
        parts.append(rest[:cut].strip())
        rest = rest[cut:].strip()
    parts.append(rest)
    sent = None
    for i, part in enumerate(parts):
        last = i == len(parts) - 1
        sent = await message.reply_text(part, reply_markup=reply_markup if last else None)
    return sent


async def _transcribe_and_offer(uid: int, message, url: str = None, video_path: str = None):
    s = get_session(uid)
    s["step"] = STEP_TRANSCRIBE
    msg = await message.reply_text(
        "Скачиваю ролик и слушаю, что там говорят… ⏳" if url
        else "Слушаю, что говорят в видео… ⏳"
    )
    try:
        if url:
            t = await asyncio.to_thread(transcribe.from_url, client, url)
        else:
            t = await asyncio.to_thread(transcribe.from_file, client, video_path)
    except transcribe.TranscribeError as e:
        await msg.edit_text(str(e))
        return
    except Exception as e:
        logger.error(f"Расшифровка не удалась: {e}")
        await msg.edit_text(
            "Не смогла расшифровать ролик 😕 Попробуй ещё раз или пришли текст сам."
        )
        return
    finally:
        if video_path:
            try: os.unlink(video_path)
            except Exception: pass

    s["texts"] = [t.text]
    s["transcript"] = t.text
    s["mode"] = "transcribe"
    s["step"] = STEP_DONE

    head = "Расшифровала ✓"
    if t.translated:
        head += " (ролик был не на русском — перевела)"
    if t.author:
        head += f"\nАвтор: {t.author}"
    await msg.edit_text(head)
    await _send_long(
        message,
        t.text,
        reply_markup=transcript_keyboard(),
    )
    await message.reply_text(
        "Если хочешь что-то поправить — просто пришли свой вариант текста, "
        "соберу карусель из него."
    )


async def handle_video(update: Update, context: ContextTypes.DEFAULT_TYPE):
    uid = update.effective_user.id
    s = get_session(uid)

    # в группе видео берём в работу, только когда человек сам попросил расшифровку
    if update.effective_chat.type != "private" and s["step"] != STEP_TRANSCRIBE:
        return

    m = update.message
    media = m.video or m.video_note or m.audio or m.voice or m.document
    if media is None:
        return
    if (getattr(media, "file_size", 0) or 0) > MAX_TG_VIDEO:
        await m.reply_text(
            "Телеграм не отдаёт ботам файлы больше 20 МБ 😕\n"
            "Пришли ссылку на ролик или кусок покороче."
        )
        return
    try:
        file = await context.bot.get_file(media.file_id)
        suffix = Path(getattr(media, "file_name", "") or "video.mp4").suffix or ".mp4"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
            await file.download_to_drive(f.name)
            path = f.name
    except Exception as e:
        logger.error(f"Не забрала видео из телеграма: {e}")
        await m.reply_text(
            "Не смогла забрать файл — возможно, он больше 20 МБ. Пришли ссылку на ролик."
        )
        return

    await _transcribe_and_offer(uid, m, video_path=path)


# ── приём текста ────────────────────────────────────────────────────────────

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    s = get_session(update.effective_user.id)

    # в группе реагируем только когда пользователь в активном мастере
    # (запуск — кнопкой «🚀 Собрать карусель» или командой /start)
    if update.effective_chat.type != "private" and s["step"] in (STEP_IDLE, STEP_DONE, STEP_MODE):
        # обращались прямо к боту (ответом на его сообщение или через @ник),
        # а мастер не запущен — не молчим, показываем кнопку старта
        reply_to = update.message.reply_to_message
        addressed = (
            (reply_to and reply_to.from_user and reply_to.from_user.is_bot)
            or "@your_bot_username" in (update.message.text or "").lower()
        )
        if addressed:
            await update.message.reply_text(
                "Я потеряла нить — мастер не запущен 🙈\n"
                "Нажми кнопку, и начнём заново: текст → фото → призыв → стиль.",
                reply_markup=InlineKeyboardMarkup(
                    [[InlineKeyboardButton("🚀 Собрать карусель", callback_data="wiz:groupstart")]]
                ),
            )
        return

    logger.info(
        f"Текст от {update.effective_user.id} ({update.effective_chat.type}), шаг {s['step']}"
    )

    if update.message.text == "▶️ Старт":
        await cmd_start(update, context)
        return

    text_in = (update.message.text or "").strip()

    # ждём ссылку на ролик
    if s["step"] == STEP_TRANSCRIBE:
        url = transcribe.find_video_url(text_in)
        if not url:
            await update.message.reply_text(
                "Нужна ссылка на ролик или само видео файлом 🙂\n" + TRANSCRIBE_ASK
            )
            return
        await _transcribe_and_offer(update.effective_user.id, update.message, url=url)
        return

    # прислали голую ссылку на ролик вне мастера — расшифровываем без лишних вопросов
    if s["step"] in (STEP_IDLE, STEP_DONE, STEP_MODE, STEP_TEXT):
        url = transcribe.find_video_url(text_in)
        if url and transcribe.is_known_host(url) and len(text_in) <= len(url) + 40:
            await _transcribe_and_offer(update.effective_user.id, update.message, url=url)
            return

    # пользователь вводит свой призыв к действию
    if s["step"] == STEP_CTA:
        s["cta_text"] = update.message.text.strip()
        s["cta_subtext"] = ""
        s["cta_auto"] = False
        s["step"] = STEP_THEME
        await update.message.reply_text(
            f"Призыв записан: «{s['cta_text']}» ✓\n\n"
            "Выбери стиль оформления 🎨",
            reply_markup=theme_keyboard(s.get("style", SURPRISE)),
        )
        return

    if s["step"] in (STEP_IDLE, STEP_DONE, STEP_MODE):
        # после расшифровки режим сессии — transcribe, дальше это обычная карусель
        reset_session(s, mode="carousel" if s.get("mode") == "transcribe" else None)

    s["texts"].append(update.message.text)

    if s["step"] == STEP_TEXT:
        mode = s.get("mode", "carousel")

        if mode == "caption":
            s["step"] = STEP_DONE

            async def reply_caption(content, reply_markup=None, as_media_group=False, as_photo=False):
                return await update.message.reply_text(content, reply_markup=reply_markup)

            async def edit_caption(m, text):
                await m.edit_text(text)

            await _run_caption(update.effective_user.id, reply_caption, edit_caption)

        elif mode == "reels":
            s["step"] = STEP_PHOTO
            first = "Заголовок принят ✓" if s.get("cover_manual") else "Тема получена ✓"
            await update.message.reply_text(
                f"{first}\n\n"
                "Шаг 2 из 3 — пришли фото для фона обложки 📷 (необязательно)\n"
                "Или сразу к выбору темы.",
                reply_markup=skip_photo_keyboard(),
            )
        elif mode == "story":
            s["step"] = STEP_PHOTO
            await update.message.reply_text(
                "Текст получен ✓\n\n"
                "Пришли свои фото 📷 — пойдут на первые сторизы по порядку.\n"
                "Остальным слайдам DALL-E сгенерирует фоны автоматически.\n"
                "Или пропусти — тогда все фоны через DALL-E.",
                reply_markup=skip_photo_keyboard(),
            )
        else:
            s["step"] = STEP_PHOTO
            await update.message.reply_text(
                "Текст получила ✓\n\n"
                "Шаг 2 из 4 — пришли фото 📷\n"
                "Я сама красиво вставлю их в слайды. Или пропусти этот шаг.",
                reply_markup=skip_photo_keyboard(),
            )
    else:
        # уже на шаге фото — просто добавляем текст
        await update.message.reply_text("Добавила ещё текст ✓")


# ── приём фото ──────────────────────────────────────────────────────────────

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    uid = update.effective_user.id
    s = get_session(uid)

    # в группе фото вне активного мастера игнорируем
    if update.effective_chat.type != "private" and s["step"] in (STEP_IDLE, STEP_DONE, STEP_MODE):
        return

    # пополнение базы изображений
    if s["step"] == STEP_LIBRARY:
        photo = update.message.photo[-1]
        file = await context.bot.get_file(photo.file_id)
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            await file.download_to_drive(f.name)
            tmp_path = f.name
        try:
            item = lib_add(tmp_path)
            await update.message.reply_text(
                f"Сохранила ✓ «{item['description']}»\n"
                f"В базе {len(lib_load())} фото. Присылай ещё или жми Готово.",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("✅ Готово", callback_data="lib:done")]]),
            )
        except Exception as e:
            logger.error(f"lib_add error: {e}")
            await update.message.reply_text(f"Не смогла сохранить: {e}")
        finally:
            try: os.unlink(tmp_path)
            except: pass
        return

    # приём скриншота для конкретного слайда
    if s["step"] == STEP_SCREENS:
        queue = s.get("pending_screens", [])
        photo = update.message.photo[-1]
        file = await context.bot.get_file(photo.file_id)
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            await file.download_to_drive(f.name)
            path = f.name
        if queue:
            sn, hint = queue.pop(0)
            s.setdefault("screen_photos", {})[sn] = path
            s["pending_screens"] = queue
            await update.message.reply_text(f"Скрин для слайда {sn} получила ✓")

        async def reply(content, reply_markup=None, as_media_group=False, as_photo=False):
            if as_media_group:
                return await update.message.reply_media_group(content)
            if as_photo:
                return await update.message.reply_photo(content, reply_markup=reply_markup)
            return await update.message.reply_text(content, reply_markup=reply_markup)

        async def edit(m, text):
            await m.edit_text(text)

        await _ask_screens_or_render(uid, reply, edit)
        return

    if s["step"] in (STEP_IDLE, STEP_DONE, STEP_MODE):
        # фото сразу после расшифровки: текст ролика оставляем, дальше обычная карусель
        keep = s.get("texts") if s.get("mode") == "transcribe" and s.get("transcript") else None
        reset_session(s, mode="carousel" if keep else None)
        if keep:
            s["texts"] = keep
        s["step"] = STEP_PHOTO

    photo = update.message.photo[-1]
    file = await context.bot.get_file(photo.file_id)
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
        await file.download_to_drive(f.name)
        path = f.name

    if update.message.caption:
        s["texts"].append(update.message.caption)

    s["photos"].append({"path": path})
    n = len(s["photos"])

    await update.message.reply_text(
        f"Фото {n} получено 📷\n"
        "Пришли ещё фото или переходи к выбору темы.",
        reply_markup=photo_next_keyboard(),
    )


# ── шаг 3: тема + генерация ─────────────────────────────────────────────────

async def _run_make(uid: int, reply_func, edit_func):
    s = get_session(uid)

    if not s["texts"]:
        await reply_func("Сначала пришли текст. Нажми /start", reply_markup=None)
        return

    msg = await reply_func("Структурирую контент…")

    photo_count = len(s["photos"])
    if photo_count:
        photo_instructions = (
            f"К посту приложено {photo_count} фото. ПЕРВОЕ фото станет ФОНОМ ОБЛОЖКИ (1-го слайда) — "
            "текст пойдёт поверх фото, поэтому заголовок 1-го слайда сделай контрастным и коротким, "
            "а body_lines обложки — максимум 1 короткая строка. "
        )
        if photo_count > 1:
            photo_instructions += (
                f"Остальные {photo_count - 1} фото размести ПО СМЫСЛУ: на слайдах со 2-го, где картинка "
                f"уместна по содержанию, добавь поле \"wants_photo\": true (не больше {photo_count - 1} таких слайдов). "
                "Туда бот вставит фото блоком НИЖЕ текста — body_lines НЕ убирай и НЕ сокращай, "
                "весь текст этого слайда должен остаться в body_lines как обычно. "
            )
        photo_instructions += "НЕ используй visual_type photo_text."
    else:
        photo_instructions = "Фото нет."

    text = "\n\n".join(s["texts"])

    try:
        response = client.chat.completions.create(
            model=CAROUSEL_MODEL,
            max_tokens=4000,
            messages=[{"role": "user", "content": STRUCTURE_PROMPT.format(
                text=text,
                photo_instructions=photo_instructions,
            )}]
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        slides = json.loads(raw)
        # CTA-слайд всегда добавляем в конец сами — обновляем total у всех слайдов
        total_with_cta = len(slides) + 1
        for sl in slides:
            sl["total_slides"] = total_with_cta
        drop_invented_numbers(slides, text)
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        await edit_func(msg, f"Ошибка: {e}")
        return

    # 1-е фото → фон обложки; остальные → пользователь выбирает куда
    photos = [p["path"] for p in s["photos"]]
    cover_photo = photos[0] if photos else None
    rest = photos[1:]

    if rest:
        # предлагаем выбор: какие слайды получат фото
        # pre-select слайды которые GPT пометил wants_photo (или первые N)
        marked = [sl for sl in slides if sl.get("slide_number", 1) != 1 and sl.get("wants_photo")]
        if len(marked) < len(rest):
            unmarked = [sl for sl in slides if sl.get("slide_number", 1) != 1 and not sl.get("wants_photo")]
            marked = marked + unmarked[:len(rest) - len(marked)]
        default_selected = {sl.get("slide_number") for sl in marked[:len(rest)]}

        s["pending_slides"] = slides
        s["pending_rest_photos"] = rest
        s["pending_cover_photo"] = cover_photo
        s["photo_selection"] = default_selected
        s["lib_photos"] = {}
        s["screen_photos"] = {}
        s["pending_screens"] = [
            (sl.get("slide_number"), sl.get("screenshot_hint") or "скриншот по теме слайда")
            for sl in slides
            if sl.get("needs_screenshot") and sl.get("slide_number", 1) != 1
        ][:2]
        s["step"] = STEP_PHOTO_SELECT

        await edit_func(msg,
            f"Структура готова! Выбери на какие слайды добавить {len(rest)} фото:\n"
            "(предварительно выбрала по смыслу — можешь изменить)"
        )
        await reply_func(
            "Отметь нужные слайды:",
            reply_markup=photo_select_keyboard(slides, default_selected, len(rest))
        )
        return

    s["pending_slides"] = slides
    s["pending_rest_photos"] = []
    s["pending_cover_photo"] = cover_photo
    s["photo_selection"] = set()

    # своих фото нет — подбираем подходящие из базы изображений
    s["lib_photos"] = {}
    if not photos and lib_load():
        await edit_func(msg, "Подбираю фото из базы…")
        matches = lib_match(slides)
        if matches:
            # обложке — фото фоном, остальным — блоком
            if 1 in matches:
                s["pending_cover_photo"] = matches.pop(1)
            s["lib_photos"] = matches
            logger.info(f"lib_match: cover={bool(s['pending_cover_photo'])}, blocks={list(matches)}")

    # слайды, где GPT просит настоящий скриншот — спросим у пользователя
    s["screen_photos"] = {}
    s["pending_screens"] = [
        (sl.get("slide_number"), sl.get("screenshot_hint") or "скриншот по теме слайда")
        for sl in slides
        if sl.get("needs_screenshot") and sl.get("slide_number", 1) != 1
    ][:2]

    await edit_func(msg, "Структура готова ✓")
    await _ask_screens_or_render(uid, reply_func, edit_func)


async def _ask_screens_or_render(uid: int, reply_func, edit_func):
    """Если GPT запросил скриншоты — спрашиваем по одному, потом рендерим."""
    s = get_session(uid)
    queue = s.get("pending_screens", [])
    if queue:
        s["step"] = STEP_SCREENS
        sn, hint = queue[0]
        await reply_func(
            f"📸 Для слайда {sn} нужен скриншот: «{hint}»\n"
            f"Пришли его фото — или пропусти.",
            reply_markup=screens_keyboard(last=len(queue) == 1),
        )
        return
    slides = s.get("pending_slides", [])
    total = slides[0].get("total_slides", len(slides) + 1) if slides else 1
    prog = await reply_func(f"Генерирую {total} слайдов…")
    await _render_carousel(uid, reply_func, edit_func, msg=prog)


def _photo_map(s: dict) -> dict:
    """Номер слайда → путь к фото. Приоритет: свои фото > скриншоты > база."""
    photo_by_num = {}
    photo_by_num.update(s.get("lib_photos", {}))
    photo_by_num.update(s.get("screen_photos", {}))
    rest = s.get("pending_rest_photos", [])
    if rest:
        chosen = sorted(s.get("photo_selection", set()))[:len(rest)]
        for sn, photo in zip(chosen, rest):
            photo_by_num[sn] = photo
    return photo_by_num


def _reroll_deco(theme: str, slide: dict) -> str:
    """Новое украшение фона из набора стиля — чтобы перерисовка отличалась."""
    pool = get_theme(theme).get("deco_set") or ["glow", "dotgrid", "bignumber", "lines", "blobs", "ruled"]
    choices = [d for d in pool if d != slide.get("bg")] or pool
    return random.choice(choices)


async def _render_carousel(uid: int, reply_func, edit_func, msg=None):
    s = get_session(uid)
    slides = s.get("pending_slides", [])
    rest = s.get("pending_rest_photos", [])
    cover_photo = s.get("pending_cover_photo")
    selected = s.get("photo_selection", set())
    text = "\n\n".join(s["texts"])

    total_with_cta = slides[0].get("total_slides", len(slides) + 1) if slides else 1
    photo_by_num = _photo_map(s)
    # чем рисовали этот прогон — запоминаем для перерисовки отдельных слайдов
    s["last_engine"] = s.get("engine")

    # ИИ-фоны Qwen — только тем слайдам, где нет своего фото
    ai_bg_by_num = {}
    if s.get("engine") == "qwen" and qwen_bg.enabled() and slides:
        colors = get_theme(s["theme"])
        need = [
            sl for sl in slides
            if sl.get("slide_number", 1) not in photo_by_num
            and not (sl.get("slide_number", 1) == 1 and cover_photo)
        ]
        if need:
            async def _bg_progress(done, total_bg):
                if msg:
                    try:
                        await edit_func(msg, f"Рисую фоны через Qwen… {done}/{total_bg}")
                    except Exception:
                        pass

            paths = await qwen_bg.generate_many(
                [qwen_bg.carousel_bg_prompt(sl, colors) for sl in need],
                qwen_bg.SIZE_CAROUSEL,
                on_done=_bg_progress,
            )
            for sl, path in zip(need, paths):
                if path:
                    ai_bg_by_num[sl.get("slide_number", 1)] = path
            if not ai_bg_by_num:
                await reply_func(
                    f"Фоны Qwen не получились: {qwen_bg.last_error()}.\n"
                    "Собираю карусель в обычном стиле — текст не потеряется."
                )

    slide_files = []
    try:
        for slide in slides:
            sn = slide.get("slide_number", 1)
            photo_path = None
            photo_mode = None
            if sn == 1 and cover_photo:
                photo_path, photo_mode = cover_photo, "cover_bg"
            elif sn in photo_by_num:
                photo_path, photo_mode = photo_by_num[sn], "block"
            elif sn in ai_bg_by_num:
                photo_path, photo_mode = ai_bg_by_num[sn], "ai_bg"

            path = generator.generate_slide(
                slide,
                theme=s["theme"],
                username=s["username"],
                photo_path=photo_path,
                photo_mode=photo_mode,
            )
            slide_files.append(path)

        # финальный CTA-слайд — текст призыва: ручной или придуманный GPT
        cta_text = s.get("cta_text") or "Сохрани, чтобы не потерять"
        cta_subtext = s.get("cta_subtext", "")
        if s.get("cta_auto"):
            try:
                cta_resp = client.chat.completions.create(
                    model=CAROUSEL_MODEL,
                    max_tokens=200,
                    messages=[{"role": "user", "content": CTA_AUTO_PROMPT.format(text=text)}],
                )
                craw = cta_resp.choices[0].message.content.strip()
                if craw.startswith("```"):
                    craw = craw.split("```")[1]
                    if craw.startswith("json"):
                        craw = craw[4:]
                cta_data = json.loads(craw)
                cta_text = cta_data.get("cta") or cta_text
                cta_subtext = cta_data.get("subtext", "")
            except Exception as e:
                logger.error(f"CTA auto error: {e}")  # тихий фолбэк на дефолт

        cta_path = generator.generate_cta_slide(
            cta_text=cta_text,
            theme=s["theme"],
            username=s["username"],
            slide_num=total_with_cta,
            total=total_with_cta,
            subtext=cta_subtext,
            link=TELEGRAM_LINK,
        )
        slide_files.append(cta_path)

        if msg:
            await edit_func(msg, f"Готово! Отправляю {len(slide_files)} слайдов…")

        for i in range(0, len(slide_files), 10):
            batch = slide_files[i:i+10]
            handles, media = [], []
            for path in batch:
                fh = open(path, "rb")
                handles.append(fh)
                media.append(InputMediaPhoto(fh))
            await reply_func(media, as_media_group=True)
            for fh in handles:
                fh.close()

        if msg:
            await msg.delete()

        s["step"] = STEP_DONE
        s["engine"] = None
        await reply_func(
            "Готово! ✨\n"
            "Не нравится отдельный слайд — перерисую только его.\n"
            "Другой стиль — выбери ниже, пересоберу без повторной генерации текста.",
            reply_markup=InlineKeyboardMarkup(
                [[InlineKeyboardButton("🔁 Перерисовать один слайд", callback_data="reslide:menu")]]
                + list(theme_keyboard(s.get("style", SURPRISE), with_restart=True).inline_keyboard)
            ),
        )

    except Exception as e:
        logger.error(f"Generation error: {e}")
        await edit_func(msg, f"Ошибка генерации: {e}")
    finally:
        for path in list(slide_files) + list(ai_bg_by_num.values()):
            try: os.unlink(path)
            except: pass


# ── режим Reels: кликбейт-обложка ───────────────────────────────────────────

async def _run_cover(uid: int, reply_func, edit_func):
    s = get_session(uid)

    if not s["texts"]:
        await reply_func("Сначала пришли заголовок/тему. Нажми /start", reply_markup=None)
        return

    text = " ".join(s["texts"]).strip()

    cover = None
    if s.get("cover_manual"):
        # заголовок написал пользователь
        cover = parse_manual_headline(text)
        msg = await reply_func("Рисую обложку…")
    else:
        msg = await reply_func("Придумываю кликбейт… 🔥")
        used_model = None
        for model in (COVER_MODEL, CAROUSEL_MODEL):
            try:
                response = client.chat.completions.create(
                    model=model,
                    max_tokens=400,
                    messages=[{"role": "user", "content": COVER_PROMPT.format(text=text)}],
                )
                raw = response.choices[0].message.content.strip()
                if raw.startswith("```"):
                    raw = raw.split("```")[1]
                    if raw.startswith("json"):
                        raw = raw[4:]
                cover = json.loads(raw)
                used_model = model
                break
            except Exception as e:
                logger.error(f"Cover model {model} error: {e}")
                continue

        if not cover:
            await edit_func(msg, "Не получилось придумать заголовок, попробуй ещё раз")
            return
        logger.info(f"Cover headline by {used_model}: {cover.get('headline')}")
        await edit_func(msg, "Рисую обложку…")

    photo_path = s["photos"][0]["path"] if s["photos"] else None
    ai_bg = None
    if not photo_path and s.get("engine") == "qwen" and qwen_bg.enabled():
        await edit_func(msg, "Рисую фон через Qwen…")
        ai_bg = await qwen_bg.generate_image_async(
            qwen_bg.cover_bg_prompt(" ".join(s["texts"]), get_theme(s["theme"])),
            qwen_bg.SIZE_VERTICAL,
        )
        photo_path = ai_bg
        if not ai_bg:
            await reply_func(f"Фон Qwen не получился: {qwen_bg.last_error()}.")
        await edit_func(msg, "Рисую обложку…")

    try:
        path = generator.generate_cover(
            cover, theme=s["theme"], username=s["username"], photo_path=photo_path,
        )
        with open(path, "rb") as fh:
            await reply_func(fh, as_photo=True)
        try: os.unlink(path)
        except: pass

        await msg.delete()
        s["step"] = STEP_DONE
        s["engine"] = None
        await reply_func(
            "Готово! 🔥\n"
            "Другой стиль — выбери ниже, перерисую.\n"
            "Или начни заново.",
            reply_markup=theme_keyboard(s.get("style", SURPRISE), with_restart=True),
        )
    except Exception as e:
        logger.error(f"Cover generation error: {e}")
        await edit_func(msg, f"Ошибка генерации обложки: {e}")
    finally:
        if ai_bg:
            try: os.unlink(ai_bg)
            except: pass


# ── режим Caption: подпись к посту ──────────────────────────────────────────

async def _run_caption(uid: int, reply_func, edit_func):
    s = get_session(uid)

    if not s["texts"]:
        await reply_func("Сначала пришли текст. Нажми /start", reply_markup=None)
        return

    text = "\n\n".join(s["texts"]).strip()
    post_type = s.get("caption_type", "пост")

    msg = await reply_func("Пишу подпись…")

    try:
        response = client.chat.completions.create(
            model=CAROUSEL_MODEL,
            max_tokens=1000,
            messages=[{"role": "user", "content": CAPTION_PROMPT.format(
                text=text,
                post_type=post_type,
            )}]
        )
        caption = response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Caption error: {e}")
        await edit_func(msg, f"Ошибка: {e}")
        return

    await msg.delete()
    s["step"] = STEP_DONE
    await reply_func(
        caption,
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("🆕 Новая задача", callback_data="wiz:restart")
        ]])
    )


# ── режим Threads: короткий пост ────────────────────────────────────────────

async def _run_threads(uid: int, reply_func, edit_func):
    s = get_session(uid)

    if not s["texts"]:
        await reply_func("Сначала пришли тему. Нажми /start", reply_markup=None)
        return

    text = "\n\n".join(s["texts"]).strip()
    msg = await reply_func("Пишу пост для Threads…")

    try:
        response = client.chat.completions.create(
            model=CAROUSEL_MODEL,
            max_tokens=500,
            messages=[{"role": "user", "content": THREADS_PROMPT.format(text=text)}]
        )
        post = response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Threads error: {e}")
        await edit_func(msg, f"Ошибка: {e}")
        return

    await msg.delete()
    s["step"] = STEP_DONE
    await reply_func(
        post,
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("🆕 Новая задача", callback_data="wiz:restart"),
        ]])
    )


# ── режим Story: серия сториз ───────────────────────────────────────────────

async def _download_image(url: str) -> str:
    """Скачивает изображение по URL во временный файл."""
    import urllib.request
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        urllib.request.urlretrieve(url, f.name)
        return f.name


async def _run_story(uid: int, reply_func, edit_func):
    s = get_session(uid)

    if not s["texts"]:
        await reply_func("Сначала пришли текст. Нажми /start", reply_markup=None)
        return

    text = "\n\n".join(s["texts"]).strip()
    photos = [p["path"] for p in s.get("photos", [])]

    msg = await reply_func("Структурирую сториз…")

    # ── GPT: разбивка на слайды ──
    try:
        resp = client.chat.completions.create(
            model=CAROUSEL_MODEL,
            max_tokens=2000,
            messages=[{"role": "user", "content": STORY_PROMPT.format(text=text)}],
        )
        raw = resp.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        slides = data.get("slides", data) if isinstance(data, dict) else data
        if isinstance(slides, dict):
            slides = [slides]
    except Exception as e:
        logger.error(f"Story GPT error: {e}")
        await edit_func(msg, f"Ошибка генерации структуры: {e}")
        return

    total = len(slides)
    for sl in slides:
        sl["total_slides"] = total

    await edit_func(msg, f"Генерирую {total} сториз…")

    story_files = []
    bg_files = []   # temp files to clean up

    use_qwen = s.get("engine") == "qwen" and qwen_bg.enabled()
    qwen_paths = {}

    try:
        if use_qwen:
            colors = get_theme(s["theme"])
            need = [(i, sl) for i, sl in enumerate(slides) if i >= len(photos)]
            if need:
                async def _bg_progress(done, total_bg):
                    try:
                        await edit_func(msg, f"Рисую фоны через Qwen… {done}/{total_bg}")
                    except Exception:
                        pass

                paths = await qwen_bg.generate_many(
                    [qwen_bg.story_bg_prompt(sl, colors) for _, sl in need],
                    qwen_bg.SIZE_VERTICAL,
                    on_done=_bg_progress,
                )
                for (idx, _), path in zip(need, paths):
                    if path:
                        qwen_paths[idx] = path
                        bg_files.append(path)
                if not qwen_paths:
                    await reply_func(
                        f"Фоны Qwen не получились: {qwen_bg.last_error()}.\n"
                        "Собираю сториз на фирменных фонах."
                    )
                await edit_func(msg, f"Собираю {total} сториз…")

        for i, slide in enumerate(slides):
            sn = slide.get("slide_number", i + 1)

            # ── фон: сначала твои фото по порядку, потом ИИ ──
            photo_path = None

            if i < len(photos):
                # есть своё фото для этого слайда
                photo_path = photos[i]
            elif use_qwen:
                photo_path = qwen_paths.get(i)
            else:
                # генерируем фон через DALL-E
                bg_prompt = slide.get("bg_prompt", "")
                if bg_prompt:
                    try:
                        await edit_func(msg, f"Генерирую фон {sn}/{total}…")
                        img_resp = client.images.generate(
                            model="dall-e-3",
                            prompt=bg_prompt,
                            size="1024x1792",
                            quality="standard",
                            n=1,
                        )
                        url = img_resp.data[0].url
                        photo_path = await _download_image(url)
                        bg_files.append(photo_path)
                    except Exception as e:
                        logger.error(f"DALL-E error slide {sn}: {e}")

            path = generator.generate_story(
                slide,
                theme=s["theme"],
                username=s["username"],
                photo_path=photo_path,
            )
            story_files.append(path)

        await edit_func(msg, f"Отправляю {len(story_files)} сториз…")

        # сторис отправляем по одной — не группой, чтобы каждая показывалась полноразмерно
        for path in story_files:
            with open(path, "rb") as fh:
                await reply_func(fh, as_photo=True)

        await msg.delete()
        s["step"] = STEP_DONE
        s["engine"] = None
        await reply_func(
            "Сториз готовы! 📱\nНачать заново — нажми Старт.",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🆕 Новая задача", callback_data="wiz:restart")
            ]])
        )

    except Exception as e:
        logger.error(f"Story generation error: {e}")
        await edit_func(msg, f"Ошибка: {e}")
    finally:
        for path in story_files:
            try: os.unlink(path)
            except: pass
        for path in bg_files:
            try: os.unlink(path)
            except: pass


def reslide_keyboard(slides):
    rows, row = [], []
    for sl in slides:
        sn = sl.get("slide_number", 1)
        row.append(InlineKeyboardButton(str(sn), callback_data=f"reslide:{sn}"))
        if len(row) == 5:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append([InlineKeyboardButton("🏁 Финальный слайд", callback_data="reslide:cta")])
    return InlineKeyboardMarkup(rows)


async def _regen_slide(uid: int, arg: str, query):
    """Перерисовывает один слайд: новое украшение фона, при Qwen — новый ИИ-фон."""
    s = get_session(uid)
    slides = s.get("pending_slides") or []
    total = slides[0].get("total_slides", len(slides) + 1) if slides else 1

    msg = await query.message.reply_text("Перерисовываю слайд…")
    path, tmp_bg = None, None
    try:
        if arg == "cta":
            path = generator.generate_cta_slide(
                cta_text=s.get("cta_text") or "Сохрани, чтобы не потерять",
                theme=s["theme"],
                username=s["username"],
                slide_num=total,
                total=total,
                subtext=s.get("cta_subtext", ""),
            )
        else:
            sn = int(arg)
            original = next((sl for sl in slides if sl.get("slide_number", 1) == sn), None)
            if not original:
                await msg.edit_text("Такого слайда в карусели нет 🤔")
                return
            slide = dict(original)
            slide["bg"] = _reroll_deco(s["theme"], slide)

            photo_by_num = _photo_map(s)
            photo_path, photo_mode = None, None
            if sn == 1 and s.get("pending_cover_photo"):
                photo_path, photo_mode = s["pending_cover_photo"], "cover_bg"
            elif sn in photo_by_num:
                photo_path, photo_mode = photo_by_num[sn], "block"
            elif s.get("last_engine") == "qwen" and qwen_bg.enabled():
                await msg.edit_text("Рисую новый фон через Qwen…")
                tmp_bg = await qwen_bg.generate_image_async(
                    qwen_bg.carousel_bg_prompt(slide, get_theme(s["theme"])),
                    qwen_bg.SIZE_CAROUSEL,
                )
                if tmp_bg:
                    photo_path, photo_mode = tmp_bg, "ai_bg"
                else:
                    await query.message.reply_text(f"Фон Qwen не получился: {qwen_bg.last_error()}.")
            # запоминаем украшение, чтобы следующая перерисовка дала другое
            original["bg"] = slide["bg"]

            path = generator.generate_slide(
                slide,
                theme=s["theme"],
                username=s["username"],
                photo_path=photo_path,
                photo_mode=photo_mode,
            )

        with open(path, "rb") as fh:
            await query.message.reply_photo(
                fh,
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("🔁 Ещё вариант этого слайда", callback_data=f"reslide:{arg}")],
                    [InlineKeyboardButton("🔀 Другой слайд", callback_data="reslide:menu")],
                    [InlineKeyboardButton("🆕 Новая карусель", callback_data="wiz:restart")],
                ]),
            )
        await msg.delete()
    except Exception as e:
        logger.error(f"Regen slide error: {e}")
        await msg.edit_text(f"Не получилось перерисовать: {e}")
    finally:
        for f in (path, tmp_bg):
            try: os.unlink(f)
            except: pass


async def _start_generation(uid: int, query, reply, edit):
    """Запуск генерации после выбора стиля и движка картинок."""
    s = get_session(uid)
    if s.get("mode") == "reels":
        await _run_cover(uid, reply, edit)
    elif s.get("mode") == "story":
        await _run_story(uid, reply, edit)
    elif s.get("pending_slides") and s.get("step") == STEP_DONE:
        # структура уже готова — перерисуем в новом стиле без нового запроса к GPT
        msg = await query.message.reply_text("Пересобираю в новом стиле…")
        await _render_carousel(uid, reply, edit, msg=msg)
    else:
        await _run_make(uid, reply, edit)


# ── callbacks ───────────────────────────────────────────────────────────────

async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    uid = query.from_user.id
    s = get_session(uid)
    data = query.data

    # кнопка-старт из закрепа в группе: не трогаем закреп, отвечаем новым сообщением
    if data == "wiz:groupstart":
        s["step"] = STEP_MODE
        name = query.from_user.first_name or "Погнали"
        await query.message.reply_text(
            f"{name}, что делаем? 💫",
            reply_markup=mode_keyboard(),
        )
        return

    if data.startswith("phslide:"):
        action = data.split(":")[1]
        slides = s.get("pending_slides", [])
        rest = s.get("pending_rest_photos", [])
        selected = s.get("photo_selection", set())

        if action == "confirm":
            # начинаем рендер
            async def reply(content, reply_markup=None, as_media_group=False, as_photo=False):
                if as_media_group:
                    return await query.message.reply_media_group(content)
                if as_photo:
                    return await query.message.reply_photo(content, reply_markup=reply_markup)
                return await query.message.reply_text(content, reply_markup=reply_markup)

            async def edit(m, text):
                await m.edit_text(text)

            await query.message.delete()
            await _ask_screens_or_render(uid, reply, edit)
        else:
            # toggle слайда
            try:
                sn = int(action)
            except ValueError:
                return
            if sn in selected:
                # снять — нельзя убрать последний если есть фото
                if len(selected) > 1 or not rest:
                    selected.discard(sn)
            else:
                # добавить; если лимит заполнен — вытолкнуть наименьший номер кроме нового
                selected.add(sn)
                while len(selected) > len(rest):
                    oldest = min(x for x in selected if x != sn)
                    selected.discard(oldest)
            s["photo_selection"] = selected
            try:
                await query.edit_message_reply_markup(
                    reply_markup=photo_select_keyboard(slides, selected, len(rest))
                )
            except Exception:
                pass
        return

    if data.startswith("mode:"):
        mode = data.split(":")[1]
        if mode == "library":
            s["step"] = STEP_LIBRARY
            n = len(lib_load())
            await query.edit_message_text(
                f"🗂 База фото — сейчас {n} шт.\n\n"
                "Пришли фото (можно несколько подряд) — я опишу каждое и сохраню. "
                "Из базы буду сама подбирать картинки к слайдам каруселей.\n\n"
                "Советую загрузить: свои портреты, рабочее место, телефон в руках, "
                "атмосферные кадры — всё, что часто уместно в постах.",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("✅ Готово", callback_data="lib:done")]]),
            )
            return
        if mode == "transcribe":
            reset_session(s, mode="transcribe")
            s["step"] = STEP_TRANSCRIBE
            await query.edit_message_text(TRANSCRIBE_ASK)
            return
        reset_session(s, mode=mode)
        if mode == "reels":
            await query.edit_message_text(
                "🔥 Кликбейт-обложка для Reels\n\n"
                "Кто придумает заголовок?",
                reply_markup=cover_source_keyboard(),
            )
        elif mode == "story":
            s["step"] = STEP_TEXT
            s["texts"] = []
            s["photos"] = []
            await query.edit_message_text(
                "📱 Серия сториз\n\n"
                "Пришли текст 📝\n"
                "Потом можешь добавить свои фото — они пойдут на первые сторизы по порядку, остальным бот сгенерирует фоны через DALL-E."
            )
        elif mode == "caption":
            s["step"] = STEP_TEXT
            await query.edit_message_text(
                "✍️ Подпись к посту\n\n"
                "Для какого формата нужна подпись?",
                reply_markup=caption_type_keyboard(),
            )
        else:
            await query.edit_message_text(
                "📲 Карусель\n\n"
                "Шаг 1 из 4 — пришли текст 📝\n"
                "Можно несколько сообщений подряд."
            )
        return

    if data.startswith("tr:"):
        action = data.split(":")[1]
        if action == "more":
            s["step"] = STEP_TRANSCRIBE
            await query.message.reply_text(TRANSCRIBE_ASK)
            return
        if not s.get("texts"):
            s["step"] = STEP_TRANSCRIBE
            await query.message.reply_text(
                "Текст расшифровки потерялся 🙈 Пришли ссылку на ролик заново."
            )
            return
        # текст оставляем, остальное состояние мастера чистим
        s["photos"] = []
        s["lib_photos"] = {}
        s["screen_photos"] = {}
        s["pending_screens"] = []
        s["engine"] = None
        s["cover_manual"] = False
        if action == "caption":
            s["mode"] = "caption"
            s["step"] = STEP_TEXT
            s["caption_from_transcript"] = True
            await query.message.reply_text(
                "Для какого формата нужна подпись?",
                reply_markup=caption_type_keyboard(),
            )
            return
        if action == "story":
            s["mode"] = "story"
            s["step"] = STEP_PHOTO
            await query.message.reply_text(
                "Текст из ролика взяла ✓\n\n"
                "Пришли свои фото 📷 — пойдут на первые сторизы по порядку. "
                "Или пропусти этот шаг.",
                reply_markup=skip_photo_keyboard(),
            )
            return
        s["mode"] = "carousel"
        s["step"] = STEP_PHOTO
        await query.message.reply_text(
            "Текст из ролика взяла ✓\n\n"
            "Шаг 2 из 4 — пришли фото 📷\n"
            "Я сама красиво вставлю их в слайды. Или пропусти этот шаг.",
            reply_markup=skip_photo_keyboard(),
        )
        return

    if data.startswith("captype:"):
        captype = data.split(":")[1]
        type_names = {"carousel": "карусель", "reels": "Reels", "feed": "пост"}
        s["caption_type"] = type_names.get(captype, "пост")
        s["step"] = STEP_TEXT
        if s.pop("caption_from_transcript", False) and s.get("texts"):
            s["step"] = STEP_DONE
            await query.edit_message_text(
                f"✍️ Подпись для формата: {s['caption_type']}\n\nПишу по тексту ролика…"
            )

            async def reply_cap(content, reply_markup=None, as_media_group=False, as_photo=False):
                return await query.message.reply_text(content, reply_markup=reply_markup)

            async def edit_cap(m, text):
                await m.edit_text(text)

            await _run_caption(uid, reply_cap, edit_cap)
            return
        await query.edit_message_text(
            f"✍️ Подпись для формата: {s['caption_type']}\n\n"
            "Пришли текст поста или его тему 📝\n"
            "Чем больше деталей — тем точнее подпись."
        )
        return

    if data.startswith("story:"):
        src = data.split(":")[1]
        s["story_source"] = src  # "ai" or "photos"
        s["step"] = STEP_TEXT
        s["texts"] = []
        s["photos"] = []
        if src == "photos":
            await query.edit_message_text(
                "📷 Свои фото\n\n"
                "Шаг 1 — пришли текст 📝\n"
                "Потом пришлёшь фото для фонов."
            )
        else:
            await query.edit_message_text(
                "🎨 DALL-E сгенерирует фоны\n\n"
                "Пришли текст для серии сториз 📝\n"
                "Бот сам подберёт визуал к каждой сторис."
            )
        return

    if data.startswith("cover:"):
        src = data.split(":")[1]
        s["mode"] = "reels"
        s["cover_manual"] = (src == "manual")
        s["step"] = STEP_TEXT
        s["texts"] = []
        if src == "manual":
            await query.edit_message_text(
                "✍️ Свой заголовок\n\n"
                "Отправь текст обложки. Главную фразу оберни в *звёздочки* — "
                "она станет КРУПНОЙ и цветной, а остальное — мелким шрифтом сверху/снизу:\n\n"
                "например:  Забудьте всё о *генерации видео* теперь это тренд"
            )
        else:
            await query.edit_message_text(
                "✨ Ок, придумаю сам!\n\n"
                "Шаг 1 — пришли тему или текст рилса 📝"
            )
        return

    if data == "wiz:skip_photo" or data == "wiz:to_theme":
        if s.get("mode") == "carousel":
            s["step"] = STEP_CTA
            await query.edit_message_text(
                "Шаг 3 из 4 — призыв к действию\n\n"
                "Что скажем на последнем слайде?",
                reply_markup=cta_keyboard(),
            )
        else:
            s["step"] = STEP_THEME
            await query.edit_message_text(
                "Шаг 3 из 3 — выбери стиль 🎨\n"
                "После выбора сразу соберу обложку.",
                reply_markup=theme_keyboard(s.get("style", SURPRISE)),
            )
        return

    if data.startswith("cta:"):
        val = data[4:]
        if val == "__custom__":
            s["cta_auto"] = False
            s["step"] = STEP_CTA
            await query.edit_message_text("Напиши свой призыв к действию — одна короткая фраза:")
        elif val == "__auto__":
            s["cta_auto"] = True
            s["cta_text"] = ""
            s["step"] = STEP_THEME
            await query.edit_message_text(
                "🤖 Ок, придумаю призыв сам по смыслу поста ✓\n\n"
                "Шаг 4 из 4 — выбери стиль 🎨\n🎲 Сюрприз — каждый раз новое оформление",
                reply_markup=theme_keyboard(s.get("style", SURPRISE)),
            )
        else:
            s["cta_auto"] = False
            s["cta_text"] = val
            s["cta_subtext"] = ""
            s["step"] = STEP_THEME
            await query.edit_message_text(
                f"Призыв: «{val}» ✓\n\n"
                "Шаг 4 из 4 — выбери стиль 🎨\n🎲 Сюрприз — каждый раз новое оформление",
                reply_markup=theme_keyboard(s.get("style", SURPRISE)),
            )
        return

    if data == "wiz:restart":
        # чистим старые фото
        for p in s["photos"]:
            try: os.unlink(p["path"])
            except: pass
        s["step"] = STEP_MODE
        s["texts"] = []
        s["photos"] = []
        await query.edit_message_text(
            "Начинаем заново 🆕\n\nЧто делаем?",
            reply_markup=mode_keyboard(),
        )
        return

    if data.startswith("style:") or data.startswith("theme:"):
        val = data.split(":", 1)[1]
        if data.startswith("theme:"):
            # легаси-кнопки из старых сообщений — конкретная палитра классики
            s["style"] = "classic"
            s["theme"] = val if val in THEME_NAMES else "warm"
            s["resolved_style"] = "classic"
            chosen_label = THEME_NAMES.get(val, val)
        elif val == "__reroll__":
            # тот же стиль, другая палитра (для сюрприза — последний выпавший стиль)
            pinned = s.get("resolved_style")
            if pinned and pinned in STYLES:
                keep = s.get("style", SURPRISE)
                s["style"] = pinned
                resolve_theme(s)
                s["style"] = keep
            else:
                resolve_theme(s)
            chosen_label = STYLE_NAMES.get(s.get("resolved_style"), "🎲")
        else:
            s["style"] = val if val in STYLE_NAMES else SURPRISE
            resolve_theme(s)
            chosen_label = STYLE_NAMES.get(s["style"], s["style"])
            if s["style"] == SURPRISE:
                chosen_label += f" → {STYLE_NAMES.get(s['resolved_style'], '')}"

        async def reply(content, reply_markup=None, as_media_group=False, as_photo=False):
            if as_media_group:
                return await query.message.reply_media_group(content)
            if as_photo:
                return await query.message.reply_photo(content, reply_markup=reply_markup)
            return await query.message.reply_text(content, reply_markup=reply_markup)

        async def edit(m, text):
            await m.edit_text(text)

        # спрашиваем, чем рисовать картинки: бесплатно или через Qwen
        if qwen_bg.enabled() and s.get("mode") in ENGINE_QUESTION and not s.get("engine"):
            s["step"] = STEP_ENGINE
            await query.edit_message_text(
                f"Стиль: {chosen_label} ✓\n\n" + ENGINE_QUESTION[s["mode"]],
                reply_markup=engine_keyboard(),
            )
            return

        await query.edit_message_text(f"Стиль: {chosen_label} ✓")
        await _start_generation(uid, query, reply, edit)
        return

    if data.startswith("engine:"):
        s["engine"] = data.split(":")[1]

        async def reply(content, reply_markup=None, as_media_group=False, as_photo=False):
            if as_media_group:
                return await query.message.reply_media_group(content)
            if as_photo:
                return await query.message.reply_photo(content, reply_markup=reply_markup)
            return await query.message.reply_text(content, reply_markup=reply_markup)

        async def edit(m, text):
            await m.edit_text(text)

        await query.edit_message_text(
            "✨ Рисую фоны через Qwen" if s["engine"] == "qwen" else "🆓 Собираю бесплатно"
        )
        await _start_generation(uid, query, reply, edit)
        return

    if data.startswith("reslide:"):
        arg = data.split(":", 1)[1]
        slides = s.get("pending_slides") or []
        if not slides:
            await query.message.reply_text(
                "Карусели в памяти уже нет — собери заново 🆕",
                reply_markup=InlineKeyboardMarkup(
                    [[InlineKeyboardButton("🆕 Новая карусель", callback_data="wiz:restart")]]
                ),
            )
            return
        if arg == "menu":
            await query.message.reply_text(
                "Какой слайд перерисовать?",
                reply_markup=reslide_keyboard(slides),
            )
            return
        await _regen_slide(uid, arg, query)
        return

    if data == "lib:done":
        s["step"] = STEP_MODE
        await query.edit_message_text(
            f"🗂 В базе {len(lib_load())} фото ✓\n\nЧто делаем дальше?",
            reply_markup=mode_keyboard(),
        )
        return

    if data.startswith("screen:"):
        action = data.split(":")[1]

        async def reply(content, reply_markup=None, as_media_group=False, as_photo=False):
            if as_media_group:
                return await query.message.reply_media_group(content)
            if as_photo:
                return await query.message.reply_photo(content, reply_markup=reply_markup)
            return await query.message.reply_text(content, reply_markup=reply_markup)

        async def edit(m, text):
            await m.edit_text(text)

        queue = s.get("pending_screens", [])
        if action == "skipall":
            s["pending_screens"] = []
        elif queue:
            queue.pop(0)
            s["pending_screens"] = queue
        try:
            await query.edit_message_reply_markup(reply_markup=None)
        except Exception:
            pass
        await _ask_screens_or_render(uid, reply, edit)
        return

    if data == "wiz:caption_go":
        async def reply(content, reply_markup=None, as_media_group=False, as_photo=False):
            if as_media_group:
                return await query.message.reply_media_group(content)
            if as_photo:
                return await query.message.reply_photo(content, reply_markup=reply_markup)
            return await query.message.reply_text(content, reply_markup=reply_markup)

        async def edit(m, text):
            await m.edit_text(text)

        await _run_caption(uid, reply, edit)
        return


# ── служебные команды ───────────────────────────────────────────────────────

async def cmd_username(update: Update, context: ContextTypes.DEFAULT_TYPE):
    s = get_session(update.effective_user.id)
    if context.args:
        name = context.args[0]
        if not name.startswith("@"):
            name = "@" + name
        s["username"] = name
        await update.message.reply_text(f"Никнейм: {name}")
    else:
        await update.message.reply_text("Пример: /username @my_project")


async def cmd_library(update: Update, context: ContextTypes.DEFAULT_TYPE):
    s = get_session(update.effective_user.id)
    items = lib_load()
    if not items:
        text = "🗂 База фото пуста.\nНажми кнопку и пришли фото — начну собирать."
    else:
        recent = "\n".join(f"• {it['description']}" for it in items[-7:])
        text = f"🗂 В базе {len(items)} фото. Последние:\n{recent}"
    s["step"] = STEP_LIBRARY
    await update.message.reply_text(
        text + "\n\nПрисылай фото — сохраню в базу.",
        reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("✅ Готово", callback_data="lib:done")]]),
    )


async def cmd_transcribe(update: Update, context: ContextTypes.DEFAULT_TYPE):
    s = get_session(update.effective_user.id)
    s["step"] = STEP_TRANSCRIBE
    await update.message.reply_text(TRANSCRIBE_ASK)


async def cmd_whoami(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показывает ID для настройки закрытого доступа."""
    user, chat = update.effective_user, update.effective_chat
    await update.message.reply_text(f"user_id: {user.id}\nchat_id: {chat.id}")


ALLOWED_USER_IDS = configured_ids(os.getenv("ALLOWED_USER_IDS", ""))
ALLOWED_CHAT_IDS = configured_ids(os.getenv("ALLOWED_CHAT_IDS", ""))


def allowed(update: Update) -> bool:
    user, chat = update.effective_user, update.effective_chat
    return is_allowed(
        user.id if user else None,
        chat.id if chat else None,
        ALLOWED_USER_IDS,
        ALLOWED_CHAT_IDS,
    )


def guarded(handler):
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not allowed(update):
            if update.message:
                await update.message.reply_text("Это личный бот. Доступ закрыт.")
            elif update.callback_query:
                await update.callback_query.answer("Доступ закрыт", show_alert=True)
            return
        return await handler(update, context)
    return wrapper


def main():
    if not TELEGRAM_TOKEN:
        raise ValueError("Нет TELEGRAM_TOKEN в .env")
    if not OPENAI_API_KEY:
        raise ValueError("Нет OPENAI_API_KEY в .env")
    if not ALLOWED_USER_IDS and not ALLOWED_CHAT_IDS:
        raise ValueError("Укажи ALLOWED_USER_IDS или ALLOWED_CHAT_IDS в .env")

    load_sessions()

    app = Application.builder().token(TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler("start", guarded(cmd_start)))
    app.add_handler(CommandHandler("username", guarded(cmd_username)))
    app.add_handler(CommandHandler("library", guarded(cmd_library)))
    app.add_handler(CommandHandler("reels", guarded(cmd_transcribe)))
    app.add_handler(CommandHandler("whoami", cmd_whoami))
    app.add_handler(CallbackQueryHandler(guarded(callback_handler)))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, guarded(handle_text)))
    app.add_handler(MessageHandler(filters.PHOTO, guarded(handle_photo)))
    app.add_handler(MessageHandler(
        filters.VIDEO | filters.VIDEO_NOTE | filters.VOICE | filters.AUDIO
        | filters.Document.VIDEO | filters.Document.AUDIO,
        guarded(handle_video),
    ))

    # после каждого апдейта складываем состояние мастера на диск
    async def _persist(update, context):
        save_sessions()

    app.add_handler(TypeHandler(Update, _persist), group=1)

    logger.info("Бот запущен")
    # сообщения, присланные во время перезапуска, не выбрасываем — иначе бот «молчит»
    app.run_polling(drop_pending_updates=False)


if __name__ == "__main__":
    import asyncio
    asyncio.set_event_loop(asyncio.new_event_loop())
    main()
