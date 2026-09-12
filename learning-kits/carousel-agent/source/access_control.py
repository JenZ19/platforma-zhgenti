import re
from pathlib import Path


def configured_ids(raw: str) -> set[int]:
    return {int(value) for value in re.findall(r"-?\d+", raw or "")}


def is_allowed(user_id, chat_id, allowed_user_ids: set[int], allowed_chat_ids: set[int]) -> bool:
    """Fail closed: an empty allowlist grants no access."""
    if not allowed_user_ids and not allowed_chat_ids:
        return False
    return user_id in allowed_user_ids or chat_id in allowed_chat_ids


def safe_state_dir(path: Path, kit_root: Path) -> Path:
    resolved = path.expanduser().resolve()
    original = (Path.home() / ".local" / "share" / "carousel-bot").resolve()
    if resolved == original or original in resolved.parents:
        raise ValueError("Учебный бот не может использовать каталог состояния оригинала")
    return resolved
