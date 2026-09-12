const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function sheet(title, intro, content, accent = '#292526') {
  return `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title>
  <style>
  *{box-sizing:border-box}body{margin:0;padding:48px;background:#f3f1ed;color:#232328;font:21px/1.55 Arial,sans-serif;--accent:${accent}}header{margin-bottom:28px}h1{font-size:38px;line-height:1.2;margin:12px 0}h2{font-size:24px;margin:0 0 16px}p{margin:0 0 18px}.meta{font-size:17px;color:#655e63}.label{font-size:16px;font-weight:700;letter-spacing:.05em;color:var(--accent)}article,section{background:#fff;padding:32px;margin-bottom:22px;border:1px solid #ddd9d6;border-radius:18px}.text{font-size:30px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.status{border-left:4px solid var(--accent);padding-left:18px;margin:28px 0 0}.notice{background:#fff6df;border:1px solid #decfa5;border-radius:12px;padding:18px 22px;font-size:18px}.row{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px;padding:20px 0;border-top:1px solid #e6e3e1}.row:first-of-type{border-top:0}.badge{font-size:18px;font-weight:700;color:var(--accent)}small{display:block;color:#686369;font-size:16px;margin-top:4px}.author{font-weight:700;font-size:18px;margin-bottom:8px}footer{font-size:17px;color:#655e63;padding:8px 0}code{font-size:16px}.row>div{min-width:0;overflow-wrap:anywhere}
  @media(max-width:650px){body{padding:20px}.row{grid-template-columns:1fr;gap:10px}h1{font-size:30px}article,section{padding:22px}.text{font-size:24px}}
  </style><header><div class="label">Вымышленный учебный пример</div><h1>${escape(title)}</h1><p class="meta">${escape(intro)}</p></header>${content}<footer>Лист просмотра результата проверки, не экран Telegram. Внешние подключения не запускались.</footer></html>`;
}

export function draftPage({text, status, count}) {
  return sheet('Threads-агент · первый черновик', 'Текст из базы, которую создала учебная проверка оригинального комплекта.', `
  <article><div class="label">Черновик 01</div><div class="text">${escape(text)}</div>
  <div class="status"><strong>${status === 'draft' ? 'Сохранён как черновик' : escape(status)}</strong><br><span class="meta">Записей в учебной базе: ${escape(count)}</span></div></article>
  <div class="notice">Это фиксированный вымышленный текст для проверки. Он не создан ИИ и не описывает реальные достижения. Публикация не выполнялась.</div>`);
}

export function moderatorPage(report) {
  const categories = {reaction:'Реакция участника',spam:'Похоже на спам',other:'Нужна проверка человеком'};
  const rows = report.messages.map(item => `<div class="row"><div><div class="author">${escape(item.author)}</div>${escape(item.text)}</div><div><span class="badge">${escape(categories[item.category] || item.category)}</span><small>${item.classified_by === 'heuristic' ? 'Определено правилами' : 'Без ответа ИИ · требуется проверка'}</small></div></div>`).join('');
  const faq = report.faq_matches.map(item => `<div class="row"><div>${escape(item.question)}</div><div class="badge">${item.matched ? 'Совпадение найдено' : 'Ответ не найден'}</div></div>`).join('');
  return sheet('Модератор · разбор учебных вопросов', 'Результат оригинальных правил и поиска по одобренной учебной базе.', `
  <section><h2>Что пришло в учебном примере</h2>${rows}</section>
  <section><h2>Поиск похожего вопроса в FAQ</h2>${faq}</section>
  <div class="notice"><strong>Режим: ${escape(report.mode)} — наблюдение.</strong> Ответы в комнату не отправлялись. Спорный вопрос оставлен на проверку человеку.</div>`, '#255c54');
}
