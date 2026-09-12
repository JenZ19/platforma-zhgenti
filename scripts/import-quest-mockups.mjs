// Import selected built-in imagegen assets without cropping or changing their content.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { projectSlugs } from './projects.mjs';

const input = process.argv[2];
assert.ok(input, 'Usage: node scripts/import-quest-mockups.mjs /absolute/selected-assets.json');
const selected = JSON.parse(await readFile(input, 'utf8'));
const allowed = projectSlugs();
const entries = Array.isArray(selected) ? selected : Object.entries(selected).map(([slug, source]) => ({ slug, source }));
await mkdir('public/materials/quest-artwork', {recursive:true});
const recordPath = 'public/materials/quest-artwork/manifest.json';
let previous = [];
try { previous = JSON.parse(await readFile(recordPath, 'utf8')).images; } catch (error) { if (error.code !== 'ENOENT') throw error; }
const records = new Map(previous.map(item => [item.slug, item]));
for (const entry of entries) {
  assert.ok(allowed.includes(entry.slug), `Unknown quest ${entry.slug}`);
  assert.ok(path.isAbsolute(entry.source), 'Source must be an absolute generated file');
  const original = await readFile(entry.source);
  const meta = await sharp(original).metadata();
  assert.ok(meta.width >= 1000 && meta.height >= 650, `Low resolution ${entry.slug}`);
  const output = await sharp(original).resize({width:1536,withoutEnlargement:true}).webp({quality:86}).toBuffer();
  const target = `public/covers/${entry.slug}.webp`;
  await writeFile(target, output);
  records.set(entry.slug, {slug:entry.slug,src:`/covers/${entry.slug}.webp`,width:meta.width,height:meta.height,sha256:createHash('sha256').update(output).digest('hex'),generator:'built-in image_gen',kind:'illustrative-result-mockup',prompt:entry.prompt ?? 'Project-specific device mockup; see original generation brief.'});
  console.log(`Imported ${entry.slug} (${Math.round(output.length/1024)} KB)`);
}
const images = allowed.flatMap(slug => records.has(slug) ? [records.get(slug)] : []);
assert.equal(new Set(images.map(item => item.sha256)).size, images.length, 'Duplicate generated art');
await writeFile(recordPath, JSON.stringify({version:'2026-09-08',description:'AI-generated concepts, not real interface screenshots. Full uncropped devices; lesson instructions remain separate.',images}, null, 2)+'\n');
console.log(`Coverage ${images.length}/${allowed.length}`);
