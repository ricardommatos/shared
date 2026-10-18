import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { loadLibrary, LibraryError } from '../src/library.js';
import { FIXTURE, copyFixture } from './helpers.js';

test('loads books sorted by title with normalised fields', async () => {
  const lib = await loadLibrary(FIXTURE);
  assert.deepEqual(lib.books.map((b) => b.slug), ['grid-systems', 'aspas', 'sem-ano']);
  const grid = lib.books[0];
  assert.deepEqual(grid.authors, ['Josef Müller-Brockmann']);
  assert.equal(grid.year, '1981');
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

test('rejects book folders that are not valid slugs or are reserved', async () => {
  for (const bad of ['Pasta Com Espaço', 'excertos', 'c', 'assets']) {
    const dir = await copyFixture();
    await rename(path.join(dir, 'books/sem-ano'), path.join(dir, 'books', bad));
    await assert.rejects(loadLibrary(dir), (e) => e instanceof LibraryError && e.message.startsWith(`${bad}:`), bad);
  }
});

test('rejects excerpt files with invalid ids', async () => {
  const dir = await copyFixture();
  await rename(path.join(dir, 'books/grid-systems/excerpts/02.md'), path.join(dir, 'books/grid-systems/excerpts/Nota 2.md'));
  await assert.rejects(loadLibrary(dir), /grid-systems: excerpt file 'Nota 2\.md'/);
});

test('rejects collections whose names collide on the same slug or have no slug', async () => {
  const dir = await copyFixture();
  await writeFile(path.join(dir, 'books/sem-ano/book.md'), '---\ntitle: S\nauthor: A\ncollections: [tipografia portuguesa]\n---\n');
  await assert.rejects(loadLibrary(dir), /collection 'tipografia portuguesa' has the same address as 'Tipografia Portuguesa'/);
  await writeFile(path.join(dir, 'books/sem-ano/book.md'), '---\ntitle: S\nauthor: A\ncollections: ["日本"]\n---\n');
  await assert.rejects(loadLibrary(dir), /sem-ano: collection '日本' needs latin letters or digits/);
});

test('keeps non-numeric years as text', async () => {
  const dir = await copyFixture();
  await writeFile(path.join(dir, 'books/sem-ano/book.md'), '---\ntitle: S\nauthor: A\nyear: c. 1960\n---\n');
  const lib = await loadLibrary(dir);
  assert.equal(lib.books.find((b) => b.slug === 'sem-ano').year, 'c. 1960');
});

test('renders excerpts as plain escaped paragraphs, not markdown', async () => {
  const dir = await copyFixture();
  await writeFile(path.join(dir, 'books/grid-systems/excerpts/02.md'), '---\npage: 3\n---\n1960. Foi o ano <b>da</b> *grelha*.\n\nSegundo.\n');
  const ex = (await loadLibrary(dir)).books[0].excerpts[1];
  assert.equal(ex.html, '<p>1960. Foi o ano &lt;b&gt;da&lt;/b&gt; *grelha*.</p>\n<p>Segundo.</p>');
});
