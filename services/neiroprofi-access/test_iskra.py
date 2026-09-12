import tempfile
import unittest
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from iskra import Iskra, ChatError


class ChatTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.calls = []
        self.docs = [{'slug': 'recipe-book', 'step': 1, 'format': 'mobile', 'os': 'mac',
                      'title': 'Книга рецептов', 'text': 'Создаём книгу рецептов в Феечке.',
                      'href': '/kurs1/?format=mobile&quest=recipe-book'}]
        def provider(messages):
            self.calls.append(messages)
            return 'Откройте Феечку и отправьте команду из урока.', 150
        self.chat = Iskra(Path(self.tmp.name)/'chat.db', self.docs, provider=provider)

    def tearDown(self):
        self.tmp.cleanup()

    def ask(self, uid=1, rid='test-request-001', **kwargs):
        return self.chat.ask(uid, {'requestId': rid, 'scope': 'recipe-book', 'format': 'mobile',
                                   'step': 1, 'os': 'mac', 'question': 'Как сделать книгу?', **kwargs})

    def test_history_is_private_and_replay_is_free(self):
        first = self.ask()
        self.assertIn('Феечку', first['answer'])
        self.assertEqual(self.ask(), first)
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(len(self.chat.history(1, 'recipe-book', 'mobile')), 2)
        self.assertEqual(self.chat.history(2, 'recipe-book', 'mobile'), [])
        self.assertEqual(self.chat.history(1, 'recipe-book', 'desktop'), [])
        self.assertIn('Создаём книгу', str(self.calls[0]))

    def test_request_id_cannot_change_body(self):
        self.ask()
        with self.assertRaises(ChatError): self.ask(question='Другой вопрос')

    def test_invalid_inputs_do_not_call_provider(self):
        for update in [{'question': ''}, {'question': 'a'*2001}, {'scope': '../secret'},
                       {'format': 'other'}, {'step': True}, {'os': 'other'}, {'question': 5}]:
            with self.assertRaises(ChatError): self.ask(**update)
        self.assertEqual(self.calls, [])

    def test_failed_call_retains_reservation_and_is_not_retried(self):
        def fail(messages): raise TimeoutError('secret provider details')
        self.chat.provider = fail
        for _ in range(2):
            with self.assertRaises(ChatError) as e: self.ask()
            self.assertNotIn('secret', str(e.exception))
        with self.chat.connect() as db:
            row = db.execute('SELECT tokens,status FROM iskra_requests').fetchone()
            self.assertGreater(row['tokens'], 0)
            self.assertEqual(row['status'], 'failed')

    def test_limits_atomic_across_users_and_restart(self):
        self.chat.daily = 1
        self.ask()
        with self.assertRaises(ChatError): self.ask(rid='test-request-002')
        self.ask(uid=2)
        self.assertEqual(len(self.calls), 2)
        fresh = Iskra(self.chat.path, self.docs, provider=self.chat.provider, daily=1)
        with self.assertRaises(ChatError): fresh.ask(1, {'requestId': 'another-request', 'scope': 'recipe-book', 'format': 'mobile', 'step': 1, 'os': 'mac', 'question': 'Помоги'})

    def test_parallel_duplicate_only_one_provider_call(self):
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: self.safe_ask(), range(2)))
        self.assertEqual(len(self.calls), 1)
        self.assertTrue(any(isinstance(r, dict) for r in results))

    def safe_ask(self):
        try: return self.ask()
        except ChatError as e: return str(e)

    def test_no_key_fails_closed(self):
        chat = Iskra(self.chat.path, self.docs)
        self.assertFalse(chat.available)
        with self.assertRaises(ChatError): chat.ask(1, {})

    def test_unknown_course_no_hallucinated_context(self):
        with self.assertRaises(ChatError): self.ask(scope='nonexistent')

    def test_source_label_keeps_current_step_and_no_random_other_tracks(self):
        self.chat.docs += [dict(self.docs[0], step=2, title='Книга рецептов · Финал')]
        result = self.ask()
        self.assertEqual(result['sources'][0]['title'], 'Книга рецептов')
        found = self.chat.retrieve('recipe-book', 'mobile', 1, 'mac', 'Ничего не понимаю')
        self.assertEqual(len(found), 1)

    def test_missing_key_does_not_break_login_service(self):
        import os
        from unittest.mock import patch
        from iskra import configured
        with patch.dict(os.environ, {'NP_ISKRA_KEY_FILE': '/no-such-key-file'}):
            self.assertFalse(configured().available)

    def test_phone_is_a_format_not_a_reason_to_recommend_random_sites(self):
        self.chat.docs += [dict(self.docs[0], slug='academy', title='С чего начать'),
                           dict(self.docs[0], slug='expert-site', title='Проверяем сайт с телефона')]
        docs = self.chat.retrieve('academy','mobile',1,'mac','Как начать учиться с телефона?')
        self.assertEqual([d['slug'] for d in docs], ['academy'])


if __name__ == '__main__': unittest.main()
