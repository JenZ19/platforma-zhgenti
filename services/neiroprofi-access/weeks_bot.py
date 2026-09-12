"""Напоминания о неделе маршрута и мягкий пинг застрявшим.

Сообщения уходят через общего бота школы, который живёт в другом проекте и сам
опрашивает Telegram. Здесь только рассылка: параллельный опрос сломал бы его.
Подключение и отключение напоминаний — в платформе, не командами боту.

  python3 weeks_bot.py send    — понедельничная рассылка о текущей неделе.
  python3 weeks_bot.py nudge   — один мягкий вопрос тем, у кого прогресс стоит.
"""
import os
import sys
import time

import course
import telegram_api
from access import Store


def send(token, chat_id, text):
    """False — чат недоступен: ученица не начала диалог с ботом или заблокировала его."""
    return telegram_api.send(chat_id, text, token)


def weekly_text(name, state, origin):
    first = (name.split()[0] if name else '').strip()
    hello = f'{first}, доброе утро!' if first else 'Доброе утро!'
    if state['finished']:
        return (f'{hello} Шесть недель маршрута пройдены.\n\n'
                'Остался последний шаг: соберите портфолио из 3–5 работ и опубликуйте его — '
                f'после этого платформа выдаст сертификат.\n{origin}/kurs1/?section=portfolio')
    title = course.WEEK_TITLES[state['week'] - 1]
    return (f'{hello} Идёт неделя {state["week"]} из {course.WEEKS} — «{title}».\n\n'
            'Достаточно одного доведённого до конца проекта. Если прошлая неделя не закрыта, '
            f'спокойно закройте её: маршрут никуда не денется.\n{origin}/kurs1/\n\n'
            'Отключить напоминания можно в платформе: «Настройки» → «Напоминания о неделе в Telegram».')


def dispatch(store, token, origin, now=None):
    """Одно сообщение на аккаунт за неделю. Повторный запуск в тот же день ничего не дублирует."""
    now = int(now or time.time())
    sent = 0
    with store.connect() as db:
        rows = db.execute('''SELECT t.chat_id, t.sent_week, c.started, u.id, u.name FROM telegram_links t
                             JOIN users u ON u.id=t.user_id
                             JOIN course_start c ON c.user_id=t.user_id
                             WHERE t.chat_id IS NOT NULL AND t.muted=0 AND u.active=1
                             AND (u.expires IS NULL OR u.expires>?)''', (now,)).fetchall()
    for row in rows:
        state = course.week_state(row['started'], now)
        mark = 99 if state['finished'] else state['week']
        if row['sent_week'] == mark:
            continue
        if send(token, row['chat_id'], weekly_text(row['name'], state, origin)):
            with store.connect() as db:
                db.execute('UPDATE telegram_links SET sent_week=? WHERE user_id=?', (mark, row['id']))
            sent += 1
        else:
            store.unlink_telegram(chat_id=row['chat_id'])
        time.sleep(0.2)
    return sent


STUCK_DAYS = 4
NUDGE_PAUSE = 10 * 86400


def nudge_text(name, origin):
    first = (name.split()[0] if name else '').strip()
    hello = f'{first}, привет!' if first else 'Привет!'
    return (f'{hello} Заметили, что уроки на паузе несколько дней.\n\n'
            'Это нормально — маршрут никуда не денется. Но если застряли на шаге, не сидите над ним в одиночку: '
            'на странице шага есть кнопка «Спросить куратора об этом шаге», а рядом — Искра, она отвечает сразу.\n'
            f'{origin}/kurs1/?section=projects\n\n'
            'Если сейчас просто нет времени — ответьте куратору, и мы подвинем ваш отсчёт недель.')


def nudge(store, token, origin, now=None):
    """Один вопрос тем, у кого отметки уроков стоят несколько дней.

    Молчим, если ученица ещё ни разу ничего не отметила (нечему стоять), если её вопрос
    уже ждёт ответа куратора и если такой же пинг уже уходил, а шагов с тех пор не прибавилось.
    """
    now = int(now or time.time())
    stale = now - STUCK_DAYS * 86400
    sent = 0
    with store.connect() as db:
        rows = db.execute("""SELECT t.chat_id, t.nudge_at, t.nudge_steps, p.steps, p.updated, u.id, u.name
                             FROM telegram_links t
                             JOIN users u ON u.id=t.user_id
                             JOIN course_start c ON c.user_id=t.user_id
                             JOIN progress_sync p ON p.user_id=t.user_id
                             WHERE t.chat_id IS NOT NULL AND t.muted=0 AND u.active=1
                             AND (u.expires IS NULL OR u.expires>?)
                             AND p.steps>0 AND p.updated<?
                             AND NOT EXISTS (SELECT 1 FROM support_requests s
                                             WHERE s.user_id=u.id AND s.answer IS NULL)""",
                          (now, stale)).fetchall()
    for row in rows:
        if row['nudge_at'] and row['nudge_at'] > now - NUDGE_PAUSE:
            continue
        if row['nudge_steps'] is not None and row['nudge_steps'] >= row['steps']:
            continue
        if send(token, row['chat_id'], nudge_text(row['name'], origin)):
            with store.connect() as db:
                db.execute('UPDATE telegram_links SET nudge_at=?, nudge_steps=? WHERE user_id=?',
                           (now, row['steps'], row['id']))
            sent += 1
        else:
            store.unlink_telegram(chat_id=row['chat_id'])
        time.sleep(0.2)
    return sent


def main():
    os.umask(0o077)
    command = sys.argv[1] if len(sys.argv) > 1 else 'send'
    token = telegram_api.token()
    if not token:
        raise SystemExit('NP_REMINDER_BOT_TOKEN is required; reminders never reuse the Iskra key.')
    if command not in ('send', 'nudge'):
        raise SystemExit('Usage: weeks_bot.py send|nudge')
    store = Store(os.environ['NP_DATABASE'], os.environ['NP_SECRET'])
    origin = os.environ.get('NP_ORIGIN', 'https://ezhgenti.ru')
    if command == 'nudge':
        print(f'Nudges sent: {nudge(store, token, origin)}')
    else:
        print(f'Reminders sent: {dispatch(store, token, origin)}')


if __name__ == '__main__':
    main()
