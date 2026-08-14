/* Rule: --accent clears WCAG AA as text on every ground the kit paints under it,
 * in all eight theme × accent cells — or a person names the cell and says why.
 *
 * The accents, their token family and the grounds are all DISCOVERED from the
 * two semantic token files rather than listed here, and the size of each
 * derivation is asserted, so one that stopped matching fails instead of passing
 * by measuring nothing. What a person writes by hand is the SURFACE_NAME
 * pattern, plus a reason for every candidate that pattern finds and this gate
 * does not measure (EXEMPT_GROUNDS), and for every pair allowed under the floor
 * (EXEMPT).
 *
 * The wash is measured over the four BASE surfaces and not over --surface-3.
 * That is a claim about the kit rather than a gap here: --surface-3 is a RAISED
 * surface, and nothing paints the accent wash on one any more.
 * src/styles/nav.css:120-129 is the rule that used to, and its comment carries
 * the numbers. Nothing holds that rule mechanically — a token gate cannot see a
 * component that stacks the wash again, and no story renders the pair either,
 * which is why it went unmeasured until a person read the CSS by hand.
 *
 * This is a TOKEN contract, not a render: milliseconds, where the story walk in
 * contrast.test.js costs seconds a cell. That is why this file affords all eight
 * cells while that one runs two, and the two are complements — it sees pairs no
 * story happens to render, and misses both a ground a component mixes for itself
 * and a pair a story invents out of literals. One story invents them on purpose,
 * and the last test here is why: the sub-theme page pins a whole accent family
 * inline per panel, and that mirror is resolved against the token files property
 * by property, because a mirror kept by hand goes stale and this one twice did.
 *
 * why: docs/specification.md#colour-and-contrast
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

const TOKENS_CSS = readFileSync(path.join(root, 'src/tokens/tokens.css'), 'utf8');

/** Every custom property a token file declares in a :root block, comments
 *  stripped first — several of them quote token names, and a quoted name is not
 *  a declaration. */
const declaredIn = (css) => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector]) => selector.split(',').some((s) => s.trim().startsWith(':root')))
  .flatMap(([, , body]) => [...body.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));

/**
 * A ground is a surface the kit paints BEHIND other things, and the kit's token
 * names say which those are: --bg…, --surface…, or a name ending in -bg. The
 * candidates are swept out of the two semantic token files by that pattern, so
 * a surface added tomorrow is a candidate the day it is declared and cannot be
 * left out by the same oversight that lost --surface-3.
 *
 * A PATTERN AND NOT A PREDICATE, on purpose. Deriving grounds from "every
 * opaque token" or "every token used as a background" sweeps in --control-knob,
 * the chip fills and the brand ramp — none of which the accent is ever read on
 * — and would bury the real grounds under a page of exemptions. Naming is the
 * kit's own signal for what a surface is, and it is the narrowest honest one.
 *
 * brand.generated.css is not swept: it carries the synced brand primitives the
 * semantic tokens are built FROM, and nothing paints text on a primitive.
 * accents.css declares no surface today and is swept anyway, so the day it does
 * the sweep already covers it.
 */
const SURFACE_NAME = /^--(bg|surface)(-|$)|-bg$/;

/** Accent names as accents.css declares them. The default accent lives in
 *  tokens.css and carries no data-accent attribute, so it is named here. */
const ACCENTS_CSS = readFileSync(path.join(root, 'src/tokens/accents.css'), 'utf8');

const CANDIDATE_GROUNDS = [...new Set([...declaredIn(TOKENS_CSS), ...declaredIn(ACCENTS_CSS)])]
  .filter((name) => SURFACE_NAME.test(name));

/**
 * A candidate the accent is NEVER read on, and the reason a person gave.
 *
 * This is the other half of discovery: the sweep decides what the candidates
 * are, and a person decides, in writing, which of them this gate does not
 * measure. Nothing here can be checked by measurement — the claim is about what
 * the kit PAINTS, not about a ratio — which is exactly why it has to be a
 * sentence somebody wrote and not a filter somebody tuned.
 */
const EXEMPT_GROUNDS = [
  {
    ground: '--seg-active-bg',
    why: 'The active pill of a segmented control, and the one candidate surface no accent ink is '
      + 'painted on: the active pill sets `color: var(--strong)` (src/styles/segmented.css), which '
      + 'is #ffffff in dark and near-black in light, and nothing else in the kit paints on this '
      + 'token at all. Measured anyway it would fail — --accent reads 4.23:1 on it in dark Nebula '
      + '— so this entry is a live one, not a formality: it records a LATENT risk, that the day a '
      + 'component puts accent ink on an active segment the pair is already under the floor. It is '
      + 'excused because the kit does not paint it, and it must stop being excused the moment the '
      + 'kit does. No measurement can notice that happening; a person reading this has to.',
  },
];

const NOT_MEASURED = new Set(EXEMPT_GROUNDS.map((e) => e.ground));
const GROUNDS = CANDIDATE_GROUNDS.filter((g) => !NOT_MEASURED.has(g));

/** The grounds the accent WASH is measured over: the base surfaces only. See the
 *  header — --surface-3 is raised, and the rule is that the wash is not stacked
 *  on it. Derived by subtraction so a sixth surface joins both lists at once. */
const WASHED_GROUNDS = GROUNDS.filter((g) => g !== '--surface-3');

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
 * WORSE of the two and a value is only chosen when it clears in both. Light
 * Ocean is where that earned its keep: its wash was thinned to 0.05 because at
 * 0.06 over --surface-2 it read 4.501 at full precision and 4.491 rounded, and
 * the pixel Chromium actually paints read 4.483 — a failing pair either way, and
 * one this gate would have carried as an exemption if it had believed a single
 * model. The wash is back at 0.10 now: #157 deepened that cell's --accent
 * instead, which is what a thinner wash had been standing in for. The rule that
 * refused 0.06 is the reason the deeper ink was looked for at all.
 */
const MODELS = {
  rounded: (fg, bg) => composite(fg, bg).map(Math.round),
  exact: (fg, bg) => composite(fg, bg),
};

/** Every pair a cell is judged on: the accent on each of the five flat grounds,
 *  and on the accent wash over the four base ones, at the worse of the two
 *  composite models. */
function pairsOf({ theme, accent }) {
  const vars = tokensFor(theme, accent);
  const colour = (name) => parseColour(substitute(`var(${name})`, vars));
  const ink = colour('--accent');
  const glow = colour('--glow-purple');
  return GROUNDS.flatMap((ground) => {
    const flat = colour(ground);
    const pairs = [{ theme, accent, ground, washed: false, ratio: ratio(ink, flat), byModel: null }];
    if (!WASHED_GROUNDS.includes(ground)) return pairs;
    const byModel = Object.fromEntries(Object.entries(MODELS).map(([name, paint]) => {
      const washed = paint(glow, flat);
      return [name, ratio(paint(ink, washed), washed)];
    }));
    return [...pairs, {
      theme, accent, ground, washed: true, byModel,
      ratio: Math.min(...Object.values(byModel)),
    }];
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

test('every exemption still names something real, and says why in a sentence', () => {
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

  // The same rot, one level up: an excused GROUND that the sweep no longer
  // finds is excusing nothing, and the surface it was written for is either
  // renamed and now silently measured, or gone and the entry is a fossil.
  const orphaned = EXEMPT_GROUNDS.map((e) => e.ground).filter((g) => !CANDIDATE_GROUNDS.includes(g));
  assert.deepEqual(
    orphaned,
    [],
    `\n${orphaned.join('\n')}\n\nEXEMPT_GROUNDS excuses a property the token-file sweep does not `
    + 'find. Either it was renamed — in which case the reason written on it now applies to a name '
    + 'nobody excused — or it left the token files and the entry should go with it.',
  );

  for (const e of EXEMPT) {
    assert.ok(e.why && e.why.length > 120, `the ${keyOf(e)} exemption has no real reason written on it`);
  }
  for (const e of EXEMPT_GROUNDS) {
    assert.ok(
      e.why && e.why.length > 120,
      `the ${e.ground} ground exemption has no real reason written on it. A ground is dropped from `
      + 'this gate only on an argument about what the kit paints, and the argument has to be here.',
    );
  }
});

test('the accent gate actually measures something', () => {
  assert.ok(
    DECLARED.length >= 3,
    `only ${DECLARED.length} accent(s) were derived from src/tokens/accents.css. A renamed attribute `
    + 'would make every assertion above pass by matching nothing, which is the failure this guards.',
  );
  // Not asserted here: `CELLS.length === THEMES.length * ACCENTS.length`. CELLS
  // is built as exactly that product one screen up, so the equality restates its
  // own definition and cannot fail — the same shape as the mirror check's old
  // comparison count, which went one commit earlier. An assertion whose two
  // sides are the same expression is not a guard, and leaving one in a file
  // about vacuity teaches the wrong lesson. What makes the matrix real is that
  // the accents are derived and their count is pinned, below.
  assert.equal(
    [...ACCENTS_CSS.matchAll(/--accent\s*:/g)].length,
    DECLARED.length * THEMES.length,
    'accents.css declares a different number of --accent values than the cells derived from it',
  );

  // The candidate sweep, pinned exactly rather than as a floor — this one
  // number does both jobs. Below it, a broken SURFACE_NAME or a renamed :root
  // block empties the sweep and every ground assertion would pass by measuring
  // nothing. Above it, a surface has joined the token files, and the point of
  // discovering candidates is that a person then decides which kind it is
  // instead of it landing in nobody's list. Bumping this number IS that
  // decision, so it is deliberately not automatic.
  assert.equal(
    CANDIDATE_GROUNDS.length, 6,
    `the token-file sweep found ${CANDIDATE_GROUNDS.length} candidate ground(s) `
    + `(${CANDIDATE_GROUNDS.join(', ')}), not 6. If a surface was added, decide whether the accent `
    + 'is ever read on it: leave it measured, or write it into EXEMPT_GROUNDS with a reason. Then '
    + 'move this number. If a surface left, move it too. If it went to zero, SURFACE_NAME or the '
    + ':root sweep is broken and this gate was about to measure nothing.',
  );
  assert.ok(GROUNDS.length > 0, 'every candidate ground has been excused, so nothing is measured');

  const inks = new Set();
  for (const cell of CELLS) {
    const vars = tokensFor(cell.theme, cell.accent);
    const colour = (name) => parseColour(substitute(`var(${name})`, vars));
    const glow = colour('--glow-purple');
    assert.ok(glow && glow[3] > 0 && glow[3] < 1, `--glow-purple (${cell.theme} ${cell.accent}) is not a wash`);

    // The INK has to be opaque too, and this is the assertion that was missing.
    // ratio() reads the rgb it is handed and ignores alpha, so a translucent
    // --accent would be measured as the colour it is not: every flat pair would
    // report the ratio of a solid ink the browser never paints, and report it
    // as a pass. The washed pairs would catch it — they composite the ink — but
    // silently, by failing for a reason nobody would connect to the alpha.
    const ink = colour('--accent');
    assert.ok(ink, `--accent (${cell.theme} ${cell.accent}) resolved to no colour`);
    assert.equal(
      ink[3], 1,
      `--accent (${cell.theme} ${cell.accent}) is not opaque. Every flat pair in this file is `
      + 'measured as though it were, so a translucent accent is judged as a colour the kit does '
      + 'not paint. A wash belongs in --glow-purple; --accent is ink.',
    );

    for (const ground of GROUNDS) {
      const flat = colour(ground);
      assert.ok(flat, `${ground} (${cell.theme} ${cell.accent}) resolved to no colour`);
      assert.equal(flat[3], 1, `${ground} (${cell.theme} ${cell.accent}) is not opaque, so it cannot be a ground`);
    }
    const pairs = pairsOf(cell);
    assert.equal(
      pairs.length, GROUNDS.length + WASHED_GROUNDS.length,
      `${cell.theme} ${cell.accent} produced the wrong pair count`,
    );
    assert.deepEqual(
      pairs.filter((p) => p.washed).map((p) => p.ground), WASHED_GROUNDS,
      `${cell.theme} ${cell.accent} is judged on the wash over a different set of grounds than `
      + 'WASHED_GROUNDS names. The exclusion of --surface-3 is a rule about where the kit paints '
      + 'the wash, stated in this file\'s header and argued in the ADR it points at — it must not '
      + 'become an accident of the loop.',
    );
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
  for (const [panel, byTheme] of Object.entries(PANELS)) {
    for (const theme of THEMES) {
      const vars = tokensFor(theme, accentOf(panel));
      const declared = declarationsOf(accentVars(byTheme[theme]));
      // This is also what makes the walk below exhaustive: the key set is
      // pinned to FAMILY per panel, so every panel contributes every property.
      // A separate count of the comparisons would only restate that.
      assert.deepEqual(
        [...declared.keys()].sort(), [...FAMILY].sort(),
        `the ${theme} ${panel} panel does not paint the accent family accents.css declares. A `
        + 'property the panel leaves out is one the preview inherits from the toolbar theme instead '
        + 'of showing; one it invents belongs to no token.',
      );
      for (const [property, painted] of declared) {
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
});
