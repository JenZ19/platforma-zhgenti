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
    assert.match(await mascot.getAttribute("src"), /iskra-mascot-transparent\.png$/, "Mascot must use the transparent asset");
    assert.equal(await mascot.evaluate((img) => getComputedStyle(img).backgroundColor), "rgba(0, 0, 0, 0)", "Mascot element must not add a background");
    await page.getByText("ИИ-ответы ещё не подключены.", { exact: false }).waitFor();
    await page.screenshot({ path: `/tmp/question-heading-${width}.png` });
    await page.goto(`${process.env.COURSE_QA_URL || "http://localhost:55231/"}?format=${width < 600 ? "mobile" : "desktop"}&quest=pressure-diary`);
    const opener = width < 600 ? page.getByRole("button", { name: "Мои вопросы, нижняя навигация" }) : page.getByRole("button", { name: "Открыть мои вопросы", exact: true });
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "Мои вопросы" });
    await dialog.waitFor();
    assert.ok(await dialog.locator(".iskra-mascot").isVisible());
    const closeGeometry = await dialog.getByRole("button", { name: "Закрыть мои вопросы" }).evaluate((button) => {
      const control = button.getBoundingClientRect();
      const icon = button.querySelector("svg").getBoundingClientRect();
      return {
        x: Math.abs((control.left + control.width / 2) - (icon.left + icon.width / 2)),
        y: Math.abs((control.top + control.height / 2) - (icon.top + icon.height / 2)),
        width: control.width,
        height: control.height,
      };
    });
    assert.ok(closeGeometry.x <= 1 && closeGeometry.y <= 1, `Close icon must be centered at ${width}px`);
    assert.ok(Math.abs(closeGeometry.width - closeGeometry.height) <= 1, `Close button must be square at ${width}px`);
    await dialog.getByRole("textbox", { name: "Ваш вопрос" }).fill("Где найти пример этого шага?");
    await dialog.getByRole("button", { name: "Сохранить вопрос" }).click();
    await dialog.getByRole("status").filter({ hasText: "Вопрос сохранён" }).waitFor();
    await page.screenshot({ path: `/tmp/iskra-dialog-${width}.png` });
    await dialog.getByRole("button", { name: "Закрыть мои вопросы" }).click();
    assert.ok(await opener.evaluate((el) => el === document.activeElement), "Closing returns focus to the opener");
  }
  console.log("PASS: question heading has a compact aligned gap on desktop and phone.");
} finally { await browser.close(); }
