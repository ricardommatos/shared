import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { loadLibrary } from '../src/library.js';
import { renderBookOg, renderExcerptOg, renderMosaicOg, truncateWords, bookByline } from '../src/og.js';
import { FIXTURE } from './helpers.js';

const lib = await loadLibrary(FIXTURE);
const book = (slug) => lib.books.find((b) => b.slug === slug);

async function assertOgPng(buf) {
  const meta = await sharp(buf).metadata();
  assert.equal(meta.format, 'png');
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 630);
}

test('truncateWords cuts at a word boundary with an ellipsis', () => {
  assert.equal(truncateWords('a b c d', 5), 'a b…');
  assert.equal(truncateWords('curto', 50), 'curto');
});

test('bookByline skips missing year', () => {
  assert.equal(bookByline(book('sem-ano')), 'Autor Desconhecido');
  assert.equal(bookByline(book('aspas')), 'Ana Silva, João Costa · 1965');
});

test('book share image is a 1200x630 png', async () => {
  await assertOgPng(await renderBookOg(book('grid-systems'), lib.config));
});

test('book share image handles quotes and markup characters in titles', async () => {
  await assertOgPng(await renderBookOg(book('aspas'), lib.config));
});

test('excerpt share image stays 1200x630 for very long text', async () => {
  const b = book('grid-systems');
  const long = { ...b.excerpts[0], text: 'palavra '.repeat(320) };
  await assertOgPng(await renderExcerptOg(b, long, lib.config));
});

test('mosaic share image is a 1200x630 png', async () => {
  await assertOgPng(await renderMosaicOg('Biblioteca de design', lib.books, lib.config));
});
