import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { chromium } from "@playwright/test";

const root = path.resolve(import.meta.dirname, "..");
const cssPath = path.join(root, "app/pink-learning-dashboard.css");
const pinkCss = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";

const markup = `
  <main class="learning-main" data-visual-theme="pink-cloud">
    <section class="next-quest-banner">
      <div>
        <p>Ваш следующий шаг</p>
        <h1>Дневник давления для семьи с очень длинным названием проекта</h1>
        <span>Понятный результат без технической перегрузки.</span>
        <a href="#quest">Продолжить →</a>
      </div>
      <figure class="project-preview"><div aria-hidden="true"></div></figure>
    </section>
  </main>`;

test("wide Pink Cloud hero keeps copy and preview in separate columns", async () => {
  assert.ok(pinkCss.includes(".next-quest-banner"), "Pink Cloud hero styles are missing");
  const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  try {
    for (const width of [1024, 1280, 1440, 2048]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.setContent(`<style>${pinkCss}</style>${markup}`);
      const boxes = await page.evaluate(() => {
        const copy = document.querySelector(".next-quest-banner > div").getBoundingClientRect();
        const preview = document.querySelector(".next-quest-banner > .project-preview").getBoundingClientRect();
        return {
          copyLeft: copy.left,
          copyRight: copy.right,
          previewLeft: preview.left,
          previewRight: preview.right,
          viewport: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      assert.ok(boxes.copyLeft < boxes.copyRight, `${width}px: hero copy has no width`);
      assert.ok(boxes.copyRight <= boxes.previewLeft, `${width}px: hero copy overlaps the project preview`);
      assert.ok(boxes.previewRight <= boxes.viewport, `${width}px: project preview leaves the viewport`);
      assert.ok(boxes.scrollWidth <= boxes.viewport + 1, `${width}px: hero creates horizontal overflow`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
