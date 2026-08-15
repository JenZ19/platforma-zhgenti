import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/pink-learning-dashboard.css", import.meta.url), "utf8").catch(() => "");

function typographyBlock(selector) {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `Missing typography selector: ${selector}`);
  const end = css.indexOf("}", start);
  return css.slice(start, end + 1);
}

test("Pink Cloud uses the approved adult font stack", () => {
  assert.match(typographyBlock("body {"), /font-family:\s*ui-sans-serif,\s*system-ui,\s*-apple-system,\s*BlinkMacSystemFont,\s*"Segoe UI",\s*sans-serif/);
  assert.doesNotMatch(css, /Baloo|Comic Neue/i);
  assert.doesNotMatch(css, /font-family:\s*Manrope|font:\s*[^;}]*Manrope/i);
});

test("preparation and customizer prose cannot fall back to legacy miniature type", () => {
  const preparation = typographyBlock(".learning-main .preparation-card {");
  const customizer = typographyBlock(".learning-main .quest-customizer {");
  const mobilePreparation = typographyBlock(".learning-shell-mobile .preparation-card {");
  const mobileCustomizer = typographyBlock(".learning-shell-mobile .quest-customizer {");
  assert.match(preparation, /font-size:\s*18px/);
  assert.match(customizer, /font-size:\s*18px/);
  assert.match(mobilePreparation, /font-size:\s*17px/);
  assert.match(mobileCustomizer, /font-size:\s*17px/);
  assert.match(css, /\.learning-main \.preparation-list label:focus-within\s*\{[^}]*outline:\s*3px solid var\(--cloud-focus\)/s);
});

test("mobile quest week label cannot fall back to legacy 8px type", () => {
  const block = typographyBlock(".learning-main .mobile-quest-hero > p {");
  assert.match(block, /font-size:\s*14px/);
  assert.match(block, /line-height:\s*1\.4/);
});

test("text-bearing Pink Cloud actions use an AA-safe solid color", () => {
  const action = "#802153";
  const toRgb = (hex) => [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  const luminance = (hex) => {
    const channels = toRgb(hex).map((value) => {
      const normalized = value / 255;
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const contrast = (left, right) => {
    const [lighter, darker] = [luminance(left), luminance(right)].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
  };
  assert.ok(contrast("#ffffff", action) >= 4.5);
  assert.match(css, /--cloud-action:\s*#802153/);
  for (const selector of [".next-quest-banner {", ".quest-step-actions button:last-child {", ".mobile-quest-step-actions button:last-child {", ".reward-modal .primary-button {"]) {
    assert.match(typographyBlock(selector), /background:\s*var\(--cloud-action\)/, `${selector} does not use the tested AA action color`);
  }
});

test("desktop quest card uses an exact 18px readable body", () => {
  const block = typographyBlock(".quest-step-card {");
  assert.match(block, /font-size:\s*18px/);
  assert.match(block, /line-height:\s*1\.65/);
  assert.match(block, /min-width:\s*0/);
});

test("mobile quest card uses an exact 17px readable body", () => {
  const block = typographyBlock(".mobile-quest-step-card {");
  assert.match(block, /font-size:\s*17px/);
  assert.match(block, /line-height:\s*1\.65/);
  assert.match(block, /min-width:\s*0/);
});

test("quest prose keeps a readable line length instead of becoming a text wall", () => {
  const desktop = typographyBlock(".quest-step-card > section > .lesson-text {");
  const mobile = typographyBlock(".mobile-quest-step-card > section > .lesson-text {");
  assert.match(desktop, /max-width:\s*72ch/);
  assert.match(mobile, /max-width:\s*68ch/);
});
