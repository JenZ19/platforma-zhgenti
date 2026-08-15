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
  assert.match(typographyBlock("body {"), /font-family:\s*Manrope,\s*Inter,\s*ui-sans-serif,\s*system-ui,\s*sans-serif/);
  assert.doesNotMatch(css, /Baloo|Comic Neue/i);
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
