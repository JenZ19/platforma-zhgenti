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
