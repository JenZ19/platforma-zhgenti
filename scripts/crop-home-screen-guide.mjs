import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const inputs = process.argv.slice(2);
if (inputs.length !== 4) throw new Error("Pass the four original iPhone screenshots in order");
const output = new URL("../public/home-screen-guide/", import.meta.url);
await mkdir(output, {recursive:true});
const crops = [
  {name:"iphone-share.jpg", left:220, top:720, width:350, height:85},
  {name:"iphone-more.jpg", left:20, top:1060, width:550, height:190},
  {name:"iphone-home.jpg", left:20, top:466, width:548, height:78},
  {name:"iphone-add.jpg", left:10, top:98, width:570, height:440},
];
for (const [index, {name, ...region}] of crops.entries()) {
  // Deterministic crops only: preserve the actual UI; omit all personal contacts.
  await sharp(inputs[index]).extract(region).jpeg({quality:92}).toFile(fileURLToPath(new URL(name, output)));
}
