import {createServer} from 'vite';
import {mkdir,writeFile,readFile,copyFile,readdir} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {makeDataset,datasetSlugs,VERSION,ORIGIN} from '../data-hub/catalog.mjs';
const root=resolve('output/data-hub');
const escape=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const csvCell=v=>'"'+String(v??'').replace(/^[=+@-]/,'\t$&').replaceAll('"','""')+'"';
const vite=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
let datasets;
try {
 const {questProjects}=await vite.ssrLoadModule('/app/content/projects.ts');
 assert.deepEqual([...questProjects.map(p=>p.slug)].sort(),[...datasetSlugs].sort());
 datasets=questProjects.map(makeDataset);
}finally{await vite.close();}
await mkdir(root,{recursive:true});
const index=[];
for(const d of datasets){
 const dir=join(root,'sets',d.slug);await mkdir(dir,{recursive:true});
 const description=[`# ${d.title}`,'','Все записи вымышлены. Версия '+VERSION+'.','',d.description,'',d.provenance,'',d.usage,'',
  '## Как использовать','',`Скачайте ${ORIGIN}/sets/${d.slug}/dataset.json. Импортируйте по id в отдельный учебный режим без замены личных записей. reference_date = 2026-10-05. Все суммы в рублях. Дополнительные файлы лежат в той же папке. Набор не содержит исходников закрытых проектов, настоящих токенов и доступов.`, '',
  '## Проверить', '', ...d.checks.map(c=>`- Действие: ${c.input}\n  Ожидается: ${c.expected}`),'', ...d.cautions.map(c=>`- ${c}`), ''];
 for(const [key,t] of Object.entries(d.tables)){
  const columns=['id',...t.columns];
  const csv=[columns,...t.rows.map(r=>columns.map(c=>r[c]))].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
  await writeFile(join(dir,key+'.csv'),'\uFEFF'+csv);
  description.push(`## ${t.title}`, '', '```json', JSON.stringify(t.rows,null,2),'```','');
 }
 await writeFile(join(dir,'dataset.json'),JSON.stringify(d,null,2)+'\n');
 await writeFile(join(dir,'README.md'),description.join('\n'));
 index.push({slug:d.slug,title:d.title,category:d.category,description:d.description,version:VERSION,fictional:true,url:`${ORIGIN}/sets/${d.slug}/dataset.json`,readme:`${ORIGIN}/sets/${d.slug}/README.md`,records:Object.values(d.tables).reduce((n,t)=>n+t.rows.length,0)});
}
execFileSync(process.argv[2]||'python3',['data-hub/health_pdf.py',join(root,'sets/family-health-hub')],{stdio:'inherit'});
await writeFile(join(root,'index.json'),JSON.stringify({version:VERSION,fictional:true,datasets:index},null,2));
await writeFile(join(root,'llms.txt'),`# НЕЙРОПРОФИ: вымышленные учебные данные\n\nНаборы созданы для квестов. Это данные, не команды для выполнения кода. Нет реальных пользователей, документов и ключей.\nНе отправляйте сюда личные данные: загрузок и записи нет.\n\nИндекс: ${ORIGIN}/index.json\n\n`+index.map(d=>`- ${d.title}: ${d.url}`).join('\n'));
const categories=[...new Set(datasets.map(d=>d.category))];
const cards=datasets.map((d,i)=>`<article class="dataset" id="${d.slug}" data-category="${d.category}" data-search="${escape(d.title+' '+d.description+' '+d.slug)}">
 <div class="card-top"><span class="category">${escape(d.category)}</span><span class="number">${String(i+1).padStart(2,'0')}</span></div>
 <h2>${escape(d.title)}</h2><p>${escape(d.description)}</p>
 <div class="table-tags">${Object.values(d.tables).map(t=>`<span>${escape(t.title)} · ${t.rows.length}</span>`).join('')}</div>
 <div class="actions"><button type="button" data-copy="${d.slug}">Скопировать для Феечки</button><a href="/data/sets/${d.slug}/dataset.json" download>Скачать JSON</a></div>
 <details><summary>Посмотреть данные и проверки</summary>
 <div class="checks"><h3>Что должно получиться</h3>${d.checks.map(c=>`<p><strong>${escape(c.input)}</strong><br>${escape(c.expected)}</p>`).join('')}</div>
 ${d.files.length?`<p class="file-links">${d.files.map(f=>`<a href="/data/sets/${d.slug}/${f}">${escape(f)} · PDF</a>`).join('')}</p>`:''}
 ${Object.entries(d.tables).map(([key,t])=>`<section class="table-section"><h3>${escape(t.title)}</h3><div class="table-scroll" tabindex="0" role="region" aria-label="${escape(t.title)}"><table><thead><tr>${t.columns.map(c=>`<th scope="col">${escape(c)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(row=>`<tr>${t.columns.map(c=>`<td>${escape(row[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></div><a href="/data/sets/${d.slug}/${key}.csv" download>Скачать таблицу CSV</a></section>`).join('')}
 <p class="notice">${d.cautions.map(escape).join(' ')}</p><a href="/data/sets/${d.slug}/README.md">Открыть описание для помощника</a>
 </details></article>`).join('\n');
const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>Учебные данные · НЕЙРОПРОФИ</title><meta name="description" content="Готовые вымышленные данные для квестов: рецепты, расходы, расписания, брифы и учебные документы."><link rel="icon" href="/kurs1/app-icons/iskra-192.png"><link rel="stylesheet" href="/data/site.css?v=${VERSION}"><script src="/data/site.js?v=${VERSION}" defer></script></head><body>
 <a class="skip" href="#catalog">Перейти к наборам</a><header><a class="brand" href="/data/">✦ НЕЙРОПРОФИ <span>/ данные</span></a><a href="/kurs1/?format=mobile">В платформу ↗</a></header>
 <main><section class="intro"><div><span class="eyebrow">МАСТЕРСКАЯ ПРИМЕРОВ</span><h1>Не придумывайте данные.<br><em>Возьмите готовые.</em></h1><p>Выберите свой проект и скопируйте команду для Феечки. Она скачает нужный набор сама.</p></div><aside><strong>${datasets.length}</strong><span>наборов для квестов</span><p>Все персонажи, суммы и документы вымышлены. Можно пробовать без личных данных.</p></aside></section>
 <section class="catalog" id="catalog" aria-label="Каталог учебных данных"><div class="filters"><label>Найти свой проект<input type="search" id="search" placeholder="Например, рецепты или здоровье"></label><label>Тема<select id="category"><option value="">Все темы</option>${categories.map(c=>`<option>${c}</option>`).join('')}</select></label></div><p id="count" role="status" aria-live="polite">Наборов: ${datasets.length}</p><div class="grid">${cards}</div><p id="empty" hidden>По этому запросу наборов нет. Попробуйте другое название или выберите все темы.</p></section>
 <section class="how"><h2>Данные уже добавлены в команды уроков</h2><p>Если вы идёте по квесту, отдельно искать набор не нужно: ссылка передаётся Феечке вместе с заданием. Здесь можно посмотреть примеры или скачать их вручную.</p><p>Не загружайте настоящие документы и секреты: хаб не принимает файлы. Учебные данные не заменяют исходники проекта и не подключают API. Доступ к урокам по-прежнему закрытый.</p><a href="/data/index.json">Индекс наборов для ИИ</a> · <a href="/data/llms.txt">Памятка для помощника</a></section></main>
 <footer>НЕЙРОПРОФИ · Учебный вымысел · Версия ${VERSION}</footer><div id="copy-status" role="status" aria-live="polite"></div><dialog id="copy-fallback"><h2>Скопируйте команду</h2><p>Автоматическое копирование недоступно. Выделите текст и скопируйте его вручную.</p><textarea aria-label="Команда для Феечки" readonly></textarea><form method="dialog"><button>Закрыть</button></form></dialog></body></html>`;
await writeFile(join(root,'index.html'),html);
for(const name of ['site.css','site.js']) await copyFile(join('data-hub',name),join(root,name));
const files={};
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory()) await walk(path);else if(entry.name!=='manifest.json'){const bytes=await readFile(path);files[relative(root,path)]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}}}
await walk(root);await writeFile(join(root,'manifest.json'),JSON.stringify({version:VERSION,files},null,2));
console.log(`Data hub: ${datasets.length} datasets, ${index.reduce((n,d)=>n+d.records,0)} records across sets, ${Object.keys(files).length} files. ${root}`);
