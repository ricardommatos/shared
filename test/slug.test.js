import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../src/slug.js';

test('slugify strips accents and punctuation', () => {
  assert.equal(slugify('Grid Systems — Müller-Brockmann 1981'), 'grid-systems-muller-brockmann-1981');
  assert.equal(slugify('Ação Gráfica'), 'acao-grafica');
  assert.equal(slugify('  --a  b-- '), 'a-b');
});
