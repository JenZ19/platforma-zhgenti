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
  : 32000 + (process.pid % 20000);
// vinext binds its dev listener to localhost/IPv6 on macOS even when passed an
// IPv4 host, so the probe and browser must use the same advertised host.
let origin = externalOrigin || `http://localhost:${port}`;
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
let server;
let ownedServerPid;
let serverOutput = "";

function childHasExited(child) {
  return !child || child.exitCode !== null || child.signalCode !== null;
}

function childExitError(output = serverOutput) {
  return new Error(`Dashboard test server exited early.\n${output}`);
}

function waitForExit(child) {
  if (childHasExited(child)) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const onExit = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    child.once("exit", onExit);
    if (childHasExited(child)) {
      child.removeListener?.("exit", onExit);
      onExit();
    }
  });
}

function waitWhileRunning(child, milliseconds) {
  if (childHasExited(child)) return Promise.reject(childExitError());
  return new Promise((resolve, reject) => {
    let timer;
    let settled = false;
    const onExit = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(childExitError());
    };
    child.once("exit", onExit);
    if (childHasExited(child)) {
      child.removeListener?.("exit", onExit);
      onExit();
      return;
    }
    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.removeListener?.("exit", onExit);
      if (childHasExited(child)) reject(childExitError());
      else resolve();
    }, milliseconds);
  });
}

async function waitForServer({
  child = server,
  advertised = () => serverOutput.includes(`http://localhost:${port}`),
  fetcher = fetch,
  pause = waitWhileRunning,
} = {}) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (childHasExited(child)) throw childExitError();
    if (!advertised()) {
      await pause(child, 250);
      continue;
    }
    try {
      const response = await fetcher(origin);
      if (childHasExited(child)) throw childExitError();
      if (response.ok) return;
    } catch (error) {
      if (childHasExited(child)) throw childExitError();
      if (error instanceof Error && error.message.startsWith("Dashboard test server exited early.")) throw error;
      // The listener is expected to refuse connections until vinext is ready.
    }
    await pause(child, 250);
  }
  throw new Error(`Dashboard test server did not start at ${origin}.\n${serverOutput}`);
}

async function stopServer() {
  if (!ownedServerPid) return;
  const running = Boolean(server && !childHasExited(server));
  if (!running) return;
  const exited = waitForExit(server);
  try {
    if (process.platform === "win32") server?.kill("SIGTERM");
    else process.kill(-ownedServerPid, "SIGTERM");
  } catch {
    if (running) server?.kill("SIGTERM");
  }
  const stopped = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 2500)),
  ]);
  if (stopped || childHasExited(server)) return;
  try {
    if (process.platform === "win32") server?.kill("SIGKILL");
    else process.kill(-ownedServerPid, "SIGKILL");
  } catch {
    server?.kill("SIGKILL");
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
  ownedServerPid = server.pid;
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

test("layout server readiness stays tied to the owned process", () => {
  const source = fs.readFileSync(new URL(import.meta.url), "utf8");
  assert.doesNotMatch(source, /serverOutput\.match\(\/Local:/, "must not adopt a listener advertised by an exited process");
  assert.match(source, /serverOutput\.includes\(`http:\/\/localhost:\$\{port\}`\)/, "owned child must advertise the configured port before readiness succeeds");
  assert.match(source, /ownedServerPid/, "cleanup must retain the owned process-group id");
});

test("child lifecycle treats normal and signal exits as final without late listeners", async () => {
  for (const child of [
    { exitCode: 0, signalCode: null, once: () => { throw new Error("late normal-exit listener"); } },
    { exitCode: null, signalCode: "SIGTERM", once: () => { throw new Error("late signal-exit listener"); } },
  ]) {
    assert.equal(childHasExited(child), true);
    await waitForExit(child);
    await assert.rejects(
      waitForServer({ child, advertised: () => true, fetcher: async () => ({ ok: true }), pause: async () => undefined }),
      /exited early/,
    );
  }

  const racedExit = {
    exitCode: null,
    signalCode: null,
    removed: false,
    once() { this.exitCode = 0; },
    removeListener() { this.removed = true; },
  };
  assert.equal(await Promise.race([
    waitForExit(racedExit).then(() => "exited"),
    new Promise((resolve) => setTimeout(() => resolve("late-listener"), 40)),
  ]), "exited");
  assert.equal(racedExit.removed, true);

  const racedSignal = {
    exitCode: null,
    signalCode: null,
    removed: false,
    once() { this.signalCode = "SIGTERM"; },
    removeListener() { this.removed = true; },
  };
  await assert.rejects(
    Promise.race([
      waitWhileRunning(racedSignal, 1000),
      new Promise((_, reject) => setTimeout(() => reject(new Error("late-listener")), 40)),
    ]),
    /exited early/,
  );
  assert.equal(racedSignal.removed, true);
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
    const modeButton = mobile.getByRole("button", { name: /работать на вымышленных данных/i });
    const modeContent = modeButton.locator(":scope > .mode-option-content");
    const modeBox = await modeContent.boundingBox();
    assert.ok(modeBox && modeBox.width > 120 && modeBox.height > 48, "preparation copy collapsed into the old 48px icon circle");
    const modeGeometry = await modeContent.evaluate((node) => {
      const style = getComputedStyle(node);
      return { borderRadius: style.borderRadius, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.equal(modeGeometry.borderRadius, "0px");
    assert.ok(modeGeometry.overflow <= 1);
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
    const telegramColors = await mobile.locator(".mobile-action-telegram > button, .mobile-action-telegram > a").first().evaluate((node) => {
      const style = getComputedStyle(node);
      return [style.color, style.backgroundColor];
    });
    assert.ok(contrast(...telegramColors) >= 4.5, `Telegram action contrast is ${contrast(...telegramColors).toFixed(2)}:1`);

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

    const noScript = await browser.newContext({ viewport: { width: 375, height: 900 }, javaScriptEnabled: false });
    const serverDesktop = await noScript.newPage();
    await serverDesktop.goto(`${origin}/?format=desktop&quest=pressure-diary`, { waitUntil: "domcontentloaded" });
    assert.equal(await serverDesktop.locator('[data-client-ready="false"] .mobile-format-switch').evaluate((node) => getComputedStyle(node).display), "none");
    await noScript.close();

    const explicitDesktop = await browser.newPage({ viewport: { width: 375, height: 900 } });
    await explicitDesktop.goto(`${origin}/?format=desktop&quest=pressure-diary`, { waitUntil: "domcontentloaded" });
    await explicitDesktop.locator('[data-client-ready="true"] .quest-shell').waitFor();
    const mobileSwitch = explicitDesktop.locator(".mobile-format-switch");
    await mobileSwitch.waitFor();
    assert.ok(await mobileSwitch.isVisible());
    await mobileSwitch.click();
    await explicitDesktop.waitForTimeout(100);
    assert.equal(new URL(explicitDesktop.url()).searchParams.get("format"), "mobile", `mobile escape did not change route from ${explicitDesktop.url()}`);
    await explicitDesktop.locator(".learning-shell-mobile").waitFor();
    assert.equal(new URL(explicitDesktop.url()).searchParams.get("format"), "mobile");
    await explicitDesktop.close();

    const orientation = await browser.newPage({ viewport: { width: 1024, height: 900 } });
    await orientation.goto(`${origin}/?quest=pressure-diary`, { waitUntil: "domcontentloaded" });
    await orientation.locator('[data-client-ready="true"].learning-shell-desktop .quest-shell').waitFor();
    await orientation.setViewportSize({ width: 375, height: 900 });
    await orientation.locator(".learning-shell-mobile").waitFor();
    assert.equal(new URL(orientation.url()).searchParams.get("format"), "mobile");
    await orientation.setViewportSize({ width: 1024, height: 900 });
    await orientation.locator(".learning-shell-desktop").waitFor();
    assert.equal(new URL(orientation.url()).searchParams.has("format"), false);
    await orientation.close();

    const dashboardOrientation = await browser.newPage({ viewport: { width: 375, height: 900 } });
    await dashboardOrientation.goto(origin, { waitUntil: "domcontentloaded" });
    await dashboardOrientation.locator('[data-client-ready="true"].learning-shell-mobile').waitFor();
    const planningCard = dashboardOrientation.getByRole("article", { name: /планирование/i });
    await planningCard.getByRole("link", { name: /начать: планирование/i }).click();
    await dashboardOrientation.locator(".learning-shell-mobile .format-choice-shell").waitFor();
    assert.equal(new URL(dashboardOrientation.url()).searchParams.get("format"), "mobile");
    await dashboardOrientation.setViewportSize({ width: 1024, height: 900 });
    await dashboardOrientation.locator(".learning-shell-desktop .format-choice-shell").waitFor();
    assert.equal(new URL(dashboardOrientation.url()).searchParams.has("format"), false);
    await dashboardOrientation.close();

    const explicitOrientation = await browser.newPage({ viewport: { width: 375, height: 900 } });
    await explicitOrientation.goto(`${origin}/?format=mobile`, { waitUntil: "domcontentloaded" });
    const explicitPlanning = explicitOrientation.getByRole("article", { name: /планирование/i });
    await explicitPlanning.getByRole("link", { name: /начать: планирование/i }).click();
    await explicitOrientation.locator(".learning-shell-mobile .format-choice-shell").waitFor();
    await explicitOrientation.setViewportSize({ width: 1024, height: 900 });
    await explicitOrientation.waitForTimeout(100);
    assert.ok(await explicitOrientation.locator(".learning-shell-mobile .format-choice-shell").isVisible());
    assert.equal(new URL(explicitOrientation.url()).searchParams.get("format"), "mobile");
    await explicitOrientation.close();

    const curator = await browser.newPage({ viewport: { width: 375, height: 900 } });
    await curator.goto(`${origin}/?format=mobile&quest=server-152fz`, { waitUntil: "domcontentloaded" });
    const curatorAction = curator.locator(".mobile-action-curator > button, .mobile-action-curator > a").first();
    await curatorAction.waitFor();
    const curatorColors = await curatorAction.evaluate((node) => {
      const style = getComputedStyle(node);
      return [style.color, style.backgroundColor];
    });
    assert.ok(contrast(...curatorColors) >= 4.5, `Curator action contrast is ${contrast(...curatorColors).toFixed(2)}:1`);
    await curator.close();

    const desktop = await browser.newPage({ viewport: { width: 1024, height: 900 } });
    await desktop.goto(`${origin}/?format=desktop&quest=family-budget&output=service`, { waitUntil: "domcontentloaded" });
    await desktop.evaluate(() => {
      localStorage.setItem("feya-academy-output-v1:family-budget", JSON.stringify("service"));
      localStorage.setItem("feya-academy-preparation-v1:family-budget:service", JSON.stringify({ version: 1, mode: "demo", checked: [], ready: true }));
      localStorage.setItem("feya-academy-progress-v1:family-budget:service", JSON.stringify({ version: 1, activeStep: 2, completed: [1], score: 10 }));
    });
    await desktop.reload({ waitUntil: "domcontentloaded" });
    const customizer = desktop.locator(".quest-customizer");
    await customizer.waitFor();
    const customizerStyle = await customizer.evaluate((node) => {
      const style = getComputedStyle(node);
      const label = getComputedStyle(node.querySelector(":scope > header p"));
      const hint = getComputedStyle(node.querySelector(".customizer-axes legend small"));
      return { background: style.backgroundColor, image: style.backgroundImage, family: style.fontFamily, label: label.color, hint: hint.color };
    });
    assert.equal(customizerStyle.image, "none");
    assert.ok(!/255, 250, 246|247, 239, 233/.test(customizerStyle.background), "customizer kept the beige legacy surface");
    assert.match(customizerStyle.family, /system-ui|Segoe UI/i);
    assert.ok(contrast(customizerStyle.label, customizerStyle.background) >= 4.5);
    assert.ok(contrast(customizerStyle.hint, customizerStyle.background) >= 4.5);
    await desktop.evaluate(() => {
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

test("bundle and install choices use Pink Cloud surfaces and AA adult type", { timeout: 60_000 }, async () => {
  const browser = await chromium.launch({
    ...(fs.existsSync(chromePath) ? { executablePath: chromePath } : {}),
    headless: true,
  });
  try {
    for (const { route, width, bodySize } of [
      { route: "/?format=mobile&quest=planning", width: 375, bodySize: "17px" },
      { route: "/?format=mobile&quest=install-codex", width: 375, bodySize: "17px" },
      { route: "/?format=desktop&quest=planning", width: 1024, bodySize: "18px" },
      { route: "/?format=desktop&quest=install-codex", width: 1024, bodySize: "18px" },
    ]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded" });
      const choice = page.locator(".format-choice-shell");
      await choice.waitFor();
      assert.equal(await choice.getAttribute("data-visual-theme"), "pink-cloud");
      const styles = await choice.evaluate((node) => {
        const shell = getComputedStyle(node);
        const card = getComputedStyle(node.querySelector(".format-choice-card"));
        const heading = getComputedStyle(node.querySelector(".format-choice-heading h2"));
        const body = getComputedStyle(node.querySelector(".format-choice-heading p"));
        const option = getComputedStyle(node.querySelector(".format-option"));
        const optionCopy = getComputedStyle(node.querySelector(".format-option-copy"));
        return {
          shellBackground: shell.backgroundColor,
          shellImage: shell.backgroundImage,
          shellFamily: shell.fontFamily,
          cardBackground: card.backgroundColor,
          cardBorder: card.borderColor,
          headingColor: heading.color,
          headingFamily: heading.fontFamily,
          bodyColor: body.color,
          bodySize: body.fontSize,
          optionBackground: option.backgroundColor,
          optionImage: option.backgroundImage,
          optionBorder: option.borderColor,
          optionColor: option.color,
          optionCopyColor: optionCopy.color,
          optionCopySize: optionCopy.fontSize,
        };
      });
      assert.equal(styles.shellImage, "none", `${route} kept a legacy shell image`);
      assert.ok(!/247, 241, 235|247, 239, 233/.test(styles.shellBackground), `${route} kept a beige shell`);
      assert.match(styles.shellFamily, /system-ui|Segoe UI/i);
      assert.equal(styles.cardBackground, "rgb(255, 255, 255)");
      assert.match(styles.cardBorder, /rgba?\(91, 55, 80/);
      assert.equal(styles.optionImage, "none", `${route} kept a multicolor legacy card`);
      assert.equal(styles.optionBackground, "rgb(255, 242, 247)");
      assert.match(styles.optionBorder, /rgba?\(91, 55, 80/);
      assert.match(styles.headingFamily, /system-ui|Segoe UI/i);
      assert.equal(styles.bodySize, bodySize);
      assert.equal(styles.optionCopySize, bodySize);
      assert.ok(contrast(styles.headingColor, styles.cardBackground) >= 4.5, `${route} heading contrast failed`);
      assert.ok(contrast(styles.bodyColor, styles.cardBackground) >= 4.5, `${route} body contrast failed`);
      assert.ok(contrast(styles.optionColor, styles.optionBackground) >= 4.5, `${route} option contrast failed`);
      assert.ok(contrast(styles.optionCopyColor, styles.optionBackground) >= 4.5, `${route} option copy contrast failed`);
      const option = page.locator(".format-option").first();
      await option.focus();
      assert.equal(await option.evaluate((node) => getComputedStyle(node).outlineWidth), "3px");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, `${route} at ${width}px has ${overflow}px horizontal overflow`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
