"""Isolated NEIROPROFI access gate. No email transport and no GetCourse SSO."""
import argparse
import csv
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from home_screen_guide import render_guide
from iskra import ChatError, configured as configured_iskra
import course
import public_pages
import sync
import telegram_api

COOKIE = '__Secure-neiroprofi'
BASE = '/kurs1'


class AccessError(Exception):
    def __init__(self, message='Проверьте почту и персональный код. Если не получается, обратитесь к куратору.', status=401):
        super().__init__(message)
        self.status = status


class Store:
    def __init__(self, path, secret):
        if len(secret) < 40:
            raise ValueError('A private secret of at least 40 characters is required')
        self.path, self.secret = Path(path), secret
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript('''
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('student','admin')), active INTEGER NOT NULL DEFAULT 1,
                    expires INTEGER, source TEXT NOT NULL, code_hash TEXT, created INTEGER NOT NULL);
                CREATE TABLE IF NOT EXISTS sessions (
                    hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
                CREATE TABLE IF NOT EXISTS personal_bots (
                    user_id INTEGER PRIMARY KEY REFERENCES users(id), url TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS attempts (key TEXT NOT NULL, at INTEGER NOT NULL);
                CREATE INDEX IF NOT EXISTS attempts_key ON attempts(key, at);
                CREATE TABLE IF NOT EXISTS audit (
                    id INTEGER PRIMARY KEY, at INTEGER NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, target INTEGER);
                CREATE TABLE IF NOT EXISTS course_start (
                    user_id INTEGER PRIMARY KEY REFERENCES users(id), started INTEGER NOT NULL);
                CREATE TABLE IF NOT EXISTS portfolios (
                    user_id INTEGER PRIMARY KEY REFERENCES users(id), slug TEXT UNIQUE,
                    headline TEXT NOT NULL, about TEXT NOT NULL, contact TEXT NOT NULL, works TEXT NOT NULL,
                    published INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL);
                CREATE TABLE IF NOT EXISTS certificates (
                    number TEXT PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
                    issued INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0);
                CREATE TABLE IF NOT EXISTS progress_sync (
                    user_id INTEGER PRIMARY KEY REFERENCES users(id), entries TEXT NOT NULL,
                    updated INTEGER NOT NULL, steps INTEGER NOT NULL DEFAULT 0, projects INTEGER NOT NULL DEFAULT 0);
                CREATE TABLE IF NOT EXISTS support_requests (
                    id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), project TEXT,
                    step INTEGER, device TEXT, question TEXT NOT NULL, created INTEGER NOT NULL,
                    answer TEXT, answered INTEGER, answered_by INTEGER);
                CREATE INDEX IF NOT EXISTS support_open ON support_requests(answered, id);
                CREATE TABLE IF NOT EXISTS telegram_links (
                    user_id INTEGER PRIMARY KEY REFERENCES users(id), chat_id INTEGER UNIQUE,
                    pending_chat INTEGER, code_hash TEXT, code_at INTEGER, linked INTEGER,
                    muted INTEGER NOT NULL DEFAULT 0, sent_week INTEGER);
            ''')
            # Витрина и индексация появились позже — добавляем колонки к готовой базе.
            columns = {row['name'] for row in db.execute('PRAGMA table_info(portfolios)')}
            if 'listed' not in columns:
                db.execute('ALTER TABLE portfolios ADD COLUMN listed INTEGER NOT NULL DEFAULT 0')
            if 'indexable' not in columns:
                db.execute('ALTER TABLE portfolios ADD COLUMN indexable INTEGER NOT NULL DEFAULT 0')
            # Мягкий пинг «прогресс стоит» появился позже понедельничной рассылки.
            columns = {row['name'] for row in db.execute('PRAGMA table_info(telegram_links)')}
            if 'nudge_at' not in columns:
                db.execute('ALTER TABLE telegram_links ADD COLUMN nudge_at INTEGER')
            if 'nudge_steps' not in columns:
                db.execute('ALTER TABLE telegram_links ADD COLUMN nudge_steps INTEGER')
        os.chmod(self.path, 0o600)

    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        return db

    def digest(self, value):
        return hmac.new(self.secret.encode(), value.encode(), hashlib.sha256).hexdigest()

    @staticmethod
    def email(value):
        value = str(value).strip().lower()
        if len(value) > 254 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
            raise AccessError('Укажите корректную почту.', 400)
        return value

    def upsert(self, email, name, role, expires, source):
        email = self.email(email)
        if role not in ('student', 'admin') or not str(name).strip() or len(str(name)) > 160:
            raise AccessError('Проверьте имя и роль.', 400)
        if role == 'student' and (not isinstance(expires, int) or expires <= 0):
            raise AccessError('Укажите дату окончания доступа.', 400)
        with self.connect() as db:
            row = db.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
            if row:
                if role == 'admin' and row['role'] != 'admin':
                    raise AccessError('Аккаунт уже существует как ученический. Нужна отдельная подтверждённая смена роли; данные не изменены.', 409)
                # Imports must never downgrade staff or restore deliberately revoked users.
                if row['role'] != 'admin':
                    db.execute('UPDATE users SET name=?,expires=?,source=? WHERE id=?', (name, expires, source, row['id']))
                return row['id']
            cur = db.execute('INSERT INTO users(email,name,role,expires,source,created) VALUES(?,?,?,?,?,?)',
                             (email, str(name).strip(), role, expires, source, int(time.time())))
            return cur.lastrowid

    def user(self, uid):
        with self.connect() as db:
            row = db.execute('SELECT id,email,name,role,active,expires,source FROM users WHERE id=?', (uid,)).fetchone()
            return dict(row) if row else None

    def personal_bot(self, uid):
        with self.connect() as db:
            row = db.execute('SELECT url FROM personal_bots WHERE user_id=?', (uid,)).fetchone()
            return row['url'] if row else None

    def save_personal_bot(self, uid, value):
        match = re.fullmatch(r'(?:(?:https://)?t\.me/|@)?([a-z][a-z0-9_]{4,31})/?', value.strip(), re.I) if isinstance(value, str) else None
        if not match or not match[1].lower().endswith('bot'):
            raise AccessError('Введите адрес личного бота: @имя_bot или https://t.me/имя_bot. Токен не нужен.', 400)
        if match[1].lower() == 'feyakrestnayasbm_bot':
            raise AccessError('Это Фея-крёстная, а не ваша личная Феечка. Вставьте адрес своего бота.', 400)
        url = 'https://t.me/' + match[1]
        with self.connect() as db:
            db.execute('INSERT INTO personal_bots(user_id,url) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET url=excluded.url', (uid, url))
        return url

    # --- Учебный прогресс в аккаунте ----------------------------------------------

    def progress(self, uid):
        with self.connect() as db:
            row = db.execute('SELECT entries,updated FROM progress_sync WHERE user_id=?', (uid,)).fetchone()
        if not row:
            return {'entries': {}, 'updated': None}
        return {'entries': json.loads(row['entries']), 'updated': row['updated']}

    def save_progress(self, uid, entries):
        """Браузер присылает свой снимок, аккаунт хранит объединённый: шаги не теряются."""
        sync.check(entries)
        now = int(time.time())
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT entries FROM progress_sync WHERE user_id=?', (uid,)).fetchone()
            merged = sync.merge(json.loads(row['entries']) if row else {}, entries)
            sync.check(merged)
            counts = sync.summary(merged)
            db.execute('INSERT INTO progress_sync(user_id,entries,updated,steps,projects) VALUES(?,?,?,?,?) '
                       'ON CONFLICT(user_id) DO UPDATE SET entries=excluded.entries, updated=excluded.updated, '
                       'steps=excluded.steps, projects=excluded.projects',
                       (uid, json.dumps(merged, ensure_ascii=False), now, counts['steps'], counts['projects']))
        return {'entries': merged, 'updated': now}

    def forget_progress(self, uid):
        with self.connect() as db:
            db.execute('DELETE FROM progress_sync WHERE user_id=?', (uid,))

    # --- Вопросы куратору ----------------------------------------------------------

    def ask_support(self, uid, name, data):
        question = course.text(data.get('question'), 'Вопрос куратору', 4000)
        project = course.text(data.get('project'), 'Проект', 120, required=False)
        device = course.text(data.get('device'), 'Устройство', 40, required=False)
        try:
            step = int(data.get('step') or 0)
        except (TypeError, ValueError):
            step = 0
        now = int(time.time())
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            waiting = db.execute('SELECT count(*) FROM support_requests WHERE user_id=? AND answer IS NULL', (uid,)).fetchone()[0]
            today = db.execute('SELECT count(*) FROM support_requests WHERE user_id=? AND created>?', (uid, now - 86400)).fetchone()[0]
            if waiting >= 5 or today >= 20:
                db.commit()
                raise AccessError('Уже отправлено несколько вопросов. Дождитесь ответа куратора.', 429)
            db.execute('INSERT INTO support_requests(user_id,project,step,device,question,created) VALUES(?,?,?,?,?,?)',
                       (uid, project, step, device, question, now))
        chat = os.environ.get('NP_CURATOR_CHAT', '')
        if chat:
            where = f'{project}, шаг {step}' if project else 'вне урока'
            try:
                telegram_api.send(chat, f'Вопрос от ученицы: {name}\n{where} · {device or "устройство не указано"}\n\n'
                                        f'{question[:800]}\n\nОтветить: https://ezhgenti.ru/kurs1/admin')
            except Exception:
                pass  # Вопрос уже сохранён; молчание Telegram не должно его терять.
        return self.support_for(uid)

    def support_for(self, uid):
        with self.connect() as db:
            rows = db.execute('SELECT id,project,step,question,created,answer,answered FROM support_requests '
                              'WHERE user_id=? ORDER BY id DESC LIMIT 20', (uid,)).fetchall()
        return {'requests': [dict(row) for row in rows]}

    def support_queue(self):
        with self.connect() as db:
            rows = db.execute('SELECT s.id,s.project,s.step,s.device,s.question,s.created,s.answer,s.answered,'
                              'u.name,u.email FROM support_requests s JOIN users u ON u.id=s.user_id '
                              'ORDER BY (s.answer IS NOT NULL), s.id DESC LIMIT 100').fetchall()
        return {'requests': [dict(row) for row in rows]}

    def answer_support(self, request_id, text, actor):
        answer = course.text(text, 'Ответ куратора', 4000)
        now = int(time.time())
        with self.connect() as db:
            row = db.execute('SELECT user_id FROM support_requests WHERE id=?', (request_id,)).fetchone()
            if not row:
                raise AccessError('Вопрос не найден.', 404)
            db.execute('UPDATE support_requests SET answer=?,answered=?,answered_by=? WHERE id=?', (answer, now, actor, request_id))
            chat = db.execute('SELECT chat_id FROM telegram_links WHERE user_id=? AND chat_id IS NOT NULL', (row['user_id'],)).fetchone()
        if chat:
            try:
                telegram_api.send(chat['chat_id'], 'Куратор ответил на ваш вопрос. Ответ открыт в платформе: '
                                                   'https://ezhgenti.ru/kurs1/?section=fairy')
            except Exception:
                pass  # Ответ уже сохранён и виден в платформе.
        return self.support_queue()

    # --- Календарь шести недель -------------------------------------------------

    def course_state(self, uid):
        with self.connect() as db:
            row = db.execute('SELECT started FROM course_start WHERE user_id=?', (uid,)).fetchone()
        return course.week_state(row['started'] if row else None)

    def start_course(self, uid, restart=False):
        now = int(time.time())
        with self.connect() as db:
            if restart:
                db.execute('INSERT INTO course_start(user_id,started) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET started=excluded.started', (uid, now))
            else:
                db.execute('INSERT OR IGNORE INTO course_start(user_id,started) VALUES(?,?)', (uid, now))
        return self.course_state(uid)

    def forget_course(self, uid):
        with self.connect() as db:
            db.execute('DELETE FROM course_start WHERE user_id=?', (uid,))
        return self.course_state(uid)

    # --- Портфолио и сертификат -------------------------------------------------

    def portfolio(self, uid):
        with self.connect() as db:
            row = db.execute('SELECT * FROM portfolios WHERE user_id=?', (uid,)).fetchone()
            certificate = db.execute('SELECT number,issued FROM certificates WHERE user_id=? AND revoked=0', (uid,)).fetchone()
        if not row:
            return {'exists': False, 'published': False, 'listed': False, 'indexable': False, 'certificate': None}
        return {
            'exists': True,
            'headline': row['headline'],
            'about': row['about'],
            'contact': json.loads(row['contact']),
            'works': json.loads(row['works']),
            'slug': row['slug'],
            'published': bool(row['published']),
            'listed': bool(row['listed']),
            'indexable': bool(row['indexable']),
            'updated': row['updated'],
            'certificate': ({'number': certificate['number'], 'issued': certificate['issued']} if certificate else None),
        }

    def save_portfolio(self, uid, data):
        payload = course.portfolio_payload(data)
        now = int(time.time())
        with self.connect() as db:
            db.execute("""INSERT INTO portfolios(user_id,headline,about,contact,works,updated)
                          VALUES(?,?,?,?,?,?)
                          ON CONFLICT(user_id) DO UPDATE SET headline=excluded.headline, about=excluded.about,
                          contact=excluded.contact, works=excluded.works, updated=excluded.updated""",
                       (uid, payload['headline'], payload['about'], json.dumps(payload['contact'], ensure_ascii=False),
                        json.dumps(payload['works'], ensure_ascii=False), now))
        return self.portfolio(uid)

    def publish_portfolio(self, uid, value, listed=False, indexable=False):
        """Открытая страница ученицы. Витрина и поисковики — только по её явному выбору."""
        address = course.slug(value)
        listed, indexable = (1 if listed else 0), (1 if indexable else 0)
        if indexable and not listed:
            raise course.CourseError('Поисковики находят страницу только через витрину: сначала разрешите показ в витрине.')
        with self.connect() as db:
            row = db.execute('SELECT 1 FROM portfolios WHERE user_id=?', (uid,)).fetchone()
            if not row:
                raise course.CourseError('Сначала заполните и сохраните портфолио.')
            taken = db.execute('SELECT user_id FROM portfolios WHERE slug=? AND user_id<>?', (address, uid)).fetchone()
            if taken:
                raise course.CourseError('Такой адрес уже занят другой ученицей. Выберите другой.', 409)
            db.execute('UPDATE portfolios SET slug=?, published=1, listed=?, indexable=?, updated=? WHERE user_id=?',
                       (address, listed, indexable, int(time.time()), uid))
            db.execute('INSERT INTO audit(at,actor,action,target) VALUES(?,?,?,?)',
                       (int(time.time()), str(uid), f'publish-portfolio:listed={listed}:indexable={indexable}', uid))
        return self.portfolio(uid)

    def unpublish_portfolio(self, uid):
        with self.connect() as db:
            db.execute('UPDATE portfolios SET published=0, listed=0, indexable=0, updated=? WHERE user_id=?', (int(time.time()), uid))
            db.execute('INSERT INTO audit(at,actor,action,target) VALUES(?,?,?,?)', (int(time.time()), str(uid), 'unpublish-portfolio', uid))
        return self.portfolio(uid)

    def moderate(self, uid, action, actor):
        """Куратор может убрать страницу из витрины, закрыть её совсем и отозвать сертификат.

        Работы ученицы при этом остаются у неё: снимается только открытый показ.
        """
        now = int(time.time())
        with self.connect() as db:
            if action == 'unpublish':
                db.execute('UPDATE portfolios SET published=0, listed=0, indexable=0, updated=? WHERE user_id=?', (now, uid))
            elif action == 'unlist':
                db.execute('UPDATE portfolios SET listed=0, indexable=0, updated=? WHERE user_id=?', (now, uid))
            elif action == 'revoke':
                db.execute('UPDATE certificates SET revoked=1 WHERE user_id=?', (uid,))
            else:
                raise AccessError('Неизвестное действие модерации.', 400)
            db.execute('INSERT INTO audit(at,actor,action,target) VALUES(?,?,?,?)',
                       (now, str(actor), 'moderate:' + action, uid))
        return self.portfolio(uid)

    def public_portfolio(self, value):
        """Открытая страница: только опубликованное, без почты и служебных полей."""
        with self.connect() as db:
            row = db.execute("""SELECT p.*, u.name, u.active, c.number, c.issued FROM portfolios p
                                JOIN users u ON u.id=p.user_id
                                LEFT JOIN certificates c ON c.user_id=p.user_id AND c.revoked=0
                                WHERE p.slug=? AND p.published=1 AND u.active=1""", (value,)).fetchone()
        if not row:
            return None
        return {'name': row['name'], 'headline': row['headline'], 'about': row['about'],
                'contact': json.loads(row['contact']), 'works': json.loads(row['works']),
                'updated': row['updated'], 'certificate': row['number'], 'certified': row['issued'],
                'indexable': bool(row['indexable'])}

    def public_gallery(self, limit=200):
        """Витрина: только те страницы, которые ученица сама разрешила показывать списком."""
        with self.connect() as db:
            rows = db.execute("""SELECT p.slug, p.headline, p.works, p.updated, u.name, c.number
                                 FROM portfolios p JOIN users u ON u.id=p.user_id
                                 LEFT JOIN certificates c ON c.user_id=p.user_id AND c.revoked=0
                                 WHERE p.published=1 AND p.listed=1 AND u.active=1 AND p.slug IS NOT NULL
                                 ORDER BY p.updated DESC LIMIT ?""", (int(limit),)).fetchall()
        gallery = []
        for row in rows:
            try:
                works = json.loads(row['works'])
            except (TypeError, ValueError):
                works = []
            gallery.append({'slug': row['slug'], 'name': row['name'], 'headline': row['headline'],
                            'works': len(works), 'certificate': row['number'], 'updated': row['updated']})
        return gallery

    def issue_certificate(self, uid, weeks_done):
        portfolio = self.portfolio(uid)
        course.may_certify(portfolio, weeks_done)
        now = int(time.time())
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            existing = db.execute('SELECT number FROM certificates WHERE user_id=? AND revoked=0', (uid,)).fetchone()
            if existing:
                db.commit()
                return self.portfolio(uid)
            order = db.execute('SELECT COUNT(*) FROM certificates').fetchone()[0] + 1
            number = course.certificate_number(order, now)
            while db.execute('SELECT 1 FROM certificates WHERE number=?', (number,)).fetchone():
                order += 1
                number = course.certificate_number(order, now)
            db.execute('INSERT INTO certificates(number,user_id,issued) VALUES(?,?,?)', (number, uid, now))
            db.execute('INSERT INTO audit(at,actor,action,target) VALUES(?,?,?,?)', (now, str(uid), 'certificate:' + number, uid))
        return self.portfolio(uid)

    def public_certificate(self, number):
        with self.connect() as db:
            row = db.execute("""SELECT c.number,c.issued,u.name,u.active,p.slug,p.published FROM certificates c
                                JOIN users u ON u.id=c.user_id
                                LEFT JOIN portfolios p ON p.user_id=c.user_id
                                WHERE c.number=? AND c.revoked=0 AND u.active=1""", (str(number).strip().upper(),)).fetchone()
        if not row:
            return None
        return {'number': row['number'], 'name': row['name'], 'certified': row['issued'],
                'slug': row['slug'] if row['published'] else None}

    # --- Напоминания в Telegram -------------------------------------------------

    def telegram_state(self, uid):
        with self.connect() as db:
            row = db.execute('SELECT chat_id,linked,muted FROM telegram_links WHERE user_id=?', (uid,)).fetchone()
        if not row or not row['chat_id']:
            return {'linked': False, 'muted': False}
        return {'linked': True, 'muted': bool(row['muted']), 'since': row['linked']}

    def telegram_request(self, uid, value, name):
        """Код подтверждения уходит в тот же чат: так чужой Telegram ID не подключить."""
        try:
            chat = int(str(value).strip())
        except (TypeError, ValueError):
            chat = 0
        if not 0 < chat < 2 ** 52:
            raise AccessError('Нужен числовой Telegram ID. Узнать его можно командой /myid у Феи-крёстной.', 400)
        now = int(time.time())
        key = self.digest('tgcode:%d' % uid)
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM attempts WHERE at < ?', (now - 3600,))
            if db.execute('SELECT count(*) FROM attempts WHERE key=?', (key,)).fetchone()[0] >= 5:
                db.commit()
                raise AccessError('Слишком много попыток подключения. Попробуйте через час.', 429)
            taken = db.execute('SELECT user_id FROM telegram_links WHERE chat_id=? AND user_id<>?', (chat, uid)).fetchone()
            if taken:
                db.commit()
                raise AccessError('Этот Telegram уже подключён к другому аккаунту курса.', 409)
            code = f'{secrets.randbelow(1000000):06d}'
            db.execute("""INSERT INTO telegram_links(user_id,pending_chat,code_hash,code_at)
                          VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET pending_chat=excluded.pending_chat,
                          code_hash=excluded.code_hash, code_at=excluded.code_at""",
                       (uid, chat, self.digest('tgcode:' + code), now))
            db.execute('INSERT INTO attempts(key,at) VALUES(?,?)', (key, now))
        first = (str(name or '').split() or [''])[0]
        greeting = f'{first}, здравствуйте! ' if first else 'Здравствуйте! '
        delivered = telegram_api.send(chat, greeting + 'Код подключения напоминаний НЕЙРОПРОФИ: ' + code
                                      + '\n\nВведите его в платформе. Если вы этого не запрашивали, просто не вводите код.')
        if not delivered:
            raise AccessError('Не удалось написать в этот Telegram. Откройте бота школы, нажмите «Начать» и повторите. '
                              'Проверьте, что ID скопирован целиком.', 400)
        return {'sent': True}

    def telegram_confirm(self, uid, code):
        now = int(time.time())
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT pending_chat,code_hash,code_at FROM telegram_links WHERE user_id=?', (uid,)).fetchone()
            if not row or not row['code_hash'] or not row['pending_chat'] or row['code_at'] < now - 1800:
                db.commit()
                raise AccessError('Код устарел. Запросите новый.', 400)
            if not hmac.compare_digest(self.digest('tgcode:' + str(code).strip()), row['code_hash']):
                db.commit()
                raise AccessError('Код не совпал. Проверьте шесть цифр из сообщения.', 400)
            db.execute('UPDATE telegram_links SET chat_id=NULL WHERE chat_id=? AND user_id<>?', (row['pending_chat'], uid))
            db.execute("""UPDATE telegram_links SET chat_id=?, linked=?, pending_chat=NULL, code_hash=NULL,
                          code_at=NULL, muted=0 WHERE user_id=?""", (row['pending_chat'], now, uid))
        return self.telegram_state(uid)

    def unlink_telegram(self, uid=None, chat_id=None):
        with self.connect() as db:
            if chat_id is not None:
                db.execute('DELETE FROM telegram_links WHERE chat_id=?', (int(chat_id),))
            else:
                db.execute('DELETE FROM telegram_links WHERE user_id=?', (uid,))

    def issue(self, uid, actor):
        code = 'NP-' + secrets.token_hex(16).upper()
        with self.connect() as db:
            if not db.execute('SELECT 1 FROM users WHERE id=?', (uid,)).fetchone():
                raise AccessError('Аккаунт не найден.', 404)
            db.execute('UPDATE users SET code_hash=? WHERE id=?', (self.digest('code:' + code), uid))
            db.execute('DELETE FROM sessions WHERE user_id=?', (uid,))
            db.execute('INSERT INTO audit(at,actor,action,target) VALUES(?,?,?,?)', (int(time.time()), str(actor), 'issue-code', uid))
        return code

    def update(self, uid, active, expires, actor):
        with self.connect() as db:
            row = db.execute('SELECT role FROM users WHERE id=?', (uid,)).fetchone()
            if not row or row['role'] == 'admin':
                raise AccessError('Администраторов изменяет владелец через защищённую настройку сервера.', 403)
            if not isinstance(active, bool) or not isinstance(expires, int) or expires <= 0:
                raise AccessError('Проверьте срок доступа.', 400)
            db.execute('UPDATE users SET active=?, expires=? WHERE id=?', (int(active), expires, uid))
            db.execute('DELETE FROM sessions WHERE user_id=?', (uid,))
            db.execute('INSERT INTO audit(at,actor,action,target) VALUES(?,?,?,?)', (int(time.time()), str(actor), 'grant' if active else 'revoke', uid))

    def login(self, email, code, ip):
        email = str(email).strip().lower()[:254]
        now = int(time.time())
        ip_key, account_key = self.digest('ip:' + ip), self.digest('email:' + email)
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM attempts WHERE at < ?', (now - 900,))
            for key, limit in [(ip_key, 40), (account_key, 10)]:
                if db.execute('SELECT count(*) FROM attempts WHERE key=?', (key,)).fetchone()[0] >= limit:
                    raise AccessError('Слишком много попыток. Подождите 15 минут или обратитесь к куратору.', 429)
            row = db.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
            valid_code = hmac.compare_digest(self.digest('code:' + str(code).strip().upper()), row['code_hash'] if row and row['code_hash'] else '0' * 64)
            if not (row and valid_code and row['active'] and (row['expires'] is None or row['expires'] > now)):
                db.executemany('INSERT INTO attempts(key,at) VALUES(?,?)', [(ip_key, now), (account_key, now)])
                db.commit()
                raise AccessError()
            token = secrets.token_urlsafe(32)
            lifetime = 8 * 3600 if row['role'] == 'admin' else 7 * 86400
            db.execute('DELETE FROM sessions WHERE expires <= ?', (now,))
            db.execute('INSERT INTO sessions VALUES(?,?,?)', (self.digest('session:' + token), row['id'], now + lifetime))
            db.execute('DELETE FROM attempts WHERE key=?', (account_key,))
            db.execute('INSERT INTO audit(at,actor,action,target) VALUES(?,?,?,?)', (now, str(row['id']), 'login', row['id']))
        return token, self.user(row['id'])

    def session(self, token):
        now = int(time.time())
        with self.connect() as db:
            row = db.execute('''SELECT u.id,u.email,u.name,u.role,u.active,u.expires,u.source FROM sessions s
                JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>? AND u.active=1
                AND (u.expires IS NULL OR u.expires>?)''', (self.digest('session:' + token), now, now)).fetchone()
            return dict(row) if row else None

    def logout(self, token):
        with self.connect() as db:
            db.execute('DELETE FROM sessions WHERE hash=?', (self.digest('session:' + token),))

    def overview(self):
        with self.connect() as db:
            users = [dict(r) for r in db.execute('''SELECT u.id,u.email,u.name,u.role,u.active,u.expires,u.source,
                (u.code_hash IS NOT NULL) AS has_code, p.slug, p.published, p.listed, p.indexable, c.number AS certificate,
                g.steps, g.projects, g.updated AS studied,
                (SELECT count(*) FROM support_requests s WHERE s.user_id=u.id AND s.answer IS NULL) AS waiting
                FROM users u LEFT JOIN portfolios p ON p.user_id=u.id
                LEFT JOIN certificates c ON c.user_id=u.id AND c.revoked=0
                LEFT JOIN progress_sync g ON g.user_id=u.id ORDER BY u.name''')]
            audit = [dict(r) for r in db.execute('''SELECT a.at,a.action,u.email AS target,v.email AS actor
                FROM audit a LEFT JOIN users u ON a.target=u.id LEFT JOIN users v ON a.actor=CAST(v.id AS TEXT)
                ORDER BY a.id DESC LIMIT 50''')]
        return {'users': users, 'audit': audit}


class Handler(BaseHTTPRequestHandler):
    server_version = 'Neiroprofi'

    def log_message(self, *_):
        pass  # Never log request bodies, credentials, cookies or personal data.

    @property
    def store(self):
        return self.server.store

    def token(self):
        try:
            cookies = SimpleCookie(self.headers.get('Cookie', ''))
            return cookies[COOKIE].value if COOKIE in cookies else ''
        except Exception:
            return ''

    def respond(self, status, body=b'', content_type='application/json; charset=utf-8', headers=None):
        if isinstance(body, dict):
            body = json.dumps(body, ensure_ascii=False).encode()
        elif isinstance(body, str):
            body = body.encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store, private')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('X-Frame-Options', 'DENY')
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def require_user(self, admin=False):
        user = self.store.session(self.token())
        if not user:
            raise AccessError('Войдите в платформу.', 401)
        if admin and user['role'] != 'admin':
            raise AccessError('Этот раздел доступен только администратору.', 403)
        return user

    def csrf(self):
        if self.headers.get('Origin') != self.server.origin or self.headers.get('X-Neiroprofi-Request') != '1':
            raise AccessError('Обновите страницу и повторите действие.', 403)

    def public_page(self, html, indexable=False):
        nonce = secrets.token_urlsafe(24)
        headers = {'Content-Security-Policy': f"default-src 'none'; style-src 'nonce-{nonce}'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}
        if not indexable:
            headers['X-Robots-Tag'] = 'noindex, nofollow'
        return self.respond(200, html(nonce), 'text/html; charset=utf-8', headers)

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        try:
            path = urlsplit(self.path).path
            if self.headers.get('Host') == 'www.ezhgenti.ru' and (path.startswith(BASE + '/') or path.startswith('/p/') or path.startswith('/s/') or path.rstrip('/') == '/raboty'):
                return self.respond(302, headers={'Location': 'https://ezhgenti.ru' + self.path})
            if path.rstrip('/') == '/raboty':
                gallery = self.store.public_gallery()
                return self.public_page(lambda nonce: public_pages.render_gallery(gallery, nonce), indexable=True)
            if path.startswith('/p/') or path.startswith('/s/'):
                if path.startswith('/p/'):
                    data = self.store.public_portfolio(path[3:].strip('/').lower())
                    if data:
                        return self.public_page(lambda nonce: public_pages.render_portfolio(data, nonce),
                                                indexable=data.get('indexable', False))
                else:
                    data = self.store.public_certificate(path[3:].strip('/'))
                    if data:
                        return self.public_page(lambda nonce: public_pages.render_certificate(data, nonce))
                return self.respond(404, public_pages.render_missing(secrets.token_urlsafe(24)), 'text/html; charset=utf-8',
                                    {'X-Robots-Tag': 'noindex, nofollow'})
            if path == '/internal/check':
                self.require_user()
                return self.respond(204)
            if path == BASE + '/access/api/me':
                return self.respond(200, self.require_user())
            if path == BASE + '/access/api/personal-bot':
                user = self.require_user()
                return self.respond(200, {'url': self.store.personal_bot(user['id'])})
            if path == BASE + '/access/api/course':
                user = self.require_user()
                return self.respond(200, {'course': self.store.course_state(user['id']),
                                          'portfolio': self.store.portfolio(user['id']),
                                          'telegram': {**self.store.telegram_state(user['id']),
                                                       'bot': telegram_api.bot_name()},
                                          'weeks': course.WEEKS})
            if path == BASE + '/access/api/progress':
                user = self.require_user()
                return self.respond(200, self.store.progress(user['id']))
            if path == BASE + '/access/api/support':
                user = self.require_user()
                if parse_qs(urlsplit(self.path).query).get('queue') and user['role'] == 'admin':
                    return self.respond(200, self.store.support_queue())
                return self.respond(200, self.store.support_for(user['id']))
            if path == BASE + '/access/api/iskra':
                user = self.require_user()
                query = parse_qs(urlsplit(self.path).query)
                chat = self.server.iskra
                return self.respond(200, {'available': chat.available, 'messages': chat.history(user['id'], query.get('scope', ['academy'])[0], query.get('format', ['desktop'])[0])})
            if path == BASE + '/access/api/users':
                self.require_user(admin=True)
                return self.respond(200, self.store.overview())
            if path in (BASE + '/login', BASE + '/admin', BASE + '/account'):
                if path != BASE + '/login':
                    try:
                        self.require_user(admin=path.endswith('/admin'))
                    except AccessError as error:
                        if error.status == 401:
                            return self.respond(302, headers={'Location': BASE + '/login'})
                        raise
                nonce = secrets.token_urlsafe(24)
                html = Path(__file__).with_name('ui.html').read_text().replace('__NONCE__', nonce)
                html = html.replace('__HOME_SCREEN_GUIDE__', render_guide())
                return self.respond(200, html, 'text/html; charset=utf-8', {'Content-Security-Policy':
                    f"default-src 'none'; style-src 'nonce-{nonce}'; script-src 'nonce-{nonce}'; connect-src 'self'; img-src 'self' data:; manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"})
            self.respond(404, {'error': 'Страница не найдена.'})
        except (AccessError, ChatError, course.CourseError, sync.SyncError) as error:
            self.respond(error.status, {'error': str(error)})
        except Exception:
            self.respond(500, {'error': 'Не удалось загрузить страницу. Попробуйте позже.'})

    def do_POST(self):
        try:
            self.csrf()
            if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                raise AccessError('Неверный формат запроса.', 415)
            path = urlsplit(self.path).path
            size = int(self.headers.get('Content-Length', '0'))
            # Портфолио — единственная длинная форма: карточки работ с описаниями.
            limit = 8192
            if path == BASE + '/access/api/portfolio':
                limit = 32768
            elif path == BASE + '/access/api/progress':
                limit = 327680
            if not 0 < size <= limit:
                raise AccessError('Слишком большой запрос.', 413)
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise AccessError('Неверный запрос.', 400)
            if path == BASE + '/access/api/login':
                token, user = self.store.login(data.get('email', ''), data.get('code', ''), self.headers.get('X-Real-IP', self.client_address[0]))
                age = 28800 if user['role'] == 'admin' else 604800
                return self.respond(200, {'role': user['role']}, headers={'Set-Cookie': f'{COOKIE}={token}; Path=/kurs1/; Max-Age={age}; HttpOnly; Secure; SameSite=Lax'})
            if path == BASE + '/access/api/logout':
                self.store.logout(self.token())
                return self.respond(200, {'ok': True}, headers={'Set-Cookie': f'{COOKIE}=; Path=/kurs1/; Max-Age=0; HttpOnly; Secure; SameSite=Lax'})
            if path == BASE + '/access/api/iskra':
                user = self.require_user()
                return self.respond(200, self.server.iskra.ask(user['id'], data))
            if path == BASE + '/access/api/personal-bot':
                user = self.require_user()
                return self.respond(200, {'url': self.store.save_personal_bot(user['id'], data.get('url'))})
            if path == BASE + '/access/api/progress':
                user = self.require_user()
                return self.respond(200, self.store.save_progress(user['id'], data.get('entries')))
            if path == BASE + '/access/api/support':
                user = self.require_user()
                action = data.get('action')
                if action == 'ask':
                    return self.respond(200, self.store.ask_support(user['id'], user['name'], data))
                if action == 'answer':
                    if user['role'] != 'admin':
                        raise AccessError('Отвечать на вопросы может куратор.', 403)
                    return self.respond(200, self.store.answer_support(data.get('id'), data.get('text'), user['id']))
                raise AccessError('Неизвестное действие с вопросами.', 400)
            if path == BASE + '/access/api/course':
                user = self.require_user()
                action = data.get('action')
                if action == 'start':
                    return self.respond(200, {'course': self.store.start_course(user['id'])})
                if action == 'restart':
                    return self.respond(200, {'course': self.store.start_course(user['id'], restart=True)})
                if action == 'forget':
                    return self.respond(200, {'course': self.store.forget_course(user['id'])})
                raise AccessError('Неизвестное действие с календарём.', 400)
            if path == BASE + '/access/api/portfolio':
                user = self.require_user()
                action = data.get('action')
                if action == 'save':
                    return self.respond(200, {'portfolio': self.store.save_portfolio(user['id'], data.get('portfolio'))})
                if action == 'publish':
                    return self.respond(200, {'portfolio': self.store.publish_portfolio(
                        user['id'], data.get('slug'), listed=bool(data.get('listed')), indexable=bool(data.get('indexable')))})
                if action == 'unpublish':
                    return self.respond(200, {'portfolio': self.store.unpublish_portfolio(user['id'])})
                if action == 'certificate':
                    return self.respond(200, {'portfolio': self.store.issue_certificate(user['id'], data.get('weeks'))})
                raise AccessError('Неизвестное действие с портфолио.', 400)
            if path == BASE + '/access/api/telegram':
                user = self.require_user()
                action = data.get('action')
                if not telegram_api.token() and action in ('request', 'confirm'):
                    raise AccessError('Напоминания пока не подключены школой. Обратитесь к куратору.', 503)
                if action == 'request':
                    return self.respond(200, self.store.telegram_request(user['id'], data.get('telegramId'), user['name']))
                if action == 'confirm':
                    return self.respond(200, {'telegram': self.store.telegram_confirm(user['id'], data.get('code'))})
                if action == 'unlink':
                    self.store.unlink_telegram(uid=user['id'])
                    return self.respond(200, {'telegram': self.store.telegram_state(user['id'])})
                raise AccessError('Неизвестное действие с напоминаниями.', 400)
            user = self.require_user(admin=True)
            if path == BASE + '/access/api/create':
                email = self.store.email(data.get('email', ''))
                with self.store.connect() as db:
                    exists = db.execute('SELECT 1 FROM users WHERE email=?', (email,)).fetchone()
                if exists:
                    raise AccessError('Такая почта уже есть. Найдите аккаунт в списке.', 409)
                uid = self.store.upsert(email, data.get('name', ''), 'student', data.get('expires'), 'admin:manual-verified-vip')
                code = self.store.issue(uid, user['id'])
                return self.respond(200, {'code': code, 'email': email})
            uid = data.get('id')
            target = self.store.user(uid)
            if not target:
                raise AccessError('Аккаунт не найден.', 404)
            if path == BASE + '/access/api/code':
                if target['role'] == 'admin' and target['id'] != user['id']:
                    raise AccessError('Нельзя менять код другого администратора.', 403)
                return self.respond(200, {'code': self.store.issue(uid, user['id']), 'email': target['email']})
            if path == BASE + '/access/api/moderate':
                return self.respond(200, {'portfolio': self.store.moderate(uid, data.get('moderation'), user['id'])})
            if path == BASE + '/access/api/update':
                self.store.update(uid, data.get('active'), data.get('expires'), user['id'])
                return self.respond(200, {'ok': True})
            self.respond(404, {'error': 'Действие не найдено.'})
        except (AccessError, ChatError, course.CourseError, sync.SyncError) as error:
            self.respond(error.status, {'error': str(error)})
        except (ValueError, TypeError, json.JSONDecodeError):
            self.respond(400, {'error': 'Проверьте заполненные поля.'})
        except Exception:
            self.respond(500, {'error': 'Не удалось сохранить. Попробуйте позже.'})


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['serve', 'import', 'admin'])
    parser.add_argument('--input')
    parser.add_argument('--output')
    parser.add_argument('--email')
    parser.add_argument('--name')
    args = parser.parse_args()
    store = Store(os.environ['NP_DATABASE'], os.environ['NP_SECRET'])
    if args.command == 'serve':
        httpd = ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('NP_PORT', '8799'))), Handler)
        httpd.store = store
        httpd.origin = os.environ['NP_ORIGIN']
        httpd.iskra = configured_iskra()
        httpd.serve_forever()
    else:
        if not args.output:
            parser.error('Private --output file required; codes are never printed')
        # Exclusive create prevents an accidental loss/overwrite of earlier credentials.
        with open(args.output, 'x', encoding='utf-8', newline='') as out:
            writer = csv.writer(out)
            writer.writerow(['Имя', 'Email', 'Персональный код', 'Роль', 'Вход'])
            records = json.loads(Path(args.input).read_text()) if args.command == 'import' else [{'email': args.email, 'name': args.name, 'expires': None, 'gc_id': 'staff'}]
            for item in records:
                role = 'admin' if args.command == 'admin' else 'student'
                uid = store.upsert(item['email'], item['name'], role, item['expires'], 'getcourse:4454899:4925213:' + str(item['gc_id']) if role == 'student' else 'owner-authorized')
                existing = store.user(uid)
                if existing['role'] != role:
                    continue
                with store.connect() as db:
                    has_code = db.execute('SELECT code_hash FROM users WHERE id=?', (uid,)).fetchone()[0]
                if has_code:
                    continue  # Repeat imports never silently reset credentials.
                code = store.issue(uid, 'bootstrap')
                writer.writerow([item['name'], item['email'], code, role, 'https://ezhgenti.ru/kurs1/login'])
        print('Import complete. Private credential file created. No messages sent.')


if __name__ == '__main__':
    main()
