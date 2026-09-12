"""Календарь шести недель, портфолио и сертификат. Чистые функции без сети и БД."""
import re
import time

WEEKS = 6
WEEK = 7 * 86400
STATUSES = ('study', 'personal', 'client')
RESERVED = {'login', 'admin', 'account', 'kurs1', 'api', 'baza', 'data', 'feya', 'kviz', 'lm', 'neiroprofi', 'legal', 'p', 'raboty', 's', 'www'}


class CourseError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


WEEK_TITLES = [
    'Полезный сервис для себя',
    'Мой личный ИИ-агент',
    'ИИ-агент для заказчика',
    'Первый сайт',
    'Развиваем готовый проект',
    'Портфолио и первая услуга',
]


def week_state(started, now=None):
    """Какая идёт неделя маршрута. started — момент нажатия «начинаю», в секундах."""
    if not started:
        return {'started': None, 'week': None, 'finished': False, 'dayOfWeek': None, 'daysLeft': None}
    now = int(now if now is not None else time.time())
    elapsed = max(0, now - int(started))
    index = elapsed // WEEK + 1
    finished = index > WEEKS
    week = WEEKS if finished else int(index)
    day = elapsed % WEEK // 86400 + 1
    return {
        'started': int(started),
        'week': week,
        'finished': finished,
        'dayOfWeek': WEEKS if finished else int(day),
        'daysLeft': 0 if finished else int(7 - elapsed % WEEK // 86400),
    }


def text(value, field, limit, required=True):
    value = ' '.join(str(value or '').split())
    if required and not value:
        raise CourseError(f'Заполните поле «{field}».')
    if len(value) > limit:
        raise CourseError(f'Поле «{field}» длиннее {limit} символов. Сократите текст.')
    return value


def public_link(value):
    """Только полная https-ссылка. Логин и пароль в ссылке не принимаем."""
    value = str(value or '').strip()
    if not value:
        return ''
    if not re.fullmatch(r'https://[^\s<>"\']{4,300}', value) or '@' in value.split('/')[2]:
        raise CourseError('Ссылка на работу должна начинаться с https:// и быть без пароля.')
    return value


def contact(value):
    """Как с ней связаться: Telegram, почта или https-ссылка. Телефон не просим."""
    value = str(value or '').strip()
    if re.fullmatch(r'@[A-Za-z][A-Za-z0-9_]{3,31}', value):
        return {'kind': 'telegram', 'value': value, 'href': 'https://t.me/' + value[1:]}
    if re.fullmatch(r'https://t\.me/[A-Za-z][A-Za-z0-9_]{3,31}/?', value):
        name = value.rstrip('/').split('/')[-1]
        return {'kind': 'telegram', 'value': '@' + name, 'href': 'https://t.me/' + name}
    if re.fullmatch(r'[^\s@]{1,64}@[^\s@]{2,180}\.[^\s@]{2,20}', value):
        return {'kind': 'email', 'value': value, 'href': 'mailto:' + value}
    if re.fullmatch(r'https://[^\s<>"\']{4,300}', value) and '@' not in value.split('/')[2]:
        return {'kind': 'link', 'value': value, 'href': value}
    raise CourseError('Контакт: @имя в Telegram, почта или https-ссылка.')


def slug(value):
    value = str(value or '').strip().lower()
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{2,39}', value) or '--' in value:
        raise CourseError('Адрес страницы: латиница, цифры и дефис, от 3 до 40 знаков.')
    if value in RESERVED:
        raise CourseError('Этот адрес занят служебной страницей. Выберите другой.')
    return value


def works(items):
    if not isinstance(items, list) or not 1 <= len(items) <= 8:
        raise CourseError('Выберите от 1 до 8 работ.')
    result = []
    for item in items:
        if not isinstance(item, dict):
            raise CourseError('Проверьте карточки работ.')
        status = item.get('status')
        if status not in STATUSES:
            raise CourseError('У каждой работы нужен честный статус: учебная, для себя или для заказчика.')
        result.append({
            'title': text(item.get('title'), 'Название работы', 120),
            'description': text(item.get('description'), 'Для кого и что делает', 600),
            'url': public_link(item.get('url')),
            'status': status,
            'kind': text(item.get('kind'), 'Тип работы', 40, required=False) or 'Проект',
        })
    return result


def portfolio_payload(data):
    if not isinstance(data, dict):
        raise CourseError('Проверьте заполненные поля.')
    return {
        'headline': text(data.get('headline'), 'Чем я помогаю', 120),
        'about': text(data.get('about'), 'О себе', 600),
        'contact': contact(data.get('contact')),
        'works': works(data.get('works')),
    }


def certificate_number(order, started=None):
    year = time.gmtime(started or time.time()).tm_year
    return f'NP-{year}-{int(order):04d}'


def may_certify(portfolio, weeks_done):
    """Сертификат — только опубликованному портфолио с тремя работами и шестью закрытыми неделями."""
    if not portfolio or not portfolio.get('published'):
        raise CourseError('Сначала опубликуйте портфолио: сертификат ссылается на него.')
    if len(portfolio.get('works') or []) < 3:
        raise CourseError('Для сертификата нужно не меньше трёх работ в портфолио.')
    if not isinstance(weeks_done, list) or sorted(set(int(w) for w in weeks_done if isinstance(w, int) and 1 <= w <= WEEKS)) != list(range(1, WEEKS + 1)):
        raise CourseError('Сертификат выдаётся, когда закрыты все шесть недель маршрута.')
    return True
