import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { coverPath, projectSlugs, root } from "./projects.mjs";

const slugs = projectSlugs();
const expected = new Set(slugs.map((slug) => path.basename(coverPath(slug))));
const directory = path.join(root, "public", "covers");
const problems = [];
const hashes = new Map();

if (!fs.existsSync(directory)) {
  problems.push("Нет папки public/covers");
} else {
  const actual = fs.readdirSync(directory).filter((name) => name.endsWith(".webp"));
  for (const name of actual) if (!expected.has(name)) problems.push(`Лишняя обложка: ${name}`);

  for (const slug of slugs) {
    const file = coverPath(slug);
    if (!fs.existsSync(file)) {
      problems.push(`Нет обложки: ${slug}`);
      continue;
    }
    const bytes = fs.readFileSync(file);
    if (bytes.subarray(0, 4).toString("ascii") !== "RIFF" || bytes.subarray(8, 12).toString("ascii") !== "WEBP") {
      problems.push(`Не WebP: ${slug}`);
      continue;
    }
    if (bytes.length <= 4_000) problems.push(`Слишком маленький файл: ${slug} (${bytes.length} байт)`);
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");
    const duplicate = hashes.get(hash);
    if (duplicate) problems.push(`Повторяется изображение: ${duplicate} и ${slug}`);
    else hashes.set(hash, slug);
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

const totalBytes = slugs.reduce((sum, slug) => sum + fs.statSync(coverPath(slug)).size, 0);
console.log(`Проверено ${slugs.length} разных WebP-обложек, общий размер ${(totalBytes / 1024 / 1024).toFixed(2)} МБ.`);
