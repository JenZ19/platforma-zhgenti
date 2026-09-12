import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { projectSlugs } from './projects.mjs';

const origin = process.argv[2];
const slugs = process.argv[3] === 'all' ? projectSlugs() : ['server-152fz','install-codex','planner','threads-agent','family-health-hub'];
await mkdir('output/quest-typography-qa',{recursive:true});
const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
  for (const width of [1440,390]) {
    const context = await browser.newContext({viewport:{width,height:1000}});
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    async function verify(slug, state) {
      const root = page.locator('[data-track-layout="comfortable"]');
      await root.locator('h1').first().waitFor();
      await page.locator('.preparation-loading').waitFor({state:'hidden'});
      const headings = await root.locator('h1,h2,h3,.format-option-title,.mode-option-title,.mobile-quest-project-title').evaluateAll(elements => elements.filter(e => e.getBoundingClientRect().width>0).map(e => {
        const css=getComputedStyle(e);
        return {text:e.textContent.slice(0,80),tag:e.tagName,family:css.fontFamily,size:parseFloat(css.fontSize),weight:parseFloat(css.fontWeight),style:css.fontStyle};
      }));
      for (const h of headings) {
        assert.equal(h.family,headings[0].family,`${slug}/${state}: mixed fonts in ${h.text}`);
        assert.ok(h.weight>=600,`${slug}/${state}: weak heading ${h.text}`);
        assert.equal(h.style,'normal',`${slug}/${state}: unexpected italic ${h.text}`);
        assert.ok(h.size<=44,`${slug}/${state}: oversized heading ${h.text}: ${h.size}px`);
      }
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${slug}/${state}: overflow ${width}`);
      const artworks = root.locator('[data-result-showcase] img, .format-result-image');
      assert.ok(await artworks.count() > 0, `${slug}/${state}: missing first-page result`);
      for (const artwork of await artworks.all()) {
        await artwork.evaluate(img => img.decode());
        assert.ok(await artwork.evaluate(img => img.naturalWidth > 0), `${slug}: image did not load`);
        assert.equal(await artwork.evaluate(img => getComputedStyle(img).objectFit), 'contain', `${slug}: cropped mockup`);
      }
      if (slug==='server-152fz') {
        const offer=root.locator('.server-offer');
        if(await offer.count()) {
          assert.ok(await offer.locator('h2').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)<=28),'Promo overwhelms lesson title');
          assert.ok(await offer.locator('.server-offer-copy').evaluate(e=>e.clientWidth>e.parentElement.clientWidth*.65),'Promo text trapped in narrow column');
        }
      }
    }
    for(const slug of slugs) {
      const desktopOnly=['install-codex','server-152fz','api-keys'].includes(slug);
      const url=new URL(origin);url.searchParams.set('format',width===390&&!desktopOnly?'mobile':'desktop');url.searchParams.set('quest',slug);
      await page.goto(url.href, {waitUntil:'domcontentloaded'});
      await verify(slug,'entry');
      const mac=page.getByRole('button',{name:'Выбрать Mac',exact:true});
      if(await mac.count()) {await mac.click();await verify(slug,'mac');}
      const demo=page.getByRole('button',{name:'Работать на вымышленных данных',exact:true});
      if(await demo.count()) {await demo.click();await page.locator('.quest-step-heading h1,.mobile-quest-step-heading h1').waitFor();await verify(slug,'lesson');}
      if(['server-152fz','install-codex','planner','threads-agent'].includes(slug)) {
        await page.screenshot({path:`output/quest-typography-qa/${slug}-${width}.png`});
      }
      console.log(`PASS ${width}px ${slug}: matching fonts, hierarchy, no overflow`);
    }
    await context.close();
  }
} finally {await browser.close();}
