/*
 * Local stand-in for the claude.ai runtime (window.claude.use).
 * Lets index.html run on your Mac: db, assets, downloads and user all work,
 * with data kept in this browser's localStorage and uploads saved by serve.py
 * into ./local/_blob. Nothing here is used by the published artifact.
 */
(() => {
  const KEY = 'cts-local-db';
  const seed = () => {
    const F = [
      { id:'f1', name:'Spring campaign moods', parent:null, createdAt:1, pinnedAt:5 },
      { id:'f2', name:'Product renders', parent:null, createdAt:2, pinnedAt:0 },
      { id:'f3', name:'Characters', parent:null, createdAt:3, pinnedAt:0 },
      { id:'f4', name:'Hero options', parent:'f1', createdAt:4, pinnedAt:0 },
    ];
    const folderOf = ['f1','f1','f1','f2','f2','f3','f3','f3','f4'];
    const db = { folders:{}, images:{}, likes:{}, settings:{ space:{ name:'Nike SS27', bg:'#FFFFFF' } } };
    F.forEach(f => db.folders[f.id] = f);
    for (let i = 0; i < 9; i++) db.images['i' + i] = { asset:'a' + i, thumb:null, name:`sample-${i + 1}.png`, type:'image/png', size:120000, w:400, h:500,
      prompt:'a quiet coastal house at dusk, soft film grain --ar 4:5 --v 7 --style raw', folder:folderOf[i], createdAt:100 - i, by:'me' };
    db.likes['i0__other'] = { image:'i0', uid:'other', at:1 };
    return db;
  };
  let DB; try { DB = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { DB = seed(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch {} };
  const subs = new Set();
  const notify = () => { save(); setTimeout(() => subs.forEach(fn => fn()), 0); };
  const rid = () => Math.random().toString(36).slice(2, 12);
  const snapDoc = (id, data) => ({ id, exists: !!data, data: () => data ? { ...data } : undefined, metadata:{ fromCache:false, hasPendingWrites:false } });
  const split = path => { const p = path.split('/'); return { col: p[0], id: p[1] }; };

  function query(col, opts = {}) {
    return {
      where() { return this },
      orderBy(field, dir = 'asc') { return query(col, { ...opts, field, dir }); },
      limit(n) { return query(col, { ...opts, n }); },
      async get() { return run(); },
      onSnapshot(next) { const fn = () => next(run()); subs.add(fn); setTimeout(fn, 60); return () => subs.delete(fn); },
      doc(id) { return docRef(col, id || rid()); },
      async add(data) { const id = rid(); (DB[col] ||= {})[id] = data; notify(); return docRef(col, id); },
    };
    function run() {
      let docs = Object.entries(DB[col] || {}).map(([id, d]) => snapDoc(id, d));
      if (opts.field) docs.sort((a, b) => ((a.data()[opts.field] ?? 0) - (b.data()[opts.field] ?? 0)) * (opts.dir === 'desc' ? -1 : 1));
      if (opts.n) docs = docs.slice(0, opts.n);
      return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata:{ fromCache:false, hasPendingWrites:false } };
    }
  }
  function docRef(col, id) {
    return {
      id, path: col + '/' + id,
      async get() { return snapDoc(id, DB[col]?.[id]); },
      async set(data) { (DB[col] ||= {})[id] = { ...data }; notify(); },
      async update(data) { if (!DB[col]?.[id]) throw { code:'invalid_argument' }; Object.assign(DB[col][id], data); notify(); },
      async delete() { if (DB[col]) delete DB[col][id]; notify(); },
      onSnapshot(next) { const fn = () => next(snapDoc(id, DB[col]?.[id])); subs.add(fn); setTimeout(fn, 30); return () => subs.delete(fn); },
    };
  }
  const db = {
    collection: path => query(path),
    doc: path => { const { col, id } = split(path); return docRef(col, id); },
  };
  const assets = {
    async upload(blob, opts = {}) {
      const r = await fetch('/_upload', { method:'POST', headers:{ 'Content-Type': opts.type || blob.type || 'application/octet-stream' }, body: blob });
      if (!r.ok) throw { code:'upstream_error' };
      const { id } = await r.json();
      return { id, url:'/_blob/' + id, sizeBytes: blob.size, contentType: opts.type || blob.type };
    },
    async list() { return { assets:[], usage:{ files:0, bytes:0, maxFiles:1000, maxBytes:5e9 } }; },
    async delete() { return { deleted:true }; },
  };
  const downloads = {
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      return { status:'saved' };
    },
  };
  // Change ROLE to 'viewer' to see the page as a team member who cannot edit.
  const ROLE = new URLSearchParams(location.search).get('role') || 'editor';
  const user = { id: async () => 'me', isOwner: async () => ROLE === 'editor', canEdit: async () => ROLE === 'editor' };
  window.claude = { use: async name => ({ db, assets: ROLE === 'editor' ? assets : null, downloads, user })[name] ?? null };
  window.resetLocalData = () => { localStorage.removeItem(KEY); location.reload(); };
})();
