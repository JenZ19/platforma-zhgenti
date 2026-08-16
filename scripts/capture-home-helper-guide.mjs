import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  homeHelperGuideFrameCounts,
  homeHelperGuideScreenPath,
} from "./projects.mjs";
import { writeWebpScreenshot } from "./webp-screenshot.mjs";

const origin = process.env.QUEST_ORIGIN || "http://localhost:3000";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const guideTasks = ["real", "demo"].flatMap((mode) => homeHelperGuideFrameCounts.flatMap((count, stepIndex) => Array.from({ length: count }, (_, frameIndex) => ({
  type: "guide",
  mode,
  step: stepIndex + 1,
  frame: frameIndex + 1,
  file: homeHelperGuideScreenPath(mode, stepIndex + 1, frameIndex + 1),
}))));
const force = process.env.FORCE_CAPTURE === "1";
const tasks = guideTasks;
let cursor = 0;
let finished = 0;

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });

async function worker(number) {
  const page = await context.newPage();
  while (cursor < tasks.length) {
    const task = tasks[cursor++];
    if (!force && fs.existsSync(task.file)) { finished += 1; continue; }
    fs.mkdirSync(path.dirname(task.file), { recursive: true });
    const route = `?capture-guide=home-helper--${task.mode}--step-${String(task.step).padStart(2, "0")}--frame-${String(task.frame).padStart(2, "0")}`;
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await page.goto(`${origin}/${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
        if (!response?.ok()) throw new Error(`HTTP ${response?.status() ?? "без ответа"}`);
        const scene = page.locator("#capture-guide-scene");
        await scene.waitFor({ state: "visible", timeout: 30_000 });
        await writeWebpScreenshot(scene, task.file);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        console.warn(`Повтор ${attempt}/3: ${route}`);
      }
    }
    if (lastError) throw lastError;
    finished += 1;
    if (finished % 25 === 0 || finished === tasks.length) console.log(`Готово ${finished}/${tasks.length} подробных кадров`);
  }
  await page.close();
  console.log(`Поток ${number} завершён`);
}

try {
  await Promise.all(Array.from({ length: 3 }, (_, index) => worker(index + 1)));
} finally {
  await browser.close();
}
