import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { draftPage, moderatorPage } from './result-preview-pages.mjs';

const [kind, input] = process.argv.slice(2);
assert.ok(['threads', 'moderator'].includes(kind) && input);
const directory = path.dirname(path.resolve(input));
const data = JSON.parse(await readFile(input, 'utf8'));
const html = kind === 'threads' ? draftPage(data) : moderatorPage(data);
const htmlFile = path.join(directory, 'index.html');
await writeFile(htmlFile, html, {flag:'wx'});
const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
  const page = await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:1});
  await page.goto(pathToFileURL(htmlFile).href);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({path:path.join(directory, 'result-preview.png'),fullPage:true});
  console.log(`${kind}: full screenshot saved; no overflow; offline result labelled`);
} finally { await browser.close(); }
