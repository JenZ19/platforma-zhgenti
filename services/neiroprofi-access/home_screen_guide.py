"""The same public guide used by React, rendered safely for the login page."""
import json
from html import escape
from pathlib import Path

def render_guide():
    guide = json.loads(Path(__file__).with_name('home-screen-guide.json').read_text())
    out = [f'<details class="home-screen-guide"><summary>{escape(guide["title"])}</summary>']
    out += [f'<p>{escape(guide[key])}</p>' for key in ('intro', 'before')]
    for platform in guide['platforms']:
        out.append(f'<details class="home-screen-platform"><summary>{escape(platform["title"])}</summary><ol>')
        for step in platform['steps']:
            out.append(f'<li><strong>{escape(step["title"])}</strong><p>{escape(step["text"])}</p>')
            if step.get('image'):
                src = '/kurs1/home-screen-guide/' + escape(step['image'], quote=True)
                out.append(f'<figure><a href="{src}" target="_blank" rel="noreferrer"><img src="{src}" alt="{escape(step["title"], quote=True)}" loading="lazy"></a>')
                if step.get('caption'):
                    out.append(f'<figcaption>{escape(step["caption"])}</figcaption>')
                out.append('</figure>')
            out.append('</li>')
        out.append(f'</ol><a href="{escape(platform["source"], quote=True)}" target="_blank" rel="noreferrer">Инструкция производителя</a></details>')
    out += [f'<p>{escape(guide[key])}</p>' for key in ('done', 'note')]
    return ''.join(out) + '</details>'
