/* Rule: the accent picker's swatch is made of the tokens that accent selects,
 * and all three copies of the picker paint the same one.
 *
 * A swatch is a promise about what happens when you press it. It is also the only
 * thing on the page that describes an accent you are not currently looking at, so
 * a stale swatch is not a cosmetic drift — it is the picker lying about the theme
 * it is offering. Nebula's had been lying since #157 lifted dark --accent onto
 * #b479ff: the swatch still painted the ramp two steps below, and the accent you
 * got was visibly lighter than the accent you picked.
 *
 * THE RULE, stated once and applied to every accent alike:
 *
 *   stop2  the accent's DARK --accent — the colour the kit actually paints.
 *   stop1  the next DISTINCT step up that accent's ramp: of --purple,
 *          --purple-light and --purple-mid, the one with the LOWEST relative
 *          luminance strictly GREATER than --accent's.
 *
 * "Strictly greater" is the whole of the Nebula fix. Every other accent's ramp
 * has --purple-light sitting one step above --accent, so that is what they get;
 * dark Nebula's --purple-light IS --accent (tokens.css:115, :152), so the rule
 * walks on to --purple-mid rather than emitting a gradient from a colour to
 * itself. Nothing here special-cases an accent by name — a fifth accent is
 * judged the day accents.css declares it, and gets whichever ramp step its own
 * numbers put above its accent.
 *
 * Dark and not light, because there is one swatch and it has to be one colour.
 * The picker sits in a footer that renders in both themes; the accent's identity
 * — the thing the swatch is naming — is the dark cell, which is where every
 * accent is at its most saturated and most itself.
 *
 * BOTH SIDES ARE DERIVED. The expected gradient is read out of src/tokens/, and
 * the painted one out of the picker's own render. Neither is restated here, so
 * this file cannot go stale the way the literals it guards did.
 *
 * THREE COPIES. The kit's accentPicker() is not the only picker: the marketing
 * site ships two more by hand, one in the footer chrome and one in the landing
 * page's live playground. They must move together — a swatch that depends on
 * where you met the picker is worse than one that is merely wrong, because now
 * the page disagrees with itself. So the copies are compared to each other
 * string for string, and only the kit's is compared to the tokens.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { luminance, parseColour, rgbOf, substitute, tokensFor } from './lib/contrast.js';
import { accentPicker } from '../src/components/index.js';
import { footer } from '../site/chrome.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

/** Accent names as the token files declare them, exactly as
 *  stories/accent-contrast.test.js derives them: the default accent lives in
 *  tokens.css and wears no data-accent attribute, so it is named. */
const ACCENTS = ['default', ...new Set(
  [...read('src/tokens/accents.css').matchAll(/\[data-accent="([\w-]+)"\]/g)].map((m) => m[1]),
)];

/** The ramp a sub-theme re-points, lightest last. The rule picks from these
 *  three by luminance; naming them is what makes "the next step up the ramp" a
 *  question with an answer. A missing one fails below rather than narrowing the
 *  search in silence. */
const RAMP = ['--purple', '--purple-light', '--purple-mid'];

/** A colour token resolved for a cell, or a thrown explanation. */
function colourOf(vars, name, accent) {
  const raw = vars.get(name);
  assert.ok(
    raw != null,
    `dark ${accent} declares no ${name}. The swatch rule reads the accent's ramp out of `
    + 'src/tokens/, so a ramp step that stops existing leaves the rule with less to choose from '
    + 'than it was written against.',
  );
  const c = parseColour(substitute(raw, vars));
  assert.ok(c, `dark ${accent}'s ${name} is ${raw}, which is not a colour this gate can read.`);
  return c;
}

/** The gradient the rule demands for one accent, as [stop1, stop2] rgb strings. */
function derive(accent) {
  const vars = tokensFor('dark', accent);
  const stop2 = colourOf(vars, '--accent', accent);
  const above = RAMP
    .map((name) => ({ name, colour: colourOf(vars, name, accent) }))
    .filter((s) => luminance(s.colour) > luminance(stop2))
    .sort((a, b) => luminance(a.colour) - luminance(b.colour));
  assert.ok(
    above.length,
    `dark ${accent} has no ramp step lighter than its --accent, so there is no second colour for `
    + 'its swatch to fade from. Either the ramp is upside down or --accent has been lifted past '
    + 'the top of it.',
  );
  return { stop1: above[0], stop2: { name: '--accent', colour: stop2 } };
}

/**
 * Every accent swatch a picker paints, as accent → the gradient text itself.
 *
 * One parser for all three copies: the kit's picker writes the gradient into a
 * --swatch custom property and the site's two write it into `background`, but
 * all three tag the button with the accent it selects. The window between the
 * tag and the gradient may not contain another tag, so a button that lost its
 * gradient cannot silently borrow the next button's.
 */
const swatchesIn = (html) => new Map(
  [...html.matchAll(/data-acc(?:ent-pick)?="([\w-]+)"((?:(?!data-acc)[\s\S])*?)(linear-gradient\([^)]*\))/g)]
    .map(([, accent, , gradient]) => [accent, gradient]),
);

/** A gradient split into what it paints: the angle, then the colour stops. */
const stopsOf = (gradient) => gradient.slice('linear-gradient('.length, -1).split(',').map((s) => s.trim());

/** What a colour paints, as numbers, so `#B479FF` and `#b479ff` are one value
 *  and the two sides of the comparison can be written in different notations. */
const paints = (c) => `rgb(${c.slice(0, 3).map(Math.round).join(', ')})`;

const SOURCES = {
  'src/components/index.js': accentPicker(),
  'site/chrome.mjs': footer(),
  'site/index.html': read('site/index.html'),
};

test('every accent swatch is the gradient its own tokens make', () => {
  assert.ok(
    ACCENTS.length >= 4,
    `only ${ACCENTS.length} accent(s) were derived from src/tokens/accents.css. A renamed attribute `
    + 'would empty this list and let the pickers paint anything.',
  );

  const kit = swatchesIn(SOURCES['src/components/index.js']);
  assert.deepEqual(
    [...kit.keys()].sort(), [...ACCENTS].sort(),
    'accentPicker() does not offer the accents the token files declare. An accent it leaves out is '
    + 'one nobody can pick; one it invents selects a sub-theme that does not exist.',
  );

  const drift = [];
  for (const accent of ACCENTS) {
    const want = derive(accent);
    const painted = stopsOf(kit.get(accent));
    if (painted.length !== 3) {
      drift.push(`${accent}: the swatch is ${kit.get(accent)}, which is not an angle and two stops`);
      continue;
    }
    const [, ...stops] = painted;
    for (const [i, side] of [want.stop1, want.stop2].entries()) {
      if (rgbOf(stops[i]) !== paints(side.colour)) {
        drift.push(
          `${accent} stop${i + 1}: the swatch paints ${stops[i]}, the kit ships `
          + `${side.name} ${paints(side.colour)}`,
        );
      }
    }
  }
  assert.deepEqual(
    drift, [],
    `\n${drift.join('\n')}\n\nThe swatch is the only thing on the page that shows you an accent you `
    + 'are not currently looking at, so it has to be made of that accent\'s own tokens: it fades '
    + 'from the next distinct step up the ramp (of --purple / --purple-light / --purple-mid, the '
    + 'darkest one still lighter than --accent) down to dark --accent. Fix the swatch, not this '
    + 'test — and if you fix one copy, fix all three (the next assertion says which).',
  );

  // Not a restatement of the loop: the loop's coverage is the key set, which is
  // pinned above. This pins that a stop was actually compared, so a `derive` that
  // started returning nothing could not pass by asserting emptiness at emptiness.
  assert.equal(
    ACCENTS.every((a) => stopsOf(kit.get(a)).length === 3), true,
    'an accent swatch stopped being an angle and two colour stops, so the rule compared nothing.',
  );
});

test('all three copies of the accent picker paint the same swatches', () => {
  const [canonical, ...rest] = Object.keys(SOURCES);
  const want = swatchesIn(SOURCES[canonical]);
  assert.equal(
    want.size, ACCENTS.length,
    `${canonical} paints ${want.size} swatch(es) for ${ACCENTS.length} accents.`,
  );
  for (const file of rest) {
    assert.deepEqual(
      Object.fromEntries(swatchesIn(SOURCES[file])), Object.fromEntries(want),
      `${file} does not paint the swatches ${canonical} declares. The kit's picker, the site `
      + 'footer\'s and the landing playground\'s are three hand-kept copies of one control, and a '
      + 'swatch that depends on where you met the picker is worse than one that is merely wrong — '
      + 'the page now disagrees with itself. Change all three together, and keep them character '
      + 'for character identical so this stays a diff a person can read.',
    );
  }
});
