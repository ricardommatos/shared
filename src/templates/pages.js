import { esc } from './escape.js';
import { layout, url } from './layout.js';
import { truncateWords, bookByline } from '../og.js';

const ICONS = {
  mark: '<path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1"/>',
  share: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  all: '<rect x="4" y="3" width="13" height="18" rx="2"/><path d="M20 6v13"/>',
  stack: '<path d="M4 9h16M6 5h12M5 13h14v6H5z"/>',
  quote: '<path d="M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
};
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

const byline = (book, withPublisher = false) =>
  [bookByline(book), withPublisher && book.publisher].filter(Boolean).join(' · ');

function picture(config, dir, images, alt, size, { lazy = true, className = '' } = {}) {
  const im = images[size];
  return `<picture class="${className}"><source type="image/webp" srcset="${url(config, `${dir}${im.webp}`)}"><img src="${url(config, `${dir}${im.jpg}`)}" width="${im.width}" height="${im.height}" alt="${esc(alt)}"${lazy ? ' loading="lazy" decoding="async"' : ''}></picture>`;
}

const coverPicture = (lib, book, size, opts) =>
  picture(lib.config, `${book.slug}/img/`, book.images, `Capa de ${book.title}`, size, opts);

function sidebar(lib, active) {
  const item = (href, key, label, count, iconName) => `<a class="nav-item${active === key ? ' is-active' : ''}" href="${url(lib.config, href)}"${active === key ? ' aria-current="page"' : ''}>${icon(iconName)}<span class="nav-label">${esc(label)}</span><span class="count">${count}</span></a>`;
  const excerptCount = lib.books.reduce((n, b) => n + b.excerpts.length, 0);
  return `<aside class="sidebar">
<a class="brand" href="${url(lib.config)}">${icon('mark')}<span>${esc(lib.config.title)}</span></a>
<nav class="nav" aria-label="Biblioteca">
${item('', 'all', 'Todos', lib.books.length, 'all')}
${item('excertos/', 'excerpts', 'Excertos', excerptCount, 'quote')}
${lib.collections.length ? `<div class="nav-heading">Coleções</div>
${lib.collections.map((c) => item(`c/${c.slug}/`, `c:${c.slug}`, c.name, c.books.length, 'stack')).join('\n')}` : ''}
</nav>
</aside>`;
}

const shell = (lib, active, main) => `<div class="app">
${sidebar(lib, active)}
<main class="main">
${main}
</main>
</div>`;

const shareButton = () => `<button class="pill" type="button" data-share>${icon('share')}<span data-share-label>Partilhar</span></button>`;

function bookGrid(lib, books) {
  return `<div class="toolbar">
<span class="toolbar-count">${books.length} ${books.length === 1 ? 'livro' : 'livros'}</span>
<div class="segmented" role="group" aria-label="Vista">
<button type="button" data-view="grid" aria-pressed="true">Grelha</button>
<button type="button" data-view="list" aria-pressed="false">Lista</button>
</div>
</div>
<ul class="books" data-books>
${books.map((b) => `<li><a class="card" href="${url(lib.config, `${b.slug}/`)}">
<div class="tile">${coverPicture(lib, b, 'grid')}</div>
<div class="card-text"><span class="card-title">${esc(b.title)}</span><span class="card-meta">${esc(byline(b))}</span></div>
</a></li>`).join('\n')}
</ul>`;
}

export function homePage(lib) {
  const { config } = lib;
  const main = `<header class="hero">
<h1><span class="ink">${esc(config.title)}.</span>${config.tagline ? ` <span class="soft">${esc(config.tagline)}</span>` : ''}</h1>
</header>
${bookGrid(lib, lib.books)}`;
  return {
    path: '',
    html: layout({
      config, path: '', title: config.title,
      description: config.tagline || `${lib.books.length} livros`,
      ogPath: 'og.png', body: shell(lib, 'all', main),
    }),
  };
}

export function collectionPage(lib, collection) {
  const path = `c/${collection.slug}/`;
  const main = `<header class="page-head">
<h1><span class="ink">${esc(collection.name)}.</span> <span class="soft">${collection.books.length} ${collection.books.length === 1 ? 'livro' : 'livros'} nesta coleção.</span></h1>
</header>
${bookGrid(lib, collection.books)}`;
  return {
    path,
    html: layout({
      config: lib.config, path, title: collection.name,
      description: `Coleção com ${collection.books.length} ${collection.books.length === 1 ? 'livro' : 'livros'}: ${collection.books.map((b) => b.title).join(', ')}`,
      ogPath: `${path}og.png`, body: shell(lib, `c:${collection.slug}`, main),
    }),
  };
}

function excerptCard(lib, book, excerpt, { showBook }) {
  return `<li><a class="excerpt-card" href="${url(lib.config, `${book.slug}/${excerpt.id}/`)}">
<p class="excerpt-snippet">${esc(truncateWords(excerpt.text, 220))}</p>
<span class="excerpt-ref">${showBook ? `${esc(book.title)}${excerpt.page ? ', ' : ''}` : ''}${excerpt.page ? `p. ${esc(excerpt.page)}` : ''}</span>
</a></li>`;
}

export function excerptsPage(lib) {
  const items = lib.books.flatMap((b) => b.excerpts.map((e) => excerptCard(lib, b, e, { showBook: true })));
  const main = `<header class="page-head">
<h1><span class="ink">Excertos.</span> <span class="soft">Passagens transcritas dos livros da biblioteca.</span></h1>
</header>
${items.length ? `<ul class="excerpts">\n${items.join('\n')}\n</ul>` : '<p class="empty">Ainda não há excertos.</p>'}`;
  return {
    path: 'excertos/',
    html: layout({
      config: lib.config, path: 'excertos/', title: 'Excertos',
      description: `${items.length} excertos de livros de design`,
      ogPath: 'excertos/og.png', body: shell(lib, 'excerpts', main),
    }),
  };
}

function ficha(lib, book) {
  const mark = (field) => (book.unverified.includes(field) ? ' <span class="unverified" title="a confirmar">·</span>' : '');
  const rows = [
    ['author', 'Autor', book.authors.join(', ')],
    ['year', 'Ano', book.year],
    ['publisher', 'Editora', book.publisher],
    ['edition', 'Edição', book.edition],
    ['isbn', 'ISBN', book.isbn],
    ['cover_designer', 'Design da capa', book.cover_designer],
    ['language', 'Idioma', book.language],
    ['condition', 'Estado do exemplar', book.condition],
  ].filter(([, , v]) => v != null && v !== '');
  const collections = book.collections.length
    ? `<dt>Coleções</dt><dd>${book.collections.map((name) => {
      const c = lib.collections.find((x) => x.name === name);
      return `<a href="${url(lib.config, `c/${c.slug}/`)}">${esc(name)}</a>`;
    }).join(', ')}</dd>`
    : '';
  return `<dl class="ficha">
${rows.map(([field, label, value]) => `<dt>${label}</dt><dd>${esc(value)}${mark(field)}</dd>`).join('\n')}
${collections}
</dl>`;
}

export function bookPage(lib, book) {
  const path = `${book.slug}/`;
  const hasUnverified = book.unverified.length > 0 || book.bodyHtml.includes('(a confirmar)');
  const main = `<header class="detail-head">
<div class="detail-title">
<h1>${esc(book.title)}</h1>
<p class="detail-meta">${esc(byline(book, true))}</p>
</div>
<div class="actions">
<a class="pill pill-icon" href="#ficha" aria-label="Ficha do livro">${icon('info')}</a>
${shareButton()}
</div>
</header>
<div class="stage">${coverPicture(lib, book, 'detail', { lazy: false, className: 'stage-cover' })}</div>
<section class="info">
<div class="prose">
${book.bodyHtml || ''}
${book.sources.length ? `<h2 class="label">Fontes</h2>
<ul class="sources">${book.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a></li>`).join('')}</ul>` : ''}
${hasUnverified ? '<p class="note-unverified"><span class="unverified">·</span> Informação marcada está por confirmar.</p>' : ''}
</div>
<aside id="ficha" class="ficha-wrap">
<h2 class="label">Ficha</h2>
${ficha(lib, book)}
</aside>
</section>
${book.excerpts.length ? `<section class="book-excerpts">
<h2 class="section-title">Excertos</h2>
<ul class="excerpts">
${book.excerpts.map((e) => excerptCard(lib, book, e, { showBook: false })).join('\n')}
</ul>
</section>` : ''}`;
  return {
    path,
    html: layout({
      config: lib.config, path, title: book.title,
      description: byline(book, true), ogPath: `${path}og.png`, ogType: 'book',
      body: shell(lib, null, main),
    }),
  };
}

export function excerptPage(lib, book, excerpt) {
  const path = `${book.slug}/${excerpt.id}/`;
  const ref = `${esc(book.title)}${excerpt.page ? `, p. ${esc(excerpt.page)}` : ''}`;
  const main = `<header class="detail-head">
<a class="back" href="${url(lib.config, `${book.slug}/`)}">${icon('back')}<span>${esc(book.title)}</span></a>
<div class="actions">${shareButton()}</div>
</header>
<article class="excerpt">
<blockquote class="quote">${excerpt.html}</blockquote>
<p class="cite"><a href="${url(lib.config, `${book.slug}/`)}">${ref}</a><span class="soft"> — ${esc(book.authors.join(', '))}</span></p>
${excerpt.note ? `<p class="excerpt-note">${esc(excerpt.note)}</p>` : ''}
${excerpt.images ? `<details class="original">
<summary>Ver original</summary>
${picture(lib.config, `${book.slug}/img/`, excerpt.images, `Página original${excerpt.page ? ` ${excerpt.page}` : ''} de ${book.title}`, 'detail')}
</details>` : ''}
</article>`;
  return {
    path,
    html: layout({
      config: lib.config, path, title: `${book.title}${excerpt.page ? `, p. ${excerpt.page}` : ''}`,
      description: truncateWords(excerpt.text, 160), ogPath: `${path}og.png`, ogType: 'article',
      body: shell(lib, null, main),
    }),
  };
}
