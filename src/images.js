import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SIZES = { grid: 600, detail: 1600 };

async function resizeTo(src, outDir, baseName, size) {
  const pipeline = sharp(src).rotate().resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true });
  const webp = `${baseName}-${size}.webp`;
  const jpg = `${baseName}-${size}.jpg`;
  const info = await pipeline.clone().webp({ quality: 82 }).toFile(path.join(outDir, webp));
  await pipeline.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(outDir, jpg));
  return { webp, jpg, width: info.width, height: info.height };
}

export async function processImage(src, outDir, baseName) {
  await mkdir(outDir, { recursive: true });
  const [grid, detail] = await Promise.all([
    resizeTo(src, outDir, baseName, SIZES.grid),
    resizeTo(src, outDir, baseName, SIZES.detail),
  ]);
  return { grid, detail };
}
