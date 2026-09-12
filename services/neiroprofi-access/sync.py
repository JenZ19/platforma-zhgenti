"""Учебный прогресс в аккаунте: копия того, что браузер держит у себя.

Браузер остаётся рабочим хранилищем, сервер — общей копией между устройствами.
Правило слияния одно: где пройдено больше шагов, та запись и остаётся. Поэтому
вход с нового ноутбука не стирает работу, сделанную на телефоне.
"""
import json

PREFIXES = ('feya-academy-progress-v1:', 'feya-academy-output-v1:', 'submarine:setup-platform:')
KEYS = ('neiroprofi-course-route-v1', 'neiroprofi-results-v1')
PROGRESS = 'feya-academy-progress-v1:'
MAX_ENTRIES = 600
MAX_VALUE = 100_000
MAX_TOTAL = 262_144


class SyncError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def allowed(key):
    return isinstance(key, str) and (key in KEYS or any(key.startswith(prefix) for prefix in PREFIXES))


def check(entries):
    """Принимаем только учебные ключи и только строки: ничего чужого в аккаунт не кладём."""
    if not isinstance(entries, dict):
        raise SyncError('Неверный формат прогресса.')
    if len(entries) > MAX_ENTRIES:
        raise SyncError('Слишком много записей прогресса.', 413)
    total = 0
    for key, value in entries.items():
        if not allowed(key):
            raise SyncError('В прогрессе есть неизвестные записи.')
        if not isinstance(value, str) or len(value) > MAX_VALUE:
            raise SyncError('В прогрессе есть слишком длинные записи.', 413)
        total += len(key) + len(value)
    if total > MAX_TOTAL:
        raise SyncError('Прогресс не помещается в копию аккаунта.', 413)
    return entries


def completed_steps(value):
    try:
        done = json.loads(value).get('completed')
        return len(done) if isinstance(done, list) else 0
    except (ValueError, AttributeError, TypeError):
        return 0


def merge(stored, incoming):
    """Шаги не отнимаем: у записи прогресса побеждает более длинное прохождение."""
    result = dict(stored or {})
    for key, value in (incoming or {}).items():
        old = result.get(key)
        if old is None or not key.startswith(PROGRESS):
            result[key] = value
        else:
            result[key] = value if completed_steps(value) >= completed_steps(old) else old
    return result


def summary(entries):
    """Что видит куратор: сколько шагов пройдено и сколько проектов начато."""
    progress = {key: value for key, value in (entries or {}).items()
                if key.startswith(PROGRESS) and not key.endswith(':legacy-20260908')}
    steps = sum(completed_steps(value) for value in progress.values())
    projects = sum(1 for value in progress.values() if completed_steps(value) > 0)
    return {'steps': steps, 'projects': projects}
