import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { root } from "./projects.mjs";

const origin = process.env.QUEST_ORIGIN || "http://localhost:3000";
const artifacts = path.join(root, "artifacts");
fs.mkdirSync(artifacts, { recursive: true });

const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 });
  await desktop.goto(origin, { waitUntil: "domcontentloaded" });
  await desktop.evaluate(() => document.fonts?.ready);
  await desktop.screenshot({ path: path.join(artifacts, "academy-desktop.png"), fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobile.goto(origin, { waitUntil: "domcontentloaded" });
  await mobile.evaluate(() => document.fonts?.ready);
  await mobile.screenshot({ path: path.join(artifacts, "academy-mobile.png"), fullPage: true });
  await mobile.goto(`${origin}/?format=mobile&quest=planning&output=agent`, { waitUntil: "domcontentloaded" });
  await mobile.evaluate(() => document.fonts?.ready);
  await mobile.screenshot({ path: path.join(artifacts, "quest-mobile.png"), fullPage: true });
  console.log(`Сохранено 3 контрольных снимка в ${artifacts}`);
} finally {
  await browser.close();
}
