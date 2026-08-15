import fs from "node:fs";
import path from "node:path";

export const root = path.resolve(import.meta.dirname, "..");

export function projectSlugs() {
  const source = fs.readFileSync(path.join(root, "app/content/projects.ts"), "utf8");
  const manifest = source.match(/export const captureProjectSlugs = \[([\s\S]*?)\] as const;/)?.[1];
  if (!manifest) throw new Error("Не найден captureProjectSlugs в app/content/projects.ts");
  const slugs = [...manifest.matchAll(/"([a-z0-9-]+)"/g)].map((match) => match[1]);
  const unique = [...new Set(slugs)];
  if (unique.length !== 49 || unique.length !== slugs.length) throw new Error(`Ожидалось 49 уникальных путей, найдено ${unique.length}`);
  return unique;
}

export function projectStepCount(slug) {
  const source = fs.readFileSync(path.join(root, "app/content/journey-plans.ts"), "utf8");
  const manifest = source.match(/export const questLevelCounts = \{([\s\S]*?)\} as const;/)?.[1];
  if (!manifest) throw new Error("Не найден questLevelCounts в app/content/journey-plans.ts");
  const counts = Object.fromEntries(
    [...manifest.matchAll(/(?:"([a-z0-9-]+)"|([a-z][a-z0-9-]*)):\s*(\d+)/g)]
      .map((match) => [match[1] || match[2], Number(match[3])]),
  );
  const count = counts[slug];
  if (!count) throw new Error(`Не найдено число уровней для ${slug}`);
  return count;
}

export function originalGuideStepCount(slug) {
  return slug === "api-keys" ? 14 : slug === "install-codex" ? 6 : 17;
}

export function screenPath(slug, step) {
  return path.join(root, "public", "screens", slug, `step-${String(step).padStart(2, "0")}.png`);
}

export function mobileScreenPath(slug, step) {
  return path.join(root, "public", "screens-mobile", slug, `step-${String(step).padStart(2, "0")}.png`);
}

export function projectCoverStep(slug) {
  return Math.min(14, projectStepCount(slug));
}

export function coverPath(slug) {
  return path.join(root, "public", "covers", `${slug}.webp`);
}

export const homeHelperGuideFrameCounts = [4, 3, 5, 4, 4, 3, 4, 3, 3, 3, 4, 3, 3, 3, 3, 4, 4];

export function homeHelperGuideScreenPath(mode, step, frame) {
  return path.join(root, "public", "guides", "home-helper", mode, `step-${String(step).padStart(2, "0")}-frame-${String(frame).padStart(2, "0")}.png`);
}

export function originalGuideScreenPath(slug, step, frame) {
  return path.join(root, "public", "guides", slug, `step-${String(step).padStart(2, "0")}-frame-${String(frame).padStart(2, "0")}.png`);
}
