import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { chromium } from "@playwright/test";

const root = path.resolve(import.meta.dirname, "..");
const tactileCss = fs.readFileSync(path.join(root, "app/tactile-album.css"), "utf8");

const markup = `
  <main data-visual-theme="tactile-album">
    <section class="academy-hero">
      <div class="academy-hero-copy">
        <p class="kicker">Весь курс в формате игры</p>
        <h1>Выбери проект.<br><em>Собери свою версию.</em></h1>
        <p class="hero-lead">Никакого пустого листа. В каждом квесте уже есть готовые команды для Codex.</p>
      </div>
      <section class="academy-album"><header><span>Моя будущая коллекция</span><b>Три результата из 42</b></header><div class="album-leaves"><figure></figure><figure></figure><figure></figure></div></section>
      <div class="academy-stats"></div>
    </section>
  </main>`;

test("desktop hero keeps the heading and project album in separate columns", async () => {
  const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  try {
    for (const width of [1024, 1280, 1440, 2048]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.setContent(`<style>*{box-sizing:border-box}body{margin:0}${tactileCss}</style>${markup}`);
      const boxes = await page.evaluate(() => {
        const heading = document.querySelector(".academy-hero h1").getBoundingClientRect();
        const album = document.querySelector(".academy-album").getBoundingClientRect();
        return { headingRight: heading.right, albumLeft: album.left };
      });
      assert.ok(
        boxes.headingRight <= boxes.albumLeft,
        `${width}px: heading ends at ${boxes.headingRight.toFixed(1)}px but album begins at ${boxes.albumLeft.toFixed(1)}px`,
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
