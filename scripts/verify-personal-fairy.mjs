// Isolated browser QA: mocked account API, no real account or bot is changed.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true,channel:'chrome'});
try {
  const page = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  let saved = null;
  await page.route('**/access/api/personal-bot', async route => {
    if (route.request().method() === 'POST') saved=route.request().postDataJSON().url;
    await route.fulfill({json:{url:saved}});
  });
  await page.goto('http://localhost:58770/?format=mobile');
  const hero=page.locator('.next-quest-banner');
  await hero.getByLabel('Адрес вашей Феечки').fill('@student_fairy_bot');
  await hero.screenshot({path:'/tmp/personal-fairy-before.png'});
  await hero.getByRole('button',{name:'Сохранить Феечку'}).click();
  await hero.getByRole('link',{name:'Открыть Феечку в Telegram'}).waitFor();
  assert.equal(await hero.getByRole('link',{name:'Открыть Феечку в Telegram'}).getAttribute('href'),'https://t.me/student_fairy_bot');
  await page.reload();
  await hero.getByRole('link',{name:'Открыть Феечку в Telegram'}).waitFor();
  assert.equal(await hero.getByLabel('Адрес вашей Феечки').count(),0);
  assert.equal(await page.locator('a[href*="feyakrestnayasbm_bot"]').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'/tmp/personal-fairy-saved.png',fullPage:false});
  console.log('Mobile: ask, save, reload, personal destination, no overflow — passed (mock account API).');
} finally {await browser.close();}
