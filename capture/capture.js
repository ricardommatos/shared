import { get, set, del } from './vendor/idb-keyval.js';
import { buildZipEntries, draftSlug } from './export.js';

const MAX_SIDE = 2400;
const $ = (id) => document.getElementById(id);

let draft = { title: '', author: '', cover: null, excerpts: [] };
let known = [];
let editing = null; // { index, source: Blob, image: Blob|null }
let worker = null;

// ---------- persistence ----------

async function persist() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    await set('draft', draft);
    status('Guardado neste telemóvel');
  } catch {
    status('Não foi possível guardar neste browser');
  }
}

// Typing is debounced; photos and excerpts are written straight away.
let saveTimer;
function save({ debounce = false } = {}) {
  render();
  if (!debounce) return persist();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 400);
}

function status(text) { $('status').textContent = text; }

// ---------- images ----------

async function loadBitmap(blob) {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    await img.decode();
    return img;
  }
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
}

async function downscale(blob, crop) {
  const bmp = await loadBitmap(blob);
  const sx = crop?.x ?? 0;
  const sy = crop?.y ?? 0;
  const sw = crop?.w ?? bmp.width;
  const sh = crop?.h ?? bmp.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  canvas.getContext('2d').drawImage(bmp, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvasToBlob(canvas);
}

const objectUrls = new Map();
function urlFor(blob) {
  if (!objectUrls.has(blob)) objectUrls.set(blob, URL.createObjectURL(blob));
  return objectUrls.get(blob);
}

// ---------- rendering ----------

function render() {
  if ($('title').value !== draft.title) $('title').value = draft.title;
  if ($('author').value !== draft.author) $('author').value = draft.author;
  $('known-hint').hidden = !known.some((b) => b.title === draft.title);

  const preview = $('cover-preview');
  preview.hidden = !draft.cover;
  if (draft.cover) preview.src = urlFor(draft.cover);
  $('cover-label').textContent = draft.cover ? 'Nova foto' : 'Fotografar capa';

  $('excerpt-count').textContent = draft.excerpts.length;
  const list = $('excerpts');
  list.replaceChildren(...draft.excerpts.map((e, i) => {
    const li = document.createElement('li');
    li.className = 'excerpt';
    const img = document.createElement('img');
    img.alt = '';
    if (e.image) img.src = urlFor(e.image);
    const body = document.createElement('div');
    const text = document.createElement('p');
    text.className = 'excerpt-text';
    text.textContent = e.text || '(sem texto)';
    const meta = document.createElement('p');
    meta.className = 'excerpt-meta';
    meta.textContent = [e.page && `p. ${e.page}`, e.note].filter(Boolean).join(' · ') || `Excerto ${i + 1}`;
    body.append(text, meta);
    const actions = document.createElement('div');
    actions.className = 'excerpt-actions';
    actions.append(
      iconButton('Editar', '<path d="M4 20h4L19 9l-4-4L4 16z"/>', () => openText(i)),
      iconButton('Apagar', '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>', () => {
        if (confirm('Apagar este excerto?')) { draft.excerpts.splice(i, 1); save(); }
      }),
    );
    li.append(img, body, actions);
    return li;
  }));

  $('export').disabled = !(draft.title.trim() && draft.author.trim() && draft.cover);
}

function iconButton(label, path, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'icon-btn';
  b.setAttribute('aria-label', label);
  b.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  b.addEventListener('click', onClick);
  return b;
}

// ---------- crop ----------

const crop = { bmp: null, scale: 1, rect: null, start: null };

async function openCrop(file) {
  editing = { index: null, source: file, image: null };
  crop.bmp = await loadBitmap(file);
  crop.rect = null;
  const canvas = $('crop-canvas');
  crop.scale = Math.min(1, 1600 / Math.max(crop.bmp.width, crop.bmp.height));
  canvas.width = Math.round(crop.bmp.width * crop.scale);
  canvas.height = Math.round(crop.bmp.height * crop.scale);
  drawCrop();
  $('editor-title').textContent = 'Recortar';
  $('crop-step').hidden = false;
  $('text-step').hidden = true;
  $('use-crop').disabled = true;
  $('editor').showModal();
}

function drawCrop() {
  const canvas = $('crop-canvas');
  const ctx = canvas.getContext('2d');
  ctx.drawImage(crop.bmp, 0, 0, canvas.width, canvas.height);
  if (!crop.rect) return;
  const { x, y, w, h } = crop.rect;
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.rect(x, y, w, h);
  ctx.fill('evenodd');
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(2, canvas.width / 300);
  ctx.strokeRect(x, y, w, h);
}

function canvasPoint(event) {
  const canvas = $('crop-canvas');
  const r = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(canvas.width, ((event.clientX - r.left) / r.width) * canvas.width)),
    y: Math.max(0, Math.min(canvas.height, ((event.clientY - r.top) / r.height) * canvas.height)),
  };
}

function bindCrop() {
  const canvas = $('crop-canvas');
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    crop.start = canvasPoint(e);
    crop.rect = null;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!crop.start) return;
    const p = canvasPoint(e);
    crop.rect = {
      x: Math.min(p.x, crop.start.x), y: Math.min(p.y, crop.start.y),
      w: Math.abs(p.x - crop.start.x), h: Math.abs(p.y - crop.start.y),
    };
    drawCrop();
  });
  const end = () => {
    crop.start = null;
    if (crop.rect && (crop.rect.w < 12 || crop.rect.h < 12)) crop.rect = null;
    $('use-crop').disabled = !crop.rect;
    drawCrop();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  $('use-full').addEventListener('click', () => finishCrop(null));
  $('use-crop').addEventListener('click', () => {
    const s = 1 / crop.scale;
    const { x, y, w, h } = crop.rect;
    finishCrop({ x: Math.round(x * s), y: Math.round(y * s), w: Math.round(w * s), h: Math.round(h * s) });
  });
}

async function finishCrop(region) {
  editing.image = await downscale(editing.source, region);
  $('editor-title').textContent = 'Texto';
  $('crop-step').hidden = true;
  $('text-step').hidden = false;
  $('crop-result').src = urlFor(editing.image);
  $('excerpt-text').value = '';
  $('excerpt-page').value = '';
  $('excerpt-note').value = '';
  runOcr(editing.image);
}

// ---------- OCR ----------

async function getWorker(onProgress) {
  if (!worker) {
    worker = await Tesseract.createWorker(['por', 'eng'], 1, {
      workerPath: new URL('vendor/worker.min.js', location.href).href,
      corePath: new URL('vendor/core', location.href).href,
      langPath: new URL('vendor/lang', location.href).href,
      logger: (m) => onProgress?.(m),
    });
  }
  return worker;
}

async function runOcr(image) {
  const progress = $('ocr-progress');
  const textarea = $('excerpt-text');
  progress.hidden = false;
  progress.textContent = 'A preparar a leitura…';
  textarea.placeholder = 'O texto aparece aqui. Podes corrigir à mão.';
  const target = editing;
  try {
    const w = await getWorker((m) => {
      if (m.status === 'recognizing text') progress.textContent = `A ler o texto… ${Math.round(m.progress * 100)}%`;
      else if (m.status) progress.textContent = 'A preparar a leitura…';
    });
    const { data } = await w.recognize(image);
    if (editing !== target) return;
    if (!textarea.value.trim()) textarea.value = cleanOcr(data.text);
    progress.textContent = 'Texto lido. Revê e corrige se for preciso.';
  } catch (error) {
    console.error(error);
    progress.textContent = 'Não foi possível ler o texto. Podes escrevê-lo à mão.';
  }
}

// Joins hard-wrapped lines inside paragraphs and removes end-of-line hyphenation.
function cleanOcr(text) {
  return text
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/-\n(?=\p{Ll})/gu, '').replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

// ---------- excerpt text ----------

function openText(index) {
  const e = draft.excerpts[index];
  editing = { index, source: e.image, image: e.image };
  $('editor-title').textContent = 'Excerto';
  $('crop-step').hidden = true;
  $('text-step').hidden = false;
  $('crop-result').hidden = !e.image;
  if (e.image) $('crop-result').src = urlFor(e.image);
  $('ocr-progress').hidden = true;
  $('excerpt-text').value = e.text;
  $('excerpt-page').value = e.page ?? '';
  $('excerpt-note').value = e.note ?? '';
  $('editor').showModal();
}

function saveExcerpt() {
  const excerpt = {
    image: editing.image,
    text: $('excerpt-text').value.trim(),
    page: $('excerpt-page').value.trim(),
    note: $('excerpt-note').value.trim(),
  };
  if (!excerpt.text && !confirm('O excerto não tem texto. Guardar na mesma?')) return;
  if (editing.index == null) draft.excerpts.push(excerpt);
  else draft.excerpts[editing.index] = excerpt;
  closeEditor();
  return save();
}

function closeEditor() {
  editing = null;
  $('crop-result').hidden = false;
  $('editor').close();
}

// ---------- export ----------

async function exportZip() {
  const zip = new JSZip();
  for (const entry of buildZipEntries(draft)) zip.file(entry.path, entry.data);
  const blob = await zip.generateAsync({ type: 'blob' });
  const name = `${draftSlug(draft)}.zip`;
  const file = new File([blob], name, { type: 'application/zip' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  status('Zip exportado');
}

// ---------- wiring ----------

async function loadKnownBooks() {
  try {
    const res = await fetch(new URL('../index.json', location.href));
    if (!res.ok) return;
    known = await res.json();
    $('known-books').replaceChildren(...known.map((b) => Object.assign(document.createElement('option'), { value: b.title })));
  } catch { /* no library index next to the capture page */ }
}

async function init() {
  bindCrop();
  $('title').addEventListener('input', (e) => {
    draft.title = e.target.value;
    const match = known.find((b) => b.title === draft.title);
    if (match && !draft.author) draft.author = match.authors.join(', ');
    save({ debounce: true });
  });
  $('author').addEventListener('input', (e) => { draft.author = e.target.value; save({ debounce: true }); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) persist(); });
  $('cover-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    status('A preparar a capa…');
    draft.cover = await downscale(file);
    save();
  });
  $('excerpt-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) openCrop(file);
  });
  $('save-excerpt').addEventListener('click', () => { saveExcerpt(); });
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeEditor));
  $('editor').addEventListener('cancel', () => { editing = null; });
  $('export').addEventListener('click', () => exportZip().catch((err) => { console.error(err); status('Erro ao exportar'); }));
  $('reset').addEventListener('click', async () => {
    if (!confirm('Começar um livro novo? O trabalho atual é apagado deste telemóvel.')) return;
    draft = { title: '', author: '', cover: null, excerpts: [] };
    await del('draft').catch(() => {});
    render();
  });

  try {
    const saved = await get('draft');
    if (saved) draft = { ...draft, ...saved };
  } catch { status('Este browser não guarda o trabalho; exporta antes de fechar'); }
  render();
  loadKnownBooks().then(render);
}

init();
