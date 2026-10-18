import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../src/build.js';
import { LibraryError } from '../src/library.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const libraryDir = path.resolve(process.argv[2] ?? path.join(root, 'library'));
const outDir = path.resolve(process.argv[3] ?? path.join(root, 'site'));

try {
  const started = Date.now();
  const { pages, warnings } = await build({ libraryDir, outDir });
  for (const w of warnings) console.warn(`aviso: ${w}`);
  console.log(`${pages} páginas geradas em ${path.relative(process.cwd(), outDir) || '.'} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
} catch (error) {
  if (error instanceof LibraryError) {
    console.error(`erro: ${error.message}`);
    process.exit(1);
  }
  throw error;
}
