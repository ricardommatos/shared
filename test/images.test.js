import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { processImage } from '../src/images.js';
import { tempDir } from './helpers.js';

const makeJpg = (file, width, height) =>
  sharp({ create: { width, height, channels: 3, background: '#888' } }).jpeg().toFile(file);

test('creates grid and detail sizes in webp and jpg', async () => {
  const dir = await tempDir();
  const src = path.join(dir, 'big.jpg');
  await makeJpg(src, 3000, 2000);
  const out = path.join(dir, 'out');
  const r = await processImage(src, out, 'cover');
  assert.equal(r.grid.width, 600);
  assert.equal(r.grid.height, 400);
  assert.equal(r.detail.width, 1600);
  assert.equal(r.grid.webp, 'cover-600.webp');
  assert.equal(r.detail.jpg, 'cover-1600.jpg');
  for (const f of [r.grid.webp, r.grid.jpg, r.detail.webp, r.detail.jpg]) await access(path.join(out, f));
});

test('never upscales small images', async () => {
  const dir = await tempDir();
  const src = path.join(dir, 'small.jpg');
  await makeJpg(src, 400, 300);
  const r = await processImage(src, path.join(dir, 'out'), 'p');
  assert.equal(r.grid.width, 400);
  assert.equal(r.detail.width, 400);
});
