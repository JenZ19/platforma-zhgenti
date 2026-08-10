import fs from "node:fs";
import path from "node:path";

export const root = path.resolve(import.meta.dirname, "..");

export function projectSlugs() {
  const source = fs.readFileSync(path.join(root, "app/content/projects.ts"), "utf8");
  const slugs = [...source.matchAll(/\bslug:\s*"([a-z0-9-]+)"/g)].map((match) => match[1]);
  const unique = [...new Set(slugs)];
  if (unique.length !== 52) throw new Error(`Ожидалось 52 проекта, найдено ${unique.length}`);
  return unique;
}

export function screenPath(slug, step) {
  return path.join(root, "public", "screens", slug, `step-${String(step).padStart(2, "0")}.png`);
}

export function mobileScreenPath(slug, step) {
  return path.join(root, "public", "screens-mobile", slug, `step-${String(step).padStart(2, "0")}.png`);
}

export const homeHelperGuideFrameCounts = [4, 3, 5, 4, 4, 3, 4, 3, 3, 3, 4, 3, 3, 3, 3, 4, 4];

export function homeHelperGuideScreenPath(mode, step, frame) {
  return path.join(root, "public", "guides", "home-helper", mode, `step-${String(step).padStart(2, "0")}-frame-${String(frame).padStart(2, "0")}.png`);
}

export function originalGuideScreenPath(slug, step, frame) {
  return path.join(root, "public", "guides", slug, `step-${String(step).padStart(2, "0")}-frame-${String(frame).padStart(2, "0")}.png`);
}
