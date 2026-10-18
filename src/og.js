import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const WIDTH = 1200;
const HEIGHT = 630;
const C = { ink: '#1a1a1a', soft: '#c4c4c4', muted: '#8a8a8a', bg: '#ffffff', surface: '#f4f4f4' };

let fontsPromise;
function fonts() {
  fontsPromise ??= Promise.all([400, 600].map(async (weight) => ({
    name: 'Inter',
    weight,
    style: 'normal',
    data: await readFile(require.resolve(`@fontsource/inter/files/inter-latin-${weight}-normal.woff`)),
  })));
  return fontsPromise;
}

const h = (type, style, ...children) => ({ type, props: { style, children: children.flat().filter((c) => c != null && c !== false) } });
const img = (src, width, height, style = {}) => ({ type: 'img', props: { src, width, height, style } });

export function truncateWords(text, max) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > 0 ? cut.slice(0, space) : cut.slice(0, max - 1)).replace(/[\s.,;:—-]+$/, '')}…`;
}

export function bookByline(book) {
  return [book.authors.join(', '), book.year].filter(Boolean).join(' · ');
}

async function coverImage(book, height) {
  const buf = await sharp(book.coverPath).rotate().resize({ height: height * 2, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const { width: w, height: hh } = await sharp(buf).metadata();
  return { src: `data:image/jpeg;base64,${buf.toString('base64')}`, width: Math.round((w / hh) * height), height };
}

async function render(tree) {
  const svg = await satori(tree, { width: WIDTH, height: HEIGHT, fonts: await fonts() });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng());
}

const shadow = '0 18px 40px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)';
const base = { width: WIDTH, height: HEIGHT, display: 'flex', boxSizing: 'border-box', fontFamily: 'Inter', overflow: 'hidden' };

const ASTERISK = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="#8a8a8a" stroke-width="2.2" stroke-linecap="round"><path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1"/></svg>')}`;
const brand = (config, size) => h('div', { display: 'flex', alignItems: 'center', fontSize: size, color: C.muted },
  img(ASTERISK, size * 0.8, size * 0.8, { marginRight: size * 0.45 }), config.title);

export async function renderBookOg(book, config) {
  const cover = await coverImage(book, 530);
  const coverWidth = Math.min(cover.width, 520);
  return render(h('div', { ...base, background: C.surface, padding: 50, alignItems: 'center' },
    img(cover.src, coverWidth, cover.height, { flexShrink: 0, objectFit: 'cover', borderRadius: 4, boxShadow: shadow }),
    h('div', { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', flex: 1, paddingLeft: 60, paddingBottom: 10 },
      h('div', { fontSize: 56, fontWeight: 600, color: C.ink, lineHeight: 1.08, letterSpacing: -1.5, wordBreak: 'break-word' }, truncateWords(book.title, 90)),
      h('div', { fontSize: 40, color: C.soft, lineHeight: 1.15, letterSpacing: -1, marginTop: 10 }, truncateWords(bookByline(book), 70)),
      h('div', { display: 'flex', marginTop: 40 }, brand(config, 22)))));
}

export async function renderExcerptOg(book, excerpt, config) {
  const cover = await coverImage(book, 84);
  const ref = [truncateWords(book.title, 60), excerpt.page && `p. ${excerpt.page}`].filter(Boolean).join(', ');
  return render(h('div', { ...base, background: C.bg, padding: '64px 72px', flexDirection: 'column', justifyContent: 'space-between' },
    h('div', { fontSize: 46, color: C.ink, lineHeight: 1.22, letterSpacing: -1, display: 'flex' }, `“${truncateWords(excerpt.text, 210)}”`),
    h('div', { display: 'flex', alignItems: 'center' },
      img(cover.src, cover.width, cover.height, { borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }),
      h('div', { display: 'flex', flexDirection: 'column', marginLeft: 22, flex: 1 },
        h('div', { fontSize: 26, fontWeight: 600, color: C.ink }, ref),
        h('div', { fontSize: 24, color: C.muted, marginTop: 4 }, truncateWords(book.authors.join(', '), 60))),
      brand(config, 22))));
}

const MOSAIC = { width: WIDTH - 128, height: 300, gap: 28, maxCover: 240 };

// Scales all covers by one factor so the row fits the width without cropping any of them.
export function mosaicLayout(covers) {
  const natural = covers.map((c) => Math.min(c.width, MOSAIC.maxCover) / c.width);
  const widths = covers.map((c, i) => c.width * natural[i]);
  const room = MOSAIC.width - MOSAIC.gap * Math.max(0, covers.length - 1);
  const fit = Math.min(1, room / widths.reduce((a, b) => a + b, 0));
  return covers.map((c, i) => ({ ...c, width: Math.floor(widths[i] * fit), height: Math.floor(c.height * natural[i] * fit) }));
}

export async function renderMosaicOg(title, books, config) {
  const covers = mosaicLayout(await Promise.all(books.slice(0, 6).map((b) => coverImage(b, MOSAIC.height))));
  return render(h('div', { ...base, background: C.surface, padding: '56px 64px', flexDirection: 'column', justifyContent: 'space-between' },
    h('div', { display: 'flex', alignItems: 'flex-end', gap: MOSAIC.gap, height: MOSAIC.height },
      covers.map((c) => img(c.src, c.width, c.height, { flexShrink: 0, borderRadius: 3, boxShadow: shadow }))),
    h('div', { display: 'flex', flexDirection: 'column' },
      h('div', { fontSize: 60, fontWeight: 600, color: C.ink, letterSpacing: -1.5 }, truncateWords(title, 40)),
      h('div', { fontSize: 40, color: C.soft, letterSpacing: -1, marginTop: 6 },
        `${books.length} ${books.length === 1 ? 'livro' : 'livros'}${title === config.title ? '' : ` · ${config.title}`}`))));
}
