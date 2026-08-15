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

test("result covers fill their frame without the legacy screenshot crop", () => {
  assert.match(css, /\.dashboard-project-card \.project-preview img[\s\S]{0,420}object-fit:\s*cover/);
  assert.match(css, /\.dashboard-project-card \.project-preview img[\s\S]{0,420}transform:\s*none/);
  assert.match(css, /\.dashboard-project-card \.project-preview-bundle > div img[\s\S]{0,180}position:\s*static/);
});

test("every result preview renders its thematic sticker from the shared identity registry", () => {
  assert.match(preview, /getProjectCardIdentity\(project\)/);
  assert.match(preview, /className=\{`project-preview-sticker/);
  assert.match(preview, /data-project-sticker=\{project\.slug\}/);
  assert.match(preview, /--project-sticker-accent/);
  assert.match(preview, /aria-hidden="true"/);
});
