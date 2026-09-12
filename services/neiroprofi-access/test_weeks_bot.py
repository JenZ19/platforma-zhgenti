import tempfile
import time
import unittest
from pathlib import Path

import course
import telegram_api
import weeks_bot
from access import Store


class BotTestBase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Store(Path(self.tmp.name) / 'db', 'a' * 64)
        self.uid = self.store.upsert('anya@example.com', 'Анна Петрова', 'student', int(time.time()) + 90 * 86400, 'test')
        self.sent = []
        self.delivered = True
        self.original = weeks_bot.send
        weeks_bot.send = lambda token, chat, text: (self.sent.append((chat, text)), self.delivered)[1]
        weeks_bot.time.sleep = lambda _: None

    def tearDown(self):
        weeks_bot.send = self.original
        self.tmp.cleanup()

    def link(self, chat=555):
        codes = []
        original = telegram_api.send
        telegram_api.send = lambda target, text, secret=None: (codes.append(text), True)[1]
        try:
            self.store.telegram_request(self.uid, chat, 'Анна Петрова')
            code = [word for word in codes[0].replace('\n', ' ').split() if word.isdigit() and len(word) == 6][0]
            self.store.telegram_confirm(self.uid, code)
        finally:
            telegram_api.send = original


class DispatchTests(BotTestBase):
    def test_nothing_goes_out_before_the_course_starts(self):
        self.link()
        self.assertEqual(weeks_bot.dispatch(self.store, 'token', 'https://ezhgenti.ru'), 0)
        self.assertFalse(self.sent)

    def test_one_message_per_week(self):
        self.link()
        started = self.store.start_course(self.uid)['started']
        self.assertEqual(weeks_bot.dispatch(self.store, 'token', 'https://ezhgenti.ru', started), 1)
        self.assertEqual(weeks_bot.dispatch(self.store, 'token', 'https://ezhgenti.ru', started + 86400), 0)
        self.assertEqual(weeks_bot.dispatch(self.store, 'token', 'https://ezhgenti.ru', started + 8 * 86400), 1)
        self.assertIn('неделя 2 из 6', self.sent[-1][1])
        self.assertIn(course.WEEK_TITLES[1], self.sent[-1][1])

    def test_finished_course_gets_one_closing_message(self):
        self.link()
        started = self.store.start_course(self.uid)['started']
        end = started + 43 * 86400
        self.assertEqual(weeks_bot.dispatch(self.store, 'token', 'https://ezhgenti.ru', end), 1)
        self.assertIn('портфолио', self.sent[-1][1])
        self.assertEqual(weeks_bot.dispatch(self.store, 'token', 'https://ezhgenti.ru', end + 7 * 86400), 0)

    def test_closed_access_stops_reminders(self):
        self.link()
        started = self.store.start_course(self.uid)['started']
        admin = self.store.upsert('admin@example.com', 'Куратор', 'admin', None, 'test')
        self.store.update(self.uid, False, started + 90 * 86400, admin)
        self.assertEqual(weeks_bot.dispatch(self.store, 'token', 'https://ezhgenti.ru', started), 0)

    def test_blocked_bot_unlinks_the_chat(self):
        self.link()
        started = self.store.start_course(self.uid)['started']
        self.delivered = False
        self.assertEqual(weeks_bot.dispatch(self.store, 'token', 'https://ezhgenti.ru', started), 0)
        self.assertFalse(self.store.telegram_state(self.uid)['linked'])

    def test_expired_access_stops_reminders(self):
        self.link()
        started = self.store.start_course(self.uid)['started']
        # Доступ закончился — напоминания молчат, даже если маршрут не пройден.
        self.assertEqual(weeks_bot.dispatch(self.store, 'token', 'https://ezhgenti.ru', started + 120 * 86400), 0)

    def test_message_names_the_student_and_links_the_platform(self):
        self.link()
        started = self.store.start_course(self.uid)['started']
        weeks_bot.dispatch(self.store, 'token', 'https://ezhgenti.ru', started)
        text = self.sent[0][1]
        self.assertIn('Анна', text)
        self.assertIn('https://ezhgenti.ru/kurs1/', text)
        self.assertNotIn('anya@example.com', text)


if __name__ == '__main__':
    unittest.main()


class NudgeTests(BotTestBase):
    """Мягкий пинг уходит только тем, у кого отметки уроков действительно стоят."""

    def stale_progress(self, steps=4, days=6):
        self.store.save_progress(self.uid, {'feya-academy-progress-v1:planning:service': '{"completed":[1,2,3,4]}'})
        with self.store.connect() as db:
            db.execute('UPDATE progress_sync SET steps=?, updated=? WHERE user_id=?',
                       (steps, int(time.time()) - days * 86400, self.uid))

    def test_silent_without_started_course(self):
        self.link()
        self.stale_progress()
        self.assertEqual(weeks_bot.nudge(self.store, 'token', 'https://ezhgenti.ru'), 0)

    def test_silent_while_progress_is_fresh(self):
        self.link()
        self.store.start_course(self.uid)
        self.stale_progress(days=1)
        self.assertEqual(weeks_bot.nudge(self.store, 'token', 'https://ezhgenti.ru'), 0)

    def test_silent_when_nothing_was_ever_marked(self):
        self.link()
        self.store.start_course(self.uid)
        self.stale_progress(steps=0)
        self.assertEqual(weeks_bot.nudge(self.store, 'token', 'https://ezhgenti.ru'), 0)

    def test_silent_while_a_question_waits_for_the_curator(self):
        self.link()
        self.store.start_course(self.uid)
        self.stale_progress()
        self.store.ask_support(self.uid, 'Анна Петрова', {'question': 'Не открывается предпросмотр, что делать?'})
        self.assertEqual(weeks_bot.nudge(self.store, 'token', 'https://ezhgenti.ru'), 0)

    def test_one_message_and_no_repeat_without_new_steps(self):
        self.link()
        self.store.start_course(self.uid)
        self.stale_progress()
        self.assertEqual(weeks_bot.nudge(self.store, 'token', 'https://ezhgenti.ru'), 1)
        self.assertIn('Спросить куратора', self.sent[-1][1])
        self.assertEqual(weeks_bot.nudge(self.store, 'token', 'https://ezhgenti.ru'), 0)

    def test_blocked_chat_unlinks_reminders(self):
        self.link()
        self.store.start_course(self.uid)
        self.stale_progress()
        self.delivered = False
        self.assertEqual(weeks_bot.nudge(self.store, 'token', 'https://ezhgenti.ru'), 0)
        self.assertFalse(self.store.telegram_state(self.uid)['linked'])
