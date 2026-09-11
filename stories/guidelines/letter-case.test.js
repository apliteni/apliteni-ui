/* Rule: text is never set in capitals by style. The author writes the case.
 *
 * What it does not reach:
 * - capitals typed into the text. "INCOME" in a template is wording, and nothing
 *   mechanical tells it from "USD" or "API", which are right as written.
 * - `style.setProperty('text-transform', …)`. Nothing in the kit calls it.
 * - a `font` shorthand in a JS style object, or one computed at render time.
 * - a declaration after a `/*` that sits inside a JS string: the comment strip
 *   takes everything up to the next `*​/` with it.
 *
 * why: docs/specification.md#labels-and-titles
 * why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { kitSheetNames } from '../../scripts/lib/icon-cascade.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

const TREES = ['src', 'stories', 'site', 'react/src', '.storybook'];
const FILES = /\.(css|js|mjs|jsx|ts|tsx|html)$/;
const SKIP = new Set(['node_modules', 'dist', 'public', 'storybook-static', '.git']);

const walk = (dir) => readdirSync(dir).flatMap((entry) => {
  if (SKIP.has(entry)) return [];
  const full = path.join(dir, entry);
  if (statSync(full).isDirectory()) return walk(full);
  return FILES.test(entry) ? [full] : [];
});

// A test hands a scanner the spellings it must refuse, this one included, so a
// test file is full of them on purpose. Excluded as a category and counted.
const isTest = (f) => /\.test\.[a-z]+$/.test(f);

const files = TREES
  .flatMap((t) => (existsSync(path.join(root, t)) ? walk(path.join(root, t)) : []))
  .sort();
const swept = files.filter((f) => !isTest(f));

// Comments out with offsets kept, so a line number is the real one and a sentence
// about text-transform is not a declaration.
const blank = (m) => m.replace(/[^\n]/g, ' ');
const decomment = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, blank)
  .replace(/<!--[\s\S]*?-->/g, blank)
  .replace(/^[ \t]*\/\/.*$/gm, blank);

const KEEPS_CASE = /^(?:none|inherit|initial|unset|revert|revert-layer)$/i;
const DRAWS_CAPS = /small-caps|petite-caps|unicase|titling-caps/i;
const CAPS_FEATURES = /\b(?:smcp|c2sc|pcap|c2pc|unic|titl)\b/i;
const UNREADABLE = /\$\{|\bvar\(/i;

// CSS folds case on property names and keywords, so the CSS patterns do too. A
// style-object key is a JS identifier and keeps its case, bare or quoted, dotted
// or bracketed; its value is a CSS keyword and does not.
const PATTERNS = [
  /(?<![\w-])(text-transform|font-variant(?:-caps)?|font)\s*:\s*([^;}"'`<>]*)/gi,
  /(?<![\w-])(font-feature-settings)\s*:\s*([^;}<>]*)/gi,
  /(?<![\w$])['"`]?(textTransform|fontVariant(?:Caps)?|fontFeatureSettings)['"`]?\s*\]?\s*[:=](?!=)\s*(?:(['"`])(.*?)\2|([^,;})\s]+))/g,
  /['"`](text-transform|font-variant(?:-caps)?|font-feature-settings)['"`]\s*\]?\s*[:=](?!=)\s*(?:(['"`])(.*?)\2|([^,;})\s]+))/gi,
];

// 'bad', 'ok', or null for a declaration that is not about case at all. The font
// shorthand and font-feature-settings are about case only when they draw
// capitals. A value the scan cannot read — an interpolation, a variable — cannot
// be judged, and is refused rather than passed.
const judge = (property, value, literal) => {
  const p = property.toLowerCase().replace(/-/g, '');
  if (p === 'font') return DRAWS_CAPS.test(value) ? 'bad' : null;
  if (p === 'fontfeaturesettings') return CAPS_FEATURES.test(value) || UNREADABLE.test(value) ? 'bad' : null;
  if (!literal || UNREADABLE.test(value)) return 'bad';
  if (p === 'texttransform') return KEEPS_CASE.test(value) ? 'ok' : 'bad';
  return DRAWS_CAPS.test(value) ? 'bad' : 'ok';
};

/** Every case declaration in one file's text, bad or not. */
export const scan = (text, file = '<text>') => {
  const clean = decomment(text);
  const found = [];
  for (const re of PATTERNS) {
    for (const m of clean.matchAll(re)) {
      const js = m.length > 3;
      const literal = !js || m[4] === undefined;
      const value = ((js ? m[3] ?? m[4] : m[2]) ?? '').replace(/!\s*important/i, '').trim();
      const verdict = judge(m[1], value, literal);
      if (!verdict) continue;
      const line = clean.slice(0, m.index).split('\n').length;
      found.push({ where: `${file}:${line}`, property: m[1], value, bad: verdict === 'bad' });
    }
  }
  return found;
};

const subjects = swept.flatMap((f) => scan(readFileSync(f, 'utf8'), path.relative(root, f)));

test('the sweep reaches every tree it names and every sheet the kit ships', () => {
  for (const t of TREES) {
    const n = swept.filter((f) => path.relative(root, f).startsWith(`${t}/`)).length;
    assert.ok(n > 0, `swept nothing under ${t}/ — the walk lost a tree, and every file in it left the gate`);
  }
  const src = path.join(root, 'src');
  for (const rel of kitSheetNames(src)) {
    assert.ok(swept.includes(path.join(src, rel)), `src/${rel} ships in src/index.css and was not swept`);
  }
  assert.ok(files.length > swept.length,
    'no test file was excluded, so the exclusion is dead or the walk is missing the tests');
});

test('nothing in the kit sets text in capitals by style', () => {
  const offenders = subjects.filter((s) => s.bad)
    .map((s) => `${s.where} — ${s.property}: ${s.value || '(computed)'}`);
  assert.deepEqual(offenders, [],
    'Write the label in sentence case and delete the case change. A word that is capitals in '
    + 'itself — an acronym, a currency code, a key name — is typed that way. The letter-spacing '
    + 'that came with the capitals goes too. docs/specification.md#labels-and-titles');
});

/* The subjects are every case declaration the sweep reads, `none` included, so a
 * declaration that appears or vanishes moves this number. It is 0 because nothing
 * in the kit sets a case any more, so nothing needs a `none` to undo one. The
 * spelling and mutation tests below are what prove the sweep can see one. */
const EXPECTED_SUBJECTS = 0;

test('the count of case declarations is the one written down', () => {
  assert.equal(subjects.length, EXPECTED_SUBJECTS,
    `read ${subjects.length} case declarations, expected ${EXPECTED_SUBJECTS}: `
    + subjects.map((s) => `${s.where} ${s.property}: ${s.value}`).join('; '));
});

const SPELLINGS = [
  ['a stylesheet', '.x { text-transform: uppercase }'],
  ['a stylesheet in capitals', '.x { TEXT-TRANSFORM: UPPERCASE }'],
  ['an inline style', '<div style="font:600 11px/1 var(--font-sans);text-transform:uppercase">'],
  ['title case', '.x { text-transform: capitalize }'],
  ['lower case', '.x { text-transform: lowercase }'],
  ['an !important', '.x { text-transform: uppercase !important }'],
  ['an interpolated value', '<div style="text-transform:${tt}">'],
  ['a JSX style object', "<div style={{ textTransform: 'uppercase' }} />"],
  ['a CSSOM write', "el.style.textTransform = 'uppercase';"],
  ['a computed style value', '<div style={{ textTransform: tt }} />'],
  ['small capitals', '.x { font-variant: small-caps }'],
  ['all small capitals', '.x { font-variant-caps: all-small-caps }'],
  ['a small-caps style object', "<i style={{ fontVariantCaps: 'all-small-caps' }} />"],
  ['small capitals in the font shorthand', '.x { font: small-caps 600 11px/1 var(--font-sans) }'],
  ['a small-caps feature', '.x { font-feature-settings: "smcp", "c2sc" }'],
  ['a quoted CSS key', "<div style={{ 'text-transform': 'uppercase' }} />"],
  ['a quoted JS key', "<div style={{ 'textTransform': 'uppercase' }} />"],
  ['a bracketed CSSOM write', "el.style['text-transform'] = 'uppercase';"],
  ['a variable', '.x { text-transform: var(--case) }'],
  ['a variable for small capitals', '.x { font-variant-caps: var(--caps) }'],
  ['a template for small capitals', '<i style={{ fontVariantCaps: `${caps}` }} />'],
];

test('every spelling of a case change is refused', () => {
  for (const [what, text] of SPELLINGS) {
    assert.ok(scan(text).some((s) => s.bad), `${what} was not refused: ${text}`);
  }
});

const ALLOWED = [
  ['a reset', '.x { text-transform: none }'],
  ['figures, not letters', '.x { font-variant-numeric: tabular-nums }'],
  ['a font shorthand', '<p style="font:600 var(--text-xs)/1 var(--font-sans);color:red">'],
  ['a figure feature', '.x { font-feature-settings: "tnum" }'],
  ['a comparison, not a write', "if (el.style.textTransform === 'none') {}"],
  ['a block comment', '/* text-transform: uppercase used to live here */ .x { color: red }'],
  ['a line comment', '  // text-transform: uppercase used to live here'],
  ['an HTML comment', '<!-- text-transform: uppercase --><p>x</p>'],
];

test('what is not a case change is not refused', () => {
  for (const [what, text] of ALLOWED) {
    assert.ok(!scan(text).some((s) => s.bad), `${what} was refused: ${text}`);
  }
});

// The mutation that kills the rule's case, on a real sheet rather than a
// fixture: put the badge's capitals back and the gate has to name that line.
test('putting the badge’s capitals back is caught at its line', () => {
  const rel = 'src/styles/badge.css';
  const css = readFileSync(path.join(root, rel), 'utf8');
  const mutated = css.replace('.ui-badge {\n', '.ui-badge {\n  text-transform: uppercase;\n');
  assert.notEqual(mutated, css, 'the mutation did not land — .ui-badge moved, so move the mutation');
  const line = mutated.split('\n').indexOf('  text-transform: uppercase;') + 1;
  const bad = scan(mutated, rel).filter((s) => s.bad);
  assert.deepEqual(bad.map((s) => s.where), [`${rel}:${line}`]);
});
