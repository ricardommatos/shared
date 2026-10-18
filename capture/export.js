// Same rules as src/slug.js (a test keeps them in sync).
export function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// JSON strings are valid YAML scalars, so this keeps quotes and colons safe.
function frontMatter(fields, body = '') {
  const lines = Object.entries(fields)
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([k, v]) => `${k}: ${JSON.stringify(String(v).trim())}`);
  const head = lines.length ? `---\n${lines.join('\n')}\n---\n` : '---\n---\n';
  return `${head}${body ? `${body.trim()}\n` : ''}`;
}

export const draftSlug = (draft) => slugify(`${draft.title} ${draft.author}`);

export function buildZipEntries(draft) {
  const root = draftSlug(draft);
  const entries = [{ path: `${root}/book.md`, data: frontMatter({ title: draft.title, author: draft.author }) }];
  if (draft.cover) entries.push({ path: `${root}/cover.jpg`, data: draft.cover });
  const excerpts = (draft.excerpts ?? []).filter((e) => e.text && e.text.trim());
  excerpts.forEach((excerpt, i) => {
    const id = String(i + 1).padStart(2, '0');
    const image = excerpt.image ? `${id}.jpg` : undefined;
    entries.push({ path: `${root}/excerpts/${id}.md`, data: frontMatter({ page: excerpt.page, note: excerpt.note, image }, excerpt.text) });
    if (excerpt.image) entries.push({ path: `${root}/excerpts/${id}.jpg`, data: excerpt.image });
  });
  return entries;
}
