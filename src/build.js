import { mkdir, rm, writeFile, cp, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLibrary } from './library.js';
import { processImage } from './images.js';
import { renderBookOg, renderExcerptOg, renderMosaicOg } from './og.js';
import { homePage, collectionPage, excerptsPage, bookPage, excerptPage } from './templates/pages.js';

const require = createRequire(import.meta.url);
const ASSETS = fileURLToPath(new URL('../assets', import.meta.url));
const FONT_WEIGHTS = [400, 500, 600];

async function writePage(outDir, page, og) {
  const dir = path.join(outDir, page.path);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), page.html);
  await writeFile(path.join(dir, 'og.png'), await og);
}

async function copyAssets(outDir) {
  const target = path.join(outDir, 'assets');
  await cp(ASSETS, target, { recursive: true });
  await mkdir(path.join(target, 'fonts'), { recursive: true });
  for (const weight of FONT_WEIGHTS) {
    const name = `inter-latin-${weight}-normal.woff2`;
    await copyFile(require.resolve(`@fontsource/inter/files/${name}`), path.join(target, 'fonts', name));
  }
}

export async function build({ libraryDir, outDir }) {
  const lib = await loadLibrary(libraryDir);
  const { config } = lib;

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await copyAssets(outDir);

  for (const book of lib.books) {
    const imgDir = path.join(outDir, book.slug, 'img');
    book.images = await processImage(book.coverPath, imgDir, 'cover');
    for (const excerpt of book.excerpts) {
      if (excerpt.imagePath) excerpt.images = await processImage(excerpt.imagePath, imgDir, `excerpt-${excerpt.id}`);
    }
  }

  let pages = 0;
  const emit = async (page, og) => { await writePage(outDir, page, og); pages += 1; };

  await emit(homePage(lib), renderMosaicOg(config.title, lib.books, config));
  const withExcerpts = lib.books.filter((b) => b.excerpts.length);
  await emit(excerptsPage(lib), renderMosaicOg('Excertos', withExcerpts.length ? withExcerpts : lib.books, config));
  for (const collection of lib.collections) {
    await emit(collectionPage(lib, collection), renderMosaicOg(collection.name, collection.books, config));
  }
  for (const book of lib.books) {
    await emit(bookPage(lib, book), renderBookOg(book, config));
    for (const excerpt of book.excerpts) {
      await emit(excerptPage(lib, book, excerpt), renderExcerptOg(book, excerpt, config));
    }
  }

  const index = lib.books.map(({ slug, title, authors }) => ({ slug, title, authors }));
  await writeFile(path.join(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  return { pages, warnings: lib.warnings };
}
