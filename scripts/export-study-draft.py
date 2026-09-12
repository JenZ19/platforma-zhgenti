"""Export the actual saved offline draft without opening any live databases."""
import html
import json
from pathlib import Path
import sqlite3
import sys

directory = Path(sys.argv[1]).resolve()
db = directory / 'study.sqlite3'
with sqlite3.connect(db.as_uri() + '?mode=ro', uri=True) as conn:
    rows = conn.execute('SELECT full_text,status FROM history').fetchall()
assert len(rows) == 1 and rows[0][1] == 'draft'
formatted = rows[0][0]
assert formatted.startswith('<pre>') and formatted.endswith('</pre>')
data = {'text': html.unescape(formatted[5:-6]), 'status': rows[0][1], 'count': len(rows)}
with (directory / 'result.json').open('x', encoding='utf-8') as stream:
    json.dump(data, stream, ensure_ascii=False, indent=2)
print('Exported one actual offline draft; source database opened read-only')
