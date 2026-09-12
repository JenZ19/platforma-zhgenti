import { chromium, webkit } from '@playwright/test';
import assert from 'node:assert/strict';

const origin = process.argv[2] || 'http://localhost:55230';
const browser = process.argv[3] === 'webkit' ? await webkit.launch() : await chromium.launch({channel:'chrome'});
try {
  for (const [format, width] of [['mobile',390],['desktop',1440]]) {
    // Disposable browser context: never clears the learner's real browser data.
    const page = await browser.newPage({viewport:{width,height:900}, ...(format === 'mobile' ? {isMobile:true,hasTouch:true} : {})});
    await page.route('**/access/api/**', route => route.fulfill({json:{url:'https://t.me/test_personal_bot',available:false,messages:[]}}));
    await page.goto(`${origin}/?format=${format}&section=weeks`);
    await page.locator('.course-library > summary').click();
    const counts = [];
    const links = [];
    for (let week=1; week<=6; week++) {
      const toggle = page.getByRole('button',{name:`Неделя ${week}`,exact:true});
      if(await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
      const panel = page.locator(`#dashboard-week-${week}`);
      const cards = panel.locator('.dashboard-project-card');
      counts.push(await cards.count());
      const hrefs = await panel.locator('.dashboard-card-action').evaluateAll(nodes => nodes.map(n=>n.getAttribute('href')));
      links.push(...hrefs);
      if (week === 2) {
        assert.equal(await cards.count(), 8);
        assert.equal(await panel.locator('a[href*="quest=planning"][href*="output=agent"]').count(), 1);
        assert.equal(await panel.locator('.bundle-preview-carousel').count(), 0);
        await cards.first().scrollIntoViewIfNeeded();
        await page.waitForFunction(() => [...document.querySelectorAll('#dashboard-week-2 .project-preview img')].slice(0,3).every(img => img.complete && img.naturalWidth > 0));
        await panel.locator('.project-preview img').evaluateAll(async nodes => {
          await Promise.all(nodes.slice(0,3).map(img => img.decode()));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        });
        await page.screenshot({path:`/tmp/neiroprofi-week2-${format}.png`});
      }
    }
    assert.equal(new Set(links).size, links.length, 'No duplicate results across weeks');
    const overflow = await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth + 1);
    assert.equal(overflow,false);
    await page.getByRole('button',{name:'Неделя 2',exact:true}).click();
    await page.locator('#dashboard-week-2 a[href*="quest=planning"][href*="output=agent"]').click();
    assert.equal(new URL(page.url()).searchParams.get('output'),'agent');
    assert.equal(new URL(page.url()).searchParams.get('quest'),'planning');
    await page.getByRole('button',{name:/работать на вымышленных данных/i}).waitFor();

    await page.evaluate(() => {
      for (const prefix of ['', 'mobile:']) {
        localStorage.setItem(`feya-academy-progress-v1:${prefix}planning:service`, JSON.stringify({version:1,journeyRevision:'planning-20260908',activeStep:9,completed:[1,2,3,4,5,6,7,8,9],score:90}));
        localStorage.setItem(`feya-academy-preparation-v1:${prefix}planning:service`,JSON.stringify({version:1,mode:'demo',ready:true,checked:[]}));
      }
      localStorage.setItem('feya-dashboard-v1:saved','["ideas"]');
      localStorage.setItem('feya-dashboard-v1:notes:academy','[]');
      localStorage.setItem('neiroprofi-personal-bot-v1','https://t.me/test_personal_bot');
      localStorage.setItem('test-unrelated','preserve');
    });
    await page.goto(`${origin}/?format=${format}&section=home`);
    const reset = page.getByRole('button',{name:'Сбросить всё обучение',exact:true});
    await reset.waitFor();
    const before = await page.evaluate(()=>localStorage.getItem('feya-academy-progress-v1:planning:service'));
    page.once('dialog', dialog=>dialog.dismiss());
    await reset.click();
    assert.equal(await page.evaluate(()=>localStorage.getItem('feya-academy-progress-v1:planning:service')),before);
    page.once('dialog', dialog=>dialog.accept());
    await reset.click();
    await page.getByRole('heading',{name:'С чего начать обучение',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>localStorage.getItem('feya-academy-progress-v1:planning:service')),null);
    assert.equal(await page.evaluate(()=>localStorage.getItem('feya-academy-progress-v1:mobile:planning:service')),null);
    assert.equal(await page.evaluate(()=>localStorage.getItem('feya-dashboard-v1:saved')),null);
    assert.equal(await page.evaluate(()=>localStorage.getItem('test-unrelated')),'preserve');
    assert.equal(await page.evaluate(()=>localStorage.getItem('neiroprofi-personal-bot-v1')),'https://t.me/test_personal_bot');
    assert.equal(await page.evaluate(()=>localStorage.getItem('feya-dashboard-v1:notes:academy')),'[]');
    await page.reload();
    await page.getByRole('heading',{name:'С чего начать обучение',exact:true}).waitFor();
    await page.locator('#learning-reset').scrollIntoViewIfNeeded();
    await page.screenshot({path:`/tmp/neiroprofi-reset-${format}.png`});
    page.once('dialog',dialog=>dialog.accept());
    await page.getByRole('button',{name:'Отменить последний сброс',exact:true}).click();
    assert.equal(await page.evaluate(()=>localStorage.getItem('feya-academy-progress-v1:planning:service')),before);
    console.log(format,JSON.stringify({counts,uniqueResults:links.length,reset:'cancel/reset/reload/undo passed',overflow}));
    await page.close();
  }
} finally { await browser.close(); }
