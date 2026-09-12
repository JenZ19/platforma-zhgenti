"""Verify published install assets and authenticated course; no secrets in output."""
import csv
import hashlib
import http.client
import json
import re
from pathlib import Path

ROOT = Path('/var/www/ezhgenti.ru/kurs1-current')


def request(path, cookie='', data=None):
    connection = http.client.HTTPSConnection('ezhgenti.ru', timeout=20)
    headers = {'Cookie': cookie}
    if data is not None:
        headers.update({'Content-Type': 'application/json', 'Origin': 'https://ezhgenti.ru', 'X-Neiroprofi-Request': '1'})
    connection.request('POST' if data is not None else 'GET', path, json.dumps(data) if data is not None else None, headers)
    response = connection.getresponse()
    result = response.status, dict(response.getheaders()), response.read()
    connection.close()
    return result


for path in ['/kurs1/', '/kurs1/?format=mobile', '/kurs1/covers/planner.webp', '/kurs1/materials/learning-kits/planner.zip']:
    status, headers, _ = request(path)
    assert status == 302 and headers.get('Location', '').endswith('/kurs1/login'), (path, status)
assert request('/kurs1/access/api/users')[0] == 401
assert request('/_neiroprofi_auth')[0] == 404
status, headers, raw = request('/kurs1/login')
assert status == 200
html = raw.decode()
assert 'Добавить Нейропрофи на экран телефона' in html
assert '__HOME_SCREEN_GUIDE__' not in html
assert 'apple-mobile-web-app-title" content="Нейропрофи"' in html
assert "manifest-src 'self'" in headers['Content-Security-Policy']
for asset in ['manifest.webmanifest', 'app-icons/iskra-180.png', 'app-icons/iskra-192.png', 'app-icons/iskra-512.png', 'home-screen-guide/iphone-share.jpg', 'home-screen-guide/iphone-more.jpg', 'home-screen-guide/iphone-home.jpg', 'home-screen-guide/iphone-add.jpg']:
    status, headers, body = request('/kurs1/' + asset)
    assert status == 200, (asset, status)
    assert hashlib.sha256(body).digest() == hashlib.sha256((ROOT / asset).read_bytes()).digest(), asset
    if asset.endswith('webmanifest'):
        assert 'application/manifest+json' in headers['Content-Type']
        assert json.loads(body)['short_name'] == 'Нейропрофи'
print('PASS: closed course, login guide, manifest and all public install assets')

with open('/root/neiroprofi-handoff/maria-code.csv') as file:
    account = next(csv.DictReader(file))
status, headers, _ = request('/kurs1/access/api/login', data={'email': account['Email'], 'code': account['Персональный код']})
assert status == 200, status
cookie = headers['Set-Cookie'].split(';')[0]
try:
    assert request('/kurs1/admin', cookie)[0] == 200
    status, _, raw = request('/kurs1/?format=mobile', cookie)
    assert status == 200
    html = raw.decode()
    assets = set(re.findall(r'(?:src|href)="(/kurs1/_next/[^"?]+\.(?:css|js))', html))
    assert assets
    css = ''
    for asset in assets:
        status, _, body = request(asset, cookie)
        assert status == 200, (asset, status)
        assert hashlib.sha256(body).digest() == hashlib.sha256((ROOT / asset.removeprefix('/kurs1/')).read_bytes()).digest(), asset
        if asset.endswith('.css'):
            css += body.decode()
    idle_rules = re.findall(r'\.learning-shell \.iskra-mascot\{[^}]*animation:([^;}]+)', css)
    assert any(all(part in rule for part in ['iskra-idle', '4.8s', 'ease-in-out', 'infinite']) for rule in idle_rules)
    assert 'prefers-reduced-motion:reduce' in css
    assert 'iskra-wave' in css
    print('PASS: authenticated course and exact published CSS with continuous Iskra motion')
finally:
    assert request('/kurs1/access/api/logout', cookie, {})[0] == 200
    print('Verification session closed; existing access codes and sessions retained')
