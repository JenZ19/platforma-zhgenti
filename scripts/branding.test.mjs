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
  const offer = fs.readFileSync(path.join(root, "app/components/ServerDiscountOffer.tsx"), "utf8");
  assert.match(shell, /НЕЙРОПРОФИ/);
  assert.match(layout, /Академия квестов НЕЙРОПРОФИ/);
  assert.match(layout, /\/og-neiroprofi\.png/);
  assert.match(offer, /SUBMARINE123/);
});
