"""Run as root on the existing platform host after uploading and validating the release."""
import os
import shutil
import sqlite3
import subprocess
from pathlib import Path

release = '20260911-iskra-chat'
app = Path('/opt/neiroprofi-access/releases') / release
static = Path('/var/www/ezhgenti.ru/kurs1-releases') / release
current = Path('/opt/neiroprofi-access/current')
web = Path('/var/www/ezhgenti.ru/kurs1-current')
conf = Path('/etc/nginx/snippets/ezhgenti-kurs1.conf')
env = Path('/etc/neiroprofi-access/env')
backup = Path('/root/neiroprofi-iskra-backup-20260911')
assert app.is_dir() and (static/'index.html').is_file()
assert current.is_symlink() and web.is_symlink()
assert not backup.exists(), 'Backup exists: inspect previous attempt rather than rerun'
assert Path('/var/lib/neiroprofi-access/minimax.key').is_file()
backup.mkdir(mode=0o700)
shutil.copy2(conf, backup/'nginx.conf')
shutil.copy2(env, backup/'env')
with sqlite3.connect('/var/lib/neiroprofi-access/access.sqlite3') as source:
    with sqlite3.connect(backup/'access.sqlite3') as target: source.backup(target)
old_app, old_web = current.resolve(), web.resolve()
(backup/'previous.txt').write_text(str(old_app)+'\n'+str(old_web)+'\n')

def switch(link, target):
    temporary = link.with_name(link.name+'.iskra-next')
    assert not temporary.exists() and not temporary.is_symlink()
    temporary.symlink_to(target)
    temporary.replace(link)

try:
    text = env.read_text()
    assert 'NP_ISKRA_KEY_FILE=' not in text
    env.write_text(text.rstrip()+'\nNP_ISKRA_KEY_FILE=/var/lib/neiroprofi-access/minimax.key\n')
    env.chmod(0o600)
    text = conf.read_text()
    assert 'location = /kurs1/access/api/iskra' not in text
    marker = 'location ^~ /kurs1/access/ {'
    assert text.count(marker) == 1
    text = text.replace(marker, '''location = /kurs1/access/api/iskra {
    client_max_body_size 8k;
    proxy_pass http://127.0.0.1:8799;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Host $host;
    proxy_read_timeout 120s;
    proxy_hide_header Cache-Control;
    add_header Cache-Control "no-store, private" always;
}

'''+marker)
    conf.write_text(text)
    subprocess.run(['nginx','-t'], check=True)
    switch(current, app)
    subprocess.run(['systemctl','restart','neiroprofi-access'], check=True)
    subprocess.run(['systemctl','is-active','--quiet','neiroprofi-access'], check=True)
    subprocess.run(['systemctl','reload','nginx'], check=True)
    switch(web, static)
    print('Release activated; previous release and access database backed up. No codes or sessions reset.')
except Exception:
    shutil.copy2(backup/'env', env)
    shutil.copy2(backup/'nginx.conf', conf)
    switch(current, old_app)
    switch(web, old_web)
    subprocess.run(['systemctl','restart','neiroprofi-access'], check=True)
    subprocess.run(['nginx','-t'], check=True)
    subprocess.run(['systemctl','reload','nginx'], check=True)
    raise
