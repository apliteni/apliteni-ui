// Every component size is one step of the --text-* scale, with no pixel offset. Seven
// declarations keep another size, and each one is named below with its reason. #814
// why: docs/foundations.md#typefaces
//
// Limits: it reads font-size, the font shorthand and the --*-font properties in the
// kit's sheets and in react/src. It reads the declared value, not the drawn size, so a
// host that redefines a token is not measured. A size set from script is not read.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const kit = new URL('./', import.meta.url);
const react = new URL('../../react/src/', import.meta.url);
const sheetsOf = (dir) => readdirSync(dir, { recursive: true }).filter(file => file.endsWith('.css'));

const STEP = /^var\(--text-(?:xs|sm|base|md|lg|xl|2xl|3xl|4xl)\)$/;
// A value that takes its size from elsewhere: the parent, or a --*-font property that
// this gate also reads.
const PASSED_ON = /^(?:inherit|var\(--[\w-]+-font\))$/;
// A field trigger matches the zoom net's flat 16px on a touch screen, so a host scale
// does not move it off the input beside it. #812
const FIELD_TRIGGER = '.ui-field > .ui-dropdown > .ui-dropdown__trigger';
const KEPT = [
  // iOS zooms into a field under 16px. docs/foundations.md#a-field-is-16px-on-a-touch-screen
  { file: 'field-zoom.css', value: '16px !important' },
  { file: 'dropdown.css', selector: FIELD_TRIGGER, value: '16px' },
  // Fluid display type of the landing page.
  { file: 'layout.css', selector: '.ui-hero__title', value: 'clamp(38px, 6.4vw, 66px)' },
  { file: 'layout.css', selector: '.ui-hero__sub', value: 'clamp(16px, 2.1vw, 20px)' },
  { file: 'layout.css', selector: '.ui-section-head h2', value: 'clamp(28px, 4vw, 40px)' },
  // Inline code follows its sentence, and never draws under the smallest step.
  { file: 'code.css', selector: '.ui-code', value: 'max(0.9em, var(--text-xs))' },
  { file: 'callout.css', selector: '.ui-callout code', value: 'max(0.92em, var(--text-xs))' },
];

const kept = (d) => KEPT.find(k => k.file === d.file && d.property === 'font-size' && k.value === d.value
  && (!k.selector || k.selector === d.selector));

// The size of a font shorthand: the word before the slash, or before the family.
const sizeOf = (property, value) => property !== 'font' || value === 'inherit' ? value
  : (value.match(/(?:^|\s)(var\([^)]*\)|calc\(.*\)|[\d.]+[a-z%]+)(?=\s*\/|\s+(?:var\(--font|['"\w]))/) || [, value])[1];

function inspect(css, file) {
  const declarations = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, selector, body] of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const [, property, raw] of body.matchAll(/(?:^|;)\s*(font-size|font|--[\w-]+-font)\s*:\s*([^;]+)/g)) {
      const d = { file, selector: selector.trim(), property, value: raw.trim() };
      const size = sizeOf(property, d.value);
      d.kept = Boolean(kept(d));
      d.invalid = !d.kept && !STEP.test(size) && !PASSED_ON.test(size);
      declarations.push(d);
    }
  }
  return declarations;
}

const read = (dir) => sheetsOf(dir).flatMap(file => inspect(readFileSync(new URL(file, dir), 'utf8'), file));
const declarations = read(kit);
const reactDeclarations = read(react);

test('every kit size is one step of the scale', () => {
  assert(declarations.length > 150, `only ${declarations.length} font declarations found in the kit sheets`);
  assert.deepEqual(declarations.filter(d => d.invalid), []);
});

test('every React sheet size is one step of the scale', () => {
  assert(reactDeclarations.length > 10, `only ${reactDeclarations.length} font declarations found in react/src`);
  assert.deepEqual(reactDeclarations.filter(d => d.invalid), []);
});

test('the seven kept sizes are each still in the source', () => {
  const found = [...declarations, ...reactDeclarations].filter(d => d.kept);
  assert.equal(found.length, KEPT.length, found.map(d => `${d.file} ${d.selector}`).join('\n'));
  for (const k of KEPT) assert(found.some(d => d.file === k.file && d.value === k.value), `${k.file} ${k.value}`);
});

test('the gate rejects an offset, a pixel size and an em size without its floor', () => {
  for (const declaration of ['font-size: 14px', 'font: 600 14px/1 var(--font-sans)',
    'font: 600 calc(var(--text-base) - 0.5px)/1 var(--font-sans)',
    '--btn-font: 12.5px', '--btn-font: calc(var(--text-sm) - 0.5px)', 'font-size: calc(13px + 0.5px)',
    'font-size: calc(var(--text-xl) + 3px)', 'font-size: 0.9em',
    'font-size: 14px; font-size: var(--text-sm)']) {
    assert(inspect(`.example { ${declaration}; }`, 'new.css').some(d => d.invalid), declaration);
  }
  assert(inspect('.ui-code { font-size: 0.9em; }', 'code.css')[0].invalid);
  assert(inspect('.ui-code { font-size: max(0.9em, 11px); }', 'code.css')[0].invalid);
});

test('only the kept sizes admit another value, each in its own rule', () => {
  assert.equal(inspect('.ui-hero__title { font-size: clamp(38px, 6.4vw, 66px); }', 'layout.css')[0].invalid, false);
  assert.equal(inspect('.ui-hero__title { font-size: clamp(38px, 6vw, 66px); }', 'layout.css')[0].invalid, true);
  assert.equal(inspect('.other { font-size: clamp(12px, 2vw, 16px); }', 'layout.css')[0].invalid, true);
  assert.equal(inspect('input { font-size: 16px !important; }', 'field-zoom.css')[0].invalid, false);
  assert.equal(inspect('input { font-size: 15px !important; }', 'field-zoom.css')[0].invalid, true);
  assert.equal(inspect(`${FIELD_TRIGGER} { font-size: 16px; }`, 'dropdown.css')[0].invalid, false);
  assert.equal(inspect(`${FIELD_TRIGGER} { font-size: 17px; }`, 'dropdown.css')[0].invalid, true);
  assert.equal(inspect('.ui-dropdown__trigger { font-size: 16px; }', 'dropdown.css')[0].invalid, true);
  assert.equal(inspect('.ui-code { font-size: max(0.9em, var(--text-xs)); }', 'other.css')[0].invalid, true);
  assert.equal(inspect('.example { font: 600 var(--text-base)/1 var(--font-sans); --btn-font: var(--text-sm); font-size: var(--btn-font); font: inherit; }', 'new.css')
    .filter(d => d.invalid).length, 0);
});

// A panel title is one role, so it is one step in every panel. #814
test('every panel title is --text-md', () => {
  const titles = ['.ui-confirm__title', '.ui-drawer__title', '.ui-empty__title', '.ui-denied__title',
    '.ui-sx--compact .ui-sx__title', '.rx-modal__title'];
  const all = [...declarations, ...reactDeclarations];
  for (const selector of titles) {
    const found = all.filter(d => d.selector === selector && d.property === 'font-size');
    assert.equal(found.length, 1, `${selector}: one size`);
    assert.equal(found[0].value, 'var(--text-md)', selector);
  }
});
