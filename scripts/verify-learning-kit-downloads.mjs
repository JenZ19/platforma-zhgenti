import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const origin = process.argv[2] || "http://localhost:55230/";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    for (const slug of ["carousel-agent", "threads-agent", "webinar-moderator-agent", "family-health-hub"]) {
      const url = new URL(origin);
      url.searchParams.set("quest", slug);
      url.searchParams.set("format", width === 390 ? "mobile" : "desktop");
      await page.goto(url.href);
      await page.getByRole("button", { name: "Работать на вымышленных данных", exact: true }).click();
      const link = page.getByRole("link", { name: /Скачать учебный комплект/ });
      await link.waitFor({ state: "visible" });
      const href = await link.getAttribute("href");
      assert.ok(href.includes(`${slug}-2026-09-08.1.zip`));
      const response = await context.request.get(new URL(href, url).href);
      assert.equal(response.status(), 200, `${slug}: ZIP unavailable`);
      const bytes = await response.body();
      assert.equal(bytes.subarray(0, 2).toString(), "PK", `${slug}: not a ZIP`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${slug}: overflow at ${width}`);
      console.log(`PASS ${width}px ${slug}: visible link, ZIP ${bytes.length} bytes, no overflow`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
