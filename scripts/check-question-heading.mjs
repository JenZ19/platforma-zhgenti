import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${process.env.COURSE_QA_URL || "http://localhost:55231/"}?section=fairy`);
    const header = page.locator(".fairy-assistant-full .fairy-heading");
    await header.waitFor();
    const geometry = await header.evaluate((el) => {
      const icon = el.querySelector(".iskra-mascot, svg").getBoundingClientRect();
      const text = el.querySelector("div").getBoundingClientRect();
      return { layout: getComputedStyle(el).display, gap: text.left - icon.right, top: Math.abs(text.top - icon.top) };
    });
    assert.equal(geometry.layout, "grid", `Heading must keep its own grid at ${width}px`);
    assert.ok(geometry.gap >= 8 && geometry.gap <= 20, `Unexpected gap at ${width}px: ${geometry.gap}`);
    assert.ok(geometry.top <= 1, `Icon and text must align at the top at ${width}px`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    const mascot = header.locator(".iskra-mascot");
    assert.ok(await mascot.evaluate((img) => img.complete && img.naturalWidth > 0), "Mascot must load at the deployed subpath");
    await page.getByText("ИИ-ответы ещё не подключены.", { exact: false }).waitFor();
    await page.screenshot({ path: `/tmp/question-heading-${width}.png` });
    await page.goto(`${process.env.COURSE_QA_URL || "http://localhost:55231/"}?format=${width < 600 ? "mobile" : "desktop"}&quest=pressure-diary`);
    const opener = width < 600 ? page.getByRole("button", { name: "Мои вопросы, нижняя навигация" }) : page.getByRole("button", { name: "Открыть мои вопросы", exact: true });
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "Мои вопросы" });
    await dialog.waitFor();
    assert.ok(await dialog.locator(".iskra-mascot").isVisible());
    await dialog.getByRole("textbox", { name: "Ваш вопрос" }).fill("Где найти пример этого шага?");
    await dialog.getByRole("button", { name: "Сохранить вопрос" }).click();
    await dialog.getByRole("status").filter({ hasText: "Вопрос сохранён" }).waitFor();
    await page.screenshot({ path: `/tmp/iskra-dialog-${width}.png` });
    await dialog.getByRole("button", { name: "Закрыть мои вопросы" }).click();
    assert.ok(await opener.evaluate((el) => el === document.activeElement), "Closing returns focus to the opener");
  }
  console.log("PASS: question heading has a compact aligned gap on desktop and phone.");
} finally { await browser.close(); }
