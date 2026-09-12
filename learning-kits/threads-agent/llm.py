"""Клиент chat/completions (httpx, ретраи с бэкофом).

API одинаковый у OpenRouter и DeepSeek, отличаются только базовый URL и ключ,
поэтому провайдер задаётся параметром base_url (или env LLM_BASE_URL).
"""
from __future__ import annotations

import asyncio
import os

import httpx

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

# Историческое имя: часть кода и тестов ссылается на URL как на llm.URL.
URL = OPENROUTER_URL


class LLMError(Exception):
    pass


async def chat(
    messages: list[dict],
    *,
    model: str | None = None,
    api_key: str | None = None,
    temperature: float = 0.8,
    json_mode: bool = True,
    timeout: float = 90.0,
    retries: int = 3,
    client: httpx.AsyncClient | None = None,
    base_url: str | None = None,
) -> str:
    key = (api_key if api_key is not None else os.getenv("OPENROUTER_API_KEY", "")).strip()
    mdl = model or os.getenv("OPENROUTER_MODEL", "anthropic/claude-sonnet-4.5")
    url = base_url or os.getenv("LLM_BASE_URL", "").strip() or OPENROUTER_URL
    if not key:
        raise LLMError("ключ LLM не задан")

    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    payload: dict = {"model": mdl, "messages": messages, "temperature": temperature}
    # Модели deepseek-v4-* по умолчанию «размышляют»: на нашем промпте это
    # 6–24 тысячи reasoning-токенов и 2–3 минуты на пачку вместо секунд.
    # Флаг проверен живым вызовом в webinar-moderator-bot (04.07.2026).
    if url == DEEPSEEK_URL:
        payload["thinking"] = {"type": "disabled"}
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    own_client = client is None
    cli = client or httpx.AsyncClient(timeout=timeout)
    try:
        last: Exception | None = None
        for attempt in range(retries):
            try:
                r = await cli.post(url, headers=headers, json=payload)
                r.raise_for_status()
                return r.json()["choices"][0]["message"]["content"]
            except httpx.HTTPStatusError as e:
                # 4xx errors: no retry, fail immediately
                if e.response.status_code < 500:
                    resp_text = e.response.text[:200]
                    raise LLMError(f"HTTP {e.response.status_code} от {url}: {resp_text}") from e
                # 5xx errors: retry
                last = e
                if attempt < retries - 1:
                    await asyncio.sleep(2 ** attempt)
            except (httpx.TransportError, asyncio.TimeoutError) as e:
                # Network/timeout errors: retry
                last = e
                if attempt < retries - 1:
                    await asyncio.sleep(2 ** attempt)
            except (ValueError, KeyError, IndexError, TypeError) as e:
                # Broken JSON/schema: no retry
                raise LLMError(f"ответ LLM невалиден: {type(e).__name__}") from e
        raise LLMError(f"LLM недоступен после {retries} попыток: {last}")
    finally:
        if own_client:
            await cli.aclose()
