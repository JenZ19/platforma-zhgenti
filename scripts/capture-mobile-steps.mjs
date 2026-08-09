import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { mobileScreenPath, projectSlugs } from "./projects.mjs";

const origin = process.env.QUEST_ORIGIN || "http://localhost:3000";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const tasks = projectSlugs().flatMap((slug) => Array.from({ length: 17 }, (_, index) => ({ slug, step: index + 1 })));
let cursor = 0;
let finished = 0;

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });

async function worker(number) {
  const page = await context.newPage();
  while (cursor < tasks.length) {
    const index = cursor++;
    const { slug, step } = tasks[index];
    const file = mobileScreenPath(slug, step);
    if (fs.existsSync(file)) { finished++; continue; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await page.goto(`${origin}/?capture-mobile=${slug}--step-${String(step).padStart(2, "0")}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
        if (!response?.ok()) throw new Error(`HTTP ${response?.status() ?? "без ответа"}`);
        const scene = page.locator("#capture-scene");
        await scene.waitFor({ state: "visible", timeout: 30_000 });
        await scene.screenshot({ path: file, animations: "disabled" });
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        console.warn(`Повтор ${attempt}/3: ${slug}, шаг ${step}`);
      }
    }
    if (lastError) throw lastError;
    finished++;
    if (finished % 50 === 0 || finished === tasks.length) console.log(`Готово ${finished}/${tasks.length} мобильных экранов`);
  }
  await page.close();
  console.log(`Поток ${number} завершён`);
}

try {
  await Promise.all(Array.from({ length: 3 }, (_, index) => worker(index + 1)));
} finally {
  await browser.close();
}
