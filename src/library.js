import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { slugify } from './slug.js';

export class LibraryError extends Error {}

const BOOK_FIELDS = new Set([
  'title', 'author', 'year', 'publisher', 'edition', 'isbn', 'cover_designer',
  'language', 'collections', 'condition', 'unverified', 'sources',
]);

const RESERVED = new Set(['c', 'excertos', 'assets', 'img']);

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Excerpts are transcribed text, not markdown: OCR lines like "1960. …" must not become lists.
const paragraphs = (text) => text.split(/\n\s*\n/).map((p) => `<p>${escapeHtml(p.trim())}</p>`).join('\n');

const exists = (p) => access(p).then(() => true, () => false);
const asList = (v) => (v == null ? [] : Array.isArray(v) ? v.map(String) : [String(v)]);
const optional = (v) => (v == null || v === '' ? undefined : String(v));

async function readConfig(dir) {
  const file = path.join(dir, 'config.json');
  const raw = (await exists(file)) ? JSON.parse(await readFile(file, 'utf8')) : {};
  const siteUrl = (raw.siteUrl || 'http://localhost:4321').replace(/\/+$/, '');
  const pathname = new URL(siteUrl).pathname.replace(/\/+$/, '');
  return {
    siteUrl,
    basePath: `${pathname}/`,
    title: raw.title || 'Biblioteca',
    tagline: raw.tagline || '',
    owner: raw.owner || '',
    indexable: raw.indexable === true,
  };
}

async function readExcerpts(bookDir, slug) {
  const dir = path.join(bookDir, 'excerpts');
  if (!(await exists(dir))) return [];
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md')).sort();
  return Promise.all(files.map(async (file) => {
    const id = file.replace(/\.md$/, '');
    if (id !== slugify(id)) throw new LibraryError(`${slug}: excerpt file '${file}' must be named like 01.md`);
    const { data, content } = matter(await readFile(path.join(dir, file), 'utf8'));
    const text = content.trim();
    if (!text) throw new LibraryError(`${slug}: excerpt ${id} is empty`);
    return {
      id,
      page: optional(data.page),
      note: optional(data.note),
      imagePath: data.image ? path.join(dir, String(data.image)) : undefined,
      text,
      html: paragraphs(text),
    };
  }));
}

async function readBook(booksDir, slug, warnings) {
  if (slug !== slugify(slug)) throw new LibraryError(`${slug}: folder name must be lowercase letters, digits and hyphens (e.g. ${slugify(slug) || 'titulo-autor'})`);
  if (RESERVED.has(slug)) throw new LibraryError(`${slug}: folder name is reserved by the site`);
  const dir = path.join(booksDir, slug);
  const { data, content } = matter(await readFile(path.join(dir, 'book.md'), 'utf8'));
  if (!data.title) throw new LibraryError(`${slug}: missing title`);
  if (!data.author) throw new LibraryError(`${slug}: missing author`);
  const coverPath = path.join(dir, 'cover.jpg');
  if (!(await exists(coverPath))) throw new LibraryError(`${slug}: missing cover.jpg`);
  for (const key of Object.keys(data)) {
    if (!BOOK_FIELDS.has(key)) warnings.push(`${slug}: unknown field '${key}'`);
  }
  return {
    slug,
    dir,
    title: String(data.title),
    authors: asList(data.author),
    year: optional(data.year),
    publisher: optional(data.publisher),
    edition: optional(data.edition),
    isbn: optional(data.isbn),
    cover_designer: optional(data.cover_designer),
    language: optional(data.language),
    collections: asList(data.collections),
    condition: optional(data.condition),
    unverified: asList(data.unverified),
    sources: Array.isArray(data.sources) ? data.sources.map((s) => ({ label: String(s.label ?? s.url), url: String(s.url) })) : [],
    bodyHtml: content.trim() ? marked.parse(content) : '',
    coverPath,
    excerpts: await readExcerpts(dir, slug),
  };
}

export async function loadLibrary(dir) {
  const config = await readConfig(dir);
  const booksDir = path.join(dir, 'books');
  const entries = await readdir(booksDir, { withFileTypes: true });
  const warnings = [];
  if (!config.siteUrl.startsWith('https://')) {
    warnings.push(`siteUrl não definido em config.json (${config.siteUrl}): as pré-visualizações só funcionam online com o endereço https completo`);
  }
  const slugs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name);
  const books = await Promise.all(slugs.map((slug) => readBook(booksDir, slug, warnings)));
  books.sort((a, b) => a.title.localeCompare(b.title, 'pt'));

  const bySlug = new Map();
  for (const book of books) {
    for (const name of book.collections) {
      const slug = slugify(name);
      if (!slug) throw new LibraryError(`${book.slug}: collection '${name}' needs latin letters or digits`);
      const existing = bySlug.get(slug);
      if (existing && existing.name !== name) {
        throw new LibraryError(`${book.slug}: collection '${name}' has the same address as '${existing.name}'; use one spelling`);
      }
      if (!existing) bySlug.set(slug, { name, slug, books: [] });
      bySlug.get(slug).books.push(book);
    }
  }
  const collections = [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  return { config, books, collections, warnings };
}
