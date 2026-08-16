import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { root } from "./projects.mjs";

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [target] : [];
  });
}

test("the academy uses the NEYROPROFI brand everywhere while preserving the partner promo code", () => {
  const appFiles = sourceFiles(path.join(root, "app"));
  const stale = appFiles.filter((file) => /\bSUBMARINE\b/.test(fs.readFileSync(file, "utf8")));
  assert.deepEqual(stale.map((file) => path.relative(root, file)), []);

  const shell = fs.readFileSync(path.join(root, "app/components/LearningShell.tsx"), "utf8");
  const layout = fs.readFileSync(path.join(root, "app/layout.tsx"), "utf8");
  const page = fs.readFileSync(path.join(root, "app/page.tsx"), "utf8");
  const guide = fs.readFileSync(path.join(root, "app/components/OriginalQuestGuideScene.tsx"), "utf8");
  const helperGuide = fs.readFileSync(path.join(root, "app/components/HomeHelperGuideScene.tsx"), "utf8");
  const faviconPath = ["public/favicon-neiroprofi.svg", "public/favicon.svg"]
    .map((file) => path.join(root, file))
    .find((file) => fs.existsSync(file));
  const favicon = fs.readFileSync(faviconPath, "utf8");
  const offer = fs.readFileSync(path.join(root, "app/components/ServerDiscountOffer.tsx"), "utf8");
  assert.match(shell, /НЕЙРОПРОФИ/);
  assert.match(layout, /Академия квестов НЕЙРОПРОФИ/);
  assert.match(page, /НЕЙРОПРОФИ — ИИ-агенты и ИИ-сайты/);
  assert.doesNotMatch(guide, /<span>S<\/span>/);
  assert.doesNotMatch(helperGuide, /<span>S<\/span>/);
  assert.match(favicon, />Н<\/text>/);
  assert.match(favicon, /#681426/i);
  assert.match(favicon, /#C8A767/i);
  assert.doesNotMatch(favicon, /#0C79D8|#2E9EFF|#68C4FF/i);
  assert.match(layout, /\/og-neiroprofi\.png/);
  assert.match(layout, /\/favicon-neiroprofi\.svg/);
  assert.match(offer, /SUBMARINE123/);
});
