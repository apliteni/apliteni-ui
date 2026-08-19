/* Rule: the accent picker's swatch is made of the tokens that accent selects,
 * and all three copies of the picker paint the same one.
 *
 * A swatch is a promise about what happens when you press it, and the only thing on the
 * page describing an accent you are not looking at — so a stale one is the picker lying
 * about the theme it offers. Nebula's painted two ramp steps below its own --accent.
 *
 * THE RULE, applied to every accent alike and never special-cased by name:
 *
 *   angle  135deg, the kit's one diagonal, the same for every swatch.
 *   stop2  the accent's DARK --accent — the colour the kit actually paints.
 *   stop1  the next DISTINCT step up that accent's ramp: of --purple,
 *          --purple-light and --purple-mid, the one with the LOWEST relative
 *          luminance strictly GREATER than --accent's. Two steps tied there leave the
 *          rule no answer and the gate says so, rather than letting the order an array
 *          happens to be written in pick a hue.
 *
 * The angle's pin, the dark cell rather than the light one, the new-invariant reading and
 * the site's two hand-kept copies: CONTRIBUTING.md, "Add an accent sub-theme".
 *
 * Both sides are derived — the colours out of src/tokens/, the painted ones out of each
 * picker's render — so nothing here restates a literal it guards. And the lookup is
 * checked: tokensFor('dark', X) matches one exact selector, so an accent whose dark block
 * is spelled otherwise falls through to :root and inherits Nebula's ramp. Each accent's
 * own block is located before its ramp is read.
 *
 * WHAT THIS GATE CANNOT READ, so a failure does not send you to fix a swatch that is
 * fine: it reads two opaque #rgb / #rrggbb, rgb()/rgba() or color(srgb …) stops with no
 * positions. Eight-digit hex, hsl(), named colours, a third stop and `#bd8cff 99%` are
 * legal CSS it was not written to judge, and it fails naming its own limit, not yours.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { luminance, parseColour, substitute, tokensFor } from './lib/contrast.js';
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

/** The three ramp names a sub-theme re-points, in the order accents.css writes
 *  them — NOT in luminance order, which is why the rule sorts. The order is not
 *  even monotonic across the token files: light Phoenix's --purple-mid (#b8420f)
 *  is darker than its --purple-light (#d64a12), and light Ocean and Emerald do
 *  the same. Naming the three is what makes "the next step up the ramp" a
 *  question with an answer; each accent's own dark block is required to declare
 *  all three below, so a ramp step that stops existing narrows the search
 *  loudly instead of falling back to another cell's value. */
const RAMP = ['--purple', '--purple-light', '--purple-mid'];

/** The gradient angle every swatch shares. See "THE ANGLE IS PINNED" above. */
const ANGLE = '135deg';

/** The colour notations this gate can compare, for its own error messages. */
const READABLE = '#rgb, #rrggbb, rgb()/rgba() or color(srgb …)';

// ---- the tokens side ------------------------------------------------------

/** accents.css as rules, comments blanked, for the dark-block check below. */
const ACCENT_RULES = [...read('src/tokens/accents.css')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .matchAll(/([^{}]+)\{([^{}]*)\}/g)];

/**
 * The custom properties an accent's OWN dark block declares.
 *
 * The selector is matched the way stories/lib/contrast.js:53-57 `const wanted = [`
 * matches it —
 * whole-string, against one exact form — because that is the lookup whose result
 * this gate then judges. Anything else (a light-first block, or the legal
 * `[data-accent="x"][data-theme="dark"]` with the attributes the other way
 * round) is invisible to tokensFor, and invisible is the dangerous answer here.
 */
function ownDarkBlock(accent) {
  const wanted = `:root[data-theme="dark"][data-accent="${accent}"]`;
  const decls = new Map();
  for (const [, selector, body] of ACCENT_RULES) {
    if (!selector.split(',').map((s) => s.trim().replace(/\s+/g, ' ')).includes(wanted)) continue;
    for (const decl of body.split(';')) {
      const i = decl.indexOf(':');
      if (i < 0) continue;
      const name = decl.slice(0, i).trim();
      if (name.startsWith('--')) decls.set(name, decl.slice(i + 1).trim());
    }
  }
  return decls;
}

/** Fail unless tokensFor('dark', accent) will really see this accent's ramp. */
function requireOwnDarkBlock(accent) {
  // The default accent is Nebula, which is the :root cell in tokens.css and
  // wears no data-accent attribute — there is nothing for it in accents.css.
  if (accent === 'default') return;
  const own = ownDarkBlock(accent);
  assert.ok(
    own.size,
    `src/tokens/accents.css declares the accent "${accent}" but this gate cannot find its dark `
    + `block. It looks for exactly one selector — :root[data-theme="dark"][data-accent="${accent}"] `
    + '— because that is the only form stories/lib/contrast.js:53-57 `const wanted = [` resolves. '
    + 'Written any other '
    + `way (light block only, or [data-accent="${accent}"][data-theme="dark"] with the attributes `
    + 'reversed, both perfectly legal CSS) the lookup finds nothing accent-specific and falls '
    + "through to :root — i.e. to NEBULA's purple ramp. This gate would then demand a purple "
    + `swatch for ${accent} and go green the moment you painted one.`,
  );
  const missing = ['--accent', ...RAMP].filter((name) => !own.has(name));
  assert.deepEqual(
    missing, [],
    `dark ${accent} does not declare ${missing.join(', ')} in its own block, so those resolve to `
    + "Nebula's :root values and the swatch rule would be reading one accent's ramp against "
    + "another's --accent. An accent sub-theme re-points the whole family together.",
  );
}

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
  assert.ok(c, `dark ${accent}'s ${name} is ${raw}, which is not a colour this gate can read `
    + `(it reads ${READABLE}).`);
  assert.ok(
    c[3] >= 0.999,
    `dark ${accent}'s ${name} is ${raw}, which is translucent. The swatch is compared colour for `
    + 'colour and the ramp is ordered by luminance, and neither means anything un-composited: what '
    + 'you would see is this colour over whatever is behind the button, which is not a fact about '
    + 'the accent. Alpha belongs in --glow-purple and --ring, not in the ramp.',
  );
  return c;
}

/** The gradient the rule demands for one accent, as { stop1, stop2 }. */
function derive(accent) {
  requireOwnDarkBlock(accent);
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
  // A tie is refused rather than broken. Two ramp steps at the same luminance
  // and different hues are two different swatches, and nothing in the rule says
  // which — resolving it by the order RAMP happens to be written in would make
  // the shipped colour depend on a line in this file that reads like a list.
  const tied = above.filter((s) => luminance(s.colour) === luminance(above[0].colour));
  assert.equal(
    tied.length, 1,
    `dark ${accent} has ${tied.length} ramp steps at the same luminance directly above its `
    + `--accent (${tied.map((s) => `${s.name} ${paints(s.colour)}`).join(', ')}), so "the next step `
    + 'up the ramp" has no answer and this gate will not invent one. Move one of them, or decide '
    + 'the tie in the rule at the top of this file first.',
  );
  return { stop1: above[0], stop2: { name: '--accent', colour: stop2 } };
}

// ---- the painted side -----------------------------------------------------

/**
 * Every accent swatch a picker paints, as accent → the gradient text itself.
 *
 * One parser for all three copies, and it reads BUTTONS, not a window in a file.
 * The kit's picker writes the gradient into a --swatch custom property on the
 * button and the site's two write it into `background` (the playground's on a
 * child <span>), so the gradient is looked for anywhere inside the button
 * element — but never outside it. Bounding on the element is what keeps the
 * mapping true: a lookahead to the next data-acc IN THE FILE would let a
 * gradient in a <style> block that follows a swatchless button become that
 * button's swatch, and a picker whose attributes are written in another order
 * would shift every accent onto its neighbour's colour and report the drift as
 * wrong colour values.
 */
const BUTTON = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
const ACCENT_ATTR = /data-acc(?:ent-pick)?="([\w-]+)"/;

/** The balanced `linear-gradient(…)` in `text`, or null. Balanced, so a stop
 *  written as color(srgb …) does not truncate the gradient at its paren. */
function gradientIn(text) {
  const at = text.indexOf('linear-gradient(');
  if (at < 0) return null;
  let depth = 0;
  for (let i = at + 'linear-gradient'.length; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') {
      depth -= 1;
      if (depth === 0) return text.slice(at, i + 1);
    }
  }
  return null;
}

/** A gradient's comma-separated fields — the angle, then the stops — split at
 *  paren depth 0, so color(srgb 0.7 0.5 1) stays one field. */
function fieldsOf(gradient) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of gradient.slice('linear-gradient('.length, -1)) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** What a colour paints, as numbers, so `#B479FF` and `#b479ff` are one value
 *  and the two sides of the comparison can be written in different notations. */
const paints = (c) => `rgb(${c.slice(0, 3).map(Math.round).join(', ')})`;

/**
 * A painted stop as a colour, or a sentence saying why it cannot be one.
 *
 * The two "cannot" cases are deliberately different sentences. A stop this gate
 * simply does not parse is the GATE's limit and says so; a translucent stop is a
 * real objection, because the whole comparison — and the ramp ordering behind it
 * — is computed un-composited and means nothing for a colour you see through.
 */
function stopColour(text) {
  const c = parseColour(text);
  if (c && c[3] >= 0.999) return { colour: c };
  if (c) {
    return {
      why: `paints ${text}, which is translucent — what you would see is that colour over the `
        + 'button, which is not the accent. This gate compares stops un-composited and orders the '
        + 'ramp by luminance, and neither is true of a colour with alpha',
    };
  }
  const bare = text.split(/\s+/)[0];
  if (parseColour(bare)) {
    return {
      why: `paints ${text}, a colour with a stop position. That is legal CSS and a limit of this `
        + 'test, not a fault in your swatch: the rule says which two colours a swatch fades '
        + 'between and nothing about where the fade lands, so a position is a decision nobody has '
        + 'made yet. Keep the swatch to two bare stops, or write the rule for positions first',
    };
  }
  return {
    why: `paints ${text}, which this gate cannot read. It reads ${READABLE} — eight-digit hex, `
      + 'hsl() and named colours are limits of this test, not faults in your swatch',
  };
}

/**
 * The swatches one source paints, as accent → gradient text.
 *
 * Two things are refused here rather than absorbed. A second button for an
 * accent already seen: a Map built from entries keeps the LAST, so a commented-out
 * old picker sitting under the live one is what the gate would validate, silently
 * and forever. And a picker button with no gradient in it at all: that accent is
 * offered — it is in the strip, it is pressable — but it has no colour, which is
 * a different fault from the accent being absent, and used to be reported as one.
 */
function swatchesIn(file, html) {
  const found = new Map();
  for (const [, attrs, inner] of html.matchAll(BUTTON)) {
    const tag = ACCENT_ATTR.exec(attrs);
    if (!tag) continue;
    const accent = tag[1];
    assert.ok(
      !found.has(accent),
      `${file} has two picker buttons for the accent "${accent}". Only one of them is what the `
      + 'page paints, and this gate cannot tell you which: keeping the last one silently is how a '
      + 'retired picker left under the live one — or commented out beside it — becomes the thing '
      + 'that gets validated. Delete the old one. (If a second REAL picker ever lands in one file '
      + '— inlining the {{FOOTER}} placeholder at site/index.html:379 `{{FOOTER}}` would put one '
      + 'there — then '
      + 'this gate has to learn to read a picker group rather than a file, which is a change to '
      + 'make deliberately.)',
    );
    found.set(accent, gradientIn(`${attrs}>${inner}`));
  }
  for (const [accent, gradient] of found) {
    assert.ok(
      gradient,
      `${file} offers the accent "${accent}" but paints no gradient inside that button, so the `
      + 'strip shows an empty square you can still press. In src/components/index.js that is '
      + 'ACCENT_SWATCH having no entry for an accent that IS in `options` — the swatch falls back '
      + 'to `transparent`. The accent is not missing; its colour is.',
    );
  }
  return found;
}

const SOURCES = {
  'src/components/index.js': accentPicker(),
  'site/chrome.mjs': footer(),
  'site/index.html': read('site/index.html'),
};

test('every accent swatch is the gradient its own tokens make', () => {
  assert.ok(
    ACCENTS.length >= 4,
    `only ${ACCENTS.length} accent(s) were derived from src/tokens/accents.css, and the kit ships `
    + 'four (Nebula plus three sub-themes). Either an attribute was renamed and this list is now '
    + 'empty enough to let the pickers paint anything, or an accent was genuinely retired — in '
    + 'which case lower this number in the same change that removes it from accents.css, the '
    + 'pickers and the Storybook toolbar, so the floor keeps saying what the kit actually ships.',
  );

  const kit = swatchesIn('src/components/index.js', SOURCES['src/components/index.js']);
  assert.deepEqual(
    [...kit.keys()].sort(), [...ACCENTS].sort(),
    'accentPicker() does not offer the accents the token files declare. An accent it leaves out is '
    + 'one nobody can pick; one it invents selects a sub-theme that does not exist. (An accent it '
    + 'offers with no swatch is a third thing, and fails above by name.)',
  );

  const drift = [];
  const derived = new Map();
  for (const accent of ACCENTS) {
    const want = derive(accent);
    derived.set(accent, `${paints(want.stop1.colour)} → ${paints(want.stop2.colour)}`);
    const painted = fieldsOf(kit.get(accent));
    if (painted.length !== 3) {
      drift.push(`${accent}: the swatch is ${kit.get(accent)}, which is not an angle and two stops`);
      continue;
    }
    if (painted[0].toLowerCase() !== ANGLE) {
      // Field 0 is not decoration. It decides which end of the gradient the
      // accent is at, and the rule is directional, so an unchecked field 0 lets
      // `315deg` paint the right two colours the wrong way round — and lets a
      // bare colour there be read as the angle and never compared at all.
      drift.push(
        `${accent}: the swatch starts ${painted[0]}, the rule says ${ANGLE}. The gradient runs `
        + 'from the ramp step DOWN to --accent, so the angle is what says which end is which',
      );
    }
    for (const [i, side] of [want.stop1, want.stop2].entries()) {
      const got = stopColour(painted[i + 1]);
      if (got.why) {
        drift.push(`${accent} stop${i + 1}: the swatch ${got.why}`);
      } else if (paints(got.colour) !== paints(side.colour)) {
        drift.push(
          `${accent} stop${i + 1}: the swatch paints ${painted[i + 1]}, the kit ships `
          + `${side.name} ${paints(side.colour)}`,
        );
      }
    }
  }
  assert.deepEqual(
    drift, [],
    `\n${drift.join('\n')}\n\nThe swatch is the only thing on the page that shows you an accent you `
    + 'are not currently looking at, so it has to be made of that accent\'s own tokens: at '
    + `${ANGLE}, it fades from the next distinct step up the ramp (of --purple / --purple-light / `
    + '--purple-mid, the darkest one still lighter than --accent) down to dark --accent. Where a '
    + 'line above says the notation is this gate\'s limit, fix the gate; otherwise fix the swatch, '
    + 'not this test — and if you fix one copy, fix all three (the next assertion says which).',
  );

  // Anti-vacuity, and it can fail. Every accent deriving the SAME pair is what a
  // broken token lookup looks like from here: tokensFor matches one exact
  // selector and falls through to :root otherwise, so an accent whose dark block
  // it cannot see is handed Nebula's ramp and derives Nebula's swatch. That is
  // caught by name in requireOwnDarkBlock; this catches the shape of it however
  // it arrives, including from a change to the resolver this file does not own.
  assert.equal(
    new Set(derived.values()).size, ACCENTS.length,
    `the ${ACCENTS.length} accents derived only ${new Set(derived.values()).size} distinct `
    + `gradient(s): ${[...derived].map(([a, g]) => `${a} ${g}`).join('; ')}. Two accents cannot `
    + 'honestly want the same swatch — the ramp lookup is reading one cell for several accents.',
  );
});

test('all three copies of the accent picker paint the same swatches', () => {
  const [canonical, ...rest] = Object.keys(SOURCES);
  const want = swatchesIn(canonical, SOURCES[canonical]);
  assert.equal(
    want.size, ACCENTS.length,
    `${canonical} paints ${want.size} swatch(es) for ${ACCENTS.length} accents.`,
  );
  for (const file of rest) {
    assert.deepEqual(
      Object.fromEntries(swatchesIn(file, SOURCES[file])), Object.fromEntries(want),
      `${file} does not paint the swatches ${canonical} declares. The kit's picker, the site `
      + 'footer\'s and the landing playground\'s are three hand-kept copies of one control, and a '
      + 'swatch that depends on where you met the picker is worse than one that is merely wrong — '
      + 'the page now disagrees with itself. Change all three together: what is compared is the '
      + 'gradient text per accent, so the three may differ in how they deliver it (--swatch here, '
      + '`background` there) and in what order they list the accents, but not in what they paint.',
    );
  }
});
