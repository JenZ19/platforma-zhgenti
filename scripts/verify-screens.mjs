import fs from "node:fs";
import path from "node:path";
import {
  homeHelperGuideFrameCounts,
  homeHelperGuideScreenPath,
  mobileScreenPath,
  originalGuideStepCount,
  originalGuideScreenPath,
  projectSlugs,
  projectStepCount,
  root,
  screenPath,
} from "./projects.mjs";
import { assertWebpSize } from "./webp-screenshot.mjs";

const originalQuestSlugs = ["family-expenses", "planner", "idea-vault", "child-schedule", "carousel-agent", "threads-agent", "webinar-moderator-agent", "family-health-hub", "install-codex", "api-keys", "unique-design"];

const missing = [];
const wrongSize = [];
const extra = [];
let count = 0;

const slugs = projectSlugs();
const slugSet = new Set(slugs);
for (const slug of slugs) {
  for (let step = 1; step <= projectStepCount(slug); step += 1) {
    for (const file of [screenPath(slug, step), mobileScreenPath(slug, step)]) {
      if (!fs.existsSync(file)) {
        missing.push(file);
        continue;
      }
      try {
        await assertWebpSize(file);
      } catch (error) {
        wrongSize.push(error instanceof Error ? error.message : String(error));
      }
      count += 1;
    }
  }
}

for (const directory of ["screens", "screens-mobile"]) {
  const base = path.join(root, "public", directory);
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const questDirectory = path.join(base, entry.name);
    if (!slugSet.has(entry.name)) {
      extra.push(...fs.readdirSync(questDirectory)
        .filter((name) => name.endsWith(".webp"))
        .map((name) => path.join(questDirectory, name)));
      continue;
    }
    const limit = projectStepCount(entry.name);
    for (const name of fs.readdirSync(questDirectory)) {
      const match = name.match(/^step-(\d+)\.webp$/);
      if (match && Number(match[1]) > limit) extra.push(path.join(questDirectory, name));
    }
  }
}

for (const mode of ["real", "demo"]) {
  for (const [stepIndex, frameCount] of homeHelperGuideFrameCounts.entries()) {
    for (let frame = 1; frame <= frameCount; frame += 1) {
      const file = homeHelperGuideScreenPath(mode, stepIndex + 1, frame);
      if (!fs.existsSync(file)) { missing.push(file); continue; }
      try {
        await assertWebpSize(file);
      } catch (error) {
        wrongSize.push(error instanceof Error ? error.message : String(error));
      }
      count += 1;
    }
  }
}

for (const slug of originalQuestSlugs) {
  for (let step = 1; step <= originalGuideStepCount(slug); step += 1) {
    for (let frame = 1; frame <= 3; frame += 1) {
      const file = originalGuideScreenPath(slug, step, frame);
      if (!fs.existsSync(file)) { missing.push(file); continue; }
      try {
        await assertWebpSize(file);
      } catch (error) {
        wrongSize.push(error instanceof Error ? error.message : String(error));
      }
      count += 1;
    }
  }
  const guideDirectory = path.join(root, "public", "guides", slug);
  for (const name of fs.readdirSync(guideDirectory)) {
    const match = name.match(/^step-(\d+)-frame-(\d+)\.webp$/);
    if (match && Number(match[1]) > originalGuideStepCount(slug)) extra.push(path.join(guideDirectory, name));
  }
}

const generalCount = slugs.reduce((total, slug) => total + projectStepCount(slug) * 2, 0);
const homeHelperCount = homeHelperGuideFrameCounts.reduce((total, frames) => total + frames * 2, 0);
const originalGuideCount = originalQuestSlugs.reduce((total, slug) => total + originalGuideStepCount(slug) * 3, 0);
const expectedCount = generalCount + homeHelperCount + originalGuideCount;

if (missing.length || wrongSize.length || extra.length || count !== expectedCount) {
  if (missing.length) console.error(`Нет файлов: ${missing.length}\n${missing.slice(0, 8).join("\n")}`);
  if (wrongSize.length) console.error(`Неверный размер: ${wrongSize.length}\n${wrongSize.slice(0, 8).join("\n")}`);
  if (extra.length) console.error(`Устаревшие файлы: ${extra.length}\n${extra.slice(0, 8).join("\n")}`);
  process.exit(1);
}

console.log(`Проверено ${count} WebP-экранов: ${generalCount} общих, ${homeHelperCount} подробных home-helper и ${originalGuideCount} кадров одиннадцати подробных квестов, все 1200x800.`);
