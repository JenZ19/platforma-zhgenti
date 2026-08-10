import fs from "node:fs";
import path from "node:path";

export const root = path.resolve(import.meta.dirname, "..");

export function projectSlugs() {
  const source = fs.readFileSync(path.join(root, "app/content/projects.ts"), "utf8");
  const manifest = source.match(/export const captureProjectSlugs = \[([\s\S]*?)\] as const;/)?.[1];
  if (!manifest) throw new Error("Не найден captureProjectSlugs в app/content/projects.ts");
  const slugs = [...manifest.matchAll(/"([a-z0-9-]+)"/g)].map((match) => match[1]);
  const unique = [...new Set(slugs)];
  if (unique.length !== 45 || unique.length !== slugs.length) throw new Error(`Ожидалось 45 уникальных путей, найдено ${unique.length}`);
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
