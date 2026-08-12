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
 * There is one story that invents the accent family out of literals on purpose —
 * the sub-theme page, whose panels each pin a whole accent inline so all four
 * show at once under one toolbar theme. That mirror is the last test in this
 * file: what the page paints is resolved against the token files property by
 * property, because a mirror kept by hand goes stale and this one twice did.
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
import { ACCENT as PANELS, accentVars } from './foundations/SubThemes.stories.js';

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
 *
 * EMPTY IS THE CORRECT STATE, NOT DEAD CODE. Nothing has had to be excused yet,
 * and an empty list makes this gate strictly harsher than a populated one: every
 * pair is judged on its measurement alone. The mechanism stays because the next
 * failing pair needs somewhere to be argued in the open rather than quietly
 * softened — and because the stale-entry test below is what stops an entry from
 * outliving the failure it was written for.
 */
const EXEMPT = [];

const keyOf = ({ theme, accent, ground, washed }) =>
  `${theme}/${accent} ${washed ? `--glow-purple over ${ground}` : ground}`;
const EXEMPTED = new Set(EXEMPT.map(keyOf));

/**
 * The two ways to composite a wash over a ground, because neither of them is
 * what the browser paints and they disagree.
 *
 * `rounded` rounds each layer to 8 bits — the wash is painted before the ink is
 * painted over it, so the rounding happens twice, once per layer. That is closer
 * to a framebuffer than full precision, which is why it is here at all, but it
 * is not the framebuffer: rendered in headless Chromium and read back out of the
 * screenshot, rgba(180,121,255,0.12) over #221f2e paints rgb(51,42,71), where
 * rounding predicts rgb(52,42,71) and full precision gives (51.52,41.80,71.08).
 * The three readings of that pair are 4.555, 4.540 and 4.555 — the same number to
 * a hundredth, and no model is the truth to three decimals.
 *
 * Which model is harsher flips from pair to pair, so a pair is judged on the
 * WORSE of the two and a value is only chosen when it clears in both. That is why
 * light Ocean's wash is at 0.05: at 0.06 it read 4.501 at full precision and
 * 4.491 rounded, and the pixel Chromium actually paints read 4.483 — a failing
 * pair either way, and one this gate would have carried as an exemption if it had
 * believed a single model.
 */
const MODELS = {
  rounded: (fg, bg) => composite(fg, bg).map(Math.round),
  exact: (fg, bg) => composite(fg, bg),
};

/** Every pair a cell is judged on: the accent on each flat ground, and on the
 *  accent wash over that ground, at the worse of the two composite models. */
function pairsOf({ theme, accent }) {
  const vars = tokensFor(theme, accent);
  const colour = (name) => parseColour(substitute(`var(${name})`, vars));
  const ink = colour('--accent');
  const glow = colour('--glow-purple');
  return GROUNDS.flatMap((ground) => {
    const flat = colour(ground);
    const byModel = Object.fromEntries(Object.entries(MODELS).map(([name, paint]) => {
      const washed = paint(glow, flat);
      return [name, ratio(paint(ink, washed), washed)];
    }));
    return [
      { theme, accent, ground, washed: false, ratio: ratio(ink, flat), byModel: null },
      {
        theme, accent, ground, washed: true, byModel,
        ratio: Math.min(...Object.values(byModel)),
      },
    ];
  });
}

const show = (p) => `${keyOf(p)} — ${p.ratio.toFixed(2)}:1`
  + (p.byModel ? ` (${Object.entries(p.byModel).map(([m, r]) => `${m} ${r.toFixed(3)}`).join(', ')})` : '');

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

  // The two composite models have to actually be two. Held the same function
  // twice, every "clears in both" above would be one claim wearing two names,
  // and the min over them would be a min over nothing.
  assert.equal(Object.keys(MODELS).length, 2, 'a washed pair is judged on two composite models');
  const spreads = CELLS.flatMap(pairsOf).filter((p) => p.byModel)
    .map((p) => Math.max(...Object.values(p.byModel)) - Math.min(...Object.values(p.byModel)));
  const widest = Math.max(...spreads);
  assert.ok(
    widest > 0,
    'the two composite models agreed exactly on all 32 washed pairs, which no two different '
    + 'models do — MODELS is holding one model twice',
  );
  assert.ok(
    widest < 0.05,
    `the composite models now disagree by ${widest.toFixed(3)} on some pair. The comment on MODELS `
    + 'says a few hundredths and reads their agreement as the reason neither has to be the browser; '
    + 'a wider gap means that argument needs re-making, not re-pinning.',
  );
});

// ---- the accent surface this gate would otherwise not see ------------------

/**
 * The accent family: every custom property a [data-accent] block declares.
 *
 * Derived from accents.css rather than listed, so a token that joins the family
 * is demanded of the story the day it is declared, and a token that leaves it
 * stops being demanded without an edit here. Comments are stripped first —
 * several of them quote token names, and a quoted name is not a declaration.
 */
const FAMILY = [...new Set(
  [...ACCENTS_CSS.replace(/\/\*[\s\S]*?\*\//g, '')
    .matchAll(/\[data-accent="[\w-]+"\][^{]*\{([^}]*)\}/g)]
    .flatMap(([, body]) => [...body.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1])),
)];

/** The accent a panel of the sub-theme story stands for. Nebula is that page's
 *  name for the default accent; every other panel is named for the attribute
 *  value itself. The mapping is asserted to cover the matrix exactly, so a
 *  rename on either side fails rather than quietly measuring seven cells. */
const accentOf = (panel) => (panel.toLowerCase() === 'nebula' ? 'default' : panel.toLowerCase());

/** A CSS value reduced to what it paints: colours become numbers, so `#fff` and
 *  `rgb(255,255,255)` and `#FFFFFF` are one value, and whitespace decides
 *  nothing. Anything that is not a colour survives as text, which is what makes
 *  `0 0 0 3px …` in --ring comparable at all. */
const canonical = (value) => String(value)
  .replace(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi, (c) => {
    const p = parseColour(c);
    return p ? `rgba(${p.slice(0, 3).map(Math.round).join(',')},${Number(p[3]).toFixed(3)})` : c;
  })
  .replace(/\s+/g, ' ')
  .trim();

/** What accentVars() actually writes onto a panel, as declared. Both sides of
 *  the comparison are derived: this one from the story's own renderer, the other
 *  from the token files — neither is restated here. */
const declarationsOf = (css) => new Map(css.split(';').map((d) => {
  const i = d.indexOf(':');
  return [d.slice(0, i).trim(), d.slice(i + 1).trim()];
}));

test('the sub-theme story paints the accent tokens it claims to mirror', () => {
  assert.ok(
    FAMILY.length >= 8,
    `only ${FAMILY.length} accent-family propert(ies) were derived from src/tokens/accents.css. `
    + 'A renamed attribute would empty this list and let the story claim anything.',
  );
  assert.deepEqual(
    Object.keys(PANELS).map(accentOf).sort(), [...ACCENTS].sort(),
    'the sub-theme story\'s panels are not the accents accents.css declares. Either an accent was '
    + 'added or renamed and the story never followed, or a panel was renamed and now stands for no '
    + 'accent — in which case its literals would be compared against nothing.',
  );

  const drift = [];
  let compared = 0;
  for (const [panel, byTheme] of Object.entries(PANELS)) {
    for (const theme of THEMES) {
      const vars = tokensFor(theme, accentOf(panel));
      const declared = declarationsOf(accentVars(byTheme[theme]));
      assert.deepEqual(
        [...declared.keys()].sort(), [...FAMILY].sort(),
        `the ${theme} ${panel} panel does not paint the accent family accents.css declares. A `
        + 'property the panel leaves out is one the preview inherits from the toolbar theme instead '
        + 'of showing; one it invents belongs to no token.',
      );
      for (const [property, painted] of declared) {
        compared += 1;
        const token = vars.get(property);
        const shipped = token == null ? null : canonical(substitute(token, vars));
        if (shipped !== canonical(painted)) {
          drift.push(`${theme} ${panel} ${property}: the story paints ${painted}, the kit ships `
            + `${token == null ? 'nothing' : substitute(token, vars)}`);
        }
      }
    }
  }
  assert.deepEqual(
    drift,
    [],
    `\n${drift.join('\n')}\n\nstories/foundations/SubThemes.stories.js hand-copies the accent `
    + 'family so each preview panel is self-contained, and a hand-copied value goes stale the next '
    + 'time a token moves. The page\'s whole subject is what each accent\'s tokens are, so a stale '
    + 'literal is the page stating something the kit does not ship. Fix the table, not this test.',
  );
  assert.equal(
    compared,
    FAMILY.length * Object.keys(PANELS).length * THEMES.length,
    'the mirror check compared a different number of values than there are properties × panels × '
    + 'themes, so it is not seeing the whole table',
  );
});
