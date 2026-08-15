import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import { chromium } from "@playwright/test";

const root = path.resolve(import.meta.dirname, "..");
const requestedPort = Number(process.env.DASHBOARD_LAYOUT_PORT);
const port = Number.isInteger(requestedPort) && requestedPort > 0
  ? requestedPort
  : 4300 + (process.pid % 1000);
// vinext binds its dev listener to localhost/IPv6 on macOS even when passed an
// IPv4 host, so the probe and browser must use the same advertised host.
const origin = `http://localhost:${port}`;
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
let server;
let serverOutput = "";

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server?.exitCode !== null) throw new Error(`Dashboard test server exited early.\n${serverOutput}`);
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
  const routes = ["/", "/?section=projects", "/?section=weeks", "/?quest=pressure-diary", "/?format=mobile"];
  try {
    for (const width of [375, 768, 1024, 1440]) {
      for (const route of routes) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded" });
        await page.locator("[data-learning-shell]").waitFor();
        const demo = page.getByRole("button", { name: /работать на вымышленных данных/i });
        if (await demo.count()) {
          await demo.first().click();
          await page.locator("[data-quest-workspace]").waitFor();
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert.ok(overflow <= 1, `${route} at ${width}px has ${overflow}px horizontal overflow`);
        if (width <= 767) {
          const undersized = await page.locator("button:visible, a:visible").evaluateAll((nodes) => nodes.filter((node) => {
            const box = node.getBoundingClientRect();
            return box.width < 44 || box.height < 44;
          }).map((node) => node.getAttribute("aria-label") || node.textContent?.trim()));
          assert.deepEqual(undersized, [], `${route} at ${width}px has undersized controls`);
        }
        const sidebar = page.locator(".learning-sidebar");
        const main = page.locator(".learning-main");
        const bottom = page.locator(".learning-bottom-nav");
        const fairy = page.locator(".fairy-floating-trigger");
        if (width >= 1024) {
          const sideBox = await sidebar.boundingBox();
          const mainBox = await main.boundingBox();
          assert.ok(sideBox && mainBox && sideBox.x + sideBox.width <= mainBox.x + 1, `${route} at ${width}px overlaps sidebar and content`);
          assert.equal(await bottom.evaluate((node) => getComputedStyle(node).display), "none");
        }
        if (width >= 768) {
          const sideBox = await sidebar.boundingBox();
          const fairyBox = await fairy.boundingBox();
          assert.ok(sideBox && fairyBox && fairyBox.x >= sideBox.x && fairyBox.x + fairyBox.width <= sideBox.x + sideBox.width, `${route} at ${width}px lets Fairy cover learning content`);
        }
        if (width <= 767) {
          assert.notEqual(await bottom.evaluate((node) => getComputedStyle(node).display), "none");
          assert.equal(await fairy.evaluate((node) => getComputedStyle(node).display), "none", `${route} duplicates Fairy over the mobile workspace`);
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
