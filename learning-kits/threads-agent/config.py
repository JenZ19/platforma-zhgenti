"""Загрузка окружения и конфигов threads-agent."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import yaml
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent

# API у обоих провайдеров одинаковый (OpenAI-совместимый chat/completions),
# отличаются базовый URL, ключ и имена моделей.
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

# Глобальный список доверенных TG-хендлов (регистронезависимо): источник
# считается СВОИМ без явного own: true в sources.yml. Общий для всех ботов.
TRUSTED_TG: set[str] = set()


@dataclass
class Source:
    name: str            # имя TG-канала, URL блога или URL Google-таблицы
    kind: str            # "telegram" | "web" | "sheet"
    own: bool = False
    column: str = ""     # только для sheet: колонка, из которой берём текст


@dataclass
class Channel:
    key: str
    handle: str
    topic: str
    enabled: bool
    style: str
    trend_query: str
    news_count: int
    total: int
    angles: list[str] = field(default_factory=list)
    sources: list[Source] = field(default_factory=list)
    # Сколько веток в дневном залпе делать из очереди сценариев (источник-таблица).
    # 0 — канал сценарии не использует, всё как раньше.
    scripts_count: int = 0
    # Куда зовём в последнем посте ветки по сценарию (ссылка на ТГ-канал).
    cta_link: str = ""


@dataclass
class Config:
    bot_token: str
    # Ключ провайдера, которым ПИШУТСЯ посты. Имя историческое: с 05.09.2026
    # здесь может лежать ключ DeepSeek (см. LLM_PROVIDER ниже).
    openrouter_api_key: str
    model: str
    trends_model: str
    db_path: str
    channels: dict[str, Channel]
    # Мульти-бот: ключ meta для admin_chat_id этого инстанса и необязательный
    # аллоулист каналов (см. load_config). Добавлено в конец с дефолтом, чтобы
    # не сломать позиционные/именованные вызовы Config(...) в существующих тестах.
    admin_key: str = "admin_chat_id"
    # Куда шлём генерацию постов. Меняется вместе с LLM_PROVIDER.
    api_url: str = OPENROUTER_URL
    # Трендвотчер (perplexity/sonar) умеет искать в вебе, у DeepSeek такого нет,
    # поэтому он всегда остаётся на OpenRouter со своим ключом.
    trends_api_key: str = ""
    trends_api_url: str = OPENROUTER_URL
    # Предохранитель учебного комплекта: без явного opt-in сеть не стартует.
    allow_live_mode: bool = False
    owner_user_id: int = 0


def _load_yaml(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def _merge_sources(raw: dict) -> list[Source]:
    out: list[Source] = []
    for t in (raw.get("telegram") or []):
        own = (t["name"].lower() in TRUSTED_TG) or bool(t.get("own", False))
        out.append(Source(name=t["name"], kind="telegram", own=own))
    for w in (raw.get("web") or []):
        out.append(Source(name=w["url"], kind="web", own=bool(w.get("own", False))))
    # Google-таблицы: свои материалы по умолчанию (это наши же тексты).
    for sh in (raw.get("sheets") or []):
        out.append(Source(name=sh["url"], kind="sheet", own=bool(sh.get("own", True)),
                          column=(sh.get("column") or "").strip()))
    return out


def load_config(root: Path = ROOT) -> Config:
    root = root.resolve()
    env = {k: (v or "") for k, v in dotenv_values(root / ".env").items()}
    channels_raw = _load_yaml(root / "channels.yml")
    sources_raw = _load_yaml(root / "sources.yml")

    channels: dict[str, Channel] = {}
    for key, c in channels_raw.items():
        channels[key] = Channel(
            key=key,
            handle=c.get("handle", ""),
            topic=c.get("topic", ""),
            enabled=bool(c.get("enabled", True)),
            style=(c.get("style") or "").strip(),
            trend_query=c.get("trend_query") or c.get("topic", ""),
            news_count=int(c.get("news_count", 4)),
            total=int(c.get("total", 10)),
            angles=list(c.get("angles") or []),
            sources=_merge_sources(sources_raw.get(key, {})),
            scripts_count=int(c.get("scripts_count", 0)),
            cta_link=(c.get("cta_link") or "").strip(),
        )

    # Мульти-бот: CHANNELS — необязательный аллоулист ключей каналов через
    # запятую (для второго инстанса, например бота Виктории, ограниченного
    # одним каналом). Фильтруем ПОСЛЕ построения словаря channels; пусто/не
    # задано — оставляем все каналы как раньше; неизвестные ключи молча
    # игнорируются (не добавляют записей).
    channels_filter = env.get("CHANNELS", "").strip()
    if channels_filter:
        allowed = {k.strip() for k in channels_filter.split(",") if k.strip()}
        channels = {k: v for k, v in channels.items() if k in allowed}

    # LLM_PROVIDER=deepseek — посты пишет прямой API DeepSeek (свой ключ, свои
    # имена моделей, без наценки шлюза). Любое другое значение — OpenRouter,
    # как было раньше.
    openrouter_key = env.get("OPENROUTER_API_KEY", "").strip()
    provider = env.get("LLM_PROVIDER", "openrouter").strip().lower()
    if provider == "deepseek":
        api_url = DEEPSEEK_URL
        api_key = env.get("DEEPSEEK_API_KEY", "").strip()
        model = env.get("DEEPSEEK_MODEL", "deepseek-v4-flash").strip()
    else:
        api_url = OPENROUTER_URL
        api_key = openrouter_key
        model = env.get("OPENROUTER_MODEL", "anthropic/claude-sonnet-4.5").strip()

    db_raw = env.get("DB_PATH", "study-data/live.sqlite3").strip()
    db_path = Path(db_raw)
    db_path = (db_path if db_path.is_absolute() else root / db_path).resolve()
    if not db_path.is_relative_to(root):
        raise ValueError("DB_PATH должен быть внутри учебного комплекта")

    return Config(
        bot_token=env.get("BOT_TOKEN", "").strip(),
        openrouter_api_key=api_key,
        model=model,
        trends_model=env.get("OPENROUTER_TRENDS_MODEL", "perplexity/sonar").strip(),
        db_path=str(db_path),
        channels=channels,
        # Ключ meta для admin_chat_id этого инстанса — разные боты (разные
        # ADMIN_KEY в systemd EnvironmentFile) не мешают друг другу в общей БД.
        admin_key=env.get("ADMIN_KEY", "admin_chat_id").strip(),
        api_url=api_url,
        trends_api_key=openrouter_key,
        allow_live_mode=env.get("ALLOW_LIVE_MODE", "false").strip().lower() == "true",
        owner_user_id=int(env.get("OWNER_USER_ID", "0").strip() or "0"),
    )


def _is_telegram_source(r: str) -> bool:
    """t.me-ссылка или голый хэндл ('@name'/'name') — без точки в доменной части.

    Веб-URL без схемы (например 'example.ru/blog') содержит точку в доменной
    части и НЕ должен попадать в telegram-ветку.
    """
    if "t.me/" in r:
        return True
    if r.startswith(("http://", "https://")):
        return False
    domain_part = r.split("/", 1)[0].lstrip("@")
    return "." not in domain_part


def add_source(root: Path, channel_key: str, raw: str) -> Source:
    """Добавить источник в sources.yml. raw = 't.me/<name>' / '@<name>' / URL.

    Идемпотентно: повторное добавление уже существующего источника (в любом
    из эквивалентных написаний) не создаёт дубль в sources.yml.
    """
    path = root / "sources.yml"
    data = _load_yaml(path)
    node = data.setdefault(channel_key, {})
    node.setdefault("telegram", [])
    node.setdefault("web", [])

    r = raw.strip()
    if _is_telegram_source(r):
        name = r.replace("https://", "").replace("http://", "")
        name = name.replace("t.me/s/", "").replace("t.me/", "").lstrip("@").strip("/")
        src = Source(name=name, kind="telegram", own=False)
        if not any(t.get("name") == name for t in node["telegram"]):
            node["telegram"].append({"name": name})
    else:
        url = r if r.startswith(("http://", "https://")) else f"https://{r}"
        src = Source(name=url, kind="web", own=False)
        if not any(w.get("url") == url for w in node["web"]):
            node["web"].append({"url": url})

    with path.open("w", encoding="utf-8") as f:
        yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False)
    return src
