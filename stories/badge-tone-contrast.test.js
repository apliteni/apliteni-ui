/* Rule: a badge tone that fills never paints the colour it is standing on.
 *
 * #459 asked a white table's status column for four chips. Two tones mapped to `neutral`,
 * whose fill was var(--surface) — the table's own white — so the column drew two chips and
 * two runs of bold text. The same chip on a card measured 1.000:1 in BOTH themes.
 *
 * Each tone in src/styles/badge.css therefore annotates itself beside its `background`, and
 * this gate reads those annotations rather than a list of its own. `chip: filled` may equal no
 * ground, and reads as a chip on the card, the table and a floating surface. `chip: ink-only`
 * takes the surface it sits on by #455, which moved Soon and Archive onto card ink to clear
 * AA; its ink is signal-contrast's and muted-ink's business. An unannotated tone fails.
 *
 * Limits are recorded in stories/guidelines/accessibility-coverage.json, with this gate's row.
 * Measure a chip's fill against the ground it is handed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { kitCssFor, substitute, parseColour, composite, ratio } from './lib/contrast.js';

const SHEET = 'src/styles/badge.css';
const raw = readFileSync(new URL(`../${SHEET}`, import.meta.url), 'utf8');
const RULE = /([^{}]+)\{([^{}]*)\}/g;
const THEMES = ['dark', 'light'];

/* The grounds the kit hands a badge, each named because they differ — the same device
 * stories/signal-contrast.test.js uses for its `on`. In light three of the five are #ffffff,
 * which is exactly why a fill of var(--surface) disappeared on all three at once. */
const GROUNDS = {
  '--bg': 'the page, where a badge sits outside a card',
  '--surface': 'a card',
  '--surface-2': 'a menu panel, which is where a row\'s trailing chip lands',
  '--bg-elevated': 'a floating surface — a drawer, a modal, a toast',
  '--table-bg': 'a data table\'s own ground, which is the Status column of #459',
};

/* Where a status chip has to READ as a chip, not merely differ from its ground. The page and
 * the menu panel are not on this list: in light the kit's signal fills measure 1.04–1.12 on
 * --bg and as little as 1.002 on --surface-2, which is debt this gate records rather than
 * invents a floor for. The card and the table are where a status column is drawn. */
const CHIP_GROUNDS = ['--surface', '--table-bg', '--bg-elevated'];

/* The floor on those three. The kit's own worst filled tone sets it: warn and pending measure
 * 1.157:1 over light's white card, and neutral 1.177:1 over dark's table. 1.15 is under both
 * and far above the 1.000:1 this gate exists to reject. It is the same band
 * stories/dropdown-state-contrast.test.js holds the menu's own soft chip in. */
const CHIP_FLOOR = 1.15;

/** Blank a comment out without moving any line, so file:line stays honest. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/**
 * Every tone in the sheet: a rule whose head names .ui-badge or .ui-pill and that declares a
 * background. Discovered from the sheet, so a tone added without an annotation lands in
 * `unannotated` below rather than quietly outside the gate.
 */
function tonesOf(source) {
  const bare = decomment(source);
  const out = [];
  for (const match of bare.matchAll(RULE)) {
    const selector = match[1].trim();
    if (!/^\.ui-(?:badge|pill)/.test(selector)) continue;
    const fill = /(?:^|[;{])\s*background\s*:\s*([^;]+)/.exec(match[2])?.[1].trim();
    if (!fill) continue;
    const text = source.slice(match.index, match.index + match[0].length);
    const annotation = /\/\* chip: (filled|ink-only)(?: — ([^*]+?))? \*\//.exec(text);
    out.push({ selector, fill, kind: annotation?.[1], reason: annotation?.[2]?.trim() });
  }
  return out;
}

const TONES = tonesOf(raw);
const filled = () => TONES.filter((t) => t.kind === 'filled');
const inkOnly = () => TONES.filter((t) => t.kind === 'ink-only');

/**
 * Each tone's fill composited over each ground, per theme, measured through JSDOM because
 * that is what resolves a color-mix: the neutral fill is a wash in both themes, and a held
 * declaration hands back the raw form parseColour cannot read.
 */
function measure(theme, tones = TONES) {
  const { css, vars } = kitCssFor(theme);
  const names = Object.keys(GROUNDS);
  const body = substitute(names.map((ground, g) => `<div id="g${g}" style="background:var(${ground})">`
    + tones.map((tone, t) => `<span id="c${g}_${t}" class="${tone.selector.slice(1).split('.').join(' ')}">x</span>`).join('')
    + '</div>').join(''), vars);
  const win = new JSDOM(`<style>${css}</style>${body}`).window;
  const read = (id) => parseColour(win.getComputedStyle(win.document.getElementById(id)).backgroundColor);
  const cells = [];
  names.forEach((ground, g) => {
    const under = read(`g${g}`);
    assert.ok(under, `${ground} did not resolve to a colour this gate can read`);
    assert.equal(under[3], 1, `${ground} must be opaque to serve as a ground`);
    tones.forEach((tone, t) => {
      const fill = read(`c${g}_${t}`);
      assert.ok(fill, `${tone.selector} did not resolve to a colour this gate can read`);
      const chip = fill[3] > 0 ? composite(fill, under) : under.slice();
      cells.push({ ...tone, theme, ground, chip, under, measured: ratio(chip, under) });
    });
  });
  win.close();
  return cells;
}

const RUN = Object.fromEntries(THEMES.map((theme) => [theme, measure(theme)]));
const show = (n) => n.toFixed(3);
const hex = (c) => `#${c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

// ---- coverage --------------------------------------------------------------

test('every tone in the sheet says whether it fills or takes its ground', () => {
  assert.ok(TONES.length >= 13, `tone discovery lost a rule — found ${TONES.length}`);
  const unannotated = TONES.filter((t) => !t.kind).map((t) => t.selector);
  assert.deepEqual(unannotated, [], 'a tone with a background and no `chip:` annotation is a tone nothing measures');
  assert.ok(filled().length >= 9, `filled discovery lost a tone — found ${filled().length}`);
  assert.ok(inkOnly().length >= 3, `ink-only discovery lost a tone — found ${inkOnly().length}`);
  // The exemption is the half that can hide a defect, so each one has to be argued in the sheet.
  for (const tone of inkOnly()) {
    assert.ok(tone.reason && tone.reason.length > 30, `${tone.selector} claims ink-only with no reason beside it`);
  }
  // Every discovered tone is measured on every ground, in both themes.
  for (const theme of THEMES) {
    assert.equal(RUN[theme].length, TONES.length * Object.keys(GROUNDS).length,
      `${theme} left a tone × ground pair unmeasured`);
  }
});

test('the coverage check rejects a tone that arrives with no annotation', () => {
  const planted = raw.replace('.ui-badge--neutral { color: var(--text); /* chip: filled */',
    '.ui-badge--neutral { color: var(--text);');
  assert.notEqual(planted, raw, 'the mutation did not land — the neutral rule moved, so move the mutation');
  assert.deepEqual(tonesOf(planted).filter((t) => !t.kind).map((t) => t.selector), ['.ui-badge--neutral']);
});

// ---- the rule --------------------------------------------------------------

for (const theme of THEMES) {
  test(`no filled badge tone paints the ground it stands on — ${theme}`, () => {
    const matches = RUN[theme].filter((c) => c.kind === 'filled')
      .filter((c) => c.chip.slice(0, 3).every((v, i) => Math.round(v) === Math.round(c.under[i])))
      .map((c) => `${c.selector} on ${c.ground} — both ${hex(c.chip)}, ${show(c.measured)}:1`);
    assert.deepEqual(matches, [],
      `a filled tone resolved to its own ground in ${theme}:\n${matches.join('\n')}\n\n`
      + 'A chip that paints its ground is not drawn at all. Point the tone at a --chip-*-fill\n'
      + 'pair, or at --chip-neutral-fill, whose wash cannot equal whatever is behind it; or\n'
      + 'declare the tone `chip: ink-only` and say in the sheet why its ink carries it alone.');
  });

  test(`a filled badge tone reads as a chip on the card and the table — ${theme}`, () => {
    const cells = RUN[theme].filter((c) => c.kind === 'filled' && CHIP_GROUNDS.includes(c.ground));
    assert.equal(cells.length, filled().length * CHIP_GROUNDS.length, 'a card ground went unmeasured');
    const under = cells.filter((c) => c.measured < CHIP_FLOOR)
      .map((c) => `${c.selector} on ${c.ground} — ${show(c.measured)}:1, under ${CHIP_FLOOR}:1`);
    assert.deepEqual(under, [],
      `a status chip is not separable from its ground in ${theme}:\n${under.join('\n')}`);
  });
}

test('an ink-only tone really is its ground, rather than claiming to be', () => {
  for (const theme of THEMES) {
    for (const cell of RUN[theme].filter((c) => c.kind === 'ink-only' && c.ground === '--surface')) {
      assert.equal(show(cell.measured), show(1),
        `${cell.selector} says it takes the card and measures ${show(cell.measured)}:1 on it — `
        + 'a tone painting something else is a filled tone, and the gate above is what holds it.');
    }
  }
});

for (const theme of THEMES) {
  test(`both rules reject the neutral tone painting the card again — ${theme}`, () => {
    const planted = TONES.map((t) => (t.selector === '.ui-badge--neutral'
      ? { ...t, fill: 'var(--surface)' } : t));
    assert.notEqual(planted.find((t) => t.selector === '.ui-badge--neutral'), undefined,
      'the mutation did not land — the neutral tone is no longer in the sheet');
    // The planted fill has to reach the DOM, so the mutation paints it inline rather than
    // editing a selector the cascade might answer from somewhere else.
    const { css, vars } = kitCssFor(theme);
    const win = new JSDOM(`<style>${css}</style>`
      + substitute('<div id="g" style="background:var(--surface)">'
        + '<span id="c" class="ui-badge ui-badge--neutral" style="background:var(--surface)">x</span></div>', vars)).window;
    const read = (id) => parseColour(win.getComputedStyle(win.document.getElementById(id)).backgroundColor);
    const chip = read('c');
    const under = read('g');
    assert.deepEqual(chip.slice(0, 3).map(Math.round), under.slice(0, 3).map(Math.round),
      'the planted fill did not reach the element');
    assert.ok(ratio(chip, under) < CHIP_FLOOR, 'the planted fill has to fail the chip floor');
    win.close();
  });
}
