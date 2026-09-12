"""Расшифровка видео: ссылка на рилс или присланный файл → текст для карусели.

Схема простая: yt-dlp качает ролик → ffmpeg вытаскивает моно-дорожку →
OpenAI распознаёт речь → gpt приводит расшифровку в читаемый вид
(и переводит, если ролик не на русском). Слова автора при этом сохраняются:
чистятся только «эээ», повторы-оговорки и отсутствующая пунктуация.
"""

import os
import re
import json
import shutil
import subprocess
import sys
import tempfile
import logging
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

DOWNLOAD_TIMEOUT = 240
FFMPEG_TIMEOUT = 300

# Распознавание речи живёт на отдельном ключе: у проекта карусельного бота
# нет доступа к моделям транскрибации, поэтому по умолчанию берём ключ из
# TRANSCRIBE_API_KEY (у нас это polza.ai). Пусто — работаем основным клиентом.
# Переменные передаёт только безопасная конфигурация учебного bot.py.
def asr_key() -> str:
    return os.getenv("TRANSCRIBE_API_KEY", "").strip()


def asr_base_url() -> str:
    return os.getenv("TRANSCRIBE_BASE_URL", "").strip()


def transcribe_model() -> str:
    explicit = os.getenv("TRANSCRIBE_MODEL", "").strip()
    if explicit:
        return explicit
    return "openai/gpt-4o-mini-transcribe" if asr_key() else "gpt-4o-mini-transcribe"


TIDY_MODEL = os.getenv("TRANSCRIBE_TIDY_MODEL", "gpt-4o")

_asr_client = None


def asr_client(fallback):
    """Клиент для распознавания речи: свой ключ, если задан, иначе общий."""
    global _asr_client
    key = asr_key()
    if not key:
        return fallback
    if _asr_client is None:
        from openai import OpenAI
        _asr_client = OpenAI(api_key=key, base_url=asr_base_url() or None)
    return _asr_client

# лимит файла у распознавания — 25 МБ; режем с запасом
MAX_AUDIO_BYTES = 24 * 1024 * 1024
CHUNK_SECONDS = 900

URL_RE = re.compile(r"https?://\S+")

# площадки, с которых точно умеем качать; остальные ссылки тоже пробуем,
# но предупреждаем пользователя, что может не выйти
KNOWN_HOSTS = (
    "instagram.com", "instagr.am",
    "tiktok.com", "vt.tiktok.com", "vm.tiktok.com",
    "youtube.com", "youtu.be",
    "vk.com", "vkvideo.ru",
    "rutube.ru",
    "pinterest.com", "pin.it",
    "facebook.com", "fb.watch",
    "t.me",
)


class TranscribeError(RuntimeError):
    """Что-то пошло не так — текст ошибки показываем пользователю как есть."""


@dataclass
class Transcript:
    text: str
    author: str = ""
    title: str = ""
    url: str = ""
    translated: bool = False


def find_video_url(text: str) -> str | None:
    """Первая ссылка в сообщении."""
    if not text:
        return None
    m = URL_RE.search(text)
    return m.group(0).rstrip(").,;»") if m else None


def is_known_host(url: str) -> bool:
    low = url.lower()
    return any(h in low for h in KNOWN_HOSTS)


def _run(command: list, timeout: int) -> subprocess.CompletedProcess:
    return subprocess.run(
        command, check=False, text=True, capture_output=True, timeout=timeout
    )


def _ytdlp_command() -> list:
    binary = shutil.which("yt-dlp")
    if binary:
        return [binary]
    return [sys.executable, "-m", "yt_dlp"]


def download_video(url: str, workdir: str) -> tuple:
    """Качает звуковую дорожку ролика. Возвращает (путь к файлу, автор, описание, ссылка)."""
    Path(workdir).mkdir(parents=True, exist_ok=True)
    template = str(Path(workdir) / "source.%(ext)s")
    command = _ytdlp_command() + [
        "--no-playlist",
        "--no-warnings",
        "--print-json",
        # нужен только звук — так быстрее и не тащим тяжёлое видео
        "-f", "bestaudio/best",
        "-o", template,
        url,
    ]
    try:
        result = _run(command, DOWNLOAD_TIMEOUT)
    except subprocess.TimeoutExpired:
        raise TranscribeError(
            "Ролик качается слишком долго 😕 Пришли видео файлом — расшифрую его."
        )
    except FileNotFoundError:
        raise TranscribeError("На сервере нет yt-dlp — скажи мне, я поставлю.")
    if result.returncode != 0:
        logger.error("yt-dlp: %s", (result.stderr or "")[-800:])
        raise TranscribeError(
            "Не смогла скачать ролик по ссылке 😕\n"
            "Так бывает с закрытыми аккаунтами и историями. "
            "Пришли видео файлом — расшифрую его."
        )

    payload = {}
    for line in reversed((result.stdout or "").strip().splitlines()):
        try:
            payload = json.loads(line)
            break
        except json.JSONDecodeError:
            continue

    path = None
    requested = payload.get("requested_downloads")
    if isinstance(requested, list) and requested and isinstance(requested[0], dict):
        path = requested[0].get("filepath")
    path = path or payload.get("_filename")
    if not path or not os.path.isfile(path):
        found = sorted(Path(workdir).glob("source.*"))
        path = str(found[0]) if found else None
    if not path or not os.path.isfile(path):
        raise TranscribeError("Видео не сохранилось. Пришли его файлом.")

    return (
        path,
        str(payload.get("uploader") or payload.get("channel") or ""),
        str(payload.get("description") or payload.get("title") or ""),
        str(payload.get("webpage_url") or url),
    )


def extract_audio(video_path: str, workdir: str) -> str:
    """Достаёт из видео моно-дорожку 16 кГц — этого хватает распознаванию."""
    audio_path = str(Path(workdir) / "audio.mp3")
    command = [
        "ffmpeg", "-y", "-i", str(video_path),
        "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k",
        audio_path,
    ]
    try:
        result = _run(command, FFMPEG_TIMEOUT)
    except subprocess.TimeoutExpired:
        raise TranscribeError("Слишком длинное видео — не успела обработать звук.")
    except FileNotFoundError:
        raise TranscribeError("На сервере нет ffmpeg — скажи мне, я поставлю.")
    if result.returncode != 0 or not os.path.isfile(audio_path):
        stderr = result.stderr or ""
        logger.error("ffmpeg: %s", stderr[-800:])
        if "does not contain any stream" in stderr or "Output file #0 does not contain" in stderr:
            raise TranscribeError("В ролике нет звуковой дорожки — расшифровывать нечего 🤷‍♀️")
        raise TranscribeError("Не получилось достать звук из видео 😕")
    return audio_path


def _split_audio(audio_path: str, workdir: str) -> list:
    """Длинную дорожку режем на куски — у распознавания лимит 25 МБ на файл."""
    if os.path.getsize(audio_path) <= MAX_AUDIO_BYTES:
        return [audio_path]
    parts_dir = Path(workdir) / "parts"
    parts_dir.mkdir(parents=True, exist_ok=True)
    command = [
        "ffmpeg", "-y", "-i", str(audio_path),
        "-f", "segment", "-segment_time", str(CHUNK_SECONDS),
        "-c", "copy", str(parts_dir / "part-%03d.mp3"),
    ]
    try:
        _run(command, FFMPEG_TIMEOUT)
    except subprocess.TimeoutExpired:
        raise TranscribeError("Слишком длинное видео — не успела разрезать звук.")
    parts = sorted(str(p) for p in parts_dir.glob("part-*.mp3"))
    return parts or [audio_path]


def transcribe_audio(client, audio_path: str, workdir: str) -> str:
    speech = asr_client(client)
    model = transcribe_model()
    chunks = _split_audio(audio_path, workdir)
    pieces = []
    for chunk in chunks:
        try:
            with open(chunk, "rb") as f:
                result = speech.audio.transcriptions.create(model=model, file=f)
        except Exception as e:
            logger.error("Распознавание не ответило: %s", e)
            if "model" in str(e).lower() and ("not" in str(e).lower() or "403" in str(e)):
                raise TranscribeError(
                    "У ключа нет доступа к распознаванию речи. "
                    f"Проверь TRANSCRIBE_API_KEY и модель {model}."
                )
            raise TranscribeError("Распознавание речи не ответило. Попробуй ещё раз через минуту.")
        piece = str(getattr(result, "text", "") or "").strip()
        if piece:
            pieces.append(piece)
    text = " ".join(pieces).strip()
    if not text:
        raise TranscribeError(
            "Речи в ролике не слышно 🤷‍♀️ Если там только музыка — пришли текст сам."
        )
    return text


TIDY_PROMPT = """Ты приводишь в порядок расшифровку речи из видео.

Что делаешь:
1. Определи язык. Если речь НЕ на русском — переведи всё на русский, фраза за фразой, ничего не выбрасывая.
2. Расставь знаки препинания и раздели текст на абзацы по смыслу.
3. Убери мусор устной речи: «эээ», «ну вот», случайные повторы слова, оборванные оговорки.
4. Исправь явные ошибки распознавания в названиях (нейросети, сервисы, бренды), если понятно, о чём речь.

Чего НЕ делаешь:
- не пересказываешь и не сокращаешь: сохраняешь ВСЕ мысли, шаги, цифры, примеры и порядок;
- не дописываешь ничего от себя, не добавляешь выводы, заголовки и списки, которых не было;
- не приглаживаешь стиль под «инфостиль»: живая речь автора должна остаться живой;
- никаких канцелярских оборотов вроде «является», «данный», «в рамках», «стоит отметить».

Верни JSON: {"text": "готовый текст", "translated": true/false}
translated = true, только если пришлось переводить."""


def tidy_transcript(client, raw: str) -> tuple:
    """Расшифровка → читаемый текст. Если модель подвела — отдаём сырой текст."""
    try:
        response = client.chat.completions.create(
            model=TIDY_MODEL,
            messages=[
                {"role": "system", "content": TIDY_PROMPT},
                {"role": "user", "content": raw},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        data = json.loads(response.choices[0].message.content)
        text = str(data.get("text") or "").strip()
        if not text:
            return raw, False
        return text, bool(data.get("translated"))
    except Exception as e:
        logger.error("Не причесала расшифровку: %s", e)
        return raw, False


def from_url(client, url: str) -> Transcript:
    workdir = tempfile.mkdtemp(prefix="reel-")
    try:
        video, author, title, page_url = download_video(url, workdir)
        audio = extract_audio(video, workdir)
        raw = transcribe_audio(client, audio, workdir)
        text, translated = tidy_transcript(client, raw)
        return Transcript(
            text=text, author=author, title=title, url=page_url, translated=translated
        )
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


def from_file(client, video_path: str) -> Transcript:
    workdir = tempfile.mkdtemp(prefix="reel-")
    try:
        audio = extract_audio(video_path, workdir)
        raw = transcribe_audio(client, audio, workdir)
        text, translated = tidy_transcript(client, raw)
        return Transcript(text=text, translated=translated)
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
