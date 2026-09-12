import tempfile
import time
import unittest
from pathlib import Path
from access import Store, AccessError


class AccessTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Store(Path(self.tmp.name) / 'test.db', 'test-secret-' * 8)
        self.student = self.store.upsert('student@example.com', 'Ученица', 'student', int(time.time()) + 3600, 'gc:1')
        self.admin = self.store.upsert('admin@example.com', 'Мария', 'admin', None, 'staff')

    def tearDown(self):
        self.tmp.cleanup()

    def test_secret_required(self):
        with self.assertRaises(ValueError):
            Store(Path(self.tmp.name) / 'bad.db', '')

    def test_login_and_hash_only(self):
        code = self.store.issue(self.student, 'bootstrap')
        token, user = self.store.login('STUDENT@example.com', code, '127.0.0.1')
        self.assertEqual(user['role'], 'student')
        self.assertEqual(self.store.session(token)['id'], self.student)
        with self.store.connect() as db:
            dump = '\n'.join(db.iterdump())
        self.assertNotIn(code, dump)
        self.assertNotIn(token, dump)

    def test_invalid_unknown_and_missing_code(self):
        for email, code in [('student@example.com', ''), ('unknown@example.com', 'x')]:
            with self.assertRaises(AccessError):
                self.store.login(email, code, '127.0.0.1')

    def test_revoke_and_reissue_invalidate_sessions(self):
        code = self.store.issue(self.student, 'bootstrap')
        token, _ = self.store.login('student@example.com', code, '127.0.0.1')
        self.store.issue(self.student, 'bootstrap')
        self.assertIsNone(self.store.session(token))
        with self.assertRaises(AccessError):
            self.store.login('student@example.com', code, '127.0.0.1')
        self.store.update(self.student, False, int(time.time()) + 3600, self.admin)
        self.assertIsNone(self.store.session(token))

    def test_expired_account_cannot_login(self):
        code = self.store.issue(self.student, 'bootstrap')
        self.store.update(self.student, True, 1, self.admin)
        with self.assertRaises(AccessError):
            self.store.login('student@example.com', code, '127.0.0.1')

    def test_session_expiry_and_logout(self):
        code = self.store.issue(self.student, 'bootstrap')
        token, _ = self.store.login('student@example.com', code, '127.0.0.1')
        self.store.logout(token)
        self.assertIsNone(self.store.session(token))

    def test_rate_limit_survives_store_restart(self):
        for _ in range(10):
            with self.assertRaises(AccessError):
                self.store.login('student@example.com', 'wrong', '127.0.0.1')
        fresh = Store(self.store.path, self.store.secret)
        code = self.store.issue(self.student, 'bootstrap')
        with self.assertRaises(AccessError) as ctx:
            fresh.login('student@example.com', code, '127.0.0.1')
        self.assertEqual(ctx.exception.status, 429)

    def test_import_does_not_promote_or_overwrite_admin(self):
        self.store.upsert('admin@example.com', 'VIP row', 'student', 1, 'gc:2')
        self.assertEqual(self.store.user(self.admin)['role'], 'admin')
        self.assertIsNone(self.store.user(self.admin)['expires'])

    def test_admin_management_cannot_disable_admin(self):
        with self.assertRaises(AccessError):
            self.store.update(self.admin, False, 1, self.admin)

    def test_admin_bootstrap_cannot_corrupt_existing_student(self):
        code = self.store.issue(self.student, 'bootstrap')
        token, _ = self.store.login('student@example.com', code, '127.0.0.1')
        before = self.store.user(self.student)
        with self.assertRaises(AccessError):
            self.store.upsert('student@example.com', 'Staff', 'admin', None, 'staff')
        self.assertEqual(self.store.user(self.student), before)
        self.assertEqual(self.store.session(token)['role'], 'student')
        self.assertEqual(self.store.login('student@example.com', code, '127.0.0.1')[1]['role'], 'student')

    def test_unique_email_and_safe_input(self):
        same = self.store.upsert('Student@example.com', 'Обновлено', 'student', int(time.time()) + 4000, 'gc:1')
        self.assertEqual(same, self.student)
        with self.assertRaises(AccessError):
            self.store.upsert('not email', 'x', 'student', None, 'x')


if __name__ == '__main__':
    unittest.main()
