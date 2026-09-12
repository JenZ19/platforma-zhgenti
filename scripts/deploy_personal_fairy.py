"""One-time isolated /kurs1/ release; run on reloqueen-prod after staging."""
from pathlib import Path
import os
import sqlite3
import subprocess
from contextlib import closing

app = Path('/opt/neiroprofi-access/current')
static = Path('/var/www/ezhgenti.ru/kurs1-current')
old_app = app.resolve()
old_static = static.resolve()
new_app = Path('/opt/neiroprofi-access/releases/20260911-personal-fairy')
new_static = Path('/var/www/ezhgenti.ru/kurs1-releases/20260911-personal-fairy')
assert old_app.name == '20260911-iskra-chat-r3'
assert old_static.name == '20260911-iskra-chat-r2'
assert (new_static / 'index.html').is_file()
subprocess.run(['python3', '-m', 'unittest', 'test_access', 'test_http', 'test_iskra'], cwd=new_app, check=True)
backup = Path('/root/neiroprofi-personal-fairy-backup-20260911')
backup.mkdir(mode=0o700)
with closing(sqlite3.connect('/var/lib/neiroprofi-access/access.sqlite3')) as source, closing(sqlite3.connect(backup / 'access.sqlite3')) as target:
    source.backup(target)
os.chmod(backup / 'access.sqlite3', 0o600)
(backup / 'previous.txt').write_text(str(old_app) + '\n' + str(old_static) + '\n')

def switch(link, target):
    temporary = link.with_name(link.name + '-personal-fairy-next')
    temporary.symlink_to(target)
    temporary.replace(link)

try:
    switch(app, new_app)
    subprocess.run(['systemctl', 'restart', 'neiroprofi-access'], check=True)
    subprocess.run(['systemctl', 'is-active', '--quiet', 'neiroprofi-access'], check=True)
    switch(static, new_static)
except Exception:
    switch(app, old_app)
    switch(static, old_static)
    subprocess.run(['systemctl', 'restart', 'neiroprofi-access'], check=True)
    raise
print('Personal Fairy release active; login, secrets and Nginx configuration preserved.')
