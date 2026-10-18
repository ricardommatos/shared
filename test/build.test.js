import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { build } from '../src/build.js';
import { LibraryError } from '../src/library.js';
import { FIXTURE, tempDir, copyFixture } from './helpers.js';

let out;
let files;
before(async () => {
  out = await tempDir('site-');
  await build({ libraryDir: FIXTURE, outDir: out });
  files = await readdir(out, { recursive: true });
});

const exists = (p) => access(p).then(() => true, () => false);
const htmlFiles = () => files.filter((f) => f.endsWith('index.html'));

test('every page has a 1200x630 og.png beside it', async () => {
  assert.ok(htmlFiles().length >= 8);
  for (const f of htmlFiles()) {
    const og = path.join(out, path.dirname(f), 'og.png');
    const meta = await sharp(og).metadata();
    assert.deepEqual([meta.width, meta.height], [1200, 630], og);
  }
});

test('every og:image is absolute under siteUrl and points to a built file', async () => {
  for (const f of htmlFiles()) {
    const html = await readFile(path.join(out, f), 'utf8');
    const m = html.match(/<meta property="og:image" content="([^"]+)">/);
    assert.ok(m, f);
    assert.ok(m[1].startsWith('https://x.pt/biblioteca/'), m[1]);
    assert.ok(await exists(path.join(out, m[1].slice('https://x.pt/biblioteca/'.length))), m[1]);
  }
});

test('no broken internal links or assets', async () => {
  for (const f of htmlFiles()) {
    const html = await readFile(path.join(out, f), 'utf8');
    for (const [, ref] of html.matchAll(/(?:href|src|srcset)="(\/biblioteca\/[^"#]*)/g)) {
      const rel = decodeURI(ref.slice('/biblioteca/'.length));
      const target = path.join(out, rel);
      const ok = rel === '' || rel.endsWith('/') ? await exists(path.join(target, 'index.html')) : await exists(target);
      assert.ok(ok, `${f} → ${ref}`);
    }
  }
});

test('builds collection pages, index.json and fonts; no capture or external fonts', async () => {
  assert.ok(files.includes(path.join('c', 'tipografia-portuguesa', 'index.html')));
  const index = JSON.parse(await readFile(path.join(out, 'index.json'), 'utf8'));
  assert.deepEqual(index.find((b) => b.slug === 'aspas'), { slug: 'aspas', title: 'O "Livro" <Raro> & Cia', authors: ['Ana Silva', 'João Costa'] });
  assert.ok(files.includes(path.join('assets', 'fonts', 'inter-latin-500-normal.woff2')));
  assert.ok(!files.some((f) => f.startsWith('capture')));
  for (const f of files.filter((x) => /\.(html|css|js)$/.test(x))) {
    assert.ok(!(await readFile(path.join(out, f), 'utf8')).includes('fonts.googleapis'), f);
  }
});

test('rebuild clears stale files', async () => {
  const dir = await tempDir('site-');
  await writeFile(path.join(dir, 'stale.txt'), 'x');
  await build({ libraryDir: FIXTURE, outDir: dir });
  assert.equal(await exists(path.join(dir, 'stale.txt')), false);
});

test('build rejects a broken library', async () => {
  const lib = await copyFixture();
  await writeFile(path.join(lib, 'books/sem-ano/book.md'), '---\nauthor: X\n---\n');
  await assert.rejects(build({ libraryDir: lib, outDir: await tempDir() }), LibraryError);
});
