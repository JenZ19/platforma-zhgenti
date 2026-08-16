import sharp from "sharp";

export async function writeWebpScreenshot(locator, file) {
  const png = await locator.screenshot({ type: "png", animations: "disabled" });
  await sharp(png).resize(800, 534).webp({ quality: 62, effort: 6 }).toFile(file);
}

export async function assertWebpSize(file, width = 800, height = 534) {
  const metadata = await sharp(file).metadata();
  if (metadata.format !== "webp" || metadata.width !== width || metadata.height !== height) {
    throw new Error(`Неверный WebP ${file}: ${metadata.width ?? 0}x${metadata.height ?? 0}`);
  }
}
