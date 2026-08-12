/* Rule: --accent clears WCAG AA as text on every ground the kit paints under it,
 * in all eight theme × accent cells — or a person names the cell and says why.
 *
 * The grounds are the four opaque surfaces the kit ever puts behind body text
 * (--bg, --bg-elevated, --surface, --surface-2) and --glow-purple washed over
 * each, because those five are the whole of what a component can reach for by
 * token when it wants an accent-tinted ground; every other accent ground in the
 * kit is a color-mix of --accent into itself, which no token value can fix — see
 * the ADR.
 *
 * This is a TOKEN contract, not a render. It costs milliseconds where the story
 * walk in contrast.test.js costs seconds a cell, so it can afford all eight cells
 * while that walk runs two. It sees pairs no story happens to render; it does not
 * see a pair a story invents out of literals. The two gates are complements.
 *
 * The accents are read out of src/tokens/accents.css rather than listed, so a
 * fifth accent is judged the day it is declared. A derivation that matched
 * nothing would pass by measuring nothing, so the count is asserted.
 *
 * why: docs/adr/0006-the-accent-is-measured-against-its-own-wash.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  AA_TEXT, composite, parseColour, ratio, substitute, tokensFor,
} from './lib/contrast.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THEMES = ['dark', 'light'];
const GROUNDS = ['--bg', '--bg-elevated', '--surface', '--surface-2'];

/** Accent names as accents.css declares them. The default accent lives in
 *  tokens.css and carries no data-accent attribute, so it is named here. */
const ACCENTS_CSS = readFileSync(path.join(root, 'src/tokens/accents.css'), 'utf8');
const DECLARED = [...new Set([...ACCENTS_CSS.matchAll(/\[data-accent="([\w-]+)"\]/g)].map((m) => m[1]))];
const ACCENTS = ['default', ...DECLARED];
const CELLS = THEMES.flatMap((theme) => ACCENTS.map((accent) => ({ theme, accent })));

/**
 * A cell that is allowed to sit under the floor, and the reason a person gave.
 * `ground` and `washed` name the exact pair — an exemption is never a whole cell,
 * because a cell that failed somewhere else would then pass on this reason.
 */
const EXEMPT = [
  {
    theme: 'dark',
    accent: 'phoenix',
    ground: '--surface',
    washed: true,
    why: 'The ember accent on its own wash over a card. The wash is the binding constraint here '
      + 'exactly as it was for the default accent, and the same fix applies — a lower alpha — but '
      + 'the hue itself is #96\'s and moving it is a separate decision. Held until the wash drops.',
  },
  {
    theme: 'dark',
    accent: 'ocean',
    ground: '--surface',
    washed: true,
    why: 'The azure accent on its own wash over a card, the same shape as dark Phoenix above and '
      + 'from the same 0.18 alpha. Flat surfaces all clear; only the wash closes the pair. Held '
      + 'until the wash drops.',
  },
  {
    theme: 'light',
    accent: 'ocean',
    ground: '--surface-2',
    washed: true,
    why: 'In light the harshest ground is --surface-2, the grey panel, and the purple wash lifts it '
      + 'further toward the ink. The light accents were deepened in #96 to clear plain white, which '
      + 'they do; the wash over the grey panel was not part of that change. Held until the wash drops.',
  },
  {
    theme: 'light',
    accent: 'emerald',
    ground: '--surface-2',
    washed: true,
    why: 'The jade accent on its wash over the grey panel — the same pair as light Ocean above, and '
      + 'from the same 0.10 alpha. Held until the wash drops.',
  },
];

const keyOf = ({ theme, accent, ground, washed }) =>
  `${theme}/${accent} ${washed ? `--glow-purple over ${ground}` : ground}`;
const EXEMPTED = new Set(EXEMPT.map(keyOf));

/** Paint `fg` over an opaque `bg` and round to 8 bits, because that is what the
 *  browser puts in the framebuffer — and the wash is painted before the ink is
 *  painted over it, so the rounding happens twice, once per layer.
 *
 *  It is not a rounding error either way round. On the pair that binds the dark
 *  default accent it is the HARSHER reading (4.54 against 4.56 at full
 *  precision); on light Ocean it is the kinder one. Full precision would have
 *  passed that dark pair on four hundredths the browser never renders. */
const paint = (fg, bg) => composite(fg, bg).map(Math.round);

/** Every pair a cell is judged on: the accent on each flat ground, and on the
 *  accent wash over that ground. */
function pairsOf({ theme, accent }) {
  const vars = tokensFor(theme, accent);
  const colour = (name) => parseColour(substitute(`var(${name})`, vars));
  const ink = colour('--accent');
  const glow = colour('--glow-purple');
  return GROUNDS.flatMap((ground) => {
    const flat = colour(ground);
    const washed = paint(glow, flat);
    return [
      { theme, accent, ground, washed: false, bg: flat, ratio: ratio(ink, flat) },
      { theme, accent, ground, washed: true, bg: washed, ratio: ratio(paint(ink, washed), washed) },
    ];
  });
}

const show = (p) => `${keyOf(p)} — ${p.ratio.toFixed(2)}:1`;

for (const cell of CELLS) {
  test(`--accent clears WCAG AA on every ground it is read on — ${cell.theme} ${cell.accent}`, () => {
    const failures = pairsOf(cell)
      .filter((p) => p.ratio < AA_TEXT && !EXEMPTED.has(keyOf(p)))
      .map(show);
    assert.deepEqual(
      failures,
      [],
      `\n${failures.join('\n')}\n\nagainst the ${AA_TEXT}:1 AA bar. The accent is read as text on all `
      + 'four surfaces and on its own wash over each of them. Move --accent, or drop --glow-purple\'s '
      + 'alpha so the wash stops lifting the ground toward the ink — and if neither is right for this '
      + 'cell, add it to EXEMPT with a reason a person wrote.',
    );
  });
}

// ---- anti-vacuity: a derivation that matches nothing passes everything ----

test('every accent exemption still names a real failure', () => {
  const measured = new Map(
    CELLS.flatMap(pairsOf).map((p) => [keyOf(p), p.ratio]),
  );
  const stale = EXEMPT.map(keyOf).filter((k) => !(measured.get(k) < AA_TEXT));
  assert.deepEqual(
    stale,
    [],
    `\n${stale.join('\n')}\n\nEXEMPT names a pair that no longer fails — either it was fixed and the `
    + 'entry should go, or a token moved and the entry now excuses a pair nobody looked at. An '
    + 'exemption that stops matching is a hole in the gate, so it fails here rather than passing quietly.',
  );
  for (const e of EXEMPT) {
    assert.ok(e.why && e.why.length > 120, `the ${keyOf(e)} exemption has no real reason written on it`);
  }
});

test('the accent gate actually measures something', () => {
  assert.ok(
    DECLARED.length >= 3,
    `only ${DECLARED.length} accent(s) were derived from src/tokens/accents.css. A renamed attribute `
    + 'would make every assertion above pass by matching nothing, which is the failure this guards.',
  );
  assert.equal(CELLS.length, THEMES.length * ACCENTS.length, 'the cell list is not the full matrix');
  assert.equal(
    [...ACCENTS_CSS.matchAll(/--accent\s*:/g)].length,
    DECLARED.length * THEMES.length,
    'accents.css declares a different number of --accent values than the cells derived from it',
  );

  const inks = new Set();
  for (const cell of CELLS) {
    const vars = tokensFor(cell.theme, cell.accent);
    const colour = (name) => parseColour(substitute(`var(${name})`, vars));
    const glow = colour('--glow-purple');
    assert.ok(glow && glow[3] > 0 && glow[3] < 1, `--glow-purple (${cell.theme} ${cell.accent}) is not a wash`);
    for (const ground of GROUNDS) {
      const flat = colour(ground);
      assert.ok(flat, `${ground} (${cell.theme} ${cell.accent}) resolved to no colour`);
      assert.equal(flat[3], 1, `${ground} (${cell.theme} ${cell.accent}) is not opaque, so it cannot be a ground`);
    }
    const pairs = pairsOf(cell);
    assert.equal(pairs.length, GROUNDS.length * 2, `${cell.theme} ${cell.accent} produced the wrong pair count`);
    for (const p of pairs) assert.ok(Number.isFinite(p.ratio) && p.ratio > 1, `${keyOf(p)} produced no real ratio`);
    inks.add(String(colour('--accent')));
  }

  // Six of the eight cells override the default; if they resolved alike, this
  // gate would be measuring tokens.css eight times over.
  assert.ok(inks.size >= 6, `the eight cells resolved only ${inks.size} distinct --accent value(s)`);
});
