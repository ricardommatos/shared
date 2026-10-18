import { test } from 'node:test';
import assert from 'node:assert/strict';
import matter from 'gray-matter';
import { buildZipEntries, slugify as captureSlugify } from '../capture/export.js';
import { slugify } from '../src/slug.js';

const jpg = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
const draft = {
  title: 'Ação Gráfica',
  author: 'Sebastião Rodrigues',
  cover: jpg(),
  excerpts: [
    { page: '42', note: 'Uma nota: com "aspas"', text: 'Primeiro texto.\n\nSegundo parágrafo.', image: jpg() },
    { text: 'Sem página.' },
  ],
};

test('zip entries follow the library folder structure', () => {
  const paths = buildZipEntries(draft).map((e) => e.path);
  assert.deepEqual(paths, [
    'acao-grafica-sebastiao-rodrigues/book.md',
    'acao-grafica-sebastiao-rodrigues/cover.jpg',
    'acao-grafica-sebastiao-rodrigues/excerpts/01.md',
    'acao-grafica-sebastiao-rodrigues/excerpts/01.jpg',
    'acao-grafica-sebastiao-rodrigues/excerpts/02.md',
  ]);
});

test('book.md and excerpt front matter parse back to the draft values', () => {
  const entries = Object.fromEntries(buildZipEntries(draft).map((e) => [e.path.split('/').slice(1).join('/'), e.data]));
  assert.deepEqual(matter(entries['book.md']).data, { title: 'Ação Gráfica', author: 'Sebastião Rodrigues' });
  const first = matter(entries['excerpts/01.md']);
  assert.deepEqual(first.data, { page: '42', note: 'Uma nota: com "aspas"', image: '01.jpg' });
  assert.equal(first.content.trim(), 'Primeiro texto.\n\nSegundo parágrafo.');
  assert.deepEqual(matter(entries['excerpts/02.md']).data, {});
});

test('excerpts with empty text are skipped', () => {
  const paths = buildZipEntries({ ...draft, excerpts: [{ text: '   ' }, ...draft.excerpts] }).map((e) => e.path);
  assert.ok(paths.includes('acao-grafica-sebastiao-rodrigues/excerpts/02.md'));
  assert.ok(!paths.includes('acao-grafica-sebastiao-rodrigues/excerpts/03.md'));
});

test('capture slugify matches the generator slugify', () => {
  for (const s of ['Grid Systems — Müller-Brockmann 1981', 'Ação Gráfica', '  --a  b-- ']) {
    assert.equal(captureSlugify(s), slugify(s));
  }
});

test('excerpts with a photo but no text are kept with a placeholder', () => {
  const entries = buildZipEntries({ ...draft, excerpts: [{ text: '', page: '7', image: jpg() }] });
  const md = entries.find((e) => e.path.endsWith('excerpts/01.md'));
  assert.ok(entries.some((e) => e.path.endsWith('excerpts/01.jpg')));
  assert.equal(matter(md.data).content.trim(), '(transcrever a partir da foto)');
});
