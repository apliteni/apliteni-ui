/* The selected accent swatch while it also holds keyboard focus.
 *
 * WHY THIS EXISTS SEPARATELY FROM accent-ring.js: that gate reads the resting
 * two-layer shadow, so it cannot see the edge the control draws when the kit's
 * focus ring is composed with the selection band. #472's review measured the
 * first attempt at that composition — the kit band laid straight against the
 * selection band — at 1.049:1 in light and 1.064:1 in dark with the page on
 * Ocean and Phoenix selected, which is one smear and not two signals.
 *
 * WHAT THIS READS: the bands of the focused rule, in the order they paint
 * outward, and the contrast between each pair that touches. The page is always
 * put on a DIFFERENT accent from the one selected, because two bands in one
 * colour cannot fail an adjacency check and a gate that sets them equal proves
 * nothing.
 *
 * WHAT IT CANNOT READ: the 12px halo in var(--ring). It is a blurred translucent
 * layer, so the pixels it reaches are the band colours mixed with the ring
 * colour by a fraction no source reader can compute; this gate records that the
 * halo is there, skips it, and measures the opaque bands as declared. The halo
 * pulls both sides of every pair toward one hue, which can only lower a ratio,
 * so a pass here is a ceiling and not the painted result. Browser pixel samples
 * at the band interiors are what close that gap, and #578 removes the halo
 * outright. JSDOM also resolves no var(), which is why the caller substitutes
 * the tokens, and no gradient, so the swatch fill inside the innermost band is
 * not a ground this gate can measure.
 */
import assert from 'node:assert/strict';
import { parseColour, ratio, substitute, tokensFor } from './contrast.js';

/** The ring-contrast floor in guidelines/accessibility-floor.md. */
export const BAND_FLOOR = 3;

/**
 * The neutral the kit hands a focused control as the ground under its ring.
 *
 * It is what the outermost band is read against, and it is the same value the
 * separator between the bands takes, so the two never drift apart. A card
 * re-points it at its own surface; at the root it is the page.
 */
export function ringGap(theme, accent) {
  const vars = tokensFor(theme, accent);
  const colour = parseColour(substitute(vars.get('--ring-gap'), vars));
  assert.ok(colour, `${theme} declares no --ring-gap this gate can read`);
  return colour;
}

/** Split on top-level commas, so `color-mix(in srgb, …)` stays one token. */
function splitTop(value, separator) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    else if (value[i] === ')') depth--;
    else if (value[i] === separator && depth === 0) { out.push(value.slice(start, i)); start = i + 1; }
  }
  out.push(value.slice(start));
  return out.map((part) => part.trim()).filter(Boolean);
}

/**
 * A px length, including the `calc()` sums the kit derives its offsets from.
 *
 * The offsets are derived so that a change to --ring-width or --ring-gap-width
 * moves the separator with the band it separates; the cost is that the computed
 * value arrives as text JSDOM has not reduced, so the arithmetic happens here.
 * Only the forms the kit writes are accepted — px terms, each optionally scaled
 * by a bare number — and anything else fails loudly rather than being guessed.
 */
export function px(value) {
  const s = String(value).trim();
  const inner = /^calc\((.*)\)$/s.exec(s);
  if (!inner) {
    // A bare 0 is a length; every other length the kit writes carries px.
    const m = /^(-?[\d.]+)(px)?$/.exec(s);
    assert.ok(m && (m[2] || Number.parseFloat(m[1]) === 0), `not a px length this gate can read: ${s}`);
    return Number.parseFloat(m[1]);
  }
  return splitTop(inner[1], '+').reduce((sum, term) => {
    const factors = splitTop(term, '*');
    let scale = 1;
    let length = null;
    for (const factor of factors) {
      const asPx = /^(-?[\d.]+)px$/.exec(factor.trim());
      const asNumber = /^-?[\d.]+$/.exec(factor.trim());
      if (asPx) { assert.equal(length, null, `two px terms multiplied: ${term}`); length = Number.parseFloat(asPx[1]); }
      else if (asNumber) scale *= Number.parseFloat(asNumber[0]);
      else assert.fail(`not a px product this gate can read: ${term}`);
    }
    assert.ok(length !== null, `no px length in: ${term}`);
    return sum + scale * length;
  }, 0);
}

/**
 * One box-shadow layer as `{ blur, spread, colour, halo }`.
 *
 * The kit writes the colour last, which is the form this reads. A layer with a
 * blur is the halo: it decorates and carries no contrast of its own, which is
 * the kit's own G2 rule in docs/specification.md#the-focus-ring.
 */
function layerOf(text) {
  const parts = splitTop(text, ' ');
  const lengths = [];
  while (parts.length && /^(-?[\d.]+(px)?$|calc\()/.test(parts[0])) lengths.push(parts.shift());
  assert.ok(lengths.length >= 2 && lengths.length <= 4, `a shadow layer takes 2-4 lengths: ${text}`);
  const colour = parts.join(' ');
  assert.ok(colour, `a shadow layer with no colour: ${text}`);
  return {
    blur: lengths.length >= 3 ? px(lengths[2]) : 0,
    spread: lengths.length >= 4 ? px(lengths[3]) : 0,
    colour: parseColour(colour),
    raw: colour,
    halo: (lengths.length >= 3 ? px(lengths[2]) : 0) > 0,
  };
}

/**
 * Measure the focused selected swatch and return its bands outward.
 *
 * `want` names the two colours this edge must carry: `ring` is the PAGE accent,
 * which is what the kit's focus ring paints, and `selection` is the SELECTED
 * swatch's own accent. Passing both in is what makes this an assertion rather
 * than a reading, and it is what catches a composition that loses one of them.
 *
 * Throws unless every pair of bands that touch clears BAND_FLOOR, which is the
 * check the resting gate cannot make: there, one band stands in one gap.
 */
export function measureFocusedBands(button, win, want) {
  const shadow = win.getComputedStyle(button).boxShadow;
  assert.ok(shadow && shadow !== 'none', 'a focused selected swatch has a box-shadow');
  assert.ok(!shadow.includes('gradient('), 'a gradient cannot be a shadow colour');
  const layers = splitTop(shadow, ',').map(layerOf);

  const bands = layers.filter((layer) => !layer.halo);
  assert.ok(bands.every((band) => band.colour && band.colour[3] === 1),
    `every band paints an opaque colour this gate can read: ${bands.map((b) => b.raw).join(' | ')}`);
  for (const [index, band] of bands.entries()) {
    if (index === 0) continue;
    assert.ok(band.spread > bands[index - 1].spread,
      `bands paint outward in source order: ${bands[index - 1].spread}px then ${band.spread}px`);
  }

  const paints = (c) => `rgb(${c.slice(0, 3).map(Math.round).join(', ')})`;
  const found = bands.map((band) => paints(band.colour));
  assert.ok(found.includes(paints(want.ring)),
    `the kit focus ring's band is missing from the edge: wanted ${paints(want.ring)}, drew ${found.join(', ')}`);
  assert.ok(found.includes(paints(want.selection)),
    'focus erased the selection band, so nothing on the edge says which accent is on: '
    + `wanted ${paints(want.selection)}, drew ${found.join(', ')}`);

  assert.ok(bands.length >= 3,
    `the focused selected swatch draws ${bands.length} bands; the kit ring's gap and band plus the `
    + 'selection band are three at least, and a composition with fewer has dropped one of its two signals');

  // Every pair that touches, including the outermost band against the ground the
  // picker stands on. Two coloured bands laid against each other is the #472
  // failure, and it is this loop that rejects it.
  const touching = bands.map((band, index) => [band, bands[index + 1] ?? { colour: want.ground, raw: 'ground' }]);
  const ratios = touching.map(([inner, outer]) => {
    const contrast = ratio(inner.colour, outer.colour);
    assert.ok(contrast >= BAND_FLOOR,
      `${inner.raw} touches ${outer.raw} at ${contrast.toFixed(2)}:1, under the ${BAND_FLOOR}:1 ring floor. `
      + 'Two bands on one edge read as one smear unless something neutral separates them');
    return contrast;
  });
  return { bands, ratios, halos: layers.filter((layer) => layer.halo).length };
}
