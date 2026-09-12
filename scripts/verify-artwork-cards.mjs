import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const origin=process.argv[2];
assert.ok(origin);
await mkdir('output/quest-artwork-qa',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
  for (const width of [1440,390]) {
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    const page=await context.newPage();
    for (const section of ['home','week-1','week-2','week-3','week-4','week-5','week-6']) {
      const url=new URL(origin); url.searchParams.set('section',section==='home'?'home':'weeks');url.searchParams.set('format',width===390?'mobile':'desktop');
      await page.goto(url.href,{waitUntil:'domcontentloaded'});
      if(section.startsWith('week-')) {
        const library=page.locator('.course-library');
        await library.locator('summary').click();
        const week=library.getByRole('button',{name:`Неделя ${section.slice(-1)}`,exact:true});
        if(await week.getAttribute('aria-expanded')!=='true') await week.click();
      }
      await page.locator('.project-preview').first().waitFor();
      const previews=page.locator('.project-preview');
      let count=0;
      for(const preview of await previews.all()) {
        if(!await preview.isVisible()) continue;
        await preview.scrollIntoViewIfNeeded();
        const img=preview.locator(':scope > img,.bundle-preview-slide.is-active img').first();
        await img.evaluate(image=>image.decode());
        assert.equal(await img.evaluate(image=>getComputedStyle(image).objectFit),'contain');
        const sticker=preview.locator('.project-preview-sticker');
        const stickerBox=await sticker.boundingBox(),imageBox=await img.boundingBox();
        assert.ok(stickerBox.y+stickerBox.height <= imageBox.y+2,'Sticker covers result');
        const dots=preview.locator('.bundle-preview-dots');
        if(await dots.count()) {
          const dotsBox=await dots.boundingBox();
          assert.ok(dotsBox.y>=imageBox.y+imageBox.height-2,'Format controls cover result');
        }
        count++;
      }
      assert.ok(count>0);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow ${section} ${width}`);
      await previews.first().scrollIntoViewIfNeeded();
      await page.screenshot({path:`output/quest-artwork-qa/catalog-${section}-${width}.png`});
      console.log(`PASS ${width}px ${section}: ${count} images without crop or overlapping stickers`);
    }
    await context.close();
  }
} finally {await browser.close();}
