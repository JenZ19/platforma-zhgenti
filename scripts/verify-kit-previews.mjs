import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';

const origin = process.argv[2];
assert.ok(origin, 'Pass a staged or live platform URL');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir('output/kit-preview-qa', {recursive:true});
const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
  for (const width of [390,1440]) {
    const context = await browser.newContext({viewport:{width,height:900}});
    const page = await context.newPage();
    for (const slug of ['carousel-agent','threads-agent','webinar-moderator-agent','family-health-hub']) {
      const url = new URL(origin);
      url.searchParams.set('format', width === 390 ? 'mobile' : 'desktop');
      url.searchParams.set('quest',slug);
      await page.goto(url.href);
      await page.getByRole('button',{name:'Работать на вымышленных данных',exact:true}).click();
      const section = page.getByRole('region',{name:'Пример первого учебного результата'});
      await section.waitFor({state:'visible'});
      await section.scrollIntoViewIfNeeded();
      const img = section.locator('img');
      // The longer first page can leave a lazy image below the viewport even
      // after scrolling its containing section. Bring the image itself into view.
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(image => image.decode());
      const dimensions = await img.evaluate(image => ({width:image.clientWidth,height:image.clientHeight,nw:image.naturalWidth,nh:image.naturalHeight}));
      assert.ok(dimensions.nw > 0 && Math.abs(dimensions.width / dimensions.height - dimensions.nw / dimensions.nh) < 0.015, 'Image must retain complete aspect ratio');
      const link = section.getByRole('link');
      const href = await link.getAttribute('href');
      const response = await context.request.get(new URL(href,url).href);
      assert.equal(response.status(),200);
      const local = await readFile(`public/materials/learning-kit-previews/${slug}-v1.png`);
      assert.equal(digest(await response.body()),digest(local),'Live image must match approved PNG');
      if (slug === 'threads-agent' || slug === 'webinar-moderator-agent') assert.match(await section.innerText(),/Это не экран Telegram/);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1),'Page overflow');
      await section.screenshot({path:`output/kit-preview-qa/${slug}-${width}.png`});
      console.log(`PASS ${width}px ${slug}: first lesson, caption, full image, SHA-256, no overflow`);
    }
    await context.close();
  }
} finally {await browser.close();}
