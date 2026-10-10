/* The edge a selected accent swatch draws while it also holds keyboard focus.
 *
 * ASSERTS: that the edge is the kit's focus ring and nothing else. One element
 * carries one accent signal, so exactly one band here may be an accent colour and
 * it has to be the accent the PAGE is on. Which swatch is selected is said inside
 * the circle, by the tick stories/lib/accent-mark.js measures.
 *
 * SEPARATE FROM accent-mark.js: that gate reads a declaration out of the sheet,
 * because the mark is a pseudo-element JSDOM does not compute. This one reads a
 * computed box-shadow off the element, which is the only way to see what the
 * cascade leaves on the edge once .is-active and :focus-visible have both matched.
 *
 * REJECTS a band in the SELECTED swatch's own accent, which #472 shipped twice;
 * the measurements and the decision are in the specification section below.
 *
 * CANNOT READ: the 12px halo in var(--ring). It is blurred and translucent, so
 * the pixels it reaches are the band colours mixed by a fraction no source reader
 * can compute; this gate counts it, skips it and measures the opaque bands as
 * declared, which makes a pass a ceiling and not the painted result. Browser
 * pixel samples close that gap, and #578 removes the halo outright. JSDOM also
 * resolves no var(), which is why the caller substitutes the tokens, and no
 * gradient, so the ring's gap band against the swatch fill is recorded by the
 * caller as a reading rather than asserted: the gap is part of the indicator, the
 * band it separates is read against the ground on both sides, and the kit gives
 * every accent-filled control the same geometry.
 * why: docs/components.md#page-furniture. See issues #429 and #472.
 */
import assert from 'node:assert/strict';
import { parseColour, ratio, substitute, tokensFor } from './contrast.js';

/** The ring-contrast floor in guidelines/accessibility-floor.md. */
export const BAND_FLOOR = 3;

/**
 * The neutral the kit hands a focused control as the ground under its ring.
 *
 * It is what the outermost band is read against, and it is the same value the
 * ring's own gap takes, so the two never drift apart. A card re-points it at its
 * own surface; at the root it is the page.
 */
export function ringGap(theme, accent) {
  const vars = tokensFor(theme, accent);
  const colour = parseColour(substitute(vars.get('--ring-gap'), vars));
  assert.ok(colour, `${theme} declares no --ring-gap this gate can read`);
  return colour;
}

/** Split on a top-level separator, so `color-mix(in srgb, …)` stays one token. */
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
 * moves the band with the width it is derived from; the cost is that the
 * computed value arrives as text JSDOM has not reduced, so the arithmetic
 * happens here. Only the forms the kit writes are accepted — px terms, each
 * optionally scaled by a bare number — and anything else fails loudly rather
 * than being guessed.
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
 * the kit's own G2 rule in docs/foundations.md#the-focus-ring.
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

const paints = (c) => `rgb(${c.slice(0, 3).map(Math.round).join(', ')})`;

/**
 * Measure the focused selected swatch's edge and return its bands outward.
 *
 * `want.ring` is the PAGE accent, which is what the kit's focus ring paints.
 * `want.accents` is every accent colour this theme paints, and `want.selection`
 * is the selected swatch's own — one of them, and the one this edge must NOT
 * carry. Passing all three in is what makes this an assertion rather than a
 * reading, and it is what catches a second accent signal arriving on the edge.
 *
 * Throws unless every pair of bands that touch clears BAND_FLOOR, which is the
 * check the mark gate cannot make: there, nothing is laid against anything.
 */
export function measureFocusedEdge(button, win, want) {
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

  const found = bands.map((band) => paints(band.colour));
  assert.ok(found.includes(paints(want.ring)),
    `the kit focus ring's band is missing from the edge: wanted ${paints(want.ring)}, drew ${found.join(', ')}`);
  assert.ok(
    !found.includes(paints(want.selection)),
    `the edge carries a band in the SELECTED swatch's own accent (${paints(want.selection)}): `
    + `${found.join(', ')}. That is a second accent signal on a control whose one accent signal is `
    + 'the kit focus ring, and separating the two with a neutral does not make it one. Selection is '
    + 'the tick inside the circle — stories/lib/accent-mark.js measures it',
  );
  const accented = bands.filter((band) => want.accents.some((accent) => paints(accent) === paints(band.colour)));
  assert.equal(
    accented.length, 1,
    `${accented.length} of this edge's bands paint an accent (${accented.map((b) => b.raw).join(', ')}), `
    + 'and the kit focus ring is the one that may. One element, one accent signal',
  );

  // Every pair that touches, including the outermost band against the ground the
  // picker stands on.
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
