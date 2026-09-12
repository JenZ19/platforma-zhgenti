"""Отправка сообщений через общего бота школы.

Бот живёт в другом проекте и опрашивает Telegram сам. Здесь только исходящие
сообщения: параллельный getUpdates сломал бы его (Telegram отдаёт 409).

Путь с этого сервера до api.telegram.org рвётся волнами: то почти всё проходит,
то больше половины попыток виснет. Поэтому мы чередуем два независимых маршрута —
SSH-туннель через другую машину (NP_TELEGRAM_VIA=127.0.0.1:8443) и прямое
соединение. TLS сквозной в обоих случаях: сертификат проверяется по имени
api.telegram.org, промежуточная машина переписку не видит.
"""
import http.client
import json
import os
import socket
import ssl
import time

HOST = 'api.telegram.org'
ATTEMPTS = 4
TIMEOUT = 10


def token():
    return os.environ.get('NP_REMINDER_BOT_TOKEN', '')


def bot_name():
    return os.environ.get('NP_REMINDER_BOT', '')


def routes():
    """Сначала туннель, если он настроен, затем прямой путь — и так по кругу."""
    via = os.environ.get('NP_TELEGRAM_VIA', '').strip()
    return ([via, ''] if via else [''])


def _connection(via=''):
    context = ssl.create_default_context()
    if not via:
        return http.client.HTTPSConnection(HOST, 443, timeout=TIMEOUT, context=context)
    host, _, port = via.partition(':')
    raw = socket.create_connection((host or '127.0.0.1', int(port or 8443)), timeout=TIMEOUT)
    connection = http.client.HTTPSConnection(HOST, timeout=TIMEOUT, context=context)
    connection.sock = context.wrap_socket(raw, server_hostname=HOST)
    return connection


def _call(secret, method, payload, via=''):
    connection = _connection(via)
    try:
        connection.request('POST', f'/bot{secret}/{method}', json.dumps(payload),
                           {'Content-Type': 'application/json'})
        response = connection.getresponse()
        return response.status, response.read()
    finally:
        connection.close()


def send(chat_id, text, secret=None):
    """True — доставлено. False — чат недоступен (бот заблокирован или диалог не начат)."""
    secret = secret or token()
    if not secret:
        return False
    payload = {'chat_id': int(chat_id), 'text': text, 'disable_web_page_preview': True}
    ways = routes()
    last = None
    for attempt in range(ATTEMPTS):
        try:
            status, body = _call(secret, 'sendMessage', payload, ways[attempt % len(ways)])
            # Отказ самого Telegram повторять незачем: чат недоступен или запрос неверный.
            if status in (400, 403):
                return False
            if status == 200:
                return json.loads(body).get('ok', False)
            last = OSError(f'Telegram ответил {status}')
        except (OSError, ssl.SSLError, http.client.HTTPException) as error:
            last = error
        if attempt + 1 < ATTEMPTS:
            time.sleep(0.5)
    raise last
