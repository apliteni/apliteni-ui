/* Rule: text that the kit draws in a gradient carries the owner's exception at its
 * declaration, the guideline of each rule that it breaks names the exception, and every
 * point of the gradient keeps 4.5:1 on each ground the text is read on, in all eight theme
 * and accent cells.
 *
 * Gradient text breaks four rules at once: Accessibility minimums "Measurable pairs" and
 * "Body contrast", Labels and titles "Use body ink" and Density and accents "Give accents a
 * job". The owner allowed it for a proposed value on #888 (rev_ce5c10633f49/d23,
 * rev_e1c16afad190/d25). This gate keeps that allowance from spreading in silence.
 *
 * The subjects are DISCOVERED: every rule in a kit sheet, under src/styles/ or react/src/,
 * that clips its background to its text. Each one carries a `gradient-ink:` note with the
 * rule ids and the owner's answers, or stands in EXEMPT with a reason. A subject that has
 * neither fails, and so does an EXEMPT line that matches no subject.
 *
 * LIMITS, so this is not read as more than it is:
 *  - It reads the sheets and the tokens, not pixels. The gradient is sampled at 33 points in
 *    sRGB, which is how Chromium mixes two stops written as hex. Text is drawn on part of the
 *    gradient only, so this measures more than a reader sees, never less.
 *  - The grounds are the list below, picked by hand: the field and table grounds that #888
 *    names. A ground that a component mixes for itself is not reached.
 *  - A stop must be one token. A gradient with a literal colour or a position fails here
 *    rather than being measured wrong.
 *  - It does not judge the decision. A note with a real rule id and a well-formed answer
 *    passes; whether the owner said yes is the reviewer's to check.
 *
 * why: docs/components.md#proposed-value
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { AA_TEXT, colourOf, ratio, tokensFor } from './lib/contrast.js';
import { parseGuideline } from './guidelines/_markdown.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const THEMES = ['dark', 'light'];
const ACCENTS = ['default', ...new Set([...read('src/tokens/accents.css').matchAll(/\[data-accent="([\w-]+)"\]/g)].map((m) => m[1]))];

/** The grounds a field or a table cell stands on: the page, a card, a drawer, the table,
 *  its zebra and hovered rows, and a selected row at rest and under the pointer. */
const GROUNDS = {
  page: 'var(--bg)',
  card: 'var(--surface)',
  zebra: 'var(--surface-2)',
  'hovered row': 'var(--surface-3)',
  table: 'var(--table-bg)',
  'selected row': 'color-mix(in srgb, var(--accent) var(--card-tint), var(--table-bg))',
  'selected row, hovered': 'color-mix(in srgb, var(--accent) var(--card-tint-hover), var(--table-bg))',
};

/** A subject this gate does not measure, and why. */
const EXEMPT = [
  {
    selector: '.ui-hero__title .grad',
    why: 'The words of a landing hero title, at 38px to 66px and 700 weight: large text with a '
      + 'floor of 3:1, in the display face, read on the page once. It is a brand moment and not a '
      + 'value, so the field and table grounds below are not where it is read. It predates #888.',
  },
];

const SHEETS = [
  ...readdirSync(path.join(root, 'src/styles')).filter((f) => f.endsWith('.css')).map((f) => `src/styles/${f}`),
  ...readdirSync(path.join(root, 'react/src'), { recursive: true })
    .filter((f) => f.endsWith('.css') && !f.includes('node_modules')).map((f) => `react/src/${f}`),
];

/** Every rule whose background is clipped to its text, with its selector and block. */
export function gradientRules(css, file = '') {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, , body]) => /(?:^|[;\s])background-clip\s*:\s*text/.test(body))
    .map(([, selector, body]) => ({ file, selector: selector.replace(/\/\*[\s\S]*?\*\//g, '').trim(), body }));
}

const NOTE = /gradient-ink:\s*([\w-]+(?:\s*,\s*[\w-]+)*)\s*—\s*(rev_[0-9a-f]{12}\/d\d+(?:\s*,\s*rev_[0-9a-f]{12}\/d\d+)*)\s*\*\//;

/** The rule ids and the owner's answers that a block's note names, or null. */
export function noteOf(body) {
  const m = NOTE.exec(body);
  return m ? { rules: m[1].split(/\s*,\s*/), answers: m[2].split(/\s*,\s*/) } : null;
}

/** The stops of the block's linear-gradient, as the text written for each. */
export function stopsOf(body) {
  const m = /background(?:-image)?\s*:\s*linear-gradient\((.*)\)\s*;/.exec(body.replace(/\/\*[\s\S]*?\*\//g, ''));
  if (!m) return null;
  const parts = m[1].split(/,(?![^(]*\))/).map((s) => s.trim());
  if (/^(?:to\s|[\d.-]+(?:deg|turn|rad))/.test(parts[0])) parts.shift();
  return parts;
}

/** The lowest ratio of any point of the gradient on the ground, in one cell. */
export function lowest(stops, ground, vars) {
  const colours = stops.map((s) => {
    if (!/^var\(--[\w-]+\)$/.test(s)) throw new Error(`a stop must be one token, not "${s}"`);
    const c = colourOf(s, vars);
    if (!c || c[3] !== 1) throw new Error(`${s} does not resolve to an opaque colour`);
    return c;
  });
  const bg = colourOf(ground, vars);
  if (!bg || bg[3] !== 1) throw new Error(`${ground} does not resolve to an opaque colour`);
  let low = Infinity;
  const steps = 32;
  for (let i = 0; i <= steps; i += 1) {
    const at = (i / steps) * (colours.length - 1);
    const k = Math.min(Math.floor(at), colours.length - 2);
    const f = at - k;
    const point = [0, 1, 2].map((ch) => colours[k][ch] * (1 - f) + colours[k + 1][ch] * f).concat(1);
    low = Math.min(low, ratio(point, bg));
  }
  return low;
}

const ruleIds = new Map(readdirSync(path.join(root, 'guidelines'))
  .filter((f) => f.endsWith('.md') && f !== 'INDEX.md' && f !== 'overview.md')
  .flatMap((f) => parseGuideline(read(`guidelines/${f}`)).rules.map((r) => [r.id, { page: f, ...r }])));

const subjects = SHEETS.flatMap((file) => gradientRules(read(file), file));
const exempt = new Set(EXEMPT.map((e) => e.selector));
const noted = subjects.filter((s) => !exempt.has(s.selector));

test('the gate finds every gradient text rule and accounts for each', () => {
  assert.ok(SHEETS.length > 40, `kit sheets discovered: ${SHEETS.length}`);
  assert.equal(subjects.length, 2, `gradient text rules: ${subjects.map((s) => `${s.file} ${s.selector}`).join('; ')}`);
  for (const e of EXEMPT) assert.ok(subjects.some((s) => s.selector === e.selector), `EXEMPT names no subject: ${e.selector}`);
  assert.equal(noted.length + EXEMPT.length, subjects.length);
});

test('each gradient text rule carries the owner\'s exception for real rules', () => {
  for (const s of noted) {
    const note = noteOf(s.body);
    assert.ok(note, `${s.file} ${s.selector} draws gradient text with no gradient-ink note`);
    for (const id of note.rules) {
      const rule = ruleIds.get(id);
      assert.ok(rule, `${s.file} ${s.selector} names no guideline rule "${id}"`);
      assert.match(rule.except ?? '', /gradient/i, `guidelines/${rule.page} "${rule.imperative}" has no Except for gradient text`);
    }
  }
});

test('every point of each gradient keeps 4.5:1 on the field and table grounds in all eight cells', (t) => {
  let measured = 0;
  for (const s of noted) {
    const stops = stopsOf(s.body);
    assert.ok(stops && stops.length >= 2, `${s.file} ${s.selector}: no linear-gradient of two stops`);
    const rows = [];
    for (const theme of THEMES) {
      for (const accent of ACCENTS) {
        const vars = tokensFor(theme, accent);
        for (const [name, ground] of Object.entries(GROUNDS)) {
          const low = lowest(stops, ground, vars);
          measured += 1;
          rows.push({ theme, accent, name, low });
          assert.ok(low >= AA_TEXT, `${s.selector} on ${name}, ${theme} ${accent}: ${low.toFixed(2)}:1`);
        }
      }
    }
    for (const theme of THEMES) {
      const worst = rows.filter((r) => r.theme === theme).sort((a, b) => a.low - b.low)[0];
      t.diagnostic(`${s.selector} ${theme}: lowest ${worst.low.toFixed(2)}:1 on ${worst.name}, ${worst.accent}`);
    }
  }
  assert.equal(ACCENTS.length, 4, `accents: ${ACCENTS.join(', ')}`);
  assert.equal(measured, noted.length * THEMES.length * ACCENTS.length * Object.keys(GROUNDS).length);
});

test('mutations: the gate rejects a rule with no note, a made-up rule, and an ink under the floor', () => {
  const [bare] = gradientRules('.x { background-image: linear-gradient(90deg, var(--accent), var(--blue)); background-clip: text; }');
  assert.equal(noteOf(bare.body), null);
  const [madeUp] = gradientRules('.x { /* gradient-ink: no-such-rule — rev_ce5c10633f49/d23 */ background-clip: text; }');
  assert.equal(ruleIds.has(noteOf(madeUp.body).rules[0]), false);
  const vars = tokensFor('light');
  assert.ok(lowest(['var(--accent)', 'var(--border)'], GROUNDS.card, vars) < AA_TEXT, 'a pale stop passes');
  assert.throws(() => lowest(['var(--accent)', '#777'], GROUNDS.card, vars), /one token/);
  assert.deepEqual(stopsOf('background-image: linear-gradient(90deg, var(--a), var(--b));'), ['var(--a)', 'var(--b)']);
});
