import sharp from "sharp";

export async function writeWebpScreenshot(locator, file) {
  const png = await locator.screenshot({ type: "png", animations: "disabled" });
  await sharp(png).webp({ quality: 72, effort: 6 }).toFile(file);
}

export async function assertWebpSize(file, width = 1200, height = 800) {
  const metadata = await sharp(file).metadata();
  if (metadata.format !== "webp" || metadata.width !== width || metadata.height !== height) {
    throw new Error(`Неверный WebP ${file}: ${metadata.width ?? 0}x${metadata.height ?? 0}`);
  }
}
