import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import { chromium } from "@playwright/test";

const root = path.resolve(import.meta.dirname, "..");
const externalOrigin = process.env.DASHBOARD_LAYOUT_ORIGIN?.replace(/\/$/, "");
const requestedPort = Number(process.env.DASHBOARD_LAYOUT_PORT);
const port = Number.isInteger(requestedPort) && requestedPort > 0
  ? requestedPort
  : 4300 + (process.pid % 1000);
// vinext binds its dev listener to localhost/IPv6 on macOS even when passed an
// IPv4 host, so the probe and browser must use the same advertised host.
let origin = externalOrigin || `http://localhost:${port}`;
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
let server;
let serverOutput = "";

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server?.exitCode !== null) {
      const existing = serverOutput.match(/Local:\s+(https?:\/\/[^\s]+)/)?.[1];
      if (existing) {
        try {
          const response = await fetch(existing);
          if (response.ok) {
            origin = existing;
            server = undefined;
            return;
          }
        } catch {
          // Fall through to the original startup error with the captured log.
        }
      }
      throw new Error(`Dashboard test server exited early.\n${serverOutput}`);
    }
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // The listener is expected to refuse connections until vinext is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Dashboard test server did not start at ${origin}.\n${serverOutput}`);
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  const exited = new Promise((resolve) => server.once("exit", resolve));
  try {
    if (process.platform === "win32") server.kill("SIGTERM");
    else process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
  const stopped = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 2500)),
  ]);
  if (stopped || server.exitCode !== null) return;
  try {
    if (process.platform === "win32") server.kill("SIGKILL");
    else process.kill(-server.pid, "SIGKILL");
  } catch {
    server.kill("SIGKILL");
  }
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 1000))]);
}

before(async () => {
  if (externalOrigin) return;
  server = spawn("npm", ["run", "dev", "--", "--port", String(port)], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });
  server.stdout?.on("data", (chunk) => { serverOutput = `${serverOutput}${chunk}`.slice(-12000); });
  server.stderr?.on("data", (chunk) => { serverOutput = `${serverOutput}${chunk}`.slice(-12000); });
  await waitForServer();
});

after(stopServer);

test("Pink Cloud CSS declares exact approved tokens and responsive safeguards", () => {
  const cssPath = path.join(root, "app/pink-learning-dashboard.css");
  assert.ok(fs.existsSync(cssPath), "app/pink-learning-dashboard.css is missing");
  const css = fs.readFileSync(cssPath, "utf8");
  for (const declaration of [
    "--cloud-bg: #f8f4fb",
    "--cloud-bg-rose: #fff2f7",
    "--cloud-surface: rgba(255, 255, 255, 0.86)",
    "--cloud-surface-solid: #ffffff",
    "--cloud-text: #2d2430",
    "--cloud-muted: #756777",
    "--cloud-pink: #ec4f93",
    "--cloud-pink-dark: #c92e74",
    "--cloud-pink-soft: #ffd7e8",
    "--cloud-success: #337a5b",
    "--cloud-error: #b9364e",
  ]) assert.ok(css.includes(declaration), `Missing approved token: ${declaration}`);
  assert.match(css, /@media\s*\(max-width:\s*767px\)/);
  assert.match(css, /@media\s*\(min-width:\s*768px\)\s*and\s*\(max-width:\s*1023px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test("dashboard and quests do not overlap or overflow", { timeout: 120_000 }, async () => {
  const browser = await chromium.launch({
    ...(fs.existsSync(chromePath) ? { executablePath: chromePath } : {}),
    headless: true,
  });
  const routes = [
    "/",
    "/?section=projects",
    "/?section=weeks",
    "/?section=portfolio",
    "/?section=fairy",
    "/?quest=pressure-diary",
    "/?format=mobile&quest=pressure-diary",
  ];
  try {
    for (const width of [375, 768, 1024, 1440]) {
      for (const route of routes) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded" });
        await page.locator("[data-learning-shell]").waitFor();
        if (width <= 767) await page.locator(".learning-shell-mobile").waitFor();
        if (route.includes("section=fairy")) await page.locator('main[data-dashboard-section="fairy"]').waitFor();
        const preparation = page.locator(".preparation-card:visible");
        if (await preparation.count()) {
          const mobileSurface = await page.locator("[data-learning-shell]").evaluate((node) => node.classList.contains("learning-shell-mobile"));
          const expectedSize = mobileSurface ? "17px" : "18px";
          assert.equal(await preparation.first().evaluate((node) => getComputedStyle(node).fontSize), expectedSize, `${route} at ${width}px has unreadable preparation type`);
        }
        const demo = page.getByRole("button", { name: /работать на вымышленных данных/i });
        if (await demo.count()) {
          await demo.first().click();
          await page.locator("[data-quest-workspace]").waitFor();
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert.ok(overflow <= 1, `${route} at ${width}px has ${overflow}px horizontal overflow`);
        if (width <= 767) {
          const undersized = await page.locator("button:visible, a:visible, input:visible:not([type=radio]):not([type=checkbox]), select:visible, textarea:visible, [role=switch]:visible").evaluateAll((nodes) => nodes.filter((node) => {
            const box = node.getBoundingClientRect();
            return box.width < 44 || box.height < 44;
          }).map((node) => node.getAttribute("aria-label") || node.textContent?.trim()));
          assert.deepEqual(undersized, [], `${route} at ${width}px has undersized controls`);
        }
        const sidebar = page.locator(".learning-sidebar");
        const main = page.locator(".learning-main");
        const bottom = page.locator(".learning-bottom-nav");
        const fairy = page.locator(".fairy-floating-trigger");
        if (width >= 768) {
          const sideBox = await sidebar.boundingBox();
          const mainBox = await main.boundingBox();
          assert.ok(sideBox && mainBox && sideBox.x + sideBox.width <= mainBox.x + 1, `${route} at ${width}px overlaps sidebar and content`);
          assert.equal(await bottom.evaluate((node) => getComputedStyle(node).display), "none");
        }
        if (width >= 768) {
          const sideBox = await sidebar.boundingBox();
          if (await fairy.count()) {
            const fairyBox = await fairy.boundingBox();
            assert.ok(sideBox && fairyBox && fairyBox.x >= sideBox.x && fairyBox.x + fairyBox.width <= sideBox.x + sideBox.width, `${route} at ${width}px lets Fairy cover learning content`);
          } else {
            assert.ok(await page.locator('main[data-dashboard-section="fairy"]').count(), `${route} at ${width}px lost both Fairy surfaces`);
          }
        }
        if (width <= 767) {
          assert.notEqual(await bottom.evaluate((node) => getComputedStyle(node).display), "none");
          if (await fairy.count()) assert.equal(await fairy.evaluate((node) => getComputedStyle(node).display), "none", `${route} duplicates Fairy over the mobile workspace`);
          else assert.ok(await page.locator('main[data-dashboard-section="fairy"]').count(), `${route} at ${width}px lost both Fairy surfaces`);
          const bottomBox = await bottom.boundingBox();
          const action = page.locator(".mobile-quest-step-actions:visible, .quest-step-actions:visible");
          const actionBox = await action.count() ? await action.boundingBox() : null;
          if (bottomBox && actionBox) assert.ok(actionBox.y + actionBox.height <= bottomBox.y + 1, `${route} at ${width}px overlaps quest actions and bottom navigation`);
        }
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
});

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb) {
  const match = rgb.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  assert.ok(match?.length === 3, `Cannot parse color ${rgb}`);
  return channel(match[0]) * 0.2126 + channel(match[1]) * 0.7152 + channel(match[2]) * 0.0722;
}

function contrast(left, right) {
  const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("phone default, dialogs, focus and effective contrast stay usable", { timeout: 90_000 }, async () => {
  const browser = await chromium.launch({
    ...(fs.existsSync(chromePath) ? { executablePath: chromePath } : {}),
    headless: true,
  });
  try {
    const home = await browser.newPage({ viewport: { width: 375, height: 900 } });
    await home.goto(origin, { waitUntil: "domcontentloaded" });
    const bannerColors = await home.locator(".next-quest-banner").evaluate((node) => {
      const style = getComputedStyle(node);
      return [style.color, style.backgroundColor];
    });
    assert.ok(contrast(...bannerColors) >= 4.5, `Home banner contrast is ${contrast(...bannerColors).toFixed(2)}:1`);
    await home.close();

    const mobile = await browser.newPage({ viewport: { width: 375, height: 900 } });
    await mobile.goto(`${origin}/?quest=pressure-diary`, { waitUntil: "domcontentloaded" });
    await mobile.locator(".learning-shell-mobile .mobile-quest-shell").waitFor();
    assert.equal(new URL(mobile.url()).searchParams.get("format"), "mobile");
    await mobile.getByRole("button", { name: /работать на реальных данных/i }).click();
    const firstChecklist = mobile.locator(".preparation-list input[type=checkbox]").first();
    await firstChecklist.focus();
    assert.equal(await firstChecklist.locator("xpath=ancestor::label").evaluate((node) => getComputedStyle(node).outlineWidth), "3px");
    await mobile.getByRole("button", { name: /изменить выбор/i }).click();
    await mobile.getByRole("button", { name: /работать на вымышленных данных/i }).click();
    await mobile.locator('[data-quest-workspace="mobile"]').waitFor();
    assert.ok(await mobile.getByRole("button", { name: /открыть карту уровней/i }).isVisible());
    assert.ok(await mobile.getByRole("button", { name: /я сделала — продолжить/i }).isVisible());
    const actionColors = await mobile.locator(".mobile-quest-step-actions button:last-child").evaluate((node) => {
      const style = getComputedStyle(node);
      return [style.color, style.backgroundColor];
    });
    assert.ok(contrast(...actionColors) >= 4.5, `Mobile CTA contrast is ${contrast(...actionColors).toFixed(2)}:1`);

    await mobile.getByRole("button", { name: /феечка, нижняя навигация/i }).click();
    const fairy = mobile.locator('dialog[data-fairy-scope="pressure-diary"]');
    await fairy.waitFor();
    assert.equal(await mobile.locator(".fairy-assistant").count(), 1);
    await fairy.getByRole("button", { name: /закрыть феечку/i }).click();

    const imageOpener = mobile.getByRole("button", { name: /увеличить мобильный пример/i });
    await imageOpener.click();
    const imageDialog = mobile.getByRole("dialog", { name: /увеличенный мобильный пример/i });
    assert.equal(await imageDialog.evaluate((node) => node.tagName), "DIALOG");
    await imageDialog.getByRole("button", { name: /закрыть увеличенный/i }).click();
    assert.ok(await imageOpener.evaluate((node) => document.activeElement === node));

    let resetMessage = "";
    const resetDialog = new Promise((resolve) => mobile.once("dialog", async (dialog) => {
      resetMessage = dialog.message();
      await dialog.dismiss();
      resolve();
    }));
    await mobile.getByRole("button", { name: /сбросить проект/i }).click();
    await resetDialog;
    assert.match(resetMessage, /сбросить проект/i);
    await mobile.close();

    const desktop = await browser.newPage({ viewport: { width: 1024, height: 900 } });
    await desktop.goto(`${origin}/?format=desktop&quest=family-budget&output=service`, { waitUntil: "domcontentloaded" });
    await desktop.evaluate(() => {
      localStorage.setItem("feya-academy-output-v1:family-budget", JSON.stringify("service"));
      localStorage.setItem("feya-academy-preparation-v1:family-budget:service", JSON.stringify({ version: 1, mode: "demo", checked: [], ready: true }));
      localStorage.setItem("feya-academy-progress-v1:family-budget:service", JSON.stringify({ version: 1, activeStep: 4, completed: [1, 2, 3], score: 30 }));
    });
    await desktop.reload({ waitUntil: "domcontentloaded" });
    const rewardOpener = desktop.locator(".quest-step-actions button:last-child");
    await rewardOpener.click();
    const reward = desktop.getByRole("dialog", { name: "Новая награда" });
    await reward.waitFor();
    assert.equal(await reward.evaluate((node) => node.tagName), "DIALOG");
    assert.ok(await reward.evaluate((node) => node.hasAttribute("open")));
    assert.ok(await reward.getByRole("button", { name: /забрать награду/i }).evaluate((node) => document.activeElement === node));
    await desktop.keyboard.press("Escape");
    await reward.waitFor({ state: "detached" });
    assert.ok(await rewardOpener.evaluate((node) => document.activeElement === node));
    await desktop.close();
  } finally {
    await browser.close();
  }
});
