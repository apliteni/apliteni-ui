// Fixed component text follows the scale; token offsets preserve default pixels.
// why: docs/specification.md#typefaces
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('./', import.meta.url);
const sheets = readdirSync(root, { recursive: true }).filter(file => file.endsWith('.css'));
const display = new Set(['.ui-hero__title', '.ui-hero__sub', '.ui-section-head h2']);

function inspect(css, file) {
  const declarations = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, selector, body] of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const [, property, value] of body.matchAll(/(?:^|;)\s*(font-size|font|--[\w-]+-font)\s*:\s*([^;]+)/g)) {
      const exempt = file === 'field-zoom.css' || (file === 'layout.css'
        && display.has(selector.trim()) && property === 'font-size' && /^clamp\(/.test(value));
      // Remove only scale-derived offsets, never arbitrary calc() pixel sizes.
      let remaining = value.replace(/calc\(\s*var\(--text-[\w-]+\)\s*[+-]\s*[\d.]+px\s*\)/g, 'token');
      if (property === 'font') remaining = remaining.replace(/\/\s*[\d.]+px\b/g, '/leading');
      declarations.push({ file, selector: selector.trim(), property, value,
        invalid: !exempt && /[\d.]+px\b/i.test(remaining) });
    }
  }
  return declarations;
}

const declarations = sheets.flatMap(file => inspect(readFileSync(new URL(file, root), 'utf8'), file));

test('component font sizes use tokens, including shorthand and custom-property sizes', () => {
  assert.equal(declarations.length, 144, 'Font-sizing coverage changed; inspect additions or removals');
  assert.deepEqual(declarations.filter(d => d.invalid), []);
});

test('the gate catches each spelling, even beside a token or inside pixel-only calc()', () => {
  for (const declaration of ['font-size: 14px', 'font: 600 14px/1 var(--font-sans)',
    '--btn-font: 12.5px', 'font-size: calc(13px + 0.5px)',
    'font-size: 14px; font-size: var(--text-sm)']) {
    assert(inspect(`.example { ${declaration}; }`, 'new.css').some(d => d.invalid), declaration);
  }
});

test('only the documented exceptions and token offsets admit pixel values', () => {
  assert.equal(inspect('.ui-hero__title { font-size: clamp(38px, 6vw, 66px); }', 'layout.css')[0].invalid, false);
  assert.equal(inspect('.other { font-size: clamp(12px, 2vw, 16px); }', 'layout.css')[0].invalid, true);
  assert.equal(inspect('input { font-size: 16px !important; }', 'field-zoom.css')[0].invalid, false);
  assert.equal(inspect('.example { font: 600 calc(var(--text-base) - 0.5px)/20px var(--font-sans); --btn-font: calc(var(--text-sm) - 0.5px); }', 'new.css').filter(d => d.invalid).length, 0);
});
