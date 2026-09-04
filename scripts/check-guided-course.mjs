import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const base = process.env.COURSE_QA_URL || "http://localhost:55230/";
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
await mkdir("/tmp/neiroprofi-qa", { recursive: true });
try {
  await page.goto(`${base}?format=desktop&section=weeks`);
  await page.getByRole("heading", { name: "Один результат за раз" }).waitFor();
  assert.equal(await page.locator(".course-milestone").count(), 6);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const card of await page.locator(".course-milestone").all()) {
      const trigger = card.locator(".course-choice-trigger");
      await trigger.click();
      const buttonBox = await trigger.boundingBox();
      const optionsBox = await card.locator(".course-choice-options").boundingBox();
      assert.ok(optionsBox.y >= buttonBox.y + buttonBox.height, "Choices must open below the trigger");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await trigger.click();
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator(".course-choice-trigger").first().click();
  await page.getByRole("radio", { name: "Вести семейный бюджет", exact: true }).click();
  await page.reload();
  assert.match(await page.locator(".course-choice-trigger").first().innerText(), /Вести семейный бюджет/);
  await page.screenshot({ path: "/tmp/neiroprofi-qa/route-desktop.png" });
  await page.locator(".course-milestone").first().getByRole("link").click();
  await page.getByRole("heading", { name: "Что вы получите и зачем" }).waitFor();
  await page.getByRole("button", { name: /работать на вымышленных данных/i }).click();
  await page.locator(".quest-step-card").waitFor();
  await page.getByRole("button", { name: /перейти дальше|я сделала|продолжить дальше/i }).last().click();
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => Object.keys(localStorage).some((key) => key.includes("family-budget:service"))));
  await page.goto(`${base}?format=desktop&section=portfolio`);
  await page.locator(".portfolio-result-card").first().waitFor();
  await page.getByLabel("Ваше название").first().fill("Бюджет нашей семьи");
  await page.getByLabel("Ссылка на результат").first().fill("https://example.com/family");
  await page.getByLabel("Для кого и что делает").first().fill("Для нашей семьи: расходы и остаток на месяц.");
  await page.getByRole("button", { name: "Сохранить карточку" }).first().click();
  await page.reload();
  await page.getByRole("link", { name: "Открыть мою работу" }).first().waitFor();
  assert.equal(await page.getByRole("link", { name: "Открыть мою работу" }).first().getAttribute("href"), "https://example.com/family");
  await page.screenshot({ path: "/tmp/neiroprofi-qa/portfolio-desktop.png" });
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobile = await phone.newPage();
  mobile.on("pageerror", (error) => errors.push(error.message));
  await mobile.goto(`${base}?format=mobile`);
  await mobile.getByRole("heading", { name: "Личный помощник в Telegram" }).waitFor();
  assert.equal(await mobile.getByText("Устанавливаем Codex", { exact: true }).count(), 0);
  await mobile.getByLabel("Ссылка от школы").fill("https://t.me/student_fairy_bot");
  await mobile.getByRole("button", { name: "Сохранить ссылку" }).click();
  await mobile.goto(`${base}?format=mobile&quest=planning&output=service`);
  await mobile.getByRole("button", { name: /работать на вымышленных данных/i }).click();
  await mobile.getByRole("link", { name: "Открыть моего помощника" }).waitFor();
  assert.equal(await mobile.getByRole("link", { name: "Открыть моего помощника" }).getAttribute("href"), "https://t.me/student_fairy_bot");
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await mobile.screenshot({ path: "/tmp/neiroprofi-qa/lesson-mobile.png" });
  await phone.close();
  assert.deepEqual(errors, []);
  console.log("PASS: six-week route, selection persistence, lesson start, saved real portfolio link, mobile bot configuration, no horizontal overflow or runtime errors.");
} finally { await browser.close(); }
