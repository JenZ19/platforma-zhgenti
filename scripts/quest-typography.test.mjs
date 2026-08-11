import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

function typographyBlock(selector) {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `Missing typography selector: ${selector}`);
  const end = css.indexOf("}", start);
  return css.slice(start, end + 1);
}

test("desktop quests use one readable typography scale", () => {
  const tokens = typographyBlock(".quest-shell {");
  assert.match(tokens, /--quest-body-size:\s*18px/);
  assert.match(tokens, /--quest-support-size:\s*18px/);
  assert.match(tokens, /--quest-control-size:\s*16px/);
  assert.match(tokens, /--quest-label-size:\s*13px/);

  assert.match(typographyBlock(".quest-shell .lesson-text-action {"), /font-size:\s*var\(--quest-body-size\)/);
  assert.match(typographyBlock(".quest-shell .why-card .lesson-text p,"), /font-size:\s*var\(--quest-support-size\)/);
  assert.match(typographyBlock(".quest-shell .expected-section li {"), /font-size:\s*var\(--quest-control-size\)/);
  assert.match(typographyBlock(".quest-shell .level-actions button {"), /font-size:\s*var\(--quest-control-size\)/);
  assert.match(typographyBlock(".quest-shell .server-offer-lead {"), /font-size:\s*var\(--quest-support-size\)/);
  assert.match(typographyBlock(".quest-shell .customizer-options label span {"), /font-size:\s*14px/);
  assert.match(typographyBlock(".quest-shell .quest-customizer > header small {"), /font-size:\s*15px/);
});

test("mobile quests keep instructions and controls readable", () => {
  const tokens = typographyBlock(".mobile-quest-shell {");
  assert.match(tokens, /--quest-body-size:\s*17px/);
  assert.match(tokens, /--quest-support-size:\s*17px/);
  assert.match(tokens, /--quest-control-size:\s*16px/);
  assert.match(tokens, /--quest-label-size:\s*13px/);

  assert.match(typographyBlock(".mobile-quest-shell .mobile-do .lesson-text-action {"), /font-size:\s*var\(--quest-body-size\)/);
  assert.match(typographyBlock(".mobile-quest-shell .mobile-why .lesson-text p,"), /font-size:\s*var\(--quest-support-size\)/);
  assert.match(typographyBlock(".mobile-quest-shell .mobile-result li {"), /font-size:\s*var\(--quest-control-size\)/);
  assert.match(typographyBlock(".mobile-quest-shell .mobile-level-actions button {"), /font-size:\s*var\(--quest-control-size\)/);
  assert.match(typographyBlock(".mobile-quest-shell .mobile-action p,"), /font-size:\s*15px/);
  assert.match(typographyBlock(".mobile-quest-shell .quest-customizer.compact .customizer-options label span {"), /font-size:\s*14px/);
});
