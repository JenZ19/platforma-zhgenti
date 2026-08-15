import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { projectSlugs, root } from "./projects.mjs";

test("all concrete projects have different optimized WebP covers", () => {
  const directory = path.join(root, "public", "covers");
  assert.equal(fs.existsSync(directory), true, "public/covers is missing");
  if (!fs.existsSync(directory)) return;

  const expected = projectSlugs().map((slug) => `${slug}.webp`);
  const actual = fs.readdirSync(directory).filter((name) => name.endsWith(".webp")).sort();
  assert.deepEqual(actual, [...expected].sort());

  const hashes = [];
  for (const name of expected) {
    const bytes = fs.readFileSync(path.join(directory, name));
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", name);
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", name);
    assert.ok(bytes.length > 4_000, `${name} is unexpectedly small`);
    hashes.push(crypto.createHash("sha256").update(bytes).digest("hex"));
  }
  assert.equal(new Set(hashes).size, expected.length, "project cover images must not repeat");
});

test("package exposes repeatable cover capture and verification commands", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(pkg.scripts["capture:covers"], "node scripts/capture-covers.mjs");
  assert.equal(pkg.scripts["verify:covers"], "node scripts/verify-covers.mjs");
});
