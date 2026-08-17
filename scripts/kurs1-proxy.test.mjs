import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const configUrl = new URL("../ops/nginx/ezhgenti-kurs1.conf", import.meta.url);

test("kurs1 static route is isolated and serves the dedicated academy release", async () => {
  const config = await readFile(configUrl, "utf8");

  assert.match(config, /location = \/kurs1\s*\{[\s\S]*return 301 \/kurs1\//);
  assert.match(config, /location \^~ \/kurs1\//);
  assert.match(config, /alias \/var\/www\/ezhgenti\.ru\/kurs1-current\//);
  assert.match(config, /index index\.html/);
  assert.doesNotMatch(config, /proxy_pass|sub_filter/);

  assert.doesNotMatch(config, /location\s+\/(?!kurs1)/);
});
