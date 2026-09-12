import http.client
import json
import tempfile
import threading
import time
import unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from access import Store, Handler, COOKIE


class HTTPTestBase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.store = Store(Path(cls.tmp.name) / 'db', 'a' * 64)
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.server.store = cls.store
        cls.server.origin = 'https://ezhgenti.ru'
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.tmp.cleanup()

    def request(self, path, data=None, token=None, origin='https://ezhgenti.ru'):
        headers = {'Origin': origin, 'X-Neiroprofi-Request': '1', 'Content-Type': 'application/json'}
        if token:
            headers['Cookie'] = f'{COOKIE}={token}'
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port)
        conn.request('POST' if data is not None else 'GET', path, json.dumps(data) if data is not None else None, headers)
        res = conn.getresponse()
        result = res.status, dict(res.getheaders()), res.read()
        conn.close()
        return result

    def login(self, role):
        email = f'{time.time_ns()}@example.com'
        uid = self.store.upsert(email, 'Проверка', role, None if role == 'admin' else int(time.time()) + 3600, 'test')
        code = self.store.issue(uid, 'test')
        status, headers, _ = self.request('/kurs1/access/api/login', {'email': email, 'code': code})
        self.assertEqual(status, 200)
        return headers['Set-Cookie'].split(';')[0].split('=', 1)[1], headers


class HTTPTests(HTTPTestBase):
    def test_public_login_and_nonce(self):
        status, headers, body = self.request('/kurs1/login')
        self.assertEqual(status, 200)
        self.assertIn('no-store', headers['Cache-Control'])
        self.assertIn("frame-ancestors 'none'", headers['Content-Security-Policy'])
        self.assertIn("manifest-src 'self'", headers['Content-Security-Policy'])
        self.assertNotIn(b'__NONCE__', body)
        self.assertIn('Добавить Нейропрофи на экран телефона', body.decode())
        self.assertIn('iphone-share.jpg', body.decode())
        self.assertNotIn('__HOME_SCREEN_GUIDE__', body.decode())

    def test_logged_out_assets_auth_and_admin(self):
        self.assertEqual(self.request('/internal/check')[0], 401)
        self.assertEqual(self.request('/kurs1/admin')[0], 302)
        self.assertEqual(self.request('/kurs1/access/api/users')[0], 401)

    def test_iskra_requires_session_and_csrf_not_admin(self):
        class Assistant:
            available = True
            def history(self, uid, scope, surface): return [{'role': 'user', 'content': str(uid)}]
            def ask(self, uid, data): return {'answer': str(uid), 'sources': []}
        self.server.iskra = Assistant()
        path = '/kurs1/access/api/iskra'
        self.assertEqual(self.request(path)[0], 401)
        self.assertEqual(self.request(path, {'question': 'test'})[0], 401)
        a, _ = self.login('student')
        b, _ = self.login('student')
        self.assertEqual(self.request(path, {}, a, origin='https://evil.test')[0], 403)
        status, _, body = self.request(path, {'uid': 999}, a)
        self.assertEqual(status, 200)
        self.assertNotEqual(json.loads(body)['answer'], '999')
        self.assertNotEqual(self.request(path, token=a)[2], self.request(path, token=b)[2])

    def test_student_denied_admin_and_role_injection(self):
        token, headers = self.login('student')
        for attr in ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/kurs1/']:
            self.assertIn(attr, headers['Set-Cookie'])
        self.assertEqual(self.request('/internal/check', token=token)[0], 204)
        self.assertEqual(self.request('/kurs1/admin', token=token)[0], 403)
        self.assertEqual(self.request('/kurs1/access/api/users', token=token)[0], 403)
        self.assertEqual(self.request('/kurs1/access/api/create', {'role': 'admin'}, token)[0], 403)

    def test_personal_fairy_is_account_scoped_and_persistent(self):
        endpoint = '/kurs1/access/api/personal-bot'
        self.assertEqual(self.request(endpoint)[0], 401)
        student, _ = self.login('student')
        admin, _ = self.login('admin')
        self.assertEqual(self.request(endpoint, {'url': '@student_fairy_bot'}, student, 'https://evil.example')[0], 403)
        for invalid in ['https://evil.test/bot', '@feyakrestnayasbm_bot', 'https://t.me/test_bot?token=secret', 123]:
            self.assertEqual(self.request(endpoint, {'url': invalid}, student)[0], 400)
        status, _, raw = self.request(endpoint, {'url': '@student_fairy_bot', 'user_id': 999}, student)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(raw)['url'], 'https://t.me/student_fairy_bot')
        self.assertEqual(json.loads(self.request(endpoint, token=student)[2])['url'], 'https://t.me/student_fairy_bot')
        self.assertIsNone(json.loads(self.request(endpoint, token=admin)[2])['url'])
        reopened = Store(self.store.path, self.store.secret)
        self.assertEqual(reopened.personal_bot(self.store.session(student)['id']), 'https://t.me/student_fairy_bot')

    def test_cross_origin_post_rejected(self):
        token, _ = self.login('admin')
        self.assertEqual(self.request('/kurs1/access/api/logout', {}, token, 'https://evil.example')[0], 403)
        self.assertEqual(self.request('/kurs1/access/api/logout', {}, token, '')[0], 403)

    def test_admin_can_create_only_student_and_revoke(self):
        token, _ = self.login('admin')
        email = f'new{time.time_ns()}@example.com'
        status, _, raw = self.request('/kurs1/access/api/create', {'email': email, 'name': '<img onerror=alert(1)>', 'role': 'admin', 'expires': int(time.time()) + 3600}, token)
        self.assertEqual(status, 200)
        code = json.loads(raw)['code']
        student_token, user = self.store.login(email, code, 'local')
        self.assertEqual(user['role'], 'student')
        status, _, _ = self.request('/kurs1/access/api/update', {'id': user['id'], 'active': False, 'expires': user['expires']}, token)
        self.assertEqual(status, 200)
        self.assertEqual(self.request('/internal/check', token=student_token)[0], 401)

    def test_no_traversal_or_unknown_paths(self):
        for path in ['/etc/passwd', '/kurs1/access/../../etc/passwd', '/kurs1/access/api/not-found']:
            self.assertEqual(self.request(path)[0], 404)


    def test_course_and_portfolio_need_a_session(self):
        for path in ('/kurs1/access/api/course',):
            self.assertEqual(self.request(path)[0], 401)
        self.assertEqual(self.request('/kurs1/access/api/portfolio', {'action': 'save'})[0], 401)
        self.assertEqual(self.request('/kurs1/access/api/telegram', {'action': 'link'})[0], 401)

    def test_portfolio_rejects_a_foreign_origin(self):
        token, _ = self.login('student')
        status, _, _ = self.request('/kurs1/access/api/portfolio', {'action': 'save'}, token, origin='https://evil.example')
        self.assertEqual(status, 403)

    def test_course_start_then_week_one(self):
        token, _ = self.login('student')
        status, _, body = self.request('/kurs1/access/api/course', {'action': 'start'}, token)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)['course']['week'], 1)
        status, _, body = self.request('/kurs1/access/api/course', None, token)
        self.assertEqual(json.loads(body)['course']['week'], 1)
        self.assertEqual(json.loads(body)['weeks'], 6)

    def test_publish_then_public_page_is_open_without_login(self):
        token, _ = self.login('student')
        draft = {'headline': 'Собираю сервисы', 'about': 'Коротко о себе.', 'contact': '@anya_neiro',
                 'works': [{'title': 'Планер', 'description': 'Для занятой мамы', 'url': 'https://planer.example.com', 'status': 'personal', 'kind': 'Сервис'}]}
        self.assertEqual(self.request('/kurs1/access/api/portfolio', {'action': 'save', 'portfolio': draft}, token)[0], 200)
        address = f'anya{time.time_ns()}'[:30]
        status, _, body = self.request('/kurs1/access/api/portfolio', {'action': 'publish', 'slug': address}, token)
        self.assertEqual(status, 200)
        self.assertTrue(json.loads(body)['portfolio']['published'])
        status, headers, page = self.request('/p/' + address)
        self.assertEqual(status, 200)
        self.assertIn('noindex', headers['X-Robots-Tag'])
        self.assertIn('Планер', page.decode())
        self.assertNotIn('@example.com', page.decode())
        self.assertEqual(self.request('/p/' + address + 'x')[0], 404)

    def test_bad_portfolio_answers_with_a_readable_error(self):
        token, _ = self.login('student')
        status, _, body = self.request('/kurs1/access/api/portfolio', {'action': 'save', 'portfolio': {'headline': '', 'about': '', 'contact': '+7 900', 'works': []}}, token)
        self.assertEqual(status, 400)
        self.assertIn('Заполните поле', json.loads(body)['error'])

    def test_reminders_need_a_configured_bot(self):
        token, _ = self.login('student')
        status, _, body = self.request('/kurs1/access/api/telegram', {'action': 'request', 'telegramId': 555}, token)
        self.assertEqual(status, 503)
        self.assertIn('куратору', json.loads(body)['error'])

    def test_curator_can_close_a_public_page_but_a_student_cannot(self):
        token, _ = self.login('student')
        draft = {'headline': 'Собираю сервисы', 'about': 'Коротко о себе.', 'contact': '@anya_neiro',
                 'works': [{'title': 'Планер', 'description': 'Для занятой мамы', 'url': 'https://planer.example.com', 'status': 'personal', 'kind': 'Сервис'}]}
        self.request('/kurs1/access/api/portfolio', {'action': 'save', 'portfolio': draft}, token)
        address = f'moder{time.time_ns()}'[:30]
        self.request('/kurs1/access/api/portfolio', {'action': 'publish', 'slug': address}, token)
        status, _, body = self.request('/kurs1/access/api/me', None, token)
        uid = json.loads(body)['id']
        self.assertEqual(self.request('/kurs1/access/api/moderate', {'id': uid, 'moderation': 'unpublish'}, token)[0], 403)
        self.assertEqual(self.request('/p/' + address)[0], 200)
        admin, _ = self.login('admin')
        self.assertEqual(self.request('/kurs1/access/api/moderate', {'id': uid, 'moderation': 'unpublish'}, admin)[0], 200)
        self.assertEqual(self.request('/p/' + address)[0], 404)
        users = json.loads(self.request('/kurs1/access/api/users', None, admin)[2])['users']
        self.assertTrue(any(user['id'] == uid and user['slug'] == address and not user['published'] for user in users))

    def progress(self, done):
        return json.dumps({'version': 1, 'activeStep': done + 1, 'completed': list(range(1, done + 1)), 'score': done * 10})

    def test_progress_travels_between_devices_without_losing_steps(self):
        token, _ = self.login('student')
        key = 'feya-academy-progress-v1:planner'
        phone = {'action': None, 'entries': {key: self.progress(5), 'neiroprofi-course-route-v1': '{"1":"planner"}'}}
        status, _, body = self.request('/kurs1/access/api/progress', {'entries': phone['entries']}, token)
        self.assertEqual(status, 200)
        # Ноутбук отстал: прежние пять шагов должны остаться.
        status, _, body = self.request('/kurs1/access/api/progress', {'entries': {key: self.progress(2)}}, token)
        merged = json.loads(body)['entries']
        self.assertEqual(json.loads(merged[key])['completed'], [1, 2, 3, 4, 5])
        status, _, body = self.request('/kurs1/access/api/progress', None, token)
        self.assertEqual(json.loads(body)['entries']['neiroprofi-course-route-v1'], '{"1":"planner"}')

    def test_progress_accepts_only_learning_keys(self):
        token, _ = self.login('student')
        status, _, body = self.request('/kurs1/access/api/progress', {'entries': {'secret': 'x'}}, token)
        self.assertEqual(status, 400)
        self.assertIn('неизвестные записи', json.loads(body)['error'])

    def test_progress_needs_a_session(self):
        self.assertEqual(self.request('/kurs1/access/api/progress')[0], 401)
        self.assertEqual(self.request('/kurs1/access/api/progress', {'entries': {}})[0], 401)

    def test_question_reaches_the_curator_queue_and_comes_back_answered(self):
        token, _ = self.login('student')
        status, _, body = self.request('/kurs1/access/api/support',
                                       {'action': 'ask', 'question': 'Codex не видит папку проекта',
                                        'project': 'Планер на день', 'step': 3, 'device': 'Компьютер'}, token)
        self.assertEqual(status, 200)
        mine = json.loads(body)['requests']
        self.assertEqual(mine[0]['question'], 'Codex не видит папку проекта')
        self.assertIsNone(mine[0]['answer'])
        # Ученица не может ответить сама себе.
        self.assertEqual(self.request('/kurs1/access/api/support', {'action': 'answer', 'id': mine[0]['id'], 'text': 'ок'}, token)[0], 403)
        admin, _ = self.login('admin')
        queue = json.loads(self.request('/kurs1/access/api/support?queue=1', None, admin)[2])['requests']
        self.assertTrue(any(item['id'] == mine[0]['id'] and item['email'] for item in queue))
        status, _, _ = self.request('/kurs1/access/api/support',
                                    {'action': 'answer', 'id': mine[0]['id'], 'text': 'Откройте папку planner в Codex.'}, admin)
        self.assertEqual(status, 200)
        answered = json.loads(self.request('/kurs1/access/api/support', None, token)[2])['requests'][0]
        self.assertEqual(answered['answer'], 'Откройте папку planner в Codex.')

    def test_students_do_not_see_the_whole_queue(self):
        token, _ = self.login('student')
        self.request('/kurs1/access/api/support', {'action': 'ask', 'question': 'Вопрос первой ученицы'}, token)
        other, _ = self.login('student')
        seen = json.loads(self.request('/kurs1/access/api/support?queue=1', None, other)[2])['requests']
        self.assertEqual(seen, [])

    def test_empty_question_is_refused(self):
        token, _ = self.login('student')
        status, _, body = self.request('/kurs1/access/api/support', {'action': 'ask', 'question': '   '}, token)
        self.assertEqual(status, 400)
        self.assertIn('Заполните поле', json.loads(body)['error'])

if __name__ == '__main__':
    unittest.main()


class GalleryTests(HTTPTestBase):
    """Витрина показывает только то, что ученица сама открыла для показа."""

    draft = {'headline': 'Собираю сервисы', 'about': 'Коротко о себе.', 'contact': '@anya_neiro',
             'works': [{'title': 'Планер', 'description': 'Для занятой мамы', 'url': 'https://planer.example.com',
                        'status': 'personal', 'kind': 'Сервис'}]}

    def publish(self, prefix, **flags):
        token, _ = self.login('student')
        self.request('/kurs1/access/api/portfolio', {'action': 'save', 'portfolio': self.draft}, token)
        address = f'{prefix}{time.time_ns()}'[:30]
        status, _, body = self.request('/kurs1/access/api/portfolio', {'action': 'publish', 'slug': address, **flags}, token)
        return token, address, status, body

    def test_published_page_stays_out_of_the_gallery_by_default(self):
        _, address, status, body = self.publish('quiet')
        self.assertEqual(status, 200)
        portfolio = json.loads(body)['portfolio']
        self.assertTrue(portfolio['published'])
        self.assertFalse(portfolio['listed'])
        self.assertFalse(portfolio['indexable'])
        self.assertNotIn(address, self.request('/raboty')[2].decode())

    def test_listed_page_appears_in_the_gallery(self):
        _, address, status, _ = self.publish('vitrina', listed=True)
        self.assertEqual(status, 200)
        gallery = self.request('/raboty')
        self.assertEqual(gallery[0], 200)
        self.assertIn('/p/' + address, gallery[2].decode())
        self.assertNotIn('@example.com', gallery[2].decode())

    def test_gallery_itself_is_open_to_search_engines(self):
        self.assertNotIn('X-Robots-Tag', self.request('/raboty')[1])

    def test_search_engines_are_allowed_only_by_an_explicit_choice(self):
        _, closed, _, _ = self.publish('closed', listed=True)
        self.assertIn('noindex', self.request('/p/' + closed)[1]['X-Robots-Tag'])
        _, open_page, status, _ = self.publish('opened', listed=True, indexable=True)
        self.assertEqual(status, 200)
        headers = self.request('/p/' + open_page)[1]
        self.assertNotIn('X-Robots-Tag', headers)

    def test_indexing_without_the_gallery_is_refused(self):
        _, _, status, body = self.publish('onlyindex', indexable=True)
        self.assertEqual(status, 400)
        self.assertIn('витрине', json.loads(body)['error'])

    def test_curator_can_remove_a_page_from_the_gallery_without_closing_it(self):
        token, address, _, _ = self.publish('unlist', listed=True)
        uid = json.loads(self.request('/kurs1/access/api/me', None, token)[2])['id']
        admin, _ = self.login('admin')
        self.assertEqual(self.request('/kurs1/access/api/moderate', {'id': uid, 'moderation': 'unlist'}, admin)[0], 200)
        self.assertNotIn('/p/' + address, self.request('/raboty')[2].decode())
        self.assertEqual(self.request('/p/' + address)[0], 200)

    def test_closing_the_page_also_clears_the_gallery_and_indexing(self):
        token, address, _, _ = self.publish('closeall', listed=True, indexable=True)
        status, _, body = self.request('/kurs1/access/api/portfolio', {'action': 'unpublish'}, token)
        self.assertEqual(status, 200)
        portfolio = json.loads(body)['portfolio']
        self.assertFalse(portfolio['listed'])
        self.assertFalse(portfolio['indexable'])
        self.assertNotIn('/p/' + address, self.request('/raboty')[2].decode())
