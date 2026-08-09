import fs from "node:fs";
import {
  homeHelperGuideFrameCounts,
  homeHelperGuideScreenPath,
  homeHelperPreparationScreenPath,
  mobileScreenPath,
  projectSlugs,
  screenPath,
} from "./projects.mjs";

const missing = [];
const wrongSize = [];
let count = 0;

for (const slug of projectSlugs()) {
  for (let step = 1; step <= 17; step += 1) {
    for (const file of [screenPath(slug, step), mobileScreenPath(slug, step)]) {
      if (!fs.existsSync(file)) {
        missing.push(file);
        continue;
      }
      const bytes = fs.readFileSync(file);
      const isPng = bytes.subarray(1, 4).toString("ascii") === "PNG";
      const width = isPng && bytes.length >= 24 ? bytes.readUInt32BE(16) : 0;
      const height = isPng && bytes.length >= 24 ? bytes.readUInt32BE(20) : 0;
      if (!isPng || width !== 1200 || height !== 800) wrongSize.push(`${file}: ${width}x${height}`);
      count += 1;
    }
  }
}

for (let index = 1; index <= 8; index += 1) {
  const file = homeHelperPreparationScreenPath(index);
  if (!fs.existsSync(file)) { missing.push(file); continue; }
  const bytes = fs.readFileSync(file);
  const isPng = bytes.subarray(1, 4).toString("ascii") === "PNG";
  const width = isPng && bytes.length >= 24 ? bytes.readUInt32BE(16) : 0;
  const height = isPng && bytes.length >= 24 ? bytes.readUInt32BE(20) : 0;
  if (!isPng || width !== 1200 || height !== 800) wrongSize.push(`${file}: ${width}x${height}`);
  count += 1;
}

for (const mode of ["real", "demo"]) {
  homeHelperGuideFrameCounts.forEach((frameCount, stepIndex) => {
    for (let frame = 1; frame <= frameCount; frame += 1) {
      const file = homeHelperGuideScreenPath(mode, stepIndex + 1, frame);
      if (!fs.existsSync(file)) { missing.push(file); continue; }
      const bytes = fs.readFileSync(file);
      const isPng = bytes.subarray(1, 4).toString("ascii") === "PNG";
      const width = isPng && bytes.length >= 24 ? bytes.readUInt32BE(16) : 0;
      const height = isPng && bytes.length >= 24 ? bytes.readUInt32BE(20) : 0;
      if (!isPng || width !== 1200 || height !== 800) wrongSize.push(`${file}: ${width}x${height}`);
      count += 1;
    }
  });
}

if (missing.length || wrongSize.length || count !== 1902) {
  if (missing.length) console.error(`Нет файлов: ${missing.length}\n${missing.slice(0, 8).join("\n")}`);
  if (wrongSize.length) console.error(`Неверный размер: ${wrongSize.length}\n${wrongSize.slice(0, 8).join("\n")}`);
  process.exit(1);
}

console.log(`Проверено ${count} PNG-экранов: 1768 общих и 134 подробных home-helper, все 1200x800.`);
