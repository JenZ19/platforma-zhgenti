import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { coverPath, projectSlugs } from "./projects.mjs";

const origin = process.env.QUEST_ORIGIN || "http://localhost:3000";
const selectedSlugs = new Set((process.env.CAPTURE_SLUGS || "").split(",").map((value) => value.trim()).filter(Boolean));
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const tasks = projectSlugs().filter((slug) => selectedSlugs.size === 0 || selectedSlugs.has(slug));
let cursor = 0;
let finished = 0;

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });

async function worker(number) {
  const page = await context.newPage();
  while (cursor < tasks.length) {
    const index = cursor;
    cursor += 1;
    const slug = tasks[index];
    const file = coverPath(slug);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let saved = false;
    let lastError;

    for (let attempt = 1; attempt <= 3 && !saved; attempt += 1) {
      try {
        const response = await page.goto(`${origin}/?capture-cover=${slug}`, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });
        if (!response?.ok()) throw new Error(`HTTP ${response?.status() ?? "без ответа"}`);
        const visual = page.locator("#capture-cover .capture-visual");
        await visual.waitFor({ state: "visible", timeout: 30_000 });
        await page.evaluate(() => document.fonts.ready);
        await visual.screenshot({ path: file, type: "webp", quality: 82, animations: "disabled" });
        saved = true;
      } catch (error) {
        lastError = error;
        console.warn(`Повтор ${attempt}/3: ${slug}`);
      }
    }

    if (!saved) throw lastError;
    finished += 1;
    if (finished % 10 === 0 || finished === tasks.length) console.log(`Готово ${finished}/${tasks.length} обложек`);
  }
  await page.close();
  console.log(`Поток ${number} завершён`);
}

try {
  await Promise.all(Array.from({ length: 3 }, (_, index) => worker(index + 1)));
} finally {
  await browser.close();
}
