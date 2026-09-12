import json
import tempfile
import time
import unittest
from pathlib import Path

import course
import public_pages
import telegram_api
from access import Store

WORK = {'title': 'Планер дня', 'description': 'Помогает маме с тремя детьми держать план', 'url': 'https://planer.example.com', 'status': 'personal', 'kind': 'Сервис'}
DRAFT = {'headline': 'Собираю сервисы и ИИ-агентов', 'about': 'Училась на курсе, делаю небольшие сервисы.', 'contact': '@anya', 'works': [WORK, dict(WORK, title='Агент меню'), dict(WORK, title='Сайт психолога', status='client')]}


class WeekTests(unittest.TestCase):
    def test_no_start_means_no_week(self):
        self.assertEqual(course.week_state(None)['week'], None)

    def test_week_advances_every_seven_days(self):
        now = 1_800_000_000
        self.assertEqual(course.week_state(now, now)['week'], 1)
        self.assertEqual(course.week_state(now, now + 6 * 86400)['week'], 1)
        self.assertEqual(course.week_state(now, now + 7 * 86400)['week'], 2)
        self.assertEqual(course.week_state(now, now + 35 * 86400)['week'], 6)

    def test_course_finishes_after_six_weeks(self):
        now = 1_800_000_000
        state = course.week_state(now, now + 42 * 86400)
        self.assertTrue(state['finished'])
        self.assertEqual(state['week'], 6)

    def test_days_left_counts_down(self):
        now = 1_800_000_000
        self.assertEqual(course.week_state(now, now)['daysLeft'], 7)
        self.assertEqual(course.week_state(now, now + 6 * 86400)['daysLeft'], 1)


class ValidationTests(unittest.TestCase):
    def test_contact_accepts_telegram_email_and_link(self):
        self.assertEqual(course.contact('@anya_bot')['kind'], 'telegram')
        self.assertEqual(course.contact('https://t.me/anya')['value'], '@anya')
        self.assertEqual(course.contact('anya@example.com')['kind'], 'email')
        self.assertEqual(course.contact('https://anya.example.com')['kind'], 'link')

    def test_contact_rejects_phone_and_plain_text(self):
        for value in ('+7 900 000-00-00', 'напишите мне', 'http://anya.example.com'):
            with self.assertRaises(course.CourseError):
                course.contact(value)

    def test_work_link_must_be_https_without_password(self):
        self.assertEqual(course.public_link(''), '')
        with self.assertRaises(course.CourseError):
            course.public_link('http://example.com')
        with self.assertRaises(course.CourseError):
            course.public_link('https://user:pass@example.com')

    def test_slug_rules(self):
        self.assertEqual(course.slug('  Anya-Works '), 'anya-works')
        for value in ('ab', 'админ', 'anya--works', 'login', 'p'):
            with self.assertRaises(course.CourseError):
                course.slug(value)

    def test_payload_requires_honest_status(self):
        with self.assertRaises(course.CourseError):
            course.portfolio_payload(dict(DRAFT, works=[dict(WORK, status='real')]))

    def test_certificate_number_format(self):
        self.assertEqual(course.certificate_number(7, 1_800_000_000), 'NP-2027-0007')


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Store(Path(self.tmp.name) / 'db', 'a' * 64)
        self.uid = self.store.upsert('anya@example.com', 'Анна Петрова', 'student', int(time.time()) + 86400, 'test')
        self.original_send = telegram_api.send

    def tearDown(self):
        telegram_api.send = self.original_send
        self.tmp.cleanup()

    def test_start_is_kept_and_restart_moves_it(self):
        first = self.store.start_course(self.uid)['started']
        self.assertEqual(self.store.start_course(self.uid)['started'], first)
        self.assertEqual(self.store.course_state(self.uid)['week'], 1)
        self.assertIsNone(self.store.forget_course(self.uid)['week'])

    def test_portfolio_is_private_until_published(self):
        self.store.save_portfolio(self.uid, DRAFT)
        self.assertFalse(self.store.portfolio(self.uid)['published'])
        self.assertIsNone(self.store.public_portfolio('anya'))
        self.store.publish_portfolio(self.uid, 'anya')
        page = self.store.public_portfolio('anya')
        self.assertEqual(page['name'], 'Анна Петрова')
        self.assertEqual(len(page['works']), 3)
        self.store.unpublish_portfolio(self.uid)
        self.assertIsNone(self.store.public_portfolio('anya'))

    def test_public_page_never_shows_email(self):
        self.store.save_portfolio(self.uid, DRAFT)
        self.store.publish_portfolio(self.uid, 'anya')
        html = public_pages.render_portfolio(self.store.public_portfolio('anya'), 'nonce')
        self.assertNotIn('anya@example.com', html)
        self.assertIn('Анна Петрова', html)
        self.assertIn('noindex', html)

    def test_closed_account_disappears_from_public_page(self):
        self.store.save_portfolio(self.uid, DRAFT)
        self.store.publish_portfolio(self.uid, 'anya')
        admin = self.store.upsert('admin@example.com', 'Куратор', 'admin', None, 'test')
        self.store.update(self.uid, False, int(time.time()) + 86400, admin)
        self.assertIsNone(self.store.public_portfolio('anya'))

    def test_address_cannot_be_taken_twice(self):
        other = self.store.upsert('lena@example.com', 'Елена', 'student', int(time.time()) + 86400, 'test')
        self.store.save_portfolio(self.uid, DRAFT)
        self.store.publish_portfolio(self.uid, 'anya')
        self.store.save_portfolio(other, DRAFT)
        with self.assertRaises(course.CourseError):
            self.store.publish_portfolio(other, 'anya')

    def test_certificate_needs_published_portfolio_and_six_weeks(self):
        with self.assertRaises(course.CourseError):
            self.store.issue_certificate(self.uid, [1, 2, 3, 4, 5, 6])
        self.store.save_portfolio(self.uid, DRAFT)
        self.store.publish_portfolio(self.uid, 'anya')
        with self.assertRaises(course.CourseError):
            self.store.issue_certificate(self.uid, [1, 2, 3])
        issued = self.store.issue_certificate(self.uid, [1, 2, 3, 4, 5, 6])
        number = issued['certificate']['number']
        self.assertRegex(number, r'^NP-\d{4}-\d{4}$')
        # Повторный запрос не выдаёт второй номер.
        self.assertEqual(self.store.issue_certificate(self.uid, [1, 2, 3, 4, 5, 6])['certificate']['number'], number)
        self.assertEqual(self.store.public_certificate(number)['name'], 'Анна Петрова')
        self.assertEqual(self.store.public_certificate(number)['slug'], 'anya')
        self.assertIsNone(self.store.public_certificate('NP-2000-9999'))

    def test_certificate_hides_unpublished_portfolio_link(self):
        self.store.save_portfolio(self.uid, DRAFT)
        self.store.publish_portfolio(self.uid, 'anya')
        number = self.store.issue_certificate(self.uid, [1, 2, 3, 4, 5, 6])['certificate']['number']
        self.store.unpublish_portfolio(self.uid)
        self.assertIsNone(self.store.public_certificate(number)['slug'])

    def sent_codes(self):
        codes = []
        telegram_api.send = lambda chat, text, secret=None: (codes.append((chat, text)), True)[1]
        return codes

    def test_code_arrives_in_the_same_chat_and_links_it(self):
        codes = self.sent_codes()
        self.store.telegram_request(self.uid, 555, 'Анна Петрова')
        chat, text = codes[0]
        self.assertEqual(chat, 555)
        self.assertIn('Анна', text)
        code = [word for word in text.replace('\n', ' ').split() if word.isdigit() and len(word) == 6][0]
        self.assertFalse(self.store.telegram_state(self.uid)['linked'])
        with self.assertRaises(Exception):
            self.store.telegram_confirm(self.uid, '000000' if code != '000000' else '111111')
        self.assertTrue(self.store.telegram_confirm(self.uid, code)['linked'])

    def test_unreachable_chat_is_not_linked(self):
        telegram_api.send = lambda chat, text, secret=None: False
        with self.assertRaises(Exception):
            self.store.telegram_request(self.uid, 556, 'Анна')
        self.assertFalse(self.store.telegram_state(self.uid)['linked'])

    def test_a_foreign_telegram_id_is_rejected_when_already_used(self):
        other = self.store.upsert('lena@example.com', 'Елена', 'student', int(time.time()) + 86400, 'test')
        codes = self.sent_codes()
        self.store.telegram_request(other, 777, 'Елена')
        self.store.telegram_confirm(other, [w for w in codes[0][1].replace('\n', ' ').split() if w.isdigit() and len(w) == 6][0])
        with self.assertRaises(Exception):
            self.store.telegram_request(self.uid, 777, 'Анна')

    def test_numeric_id_is_required(self):
        self.sent_codes()
        for value in ('@anya', '', 'abc', -5):
            with self.assertRaises(Exception):
                self.store.telegram_request(self.uid, value, 'Анна')

    def test_connection_attempts_are_limited(self):
        self.sent_codes()
        for _ in range(5):
            self.store.telegram_request(self.uid, 555, 'Анна')
        with self.assertRaises(Exception):
            self.store.telegram_request(self.uid, 555, 'Анна')

    def test_saving_keeps_publication(self):
        self.store.save_portfolio(self.uid, DRAFT)
        self.store.publish_portfolio(self.uid, 'anya')
        self.store.save_portfolio(self.uid, dict(DRAFT, headline='Делаю сайты'))
        self.assertEqual(self.store.public_portfolio('anya')['headline'], 'Делаю сайты')



class ContentTests(unittest.TestCase):
    def test_week_titles_match_the_platform(self):
        """Бот и платформа должны называть недели одинаково."""
        source = Path(__file__).resolve().parents[2] / 'app' / 'content' / 'course-route.ts'
        titles = [line.split('title: "')[1].split('"')[0] for line in source.read_text().splitlines() if 'title: "' in line and 'week:' in line]
        self.assertEqual(titles, course.WEEK_TITLES)
if __name__ == '__main__':
    unittest.main()


class SendingTests(unittest.TestCase):
    """Путь до Telegram рвётся: одна неудача не должна ломать подключение."""

    def setUp(self):
        self.calls = []
        self.original = telegram_api._connection
        telegram_api.time.sleep = lambda _: None

    def tearDown(self):
        telegram_api._connection = self.original

    def fake(self, answers):
        outer = self
        self.ways = []

        class Connection:
            def request(self, *args, **kwargs):
                outer.calls.append(args[1])
                answer = answers[len(outer.calls) - 1]
                if isinstance(answer, Exception):
                    raise answer

            def getresponse(self):
                answer = answers[len(outer.calls) - 1]

                class Response:
                    status = answer[0]
                    def read(self_inner): return answer[1]
                return Response()

            def close(self):
                pass

        telegram_api._connection = lambda via='': (outer.ways.append(via), Connection())[1]

    def test_retries_a_broken_connection(self):
        self.fake([TimeoutError('timed out'), (200, b'{"ok": true}')])
        self.assertTrue(telegram_api.send(555, 'привет', 'token'))
        self.assertEqual(len(self.calls), 2)
        self.assertIn('/bottoken/sendMessage', self.calls[0])

    def test_gives_up_after_the_last_attempt(self):
        self.fake([TimeoutError('timed out')] * telegram_api.ATTEMPTS)
        with self.assertRaises(TimeoutError):
            telegram_api.send(555, 'привет', 'token')
        self.assertEqual(len(self.calls), telegram_api.ATTEMPTS)

    def test_a_closed_chat_is_not_retried(self):
        self.fake([(403, b'{"ok": false}')])
        self.assertFalse(telegram_api.send(555, 'привет', 'token'))
        self.assertEqual(len(self.calls), 1)

    def test_alternates_between_the_tunnel_and_the_direct_route(self):
        telegram_api.os.environ['NP_TELEGRAM_VIA'] = '127.0.0.1:8443'
        try:
            self.fake([TimeoutError('timed out'), TimeoutError('timed out'), (200, b'{"ok": true}')])
            self.assertTrue(telegram_api.send(555, 'привет', 'token'))
            self.assertEqual(self.ways, ['127.0.0.1:8443', '', '127.0.0.1:8443'])
        finally:
            telegram_api.os.environ.pop('NP_TELEGRAM_VIA', None)

    def test_without_a_tunnel_only_the_direct_route_is_used(self):
        self.fake([(200, b'{"ok": true}')])
        self.assertTrue(telegram_api.send(555, 'привет', 'token'))
        self.assertEqual(self.ways, [''])

    def test_without_a_token_nothing_is_sent(self):
        self.fake([(200, b'{"ok": true}')])
        self.assertFalse(telegram_api.send(555, 'привет', ''))
        self.assertEqual(self.calls, [])


if __name__ == '__main__':
    unittest.main()
