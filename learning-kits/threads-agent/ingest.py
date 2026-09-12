"""Сбор материалов: TG-превью, web-блоги, трендвотчинг."""
from __future__ import annotations

import asyncio
import csv
import hashlib
import io
import re
from datetime import datetime, timezone
from urllib.parse import parse_qs, urljoin, urlparse

import feedparser
import httpx
from bs4 import BeautifulSoup

import kb
import llm
from config import Channel, Config, Source

TME_PREVIEW = "https://t.me/s/{name}"
UA = {"User-Agent": "Mozilla/5.0 (compatible; threads-agent/1.0)"}
RSS_PATHS = ["/rss", "/feed", "/rss.xml", "/atom.xml", "/index.xml"]
MAX_NEW_ARTICLES = 6
SOURCE_TIMEOUT = 120.0
SHEET_MIN_LEN = 120          # короче — это не сценарий, а обрывок

# Маркеры рекламы в чужих каналах. Только однозначные: слово «реклама» само по
# себе встречается и в полезных постах про маркетинг, поэтому ловим юридические
# пометки и промо-механику, а не тему поста. Мягкие случаи (анонсы конференций,
# набор в комьюнити) отсекает уже промпт.
AD_MARKERS = [
    r"\berid\b",
    r"на правах рекламы",
    r"#\s*реклама",
    r"рекламодател",
    r"по вопросам рекламы",
    r"партн[её]рский материал",
    r"промокод",
    r"реферальн",
    r"розыгрыш",
    r"конкурс репостов",
]
AD_RE = re.compile("|".join(AD_MARKERS), re.IGNORECASE)


def looks_like_ad(text: str) -> bool:
    """Похоже на рекламную вставку, а не на полезный пост."""
    return bool(AD_RE.search(text or ""))
SHEET_TITLE_COLUMNS = ["Исходный хук", "Название или подпись"]


def _entry_published(e) -> str | None:
    """Парсить published_parsed (или updated_parsed) feedparser → ISO-строка с UTC."""
    pp = e.get("published_parsed") or e.get("updated_parsed")
    if not pp:
        return None
    return datetime(*pp[:6], tzinfo=timezone.utc).isoformat()


def parse_tme_preview(html: str) -> list[dict]:
    """Разобрать HTML страницы t.me/s/<name> → [{url, text, published_at}]."""
    soup = BeautifulSoup(html, "html.parser")
    out: list[dict] = []
    for msg in soup.select(".tgme_widget_message"):
        text_el = msg.select_one(".tgme_widget_message_text")
        text = text_el.get_text("\n", strip=True) if text_el else ""
        data_post = msg.get("data-post")
        url = f"https://t.me/{data_post}" if data_post else None
        time_el = msg.select_one("time[datetime]")
        published = time_el.get("datetime") if time_el else None
        if url and text:
            out.append({"url": url, "text": text, "published_at": published})
    return out


async def _fetch(url: str, *, client: httpx.AsyncClient, retries: int = 3,
                  timeout: float | None = None) -> str:
    last: Exception | None = None
    kwargs = {} if timeout is None else {"timeout": timeout}
    for attempt in range(retries):
        try:
            r = await client.get(url, headers=UA, follow_redirects=True, **kwargs)
            r.raise_for_status()
            return r.text
        except Exception as e:  # noqa: BLE001
            last = e
            if attempt < retries - 1:
                await asyncio.sleep(2 ** attempt)
    raise RuntimeError(f"GET {url} провалился: {last}")


async def ingest_telegram(conn, channel_key: str, src: Source, *, client: httpx.AsyncClient) -> int:
    html = await _fetch(TME_PREVIEW.format(name=src.name), client=client)
    posts = parse_tme_preview(html)
    added = 0
    for p in posts:
        # Из чужих каналов рекламу не тащим вообще: в базу не попадёт — в ветку
        # не просочится. Свои каналы фильтровать не нужно.
        if not src.own and looks_like_ad(p["text"]):
            continue
        if kb.add_item(conn, channel=channel_key, source=f"tg:{src.name}", url=p["url"],
                       published_at=p["published_at"], title=None, text=p["text"],
                       own=src.own, kind="tg"):
            added += 1
    if posts:
        kb.set_meta(conn, f"cursor:{channel_key}:tg:{src.name}", posts[-1]["url"])
    return added


def _strip_html(s: str) -> str:
    return BeautifulSoup(s or "", "html.parser").get_text(" ", strip=True)


def _blog_index_links(html: str, base: str) -> list[tuple[str, str]]:
    soup = BeautifulSoup(html, "html.parser")
    seen: set[str] = set()
    out: list[tuple[str, str]] = []
    for a in soup.select("a[href]"):
        href = a.get("href", "")
        if not href or href.startswith("#"):
            continue
        url = urljoin(base, href)
        if "/blog" not in url or url.rstrip("/") == base.rstrip("/"):
            continue
        if url in seen:
            continue
        seen.add(url)
        title = a.get_text(" ", strip=True)
        if title:
            out.append((url, title))
        if len(out) >= 15:
            break
    return out


def _main_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    node = soup.find("article") or soup.find("main") or soup.body or soup
    return node.get_text("\n", strip=True)[:4000]


async def _try_feeds(base: str, *, client) -> list[dict]:
    base = base.rstrip("/")
    for u in [base] + [base + p for p in RSS_PATHS]:
        try:
            raw = await _fetch(u, client=client, retries=1, timeout=10.0)
        except Exception:  # noqa: BLE001
            continue
        parsed = feedparser.parse(raw)
        if parsed.entries:
            return [dict(e) for e in parsed.entries[:20]]
    return []


async def ingest_web(conn, channel_key: str, src: Source, *, client) -> int:
    added = 0
    entries = await _try_feeds(src.name, client=client)
    if entries:
        for e in entries:
            url = e.get("link")
            if not url:
                continue
            if kb.add_item(conn, channel=channel_key, source=src.name, url=url,
                           published_at=_entry_published(e), title=e.get("title"),
                           text=_strip_html(e.get("summary", "")), own=src.own, kind="web"):
                added += 1
        return added
    html = await _fetch(src.name, client=client)
    new_fetched = 0
    for url, title in _blog_index_links(html, src.name):
        if kb.has_item(conn, url, channel_key):
            continue
        if new_fetched >= MAX_NEW_ARTICLES:
            break
        new_fetched += 1
        try:
            page = await _fetch(url, client=client, retries=1, timeout=12.0)
        except Exception:  # noqa: BLE001
            continue
        if kb.add_item(conn, channel=channel_key, source=src.name, url=url,
                       published_at=None, title=title, text=_main_text(page),
                       own=src.own, kind="web"):
            added += 1
    return added


def sheet_csv_url(url: str) -> str:
    """Ссылку на Google-таблицу превращаем в ссылку на CSV-выгрузку вкладки.

    Работает для обычных /edit#gid=… и /edit?gid=… ссылок; если gid не указан,
    выгружается первая вкладка. Таблица должна быть открыта по ссылке — доступа
    к приватным таблицам у бота нет.
    """
    m = re.search(r"/spreadsheets/d/([A-Za-z0-9_-]+)", url)
    if not m:
        raise RuntimeError(f"не похоже на ссылку Google-таблицы: {url}")
    sheet_id = m.group(1)
    parsed = urlparse(url)
    gid = (parse_qs(parsed.query).get("gid") or
           parse_qs(parsed.fragment.lstrip("#")).get("gid") or [""])[0]
    out = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
    return f"{out}&gid={gid}" if gid else out


def _sheet_key(url: str, text: str, channel_key: str = "") -> str:
    """Стабильный id строки: хэш текста сценария. Переставили строки местами —
    дубля не появится, отредактировали сценарий — приедет как новый.

    Ключ каналозависимый: одну и ту же таблицу читают несколько каналов
    (Натали и Яков), и url в items — UNIQUE на всю базу."""
    m = re.search(r"/spreadsheets/d/([A-Za-z0-9_-]+)", url)
    sheet_id = m.group(1) if m else "unknown"
    digest = hashlib.sha1(text.strip().encode("utf-8")).hexdigest()[:16]
    return f"sheet://{sheet_id}/{channel_key}/{digest}" if channel_key else \
        f"sheet://{sheet_id}/{digest}"


def parse_sheet_csv(raw: str, column: str) -> list[dict]:
    """CSV выгрузки → [{url, title, text}] по указанной колонке (обычно «Сценарий»)."""
    reader = csv.DictReader(io.StringIO(raw))
    if not reader.fieldnames:
        return []
    wanted = column.strip().lower()
    col = next((f for f in reader.fieldnames if (f or "").strip().lower() == wanted), None)
    if col is None:
        raise RuntimeError(f"в таблице нет колонки «{column}» "
                           f"(есть: {', '.join(f for f in reader.fieldnames if f)})")
    title_cols = [f for f in reader.fieldnames
                  if (f or "").strip() in SHEET_TITLE_COLUMNS]
    out: list[dict] = []
    for row in reader:
        text = (row.get(col) or "").strip()
        if len(text) < SHEET_MIN_LEN:
            continue
        title = ""
        for tc in title_cols:
            title = (row.get(tc) or "").strip().split("\n")[0]
            if title:
                break
        out.append({"title": title[:200], "text": text})
    return out


async def ingest_sheet(conn, channel_key: str, src: Source, *, client: httpx.AsyncClient) -> int:
    """Сценарии из Google-таблицы в очередь. Строки, которые уже брали, не
    повторяются: ключ строки — хэш текста, а сам INSERT идемпотентен по url."""
    raw = await _fetch(sheet_csv_url(src.name), client=client, timeout=60.0)
    added = 0
    for row in parse_sheet_csv(raw, src.column or "Сценарий"):
        # published_at не ставим: сценарий не новость, он ждёт своей очереди
        # и не должен протухать по дате.
        if kb.add_item(conn, channel=channel_key, source=f"sheet:{src.column or 'Сценарий'}",
                       url=_sheet_key(src.name, row["text"], channel_key),
                       published_at=None,
                       title=row["title"] or None, text=row["text"], own=src.own,
                       kind="sheet"):
            added += 1
    return added


async def ingest_trend(conn, channel: Channel, cfg: Config) -> int:
    query = channel.trend_query or channel.topic
    prompt = [
        {"role": "system", "content": "Ты аналитик новостей. Кратко перечисли главные "
                                       "новости и обсуждаемые темы за последние 24 часа по "
                                       "заданной теме, по-русски, маркированным списком с фактами."},
        {"role": "user", "content": f"Тема: {query}. Главные новости и обсуждаемые темы за 24 часа."},
    ]
    try:
        # Трендвотчер ищет в вебе — это умеет только perplexity через OpenRouter,
        # поэтому он остаётся на своём ключе, даже когда посты пишет DeepSeek.
        text = await llm.chat(prompt, model=cfg.trends_model,
                              api_key=(getattr(cfg, "trends_api_key", "")
                                       or cfg.openrouter_api_key),
                              base_url=getattr(cfg, "trends_api_url", None),
                              json_mode=False, temperature=0.4)
    except llm.LLMError:
        return 0
    if not text.strip():
        return 0
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    url = f"trend://{channel.key}/{stamp}"
    if kb.add_item(conn, channel=channel.key, source="trendwatch", url=url,
                   published_at=datetime.now(timezone.utc).isoformat(),
                   title=f"Тренды {stamp}", text=text, own=True, kind="trend"):
        return 1
    return 0


async def ingest_channel(conn, channel: Channel, cfg: Config) -> dict[str, int]:
    counts: dict[str, int] = {}
    async with httpx.AsyncClient(timeout=30.0) as client:
        for src in channel.sources:
            label = f"tg:{src.name}" if src.kind == "telegram" else src.name
            try:
                if src.kind == "telegram":
                    counts[label] = await asyncio.wait_for(
                        ingest_telegram(conn, channel.key, src, client=client),
                        timeout=SOURCE_TIMEOUT)
                elif src.kind == "sheet":
                    counts[label] = await asyncio.wait_for(
                        ingest_sheet(conn, channel.key, src, client=client),
                        timeout=SOURCE_TIMEOUT)
                else:
                    counts[label] = await asyncio.wait_for(
                        ingest_web(conn, channel.key, src, client=client),
                        timeout=SOURCE_TIMEOUT)
            except Exception:  # noqa: BLE001
                counts[label] = -1
    try:
        counts["trend"] = await asyncio.wait_for(
            ingest_trend(conn, channel, cfg), timeout=SOURCE_TIMEOUT)
    except Exception:  # noqa: BLE001
        counts["trend"] = -1
    kb.purge_old_items(conn, days=90)
    return counts
