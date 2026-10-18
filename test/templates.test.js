import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLibrary } from '../src/library.js';
import { esc } from '../src/templates/escape.js';
import { homePage, collectionPage, excerptsPage, bookPage, excerptPage } from '../src/templates/pages.js';
import { FIXTURE } from './helpers.js';

const fakeImages = (name) => ({
  grid: { webp: `${name}-600.webp`, jpg: `${name}-600.jpg`, width: 600, height: 800 },
  detail: { webp: `${name}-1600.webp`, jpg: `${name}-1600.jpg`, width: 1200, height: 1600 },
});

const lib = await loadLibrary(FIXTURE);
for (const b of lib.books) {
  b.images = fakeImages('cover');
  for (const e of b.excerpts) if (e.imagePath) e.images = fakeImages(`excerpt-${e.id}`);
}
const book = (slug) => lib.books.find((b) => b.slug === slug);

test('esc escapes html-significant characters', () => {
  assert.equal(esc('O "L" <R> & C'), 'O &quot;L&quot; &lt;R&gt; &amp; C');
});

test('meta tags escape titles with quotes and markup', () => {
  const { html } = bookPage(lib, book('aspas'));
  assert.ok(html.includes('<meta property="og:title" content="O &quot;Livro&quot; &lt;Raro&gt; &amp; Cia">'));
  assert.ok(!html.includes('<Raro>'));
});

test('book page has absolute share-image meta and noindex', () => {
  const { path, html } = bookPage(lib, book('grid-systems'));
  assert.equal(path, 'grid-systems/');
  assert.ok(html.includes('<meta property="og:image" content="https://x.pt/biblioteca/grid-systems/og.png">'));
  assert.ok(html.includes('<meta property="og:url" content="https://x.pt/biblioteca/grid-systems/">'));
  assert.ok(html.includes('<meta property="og:image:width" content="1200">'));
  assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
  assert.ok(html.includes('<meta name="robots" content="noindex">'));
  assert.ok(html.includes('<html lang="pt">'));
});

test('book page lists excerpts and marks unverified fields', () => {
  const { html } = bookPage(lib, book('grid-systems'));
  assert.ok(html.includes('href="/biblioteca/grid-systems/01/"'));
  assert.match(html, /1\.ª edição[^<]*<span class="unverified" title="a confirmar"/);
  assert.ok(html.includes('href="https://en.wikipedia.org/wiki/Josef_M%C3%BCller-Brockmann"'));
});

test('book without year or excerpts has no empty sections', () => {
  const { html } = bookPage(lib, book('sem-ano'));
  assert.ok(!html.includes('Excertos</h2>'));
  assert.ok(!html.includes(' · '));
});

test('home page links collections with accents by ascii slug and count', () => {
  const { path, html } = homePage(lib);
  assert.equal(path, '');
  assert.match(html, /href="\/biblioteca\/c\/tipografia-portuguesa\/"[^>]*>[\s\S]*?Tipografia Portuguesa[\s\S]*?<span class="count">1<\/span>/);
  assert.ok(html.includes('<meta property="og:image" content="https://x.pt/biblioteca/og.png">'));
});

test('collection, excerpts and excerpt pages have expected paths', () => {
  const tp = lib.collections.find((c) => c.slug === 'tipografia-portuguesa');
  assert.equal(collectionPage(lib, tp).path, 'c/tipografia-portuguesa/');
  assert.equal(excerptsPage(lib).path, 'excertos/');
  const b = book('grid-systems');
  const { path, html } = excerptPage(lib, b, b.excerpts[0]);
  assert.equal(path, 'grid-systems/01/');
  assert.ok(html.includes('p. xii'));
  assert.ok(html.includes('A frase que abre o livro.'));
  assert.ok(html.includes('Ver original'));
  assert.ok(!excerptPage(lib, b, b.excerpts[1]).html.includes('Ver original'));
});

test('text years appear in the ficha and byline', () => {
  const b = { ...book('sem-ano'), year: 'c. 1960' };
  const { html } = bookPage(lib, b);
  assert.ok(html.includes('<dd>c. 1960</dd>'));
  assert.ok(html.includes('Autor Desconhecido · c. 1960'));
  assert.ok(!html.includes('NaN'));
});
