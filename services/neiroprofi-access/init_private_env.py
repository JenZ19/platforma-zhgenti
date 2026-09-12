"""One-time on-server secret generation: never exposes the secret to tool output."""
import os
import secrets
from pathlib import Path

os.umask(0o077)
target = Path('/etc/neiroprofi-access/env')
if target.exists():
    raise SystemExit('Environment already exists; preserving it.')
with target.open('x') as output:
    output.write('NP_DATABASE=/var/lib/neiroprofi-access/access.sqlite3\n')
    output.write('NP_SECRET=' + secrets.token_urlsafe(64) + '\n')
    output.write('NP_ORIGIN=https://ezhgenti.ru\nNP_PORT=8799\n')
os.chmod(target, 0o600)
print('Private environment initialized.')
