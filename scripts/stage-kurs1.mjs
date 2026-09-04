// Stage only generated public assets for the existing isolated Nginx /kurs1/ release.
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const [origin, destination] = process.argv.slice(2);
assert.ok(origin && destination && path.isAbsolute(destination), "Usage: node scripts/stage-kurs1.mjs http://localhost:PORT /absolute/staging/path");
const response = await fetch(origin);
assert.equal(response.status, 200, "Production SSR must succeed before staging");
const html = await response.text();
assert.ok(html.includes("<!DOCTYPE html>") && html.includes("/_next/static/"), "Expected production HTML, not a dev page");
assert.ok(!html.includes("/@vite/client"), "Never publish development scripts");
await mkdir(destination, { recursive: true });
await cp("dist/client", destination, { recursive: true });
const dirs = ["_next", "covers", "screens-mobile", "screens", "guides", "materials"];
function rewrite(text) {
  for (const dir of dirs) text = text.replaceAll(`/${dir}/`, `/kurs1/${dir}/`);
  text = text.replaceAll("/favicon-neiroprofi.svg", "/kurs1/favicon-neiroprofi.svg");
  for (const name of ["og-neiroprofi.png", "og.png", "og-42-projects.png", "og-45-projects.png"]) text = text.replaceAll(`/${name}`, `/kurs1/${name}`);
  return text;
}
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await visit(file);
    else if (/\.(?:js|css|json|html)$/.test(entry.name)) {
      const old = await readFile(file, "utf8");
      const next = rewrite(old);
      if (next !== old) await writeFile(file, next);
    }
  }
}
await visit(destination);
await writeFile(path.join(destination, "index.html"), rewrite(html));
console.log(`Staged /kurs1/ public release at ${destination}`);
