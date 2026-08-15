import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { root } from "./projects.mjs";

const preview = fs.readFileSync(path.join(root, "app/components/ProjectPreview.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "app/pink-learning-dashboard.css"), "utf8");

test("project cards use result covers instead of lesson screenshots", () => {
  assert.match(preview, /\/covers\/\$\{project\.slug\}\.webp/);
  assert.doesNotMatch(preview, /\/screens\//);
});

test("project card headings stay bold and aligned on desktop, then relax on phone", () => {
  assert.match(css, /\.dashboard-card-body h3[\s\S]{0,260}font-size:\s*24px/);
  assert.match(css, /\.dashboard-card-body h3[\s\S]{0,260}font-weight:\s*800/);
  assert.match(css, /\.dashboard-card-labels[\s\S]{0,180}min-height:/);
  assert.match(css, /\.dashboard-card-body > p[\s\S]{0,180}min-height:/);
  assert.match(css, /@media \(max-width:\s*767px\)[\s\S]*\.dashboard-card-body h3[\s\S]{0,240}min-height:\s*0/);
});

test("result covers remain completely visible and bundles layer two whole results", () => {
  assert.match(css, /\.dashboard-project-card > \.project-preview,[\s\S]{0,260}aspect-ratio:\s*840\s*\/\s*476/);
  assert.match(css, /\.dashboard-project-card \.project-preview img[\s\S]{0,420}object-fit:\s*contain/);
  assert.match(css, /\.dashboard-project-card \.project-preview img[\s\S]{0,420}transform:\s*none/);
  assert.match(css, /\.dashboard-project-card:hover \.project-preview img,[\s\S]{0,180}transform:\s*none/);
  assert.match(css, /\.bundle-preview-carousel\s*\{[\s\S]{0,420}position:\s*relative/);
  assert.match(css, /\.bundle-preview-slide\s*\{[\s\S]{0,520}position:\s*absolute[\s\S]{0,220}width:\s*100%/);
  assert.doesNotMatch(css, /\.bundle-preview-slide\s*\{[\s\S]{0,520}transform:\s*scale/);
  assert.match(css, /\.bundle-preview-slide\.is-active[\s\S]{0,160}opacity:\s*1/);
  assert.match(css, /\.bundle-preview-format[\s\S]{0,520}z-index:\s*4/);
  assert.match(css, /\.bundle-preview-dots[\s\S]{0,520}z-index:\s*4/);
  assert.doesNotMatch(css, /\.project-preview-bundle > div\s*\{[\s\S]{0,180}grid-template-columns:\s*1fr 1fr/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.bundle-preview-slide/);
});

test("every result preview renders its thematic sticker from the shared identity registry", () => {
  assert.match(preview, /getProjectCardIdentity\(project\)/);
  assert.match(preview, /className=\{`project-preview-sticker/);
  assert.match(preview, /data-project-sticker=\{project\.slug\}/);
  assert.match(preview, /--project-sticker-accent/);
  assert.match(preview, /aria-hidden="true"/);
});

test("Pink Cloud stickers stay readable, varied and clear of card actions", () => {
  assert.match(css, /\.project-preview-sticker\s*\{[\s\S]{0,900}z-index:\s*5/);
  assert.match(css, /\.project-preview-sticker\s*\{[\s\S]{0,900}max-width:\s*min\(70%,\s*230px\)/);
  assert.match(css, /\.project-preview-sticker\s*\{[\s\S]{0,900}font-size:\s*12px/);
  for (const shape of ["receipt", "label", "seal", "ticket", "bookmark", "cloud"]) {
    assert.match(css, new RegExp(`\\.project-preview-sticker\\.sticker-${shape}`));
  }
  assert.match(css, /\.project-preview-sticker\.sticker-left/);
  assert.match(css, /\.project-preview-sticker\.sticker-right/);
  assert.match(css, /@media \(max-width:\s*767px\)[\s\S]*\.project-preview-sticker[\s\S]{0,420}font-size:\s*11px/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.project-preview-sticker/);
});
