import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=process.argv[3]==='webkit' ? await webkit.launch() : await chromium.launch({headless:true,channel:'chrome'});
const origin=process.argv[2]||'http://localhost:55230';
const failures=[];
try {
 for(const format of ['mobile','desktop']) {
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.route('**/access/api/**',route=>route.fulfill({json:{url:null,available:false,messages:[]}}));
  await page.goto(`${origin}/?format=${format}&quest=recipe-book&output=service`);
  await page.getByRole('button',{name:/работать на вымышленных данных/i}).click();
  for(let step=1;step<=8;step++) {
   const next=page.getByRole('button',{name:/Я сделала.*продолжить|Завершить квест/i});
   await next.scrollIntoViewIfNeeded();
   await next.click();
   await page.waitForTimeout(100);
   const reward=page.getByRole('button',{name:'Забрать награду'});
   if(await reward.isVisible()) await reward.click();
   await page.waitForTimeout(1000);
   const state=await page.evaluate(()=>({y:scrollY,focused:document.activeElement?.textContent?.slice(0,70)}));
   console.log(format,step,JSON.stringify(state));
   if(state.y>2) failures.push(`${format} step ${step}: scrollY=${state.y}`);
  }
  await page.close();
 }
 assert.deepEqual(failures,[],'New lessons must open at the top, including after rewards.');
} finally {await browser.close();}
