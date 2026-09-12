import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { projectSlugs } from './projects.mjs';

const manifest = JSON.parse(await readFile('public/materials/quest-artwork/manifest.json', 'utf8'));
const partial = process.argv.includes('--partial');
const expected = projectSlugs();
assert.equal(new Set(manifest.images.map(item => item.slug)).size, manifest.images.length, 'Duplicate quest entry');
if (!partial) assert.deepEqual(manifest.images.map(item => item.slug).sort(), [...expected].sort(), 'Every route must have new art');
const hashes = new Set();
for (const image of manifest.images) {
  assert.ok(expected.includes(image.slug));
  const bytes = await readFile(`public${image.src}`);
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash, image.sha256, `Changed asset ${image.slug}`);
  assert.ok(!hashes.has(hash), `Repeated artwork ${image.slug}`);
  hashes.add(hash);
  const meta = await sharp(bytes).metadata();
  assert.ok(meta.width >= 1000 && meta.height >= 650, `Resolution ${image.slug}`);
  assert.ok(bytes.length < 600000, `Heavy cover ${image.slug}`);
  assert.equal(image.kind, 'illustrative-result-mockup');
}
await mkdir('output/quest-artwork-qa', {recursive:true});
// Contact sheets are inspection reports only; the original art is never cropped.
for (let offset = 0; offset < manifest.images.length; offset += 12) {
  const group = manifest.images.slice(offset, offset + 12);
  const cells = [];
  for (const [index, entry] of group.entries()) {
    const col = index % 3, row = Math.floor(index / 3);
    const thumb = await sharp(`public${entry.src}`).resize(500,334,{fit:'contain',background:'#fff'}).png().toBuffer();
    const label = Buffer.from(`<svg width="500" height="36"><rect width="500" height="36" fill="white"/><text x="10" y="24" font-size="18" font-family="Arial" fill="#35212c">${entry.slug}</text></svg>`);
    cells.push({input:thumb,left:col*500,top:row*370},{input:label,left:col*500,top:row*370+334});
  }
  await sharp({create:{width:1500,height:Math.ceil(group.length/3)*370,channels:3,background:'#fff'}}).composite(cells).png().toFile(`output/quest-artwork-qa/sheet-${offset/12+1}.png`);
}
console.log(`PASS ${manifest.images.length}/${expected.length} unique, full-resolution, compressed result mockups${partial?' (partial inventory)':''}`);
const origin = process.argv.find(value => /^https?:/.test(value));
if (origin) {
  const response = await fetch(new URL('materials/quest-artwork/manifest.json', origin));
  assert.equal(response.status,200,'Published manifest');
  const live = await response.json();
  assert.equal(live.images.length, expected.length, 'Published coverage');
  for (let offset=0;offset<live.images.length;offset+=4) {
    await Promise.all(live.images.slice(offset,offset+4).map(async item => {
      const expectedImage = manifest.images.find(image=>image.slug===item.slug);
      assert.ok(expectedImage);
      const imageResponse = await fetch(new URL(item.src,origin));
      assert.equal(imageResponse.status,200,`Published asset ${item.slug}`);
      assert.match(imageResponse.headers.get('content-type'),/image\/webp/);
      const hash = createHash('sha256').update(Buffer.from(await imageResponse.arrayBuffer())).digest('hex');
      assert.equal(hash,expectedImage.sha256,`Wrong published image ${item.slug}`);
    }));
  }
  console.log('PASS all 49 published image hashes match selected originals');
}
