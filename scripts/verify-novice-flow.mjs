import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {projectSlugs} from './projects.mjs';
const origin=process.argv[2];assert.ok(origin);
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
await mkdir('output/novice-flow',{recursive:true});
let count=0;
try{
 for(const width of [390,1440]) for(const slug of (process.argv[3] ? process.argv[3].split(',') : projectSlugs())){
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=new URL(origin);url.searchParams.set('format',width===390&&!['install-codex','api-keys','server-152fz'].includes(slug)?'mobile':'desktop');url.searchParams.set('quest',slug);
  await page.goto(url.href,{waitUntil:'domcontentloaded'});
  await page.locator('[data-track-layout] h1').first().waitFor();
  await page.locator('.preparation-loading').waitFor({state:'hidden'});
  const mac=page.getByRole('button',{name:'Выбрать Mac',exact:true});if(await mac.count())await mac.click();
  const demo=page.getByRole('button',{name:'Работать на вымышленных данных',exact:true});if(await demo.count())await demo.click();
  const heading=page.locator('.quest-step-heading h1,.mobile-quest-step-heading h1');await heading.waitFor();
  const firstTitle=await heading.innerText();const block=page.getByRole('region',{name:'Действие этого шага'});await block.waitFor();
  const original=await page.evaluate(()=>JSON.stringify({...localStorage}));
  const prompt=block.locator('.workbench-prompt');if(await prompt.count()){
    assert.equal(await prompt.getAttribute('open'),null);
    assert.ok(await block.evaluate(e=>Boolean(e.compareDocumentPosition(document.querySelector('[data-result-showcase]'))&Node.DOCUMENT_POSITION_FOLLOWING)),slug+' command after art');
    const copy=block.getByRole('button',{name:'Скопировать команду',exact:true});const top=await copy.evaluate(e=>e.getBoundingClientRect().top+scrollY);
    assert.ok(top<1700,`${slug}: first copy too far down ${top}`);
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text;}}}));
    await copy.click();assert.ok((await page.evaluate(()=>window.__copied)).length>50);
  }
  await block.locator('.support-request summary').click();
  const draft=await block.getByRole('textbox',{name:'Сообщение куратору'}).inputValue();assert.ok(draft.includes(firstTitle));
  await block.locator('.support-request summary').click();
  if(['planner','server-152fz'].includes(slug))await page.screenshot({path:`output/novice-flow/${slug}-${width}.png`,fullPage:false});
  await page.getByRole('button',{name:'Посмотреть следующий шаг без отметки',exact:true}).click();
  await page.getByText('Режим просмотра — выполнение не отмечается',{exact:true}).waitFor();
  assert.notEqual(await heading.innerText(),firstTitle);
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),original,slug+' changed progress in preview');
  assert.equal(await page.locator('.quest-step-actions,.mobile-quest-step-actions').count(),0);
  await page.getByRole('button',{name:'Вернуться к моей работе',exact:true}).click();assert.equal(await heading.innerText(),firstTitle);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),slug+' overflow');assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px ${slug}`);count++;await context.close();
 }
 const demoURL=new URL('materials/planner-example/index.html?mode=real',origin.endsWith('/')?origin:origin+'/');
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();
 await page.goto(demoURL.href);await page.getByRole('button',{name:'Добавить дело',exact:true}).click();assert.ok(await page.getByRole('textbox',{name:'Что хотите сделать?'}).evaluate(e=>e===document.activeElement));await page.getByRole('textbox',{name:'Что хотите сделать?'}).fill('Тест планера');await page.getByRole('button',{name:'Сохранить',exact:true}).click();
 await page.reload();assert.equal(await page.locator('.task').count(),1);await page.getByRole('button',{name:'Сделать главным',exact:true}).click();
 await page.getByRole('button',{name:'Готово',exact:true}).click();await page.getByRole('button',{name:'Вернуть в работу',exact:true}).click();
 await page.getByRole('button',{name:'На завтра',exact:true}).click();await page.getByRole('button',{name:'Завтра',exact:true}).click();assert.equal(await page.locator('.task').count(),1);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'output/novice-flow/planner-example-390.png',fullPage:true});
 const zipURL=new URL('materials/learning-kits/planner-2026-09-09.1.zip',origin.endsWith('/')?origin:origin+'/');
 const remote=await fetch(zipURL);assert.equal(remote.status,200);const hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(Buffer.from(await remote.arrayBuffer())),hash(await readFile('public/materials/learning-kits/planner-2026-09-09.1.zip')));
 await context.close();console.log(`PASS ${count} route/viewport checks + working starter + downloadable ZIP hash`);
}finally{await browser.close();}
