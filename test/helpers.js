import { cp, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FIXTURE = fileURLToPath(new URL('./fixtures/library', import.meta.url));

export async function tempDir(prefix = 'bib-') {
  return mkdtemp(path.join(tmpdir(), prefix));
}

export async function copyFixture() {
  const dir = await tempDir();
  await cp(FIXTURE, dir, { recursive: true });
  return dir;
}
