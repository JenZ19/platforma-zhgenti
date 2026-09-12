"""Открытые страницы: портфолио ученицы и проверка сертификата.

Никаких внешних файлов и скриптов: только текст, который ученица ввела сама.
Всё экранируется, страницы закрыты от индексации.
"""
from datetime import datetime, timezone
from html import escape as e

STATUS_LABEL = {'study': 'Учебная работа', 'personal': 'Пользуюсь сама', 'client': 'Сделано для заказчика'}
MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

CSS = '''
:root{--ink:#352530;--muted:#796c76;--pink:#b52f71;--soft:#faedf3;--line:#e9dce3}
*{box-sizing:border-box}
body{margin:0;background:#fcf8fa;color:var(--ink);font:17px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
.shell{max-width:900px;margin:auto;padding:48px 22px 72px}
header.intro{margin-bottom:38px}
.eyebrow{letter-spacing:.09em;text-transform:uppercase;font-size:13px;font-weight:700;color:var(--pink);margin:0 0 12px}
h1{font-size:clamp(30px,5vw,46px);line-height:1.12;letter-spacing:-.03em;margin:0 0 14px}
.headline{font-size:21px;margin:0 0 18px}
.about{color:var(--muted);margin:0;max-width:62ch;white-space:pre-line}
.contact{display:inline-block;margin-top:26px;background:var(--pink);color:#fff;text-decoration:none;font-weight:650;border-radius:13px;padding:13px 22px}
.contact:focus-visible,a:focus-visible{outline:3px solid #bf739d;outline-offset:3px}
h2{font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 18px}
.works{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));padding:0;margin:0;list-style:none}
.work{background:#fff;border:1px solid var(--line);border-radius:22px;padding:24px;min-width:0}
.work h3{margin:0 0 10px;font-size:20px;line-height:1.25}
.badge{display:inline-block;background:var(--soft);color:#862953;border-radius:30px;font-size:13px;padding:5px 11px;font-weight:600;margin-bottom:12px}
.work p{margin:0 0 16px;color:var(--muted);white-space:pre-line;overflow-wrap:anywhere}
.work a{color:var(--pink);font-weight:650;overflow-wrap:anywhere}
.cert{margin-top:44px;background:#fff;border:1px solid var(--line);border-radius:22px;padding:26px}
.cert p{margin:0 0 8px}
footer{margin-top:52px;color:var(--muted);font-size:14px}
footer a{color:var(--pink)}
.sheet{background:#fff;border:1px solid var(--line);border-radius:26px;padding:clamp(28px,5vw,56px);text-align:center}
.sheet .number{font-size:15px;letter-spacing:.12em;color:var(--muted);margin:0 0 22px}
.sheet .who{font-size:clamp(26px,4.4vw,38px);margin:0 0 16px;letter-spacing:-.02em}
.sheet .what{max-width:54ch;margin:0 auto 18px;color:var(--muted)}
.missing{text-align:center;padding:80px 0}
@media print{body{background:#fff}.noprint{display:none}.sheet{border-color:#c9b7c2}}
'''


def head(title, nonce, noindex=True):
    robots = '<meta name="robots" content="noindex, nofollow">' if noindex else ''
    return ('<!doctype html><html lang="ru"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1">'
            f'{robots}<title>{e(title)}</title><style nonce="{e(nonce)}">{CSS}</style></head><body>')


def human_date(moment):
    date = datetime.fromtimestamp(int(moment), timezone.utc)
    return f'{date.day} {MONTHS[date.month - 1]} {date.year} года'


def render_portfolio(data, nonce):
    works = ''.join(
        '<li class="work">'
        f'<span class="badge">{e(STATUS_LABEL.get(work["status"], "Работа"))}</span>'
        f'<h3>{e(work["title"])}</h3>'
        f'<p>{e(work["description"])}</p>'
        + (f'<a href="{e(work["url"])}" rel="nofollow noopener ugc" target="_blank">Открыть работу ↗</a>' if work.get('url') else '<span class="badge">Ссылку автор не публиковала</span>')
        + '</li>'
        for work in data['works'])
    certificate = ''
    if data.get('certificate'):
        certificate = ('<section class="cert"><p><strong>Сертификат '
                       f'{e(data["certificate"])}</strong></p><p>Выдан школой НЕЙРОПРОФИ '
                       f'{e(human_date(data["certified"]))}. '
                       f'<a href="/s/{e(data["certificate"])}">Проверить сертификат</a></p></section>')
    return (head(f'{data["name"]} — портфолио', nonce, noindex=not data.get('indexable'))
            + '<div class="shell"><header class="intro">'
            + '<p class="eyebrow">Портфолио</p>'
            + f'<h1>{e(data["name"])}</h1>'
            + f'<p class="headline">{e(data["headline"])}</p>'
            + f'<p class="about">{e(data["about"])}</p>'
            + f'<a class="contact" href="{e(data["contact"]["href"])}" rel="nofollow noopener">Написать: {e(data["contact"]["value"])}</a>'
            + '</header><h2>Работы</h2>'
            + f'<ul class="works">{works}</ul>'
            + certificate
            + '<footer><p>Работы собраны на практическом курсе НЕЙРОПРОФИ. Статус каждой работы указан автором. '
              'Страница обновлена ' + e(human_date(data['updated'])) + '. '
              '<a href="/raboty">Другие работы учениц</a>.</p></footer>'
            + '</div></body></html>')


def render_certificate(data, nonce):
    portfolio = f'<p class="what"><a href="/p/{e(data["slug"])}">Портфолио выпускницы</a></p>' if data.get('slug') else ''
    return (head(f'Сертификат {data["number"]}', nonce)
            + '<div class="shell"><div class="sheet">'
            + f'<p class="number">СЕРТИФИКАТ {e(data["number"])}</p>'
            + f'<p class="who">{e(data["name"])}</p>'
            + '<p class="what">прошла практический курс НЕЙРОПРОФИ: шесть недель работы над собственными проектами '
              'и собранное портфолио с результатами.</p>'
            + f'<p class="what">Выдан {e(human_date(data["certified"]))}.</p>'
            + portfolio
            + '<p class="what">Это сертификат школы о прохождении курса дополнительного образования. '
              'Он не является документом об образовании государственного образца.</p>'
            + '</div><footer class="noprint"><p>Страница подтверждает подлинность сертификата. '
              'Проверить другой номер: /s/НОМЕР.</p></footer></div></body></html>')


def render_missing(nonce, message='Такой страницы нет. Проверьте ссылку — возможно, автор сняла её с публикации.'):
    return (head('Страница не найдена', nonce)
            + f'<div class="shell"><div class="missing"><h1>Страница не найдена</h1><p class="about">{e(message)}</p></div></div></body></html>')


def render_gallery(items, nonce):
    """Витрина: только те страницы, которые ученицы сами разрешили показывать списком."""
    if not items:
        cards = ('<p class="about">Здесь появятся портфолио учениц курса. Пока ни одна страница '
                 'не открыта для витрины: каждая выпускница решает это сама.</p>')
    else:
        cards = '<ul class="works">' + ''.join(
            '<li class="work">'
            + (f'<span class="badge">Сертификат {e(item["certificate"])}</span>' if item.get('certificate') else '<span class="badge">Портфолио курса</span>')
            + f'<h3>{e(item["name"])}</h3>'
            + f'<p>{e(item["headline"])}</p>'
            + f'<a href="/p/{e(item["slug"])}">Открыть портфолио →</a>'
            + '</li>'
            for item in items) + '</ul>'
    return (head('Работы учениц НЕЙРОПРОФИ', nonce, noindex=False)
            + '<div class="shell"><header class="intro">'
            + '<p class="eyebrow">НЕЙРОПРОФИ</p>'
            + '<h1>Работы учениц</h1>'
            + '<p class="headline">Сервисы, сайты и ИИ-агенты, собранные на практическом курсе.</p>'
            + '<p class="about">Каждую страницу собрала и открыла сама выпускница. Статус работы — учебная, '
              'для себя или для заказчика — указан на её странице.</p>'
            + '</header>'
            + cards
            + '<footer><p>Школа НЕЙРОПРОФИ. Если на странице есть что-то неуместное, напишите куратору курса.</p></footer>'
            + '</div></body></html>')
