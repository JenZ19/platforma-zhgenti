import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { selectedNumbers } from "./capture-selection.mjs";
import { projectSlugs, projectStepCount, screenPath } from "./projects.mjs";

const origin = process.env.QUEST_ORIGIN || "http://localhost:3000";
const force = process.env.FORCE_SCREENS === "1";
const selectedSlugs = new Set((process.env.CAPTURE_SLUGS || "").split(",").map((value) => value.trim()).filter(Boolean));
const selectedSteps = selectedNumbers(process.env.CAPTURE_STEPS);
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const tasks = projectSlugs()
  .filter((slug) => selectedSlugs.size === 0 || selectedSlugs.has(slug))
  .flatMap((slug) => Array.from({ length: projectStepCount(slug) }, (_, index) => ({ slug, step: index + 1 })))
  .filter(({ step }) => selectedSteps.size === 0 || selectedSteps.has(step));
let cursor = 0;
let finished = 0;

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });

async function worker(number) {
  const page = await context.newPage();
  while (cursor < tasks.length) {
    const index = cursor;
    cursor += 1;
    const { slug, step } = tasks[index];
    const file = screenPath(slug, step);
    if (!force && fs.existsSync(file)) {
      finished += 1;
      continue;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let saved = false;
    let lastError;
    for (let attempt = 1; attempt <= 3 && !saved; attempt += 1) {
      try {
        const response = await page.goto(`${origin}/?capture=${slug}--step-${String(step).padStart(2, "0")}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
        if (!response?.ok()) throw new Error(`HTTP ${response?.status() ?? "без ответа"}`);
        const scene = page.locator("#capture-scene");
        await scene.waitFor({ state: "visible", timeout: 30_000 });
        await scene.screenshot({ path: file, animations: "disabled" });
        saved = true;
      } catch (error) {
        lastError = error;
        console.warn(`Повтор ${attempt}/3: ${slug}, шаг ${step}`);
      }
    }
    if (!saved) throw lastError;
    finished += 1;
    if (finished % 50 === 0 || finished === tasks.length) console.log(`Готово ${finished}/${tasks.length} экранов`);
  }
  await page.close();
  console.log(`Поток ${number} завершён`);
}

try {
  await Promise.all(Array.from({ length: 3 }, (_, index) => worker(index + 1)));
} finally {
  await browser.close();
}
