// Walk only local lesson controls in isolated browser contexts, never external actions.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { projectSlugs } from './projects.mjs';
const origin = process.argv[2];
assert.ok(origin);
const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
let total = 0;
try {
  for (const width of [1440,390]) {
    for (const slug of projectSlugs()) {
      const context = await browser.newContext({viewport:{width,height:950}, reducedMotion:'reduce'});
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      const desktopOnly = ['install-codex','server-152fz','api-keys'].includes(slug);
      const url = new URL(origin);
      url.searchParams.set('format', width === 390 && !desktopOnly ? 'mobile' : 'desktop');
      url.searchParams.set('quest',slug);
      await page.goto(url.href,{waitUntil:'domcontentloaded'});
      const root = page.locator('[data-track-layout="comfortable"]');
      await root.locator('h1').first().waitFor();
      await page.locator('.preparation-loading').waitFor({state:'hidden'});
      const mac = page.getByRole('button',{name:'Выбрать Mac',exact:true});
      if(await mac.count()) await mac.click();
      const demo = page.getByRole('button',{name:'Работать на вымышленных данных',exact:true});
      if(await demo.count()) await demo.click();
      const title = page.locator('.quest-step-heading h1,.mobile-quest-step-heading h1');
      await title.waitFor();
      let steps = 0;
      for(let index=0;index<25;index++) {
        const text = await title.innerText();
        const headings = await root.locator('h1,h2,h3').evaluateAll(items => items.filter(e=>e.getBoundingClientRect().width>0).map(e=>({text:e.textContent.slice(0,80),size:parseFloat(getComputedStyle(e).fontSize),font:getComputedStyle(e).fontFamily,weight:parseFloat(getComputedStyle(e).fontWeight)})));
        for(const h of headings) {
          assert.equal(h.font,headings[0].font,`${slug}/${index+1}: mixed font ${h.text}`);
          assert.ok(h.size<=44,`${slug}/${index+1}: oversized ${h.text}`);
          assert.ok(h.weight>=600,`${slug}/${index+1}: weak ${h.text}`);
        }
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${slug}/${index+1}: overflow ${width}`);
        if(index>0) assert.equal(await root.locator('[data-result-showcase]').count(),0,`${slug}: repeated hero`);
        steps++;total++;
        const next = page.locator('.quest-step-actions,.mobile-quest-step-actions').getByRole('button').last();
        if(/Завершить квест|Квест пройден/.test(await next.innerText())) break;
        assert.ok(await next.isEnabled(), `${slug}/${index+1}: next disabled`);
        await next.click();
        const reward = page.getByRole('button',{name:'Забрать награду',exact:true});
        if(await reward.isVisible()) await reward.click();
        await page.waitForFunction(old=>document.querySelector('.quest-step-heading h1,.mobile-quest-step-heading h1')?.textContent!==old,text);
        assert.ok(index<24,`${slug}: stuck in navigation`);
      }
      console.log(`PASS ${width}px ${slug}: ${steps} consecutive steps`);
      await context.close();
    }
  }
  console.log(`PASS total ${total} lesson screens`);
} finally {await browser.close();}
