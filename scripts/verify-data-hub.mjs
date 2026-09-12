import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
const root=path.resolve('output/data-hub');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
for(const [name,entry] of Object.entries(manifest.files)){
 const data=await readFile(path.join(root,name));
 assert.equal(data.length,entry.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256);
}
const html=await readFile(path.join(root,'index.html'),'utf8');
const dom=new JSDOM(html,{url:'https://ezhgenti.ru/data/',runScripts:'outside-only'});
const {document}=dom.window;
assert.equal(document.querySelectorAll('article.dataset').length,49);
for(const a of document.querySelectorAll('a[href^="/data/"]')){
 const url=new URL(a.href);const name=url.pathname.slice(6)||'index.html';
 await readFile(path.join(root,name));
}
let copied='';Object.defineProperty(dom.window.navigator,'clipboard',{value:{writeText:async text=>{copied=text;}}});
dom.window.eval(await readFile(path.join(root,'site.js'),'utf8'));
const search=document.querySelector('#search');search.value='здоровье';search.dispatchEvent(new dom.window.Event('input'));
assert.equal(document.querySelectorAll('article:not([hidden])').length,2);
search.value='хаб';search.dispatchEvent(new dom.window.Event('input'));
assert.equal(document.querySelectorAll('article:not([hidden])').length,1);
document.querySelector('[data-copy="family-health-hub"]').click();
await new Promise(resolve=>setTimeout(resolve,0));
assert.ok(copied.startsWith('Хаб здоровья семьи\n'));
assert.ok(copied.includes('https://ezhgenti.ru/data/sets/family-health-hub/dataset.json'));
search.value='нет-такого-проекта';search.dispatchEvent(new dom.window.Event('input'));
assert.equal(document.querySelector('#empty').hidden,false);
dom.window.close();
console.log(`Data hub: ${Object.keys(manifest.files).length} hashes/links, 49 cards, search, copy and empty state passed.`);
