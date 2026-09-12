import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Resize the approved, opaque mascot artwork without changing its design.
// Исходная иллюстрация лежит вне public/: в релиз уходит только webp 192 px и готовые значки.
const source = new URL("../artifacts/brand/iskra-mascot.png", import.meta.url);
const output = new URL("../public/app-icons/", import.meta.url);
await mkdir(output, { recursive: true });
for (const size of [180, 192, 512]) {
  await sharp(fileURLToPath(source)).resize(size, size).png().toFile(fileURLToPath(new URL(`iskra-${size}.png`, output)));
}
