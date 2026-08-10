import fs from "node:fs";
import {
  homeHelperGuideFrameCounts,
  homeHelperGuideScreenPath,
  mobileScreenPath,
  originalGuideScreenPath,
  projectSlugs,
  screenPath,
} from "./projects.mjs";

const originalQuestSlugs = ["family-expenses", "planner", "idea-vault", "child-schedule"];

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

for (const slug of originalQuestSlugs) {
  for (let step = 1; step <= 17; step += 1) {
    for (let frame = 1; frame <= 3; frame += 1) {
      const file = originalGuideScreenPath(slug, step, frame);
      if (!fs.existsSync(file)) { missing.push(file); continue; }
      const bytes = fs.readFileSync(file);
      const isPng = bytes.subarray(1, 4).toString("ascii") === "PNG";
      const width = isPng && bytes.length >= 24 ? bytes.readUInt32BE(16) : 0;
      const height = isPng && bytes.length >= 24 ? bytes.readUInt32BE(20) : 0;
      if (!isPng || width !== 1200 || height !== 800) wrongSize.push(`${file}: ${width}x${height}`);
      count += 1;
    }
  }
}

if (missing.length || wrongSize.length || count !== 2092) {
  if (missing.length) console.error(`Нет файлов: ${missing.length}\n${missing.slice(0, 8).join("\n")}`);
  if (wrongSize.length) console.error(`Неверный размер: ${wrongSize.length}\n${wrongSize.slice(0, 8).join("\n")}`);
  process.exit(1);
}

console.log(`Проверено ${count} PNG-экранов: 1768 общих, 120 подробных home-helper и 204 кадра четырёх оригинальных квестов, все 1200x800.`);
