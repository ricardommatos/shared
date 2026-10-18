// Copies the capture page's third-party files into capture/vendor/ so the page works without a CDN.
import { cp, mkdir, rm, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const vendor = fileURLToPath(new URL('../capture/vendor', import.meta.url));
const pkgDir = (name) => path.dirname(require.resolve(`${name}/package.json`));

await rm(vendor, { recursive: true, force: true });
await mkdir(path.join(vendor, 'core'), { recursive: true });
await mkdir(path.join(vendor, 'lang'), { recursive: true });
await mkdir(path.join(vendor, 'fonts'), { recursive: true });

const tess = path.join(pkgDir('tesseract.js'), 'dist');
await cp(path.join(tess, 'tesseract.min.js'), path.join(vendor, 'tesseract.min.js'));
await cp(path.join(tess, 'worker.min.js'), path.join(vendor, 'worker.min.js'));

const core = pkgDir('tesseract.js-core');
for (const file of (await readdir(core)).filter((f) => f.endsWith('lstm.wasm.js'))) {
  await cp(path.join(core, file), path.join(vendor, 'core', file));
}
for (const lang of ['por', 'eng']) {
  await cp(path.join(pkgDir(`@tesseract.js-data/${lang}`), '4.0.0', `${lang}.traineddata.gz`), path.join(vendor, 'lang', `${lang}.traineddata.gz`));
}
await cp(path.join(pkgDir('jszip'), 'dist', 'jszip.min.js'), path.join(vendor, 'jszip.min.js'));
await cp(path.join(pkgDir('idb-keyval'), 'dist', 'index.js'), path.join(vendor, 'idb-keyval.js'));
for (const weight of [400, 500, 600]) {
  const name = `inter-latin-${weight}-normal.woff2`;
  await cp(path.join(pkgDir('@fontsource/inter'), 'files', name), path.join(vendor, 'fonts', name));
}
console.log(`capture/vendor pronto`);
