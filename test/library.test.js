import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadLibrary, LibraryError } from '../src/library.js';
import { FIXTURE, copyFixture } from './helpers.js';

test('loads books sorted by title with normalised fields', async () => {
  const lib = await loadLibrary(FIXTURE);
  assert.deepEqual(lib.books.map((b) => b.slug), ['grid-systems', 'aspas', 'sem-ano']);
  const grid = lib.books[0];
  assert.deepEqual(grid.authors, ['Josef Müller-Brockmann']);
  assert.equal(grid.year, 1981);
  assert.deepEqual(grid.unverified, ['edition']);
  assert.match(grid.bodyHtml, /<strong>grelhas<\/strong>/);
  assert.deepEqual(grid.excerpts.map((e) => e.id), ['01', '02']);
  assert.equal(grid.excerpts[0].page, 'xii');
  assert.equal(grid.excerpts[0].note, 'A frase que abre o livro.');
  assert.ok(grid.excerpts[0].imagePath.endsWith(path.join('excerpts', '01.jpg')));
  assert.equal(grid.excerpts[1].imagePath, undefined);
  assert.ok(grid.coverPath.endsWith('cover.jpg'));
  const semAno = lib.books.find((b) => b.slug === 'sem-ano');
  assert.deepEqual(semAno.excerpts, []);
  assert.deepEqual(semAno.collections, []);
  assert.deepEqual(lib.books.find((b) => b.slug === 'aspas').authors, ['Ana Silva', 'João Costa']);
});

test('builds collections with ascii slugs and display names', async () => {
  const lib = await loadLibrary(FIXTURE);
  const tp = lib.collections.find((c) => c.name === 'Tipografia Portuguesa');
  assert.equal(tp.slug, 'tipografia-portuguesa');
  assert.equal(tp.books.length, 1);
  assert.equal(lib.collections.find((c) => c.name === 'Tipografia').books.length, 2);
});

test('normalises siteUrl and derives basePath', async () => {
  const lib = await loadLibrary(FIXTURE);
  assert.equal(lib.config.siteUrl, 'https://x.pt/biblioteca');
  assert.equal(lib.config.basePath, '/biblioteca/');
  assert.equal(lib.config.indexable, false);
  const dir = await copyFixture();
  await writeFile(path.join(dir, 'config.json'), JSON.stringify({ title: 'T' }));
  const lib2 = await loadLibrary(dir);
  assert.equal(lib2.config.siteUrl, 'http://localhost:4321');
  assert.equal(lib2.config.basePath, '/');
});

test('warns on unknown front-matter fields', async () => {
  const lib = await loadLibrary(FIXTURE);
  assert.ok(lib.warnings.includes("grid-systems: unknown field 'foo'"));
});

test('rejects a book without title', async () => {
  const dir = await copyFixture();
  await writeFile(path.join(dir, 'books/sem-ano/book.md'), '---\nauthor: X\n---\n');
  await assert.rejects(loadLibrary(dir), (e) => e instanceof LibraryError && /^sem-ano: missing title/.test(e.message));
});

test('rejects a book without cover', async () => {
  const dir = await copyFixture();
  await rm(path.join(dir, 'books/sem-ano/cover.jpg'));
  await assert.rejects(loadLibrary(dir), /sem-ano: missing cover\.jpg/);
});

test('rejects an empty excerpt', async () => {
  const dir = await copyFixture();
  await writeFile(path.join(dir, 'books/grid-systems/excerpts/01.md'), '---\npage: 1\n---\n  \n');
  await assert.rejects(loadLibrary(dir), /grid-systems: excerpt 01 is empty/);
});

test('warns when siteUrl is not set', async () => {
  const dir = await copyFixture();
  await writeFile(path.join(dir, 'config.json'), JSON.stringify({ siteUrl: '' }));
  const lib = await loadLibrary(dir);
  assert.ok(lib.warnings.some((w) => /siteUrl/.test(w)));
  assert.ok(!(await loadLibrary(FIXTURE)).warnings.some((w) => /siteUrl/.test(w)));
});
