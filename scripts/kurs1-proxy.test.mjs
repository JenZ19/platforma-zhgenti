import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const configUrl = new URL("../ops/nginx/ezhgenti-kurs1.conf", import.meta.url);

test("kurs1 proxy is isolated and rewrites every academy asset family", async () => {
  const config = await readFile(configUrl, "utf8");

  assert.match(config, /location = \/kurs1\s*\{[\s\S]*return 301 \/kurs1\//);
  assert.match(config, /location \^~ \/kurs1\//);
  assert.match(config, /proxy_pass https:\/\/feya-quest-academy\.submarine-edu\.chatgpt\.site\//);
  assert.match(config, /proxy_ssl_server_name on/);
  assert.match(config, /proxy_set_header Host feya-quest-academy\.submarine-edu\.chatgpt\.site/);
  assert.match(config, /proxy_set_header Accept-Encoding ""/);
  assert.match(config, /sub_filter_once off/);

  for (const assetFamily of [
    "_next/",
    "covers/",
    "materials/",
    "screens/",
    "screens-mobile/",
    "guides/",
    "og-",
    "favicon-",
  ]) {
    assert.ok(
      config.includes(`sub_filter '\"/${assetFamily}' '\"/kurs1/${assetFamily}';`),
      `Missing /kurs1 rewrite for ${assetFamily}`,
    );
  }

  assert.doesNotMatch(config, /location\s+\/(?!kurs1)/);
});
