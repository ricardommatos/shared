# Biblioteca de Design — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static site generator that turns `library/books/*` folders into a shareable design-book library with per-page 1200×630 share images, plus a phone capture page that exports book zips.

**Architecture:** Plain Node ESM modules, no site framework. `src/library.js` reads and validates content; `src/images.js` and `src/og.js` produce images; `src/templates/*` return HTML strings; `src/build.js` orchestrates into `site/`. The capture page is a standalone static folder `capture/` using CDN-free vendored libs.

**Tech Stack:** Node ≥20 (ESM), `node:test`, `gray-matter`, `marked`, `satori`, `@resvg/resvg-js`, `sharp`, `@fontsource/inter` (woff for Satori + woff2 for the site), `tesseract.js`, `jszip`, `idb-keyval`.

**Spec:** `docs/superpowers/specs/2026-10-18-biblioteca-design-design.md`

## Global Constraints

- Language of all UI copy: Portuguese (pt-PT). `<html lang="pt">`.
- Tokens (`:root`): `--ink:#1a1a1a; --ink-soft:#c4c4c4; --muted:#8a8a8a; --bg:#ffffff; --surface:#f4f4f4; --line:#e8e8e8`; dark mode via `prefers-color-scheme: dark` with inverted values.
- Font: Inter, self-hosted under `site/assets/fonts/`; no Google Fonts or other external requests from the public site.
- Share images: PNG exactly 1200×630, file name `og.png` next to each page's `index.html`.
- `og:image` and `og:url` are absolute: `config.siteUrl` (trailing slash normalised) + path.
- Every public page has `<meta name="robots" content="noindex">` unless `config.indexable === true`.
- URLs: `/`, `/c/<tag-slug>/`, `/excertos/`, `/<book-slug>/`, `/<book-slug>/<NN>/`; every page is `<dir>/index.html`; all internal links relative-safe via absolute paths from `config.basePath` (default derived from `siteUrl` pathname).
- Slug: lowercase, accents stripped (NFD + remove combining marks), non-alphanumerics → `-`, collapsed, trimmed.
- Images: grid 600 px, detail 1600 px (longest side), both WebP + JPG. Originals never copied to `site/`.
- `capture/` is never copied into `site/`.

## Review Focus

1. Titles/quotes containing `"`, `<`, `&` — must be HTML-escaped in text and in meta `content` attributes (test in Task 4).
2. Portuguese accents in titles and collection names (`Tipografia Portuguesa`, `Ação`) — slugs ascii, display text intact (tests in Tasks 1 and 5).
3. Book with no excerpts, no year, no publisher — pages render without stray ` · ` separators or empty sections (test in Task 4).
4. Very long excerpt (2 000+ chars) — share image text truncated with "…", never overflows (test in Task 3).
5. `siteUrl` with or without trailing slash / with subpath (`https://x.pt/biblioteca`) — og URLs and internal links still correct (tests in Tasks 4 and 5).

---

## File Structure

```
package.json
library/config.json                 sample config
library/books/<slug>/...            sample content (2 books)
src/slug.js                         slugify()
src/library.js                      loadLibrary(), validation
src/images.js                       processCover(), processExcerptImage()
src/og.js                           renderBookOg(), renderExcerptOg(), renderMosaicOg()
src/templates/layout.js             layout({ meta, body, config }) + meta tags
src/templates/pages.js              homePage, collectionPage, excerptsPage, bookPage, excerptPage
src/templates/escape.js             esc()
src/build.js                        build({ libraryDir, outDir })
scripts/build.js                    CLI entry
scripts/dev.js                      build + static server on :4321
assets/site.css                     public CSS
assets/site.js                      share button, grid/list toggle
capture/index.html, capture.css, capture.js, vendor/
test/fixtures/library/...           fixture library incl. edge cases
test/*.test.js
README.md                           how to capture, build, publish
```

---

### Task 1: Project scaffold, slugs and library loader

**Files:**
- Create: `package.json`, `.gitignore` (`node_modules/`, `site/`), `src/slug.js`, `src/library.js`, `test/slug.test.js`, `test/library.test.js`, `test/fixtures/library/**`

**Interfaces:**
- Produces:
  - `slugify(text: string): string`
  - `loadLibrary(dir: string): Promise<Library>` where
    `Library = { config: Config, books: Book[], collections: Collection[], warnings: string[] }`
    `Config = { siteUrl: string, basePath: string, title: string, tagline: string, owner: string, indexable: boolean }` (`siteUrl` stored without trailing slash; `basePath` = URL pathname with trailing slash, e.g. `/biblioteca/`)
    `Book = { slug, dir, title, authors: string[], year?: number, publisher?, edition?, isbn?, cover_designer?, language?, collections: string[], condition?, unverified: string[], sources: {label,url}[], bodyHtml: string, coverPath: string, excerpts: Excerpt[] }`
    `Excerpt = { id: string /* "01" */, page?: string, note?: string, imagePath?: string, text: string, html: string }`
    `Collection = { name: string, slug: string, books: Book[] }`
  - Throws `LibraryError` (exported class) with message `"<book-slug>: <problem>"`.

- [ ] **Step 1: npm init**, `"type":"module"`, scripts `build`, `dev`, `test` (`node --test`), engines `node >=20`. Install deps listed in Tech Stack (dev: none needed beyond node:test).
- [ ] **Step 2: Write failing tests**
  - `slugify('Grid Systems — Müller-Brockmann 1981') === 'grid-systems-muller-brockmann-1981'`
  - `slugify('Ação Gráfica') === 'acao-grafica'`; `slugify('  --a  b-- ') === 'a-b'`
  - fixture with 3 books: `grid-systems` (full fields, 2 excerpts), `sem-ano` (only title/author/cover, no excerpts), `aspas` (title `O "Livro" <Raro> & Cia`, collection `Tipografia Portuguesa`).
  - `loadLibrary` returns 3 books sorted by title; `authors` is always an array; excerpts sorted by id; `collections` contains `{ name:'Tipografia Portuguesa', slug:'tipografia-portuguesa' }`.
  - Config `siteUrl: 'https://x.pt/biblioteca/'` → `siteUrl === 'https://x.pt/biblioteca'`, `basePath === '/biblioteca/'`; missing siteUrl → `'http://localhost:4321'`, `'/'`.
  - Missing `title` → rejects with `LibraryError` matching `/^broken: missing title/`; missing `cover.jpg` → `/missing cover\.jpg/`; empty excerpt body → `/excerpt 01 is empty/` (each in its own temp copy of a tiny fixture).
  - Unknown front-matter field → resolves, `warnings` contains `"grid-systems: unknown field 'foo'"`.
- [ ] **Step 3: Run `npm test`** — expect failures (modules missing).
- [ ] **Step 4: Implement** `slugify` (NFD, strip `\p{M}`, lower, replace `[^a-z0-9]+` with `-`, trim `-`) and `loadLibrary` (gray-matter + marked; book slug = folder name).
- [ ] **Step 5: Run `npm test`** — PASS.
- [ ] **Step 6: Commit** `feat: library loader and slugs`.

### Task 2: Image processing

**Files:** Create `src/images.js`, `test/images.test.js`

**Interfaces:**
- Consumes: `Book.coverPath`, `Excerpt.imagePath`
- Produces: `processImage(src: string, outDir: string, baseName: string): Promise<{ grid:{webp,jpg,width,height}, detail:{webp,jpg,width,height} }>` — paths relative to `outDir`, files named `<baseName>-600.webp|jpg`, `<baseName>-1600.webp|jpg`. Never upscales.

- [ ] **Step 1: Failing test:** generate a 3000×2000 JPG with sharp in a temp dir → result grid width 600, detail width 1600, all four files exist; a 400×300 source → grid width 400 (no upscale).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** with `sharp(src).rotate().resize({ width, height, fit:'inside', withoutEnlargement:true })` (`.rotate()` honours EXIF orientation from phone photos).
- [ ] **Step 4: Run** — PASS. **Step 5: Commit** `feat: image resizing`.

### Task 3: Share images (og.png)

**Files:** Create `src/og.js`, `test/og.test.js`

**Interfaces:**
- Consumes: `Book`, `Excerpt`, `Config`
- Produces:
  - `renderBookOg(book: Book, config: Config): Promise<Buffer>`
  - `renderExcerptOg(book: Book, excerpt: Excerpt, config: Config): Promise<Buffer>`
  - `renderMosaicOg(title: string, books: Book[], config: Config): Promise<Buffer>` (first 6 covers)
  - `truncateWords(text: string, max: number): string` — cuts at a word boundary ≤ `max` chars and appends `…`; returns input unchanged when shorter.

Layouts per spec §6: book = bg `#f4f4f4`, cover left (height 550, soft shadow), right block bottom-aligned: title 56px `#1a1a1a` weight 600, `Autor · Ano` 40px `#c4c4c4`, library title 22px `#8a8a8a`. Excerpt = white bg, quote 44px max 220 chars via `truncateWords`, footer row: cover thumb 80px high, `Título, p. NN`, library title. Covers passed to Satori as data URIs of the 600px JPG (resize in-memory with sharp). Fonts: Inter 400 and 600 `.woff` from `@fontsource/inter/files/`.

- [ ] **Step 1: Failing tests:** each renderer returns a PNG whose `sharp(buf).metadata()` is `{ width:1200, height:630, format:'png' }`; `renderExcerptOg` with a 2 500-char excerpt still returns 1200×630; `truncateWords('a b c d', 5) === 'a b…'`; title with `"<&` renders without throwing; book without year → no ` · ` (assert via exported `bookByline(book) === 'Autor'`).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** (Satori element trees as plain objects; `bookByline(book): string` joins `authors.join(', ')`, `year` with ` · `, skipping missing). **Step 4: Run** — PASS.
- [ ] **Step 5: Visual check:** write the three PNGs for the fixture to the scratchpad and look at them; adjust spacing until it reads like the Atlas hero. **Step 6: Commit** `feat: share images`.

### Task 4: Templates and CSS

**Files:** Create `src/templates/escape.js`, `src/templates/layout.js`, `src/templates/pages.js`, `assets/site.css`, `assets/site.js`, `test/templates.test.js`

**Interfaces:**
- Consumes: `Library`, `Book`, `Excerpt`, `Collection`, `Config`, image results from Task 2 (`book.images`, `excerpt.images` — attached by the build)
- Produces:
  - `esc(s: string): string`
  - `layout({ config, path, title, description, ogPath, ogType, body }): string` — `path` and `ogPath` are site-relative without leading slash (`'grid-systems/'`, `'grid-systems/og.png'`).
  - `homePage(lib)`, `collectionPage(lib, collection)`, `excerptsPage(lib)`, `bookPage(lib, book)`, `excerptPage(lib, book, excerpt)` — each returns `{ path, html }`.

Page contents per spec §5 (hero two-tone: `<span class="ink">{title}.</span> <span class="soft">{tagline}</span>`; sidebar Todos / coleções com contadores / Excertos; book header with *Partilhar* and *ⓘ* pills; `unverified` fields marked with a `·` dot + `title="a confirmar"`; excerpt "Ver original" as `<details>`). `site.js`: share button uses `navigator.share` when available else `navigator.clipboard.writeText(location.href)` and shows "Link copiado"; grid/list toggle stored in `localStorage` inside try/catch. CSS: tokens from Global Constraints, sidebar collapses to horizontal scroll row below 760px, 16px side gutter, no horizontal page scroll.

- [ ] **Step 1: Failing tests:**
  - `esc('O "L" <R> & C') === 'O &quot;L&quot; &lt;R&gt; &amp; C'`
  - `bookPage` for `aspas` contains `<meta property="og:title" content="O &quot;Livro&quot; &lt;Raro&gt; &amp; Cia">`
  - with `siteUrl 'https://x.pt/biblioteca'`, `bookPage(grid-systems)` contains `content="https://x.pt/biblioteca/grid-systems/og.png"`, `og:image:width" content="1200"`, `twitter:card" content="summary_large_image"`, `<meta name="robots" content="noindex">`
  - `bookPage(sem-ano)` contains no `Excertos` section heading and no `' · '` in the byline
  - `homePage` contains links to `/biblioteca/c/tipografia-portuguesa/` with text `Tipografia Portuguesa` and its count `1`
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS. **Step 5: Commit** `feat: page templates and styles`.

### Task 5: Build orchestration, dev server, site checks

**Files:** Create `src/build.js`, `scripts/build.js`, `scripts/dev.js`, `test/build.test.js`

**Interfaces:**
- Consumes: everything above.
- Produces: `build({ libraryDir: string, outDir: string }): Promise<{ pages: number, warnings: string[] }>` — wipes `outDir`, copies `assets/` + Inter woff2 to `outDir/assets/`, processes images into `outDir/<book>/img/`, writes every page + `og.png`, writes `outDir/index.json` (`[{slug,title,authors}]`, used by the capture page). CLI prints warnings and page count; exits 1 with the `LibraryError` message on failure.

- [ ] **Step 1: Failing tests** (build fixture into a temp dir with `siteUrl 'https://x.pt/biblioteca/'`):
  - every `index.html` under outDir has a sibling `og.png` that is 1200×630
  - every `og:image` content starts with `https://x.pt/biblioteca/` and maps to an existing file
  - every `href`/`src` starting with `/biblioteca/` resolves to an existing file or `<dir>/index.html` (broken-link check)
  - `c/tipografia-portuguesa/index.html` exists
  - no file under outDir contains `fonts.googleapis` and no `capture/` dir exists
  - build of a library with a broken book rejects with `LibraryError`
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** `build`, CLI, and `dev.js` (build then `node:http` static server serving outDir under `basePath`, port 4321). **Step 4: Run** — PASS.
- [ ] **Step 5: Run `npm run dev`**, open with Playwright at 1280px and 390px, screenshot home/book/excerpt to the scratchpad and check against the spec's look. **Step 6: Commit** `feat: build pipeline and dev server`.

### Task 6: Capture page

**Files:** Create `capture/index.html`, `capture/capture.css`, `capture/capture.js`, `capture/vendor/` (copied from node_modules by `scripts/vendor-capture.js`: tesseract.js + worker + core + `por`/`eng` traineddata, jszip, idb-keyval), `scripts/vendor-capture.js`, `test/capture-export.test.js`, `capture/export.js`

**Interfaces:**
- Consumes: `index.json` from Task 5 (optional, fetched relative `../index.json`; failure → only "Novo livro").
- Produces: `buildZipEntries(draft: Draft): { path: string, data: string|Blob }[]` in `capture/export.js` (pure, testable in Node), where `Draft = { title, author, cover?: Blob, excerpts: { page?, note?, text, image?: Blob }[] }`. Zip root folder = `slugify(title + ' ' + author)` (port of `src/slug.js`, shared by importing `../src/slug.js` is not possible in the browser → `capture/export.js` re-exports an identical copy; a test asserts both give the same output on the Task 1 cases).

Flow per spec §7: Livro → Capa (`capture="environment"`) → Excertos (photo, drag-rectangle crop on a canvas, OCR `por+eng`, editable textarea, página, nota). Images downscaled to max 2400px before storing. Draft persisted in IndexedDB on every change. *Exportar .zip* downloads `<slug>.zip`.

- [ ] **Step 1: Failing tests:** `buildZipEntries` for a draft with title `Ação Gráfica`, author `Sebastião Rodrigues`, cover and 2 excerpts → paths `acao-grafica-sebastiao-rodrigues/book.md`, `.../cover.jpg`, `.../excerpts/01.md`, `.../excerpts/01.jpg`, `.../excerpts/02.md`; `book.md` front matter parses with gray-matter to `{ title:'Ação Gráfica', author:'Sebastião Rodrigues' }`; excerpt md has `page` and body text; slug parity test.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** export.js, then the page. **Step 4: Run** — PASS.
- [ ] **Step 5: Round-trip check:** in Playwright, load the capture page, feed a fixture photo via `setInputFiles`, crop, wait for OCR text, export; unzip into a temp `library/books/` and run `build` on it — succeeds. **Step 6: Commit** `feat: capture page`.

### Task 7: Sample library and README

**Files:** Create `library/config.json` (`siteUrl: ""`, `title: "Biblioteca de design"`, `tagline: "Livros antigos, capas e excertos, recolhidos por Ricardo Matos."`, `owner: "Ricardo Matos"`, `indexable: false`), two sample books with placeholder generated covers clearly titled "Exemplo", `README.md` (pt-PT: capturar → enviar zip ao Claude → `npm run build` → carregar `site/` por FTP; como mudar o domínio; como forçar o Slack/LinkedIn a atualizar a pré-visualização).

- [ ] **Step 1:** `npm run build` with the sample library succeeds; `npm test` all green.
- [ ] **Step 2: Commit** `docs: sample library and README`.
