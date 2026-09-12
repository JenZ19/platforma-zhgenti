"""On-server smoke check; never prints codes, sessions or private records."""
import csv
import http.client
import json
import os
import time
from pathlib import Path
from access import Store, COOKIE

for line in Path('/etc/neiroprofi-access/env').read_text().splitlines():
    key, value = line.split('=', 1)
    os.environ[key] = value
store = Store(os.environ['NP_DATABASE'], os.environ['NP_SECRET'])


def req(path, token='', data=None, origin='https://ezhgenti.ru'):
    conn = http.client.HTTPSConnection('ezhgenti.ru', timeout=20)
    headers = {'Cookie': COOKIE + '=' + token}
    if data is not None:
        headers.update({'Content-Type': 'application/json', 'Origin': origin, 'X-Neiroprofi-Request': '1'})
    conn.request('POST' if data is not None else 'GET', path, json.dumps(data) if data is not None else None, headers)
    res = conn.getresponse()
    result = res.status, dict(res.getheaders()), res.read()
    conn.close()
    return result


for path in ['/kurs1/', '/kurs1/?quest=server-152fz', '/kurs1/covers/planner.webp', '/kurs1/materials/learning-kits/planner.zip']:
    status, headers, _ = req(path)
    assert status == 302 and headers.get('Location', '').endswith('/kurs1/login'), (path, status)
print('PASS: pages and files require login')
assert req('/kurs1/access/api/users')[0] == 401
assert req('/_neiroprofi_auth')[0] == 404
assert req('/kurs1/login')[0] == 200

with open('/root/neiroprofi-handoff/maria-code.csv') as f:
    maria = next(csv.DictReader(f))
status, headers, _ = req('/kurs1/access/api/login', data={'email': maria['Email'], 'code': maria['Персональный код']})
assert status == 200, status
admin_token = headers['Set-Cookie'].split(';')[0].split('=', 1)[1]
try:
    assert req('/kurs1/admin', admin_token)[0] == 200
    status, _, raw = req('/kurs1/access/api/users', admin_token)
    assert status == 200
    users = json.loads(raw)['users']
    assert len([u for u in users if u['role'] == 'student']) == 57
    assert len([u for u in users if u['role'] == 'admin']) == 1
    assert req('/kurs1/', admin_token)[0] == 200
    assert req('/kurs1/covers/planner.webp', admin_token)[0] == 200
    assert req('/kurs1/access/api/logout', admin_token, {}, 'https://not-school.invalid')[0] == 403
    print('PASS: Maria admin, 57 VIP accounts, assets and CSRF')
finally:
    store.logout(admin_token)

uid = store.upsert('access-smoke-test@neiroprofi.invalid', 'Временная проверка', 'student', int(time.time()) + 600, 'test-created-by-verify-live')
token = ''
try:
    code = store.issue(uid, 'verification')
    status, headers, _ = req('/kurs1/access/api/login', data={'email': 'access-smoke-test@neiroprofi.invalid', 'code': code})
    assert status == 200
    token = headers['Set-Cookie'].split(';')[0].split('=', 1)[1]
    assert req('/kurs1/', token)[0] == 200
    assert req('/kurs1/admin', token)[0] == 403
    assert req('/kurs1/access/api/users', token)[0] == 403
    store.update(uid, False, int(time.time()) + 600, 'verification')
    assert req('/kurs1/', token)[0] == 302
    print('PASS: student access, admin denial and immediate revocation')
finally:
    with store.connect() as db:
        db.execute('DELETE FROM sessions WHERE user_id=?', (uid,))
        db.execute('DELETE FROM audit WHERE target=?', (uid,))
        db.execute('DELETE FROM users WHERE id=? AND source=?', (uid, 'test-created-by-verify-live'))
    print('Temporary test account removed; real accounts unchanged.')
