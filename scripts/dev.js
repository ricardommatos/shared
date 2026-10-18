import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../src/build.js';
import { loadLibrary } from '../src/library.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const libraryDir = path.resolve(process.argv[2] ?? path.join(root, 'library'));
const outDir = path.join(root, 'site');
const port = Number(process.env.PORT ?? 4321);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

const { pages } = await build({ libraryDir, outDir });
const { config } = await loadLibrary(libraryDir);

createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!pathname.startsWith(config.basePath)) {
    res.writeHead(302, { location: config.basePath }).end();
    return;
  }
  let file = path.join(outDir, pathname.slice(config.basePath.length));
  if (!file.startsWith(outDir)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Não encontrado');
  }
}).listen(port, () => console.log(`${pages} páginas · http://localhost:${port}${config.basePath}`));
