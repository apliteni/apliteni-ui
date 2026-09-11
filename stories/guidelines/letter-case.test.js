/* Rule: text is never set in capitals by style. The author writes the case.
 *
 * What it does not reach:
 * - capitals typed into the text. "INCOME" in a template is wording, and nothing
 *   mechanical tells it from "USD" or "API", which are right as written.
 * - `style.setProperty('text-transform', …)`. Nothing in the kit calls it.
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

// CSS folds case on property names and keywords, so the CSS patterns do too. The
// style-object key is a JS identifier and keeps its case; its value is a CSS
// keyword and does not. A value the scan cannot read — an interpolation, a
// variable — cannot be judged, and is refused rather than passed.
const PATTERNS = [
  { re: /(?<![\w-])(text-transform)\s*:\s*([^;}"'`<>]*)/gi, bad: (v) => !KEEPS_CASE.test(v) },
  { re: /(?<![\w-])(font-variant(?:-caps)?)\s*:\s*([^;}"'`<>]*)/gi, bad: (v) => DRAWS_CAPS.test(v) || v.includes('$') },
  { re: /\b(textTransform)\s*[:=]\s*(?:['"`]([^'"`]*)['"`]|([^,;}\s]+))/g, bad: (v, lit) => !lit || !KEEPS_CASE.test(v) },
  { re: /\b(fontVariant(?:Caps)?)\s*[:=]\s*(?:['"`]([^'"`]*)['"`]|([^,;}\s]+))/g, bad: (v, lit) => !lit || DRAWS_CAPS.test(v) },
];

/** Every case declaration in one file's text, bad or not. */
export const scan = (text, file = '<text>') => {
  const clean = decomment(text);
  const found = [];
  for (const { re, bad } of PATTERNS) {
    for (const m of clean.matchAll(re)) {
      const literal = m[3] === undefined;
      const value = (m[2] ?? m[3] ?? '').replace(/!\s*important/i, '').trim();
      const line = clean.slice(0, m.index).split('\n').length;
      found.push({ where: `${file}:${line}`, property: m[1], value, bad: bad(value, literal) });
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
 * declaration that appears or vanishes moves this number. It is 0 because the
 * kit resets nothing: no rule of its own ever set a case, so none needs undoing.
 * The two tests below are what prove the sweep can see one. */
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
];

test('every spelling of a case change is refused', () => {
  for (const [what, text] of SPELLINGS) {
    assert.ok(scan(text).some((s) => s.bad), `${what} was not refused: ${text}`);
  }
});

const ALLOWED = [
  ['a reset', '.x { text-transform: none }'],
  ['figures, not letters', '.x { font-variant-numeric: tabular-nums }'],
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
