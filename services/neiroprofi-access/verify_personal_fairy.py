"""Live read/validation checks. No personal bot is saved or replaced."""
import json
import os
import re
import secrets
import time
import urllib.request
import urllib.error
from pathlib import Path
from access import Store, COOKIE

env = dict(line.split('=', 1) for line in Path('/etc/neiroprofi-access/env').read_text().splitlines() if line and not line.startswith('#') and '=' in line)
store = Store(env['NP_DATABASE'], env['NP_SECRET'])
with store.connect() as db:
    uid = db.execute("SELECT id FROM users WHERE email='kyzupic@icloud.com' AND role='admin' AND active=1").fetchone()[0]
    token = secrets.token_urlsafe(32)
    digest = store.digest('session:' + token)
    db.execute('INSERT INTO sessions VALUES(?,?,?)', (digest, uid, int(time.time()) + 120))

def request(path, data=None, auth=True):
    headers = {'Origin':'https://ezhgenti.ru', 'X-Neiroprofi-Request':'1', 'Content-Type':'application/json'}
    if auth: headers['Cookie'] = COOKIE + '=' + token
    req = urllib.request.Request('https://ezhgenti.ru' + path, json.dumps(data).encode() if data is not None else None, headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as response: return response.status, response.read()
    except urllib.error.HTTPError as error: return error.code, error.read()

try:
    endpoint='/kurs1/access/api/personal-bot'
    assert request(endpoint,auth=False)[0] == 401
    status, raw = request(endpoint)
    assert status == 200
    before = json.loads(raw)
    assert set(before) == {'url'}
    assert request(endpoint, {'url':'@feyakrestnayasbm_bot'})[0] == 400
    assert json.loads(request(endpoint)[1]) == before
    status, raw = request('/kurs1/?format=mobile')
    assert status == 200
    html = raw.decode()
    scripts = re.findall(r'<script[^>]+src="([^"]+)"',html)
    assert scripts
    combined = ''
    for src in scripts:
        status, body = request(src)
        assert status == 200
        combined += body.decode()
    # AppEntry is a lazy chunk, not a top-level script tag in the SSR shell.
    root = Path('/var/www/ezhgenti.ru/kurs1-current')
    chunk = next(file for file in (root / '_next').rglob('*.js') if '/kurs1/access/api/personal-bot' in file.read_text())
    status, body = request('/kurs1/' + chunk.relative_to(root).as_posix())
    assert status == 200 and 'Адрес вашей Феечки' in body.decode()
    assert request('/kurs1/access/api/iskra?scope=academy&format=mobile')[0] == 200
    print('HTTPS: protected API, account read, wrong-bot rejection, unchanged setting, new UI assets, Iskra — passed.')
finally:
    with store.connect() as db: db.execute('DELETE FROM sessions WHERE hash=?', (digest,))
