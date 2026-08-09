import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { originalGuideScreenPath } from "./projects.mjs";

const origin = process.env.QUEST_ORIGIN || "http://localhost:3000";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const force = process.env.FORCE_CAPTURE === "1";
const selectedSlugs = (process.env.CAPTURE_SLUGS || "family-expenses").split(",").map((value) => value.trim()).filter(Boolean);
const tasks = selectedSlugs.flatMap((slug) => Array.from({ length: 17 }, (_, stepIndex) => Array.from({ length: 3 }, (_, frameIndex) => ({ slug, step: stepIndex + 1, frame: frameIndex + 1 })))).flat();
let cursor = 0;
let finished = 0;

function assertPng(file) {
  const bytes = fs.readFileSync(file);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (bytes.subarray(1, 4).toString("ascii") !== "PNG" || width !== 1200 || height !== 800) throw new Error(`Неверный PNG ${file}: ${width}x${height}`);
}

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });

async function worker(number) {
  const page = await context.newPage();
  while (cursor < tasks.length) {
    const task = tasks[cursor++];
    const file = originalGuideScreenPath(task.slug, task.step, task.frame);
    if (!force && fs.existsSync(file)) { assertPng(file); finished += 1; continue; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const route = `?capture-guide=${task.slug}--real--step-${String(task.step).padStart(2, "0")}--frame-${String(task.frame).padStart(2, "0")}`;
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await page.goto(`${origin}/${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
        if (!response?.ok()) throw new Error(`HTTP ${response?.status() ?? "без ответа"}`);
        const scene = page.locator("#capture-guide-scene");
        await scene.waitFor({ state: "visible", timeout: 30_000 });
        await scene.screenshot({ path: file, animations: "disabled" });
        assertPng(file);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        console.warn(`Повтор ${attempt}/3: ${route}`);
      }
    }
    if (lastError) throw lastError;
    finished += 1;
    if (finished % 17 === 0 || finished === tasks.length) console.log(`Готово ${finished}/${tasks.length} кадров первых оригинальных квестов`);
  }
  await page.close();
  console.log(`Поток ${number} завершён`);
}

try {
  await Promise.all(Array.from({ length: 3 }, (_, index) => worker(index + 1)));
} finally {
  await browser.close();
}
