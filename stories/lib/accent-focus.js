/* The edge a selected accent swatch draws while it also holds keyboard focus.
 *
 * ASSERTS: that the edge is the kit's focus ring and nothing else. One element
 * carries one accent signal, so exactly one band here may be an accent colour and
 * it has to be the accent the PAGE is on. Which swatch is selected is said inside
 * the circle, by the tick stories/lib/accent-mark.js measures.
 *
 * SEPARATE FROM accent-mark.js: that gate reads a declaration out of the sheet,
 * because the mark is a pseudo-element JSDOM does not compute. This one reads the
 * computed edge off the element, which is the only way to see what the cascade
 * leaves there once .is-active and :focus-visible have both matched.
 *
 * TWO CARRIERS, BOTH READ. Since #578 the band is a real `outline` and the swatch
 * keeps a `box-shadow` of its own, so the edge is whatever the two draw together
 * and a second accent signal can arrive on either. The outline is read from the
 * shorthand because JSDOM expands no shorthand into longhands.
 *
 * REJECTS a band in the SELECTED swatch's own accent, which #472 shipped twice;
 * the measurements and the decision are in the specification section below.
 *
 * CANNOT READ: anything about where the bands actually land. JSDOM lays nothing
 * out, so this reads declared widths and colours and the ORDER they stack in —
 * a pass is a ceiling and not the painted result, and browser pixel samples are
 * what close that gap. It also resolves no var(), which is why the caller
 * substitutes the tokens, and no gradient, so the ring's gap against the swatch
 * fill is recorded by the caller as a reading rather than asserted: an outline
 * leaves its offset UNPAINTED, so what shows there is the swatch's own shadow.
 * why: docs/components.md#page-furniture. See issues #429, #472 and #578.
 */
import assert from 'node:assert/strict';
import { parseColour, ratio, substitute, tokensFor } from './contrast.js';

/** The ring-contrast floor in guidelines/accessibility-floor.md. */
export const BAND_FLOOR = 3;

/**
 * The ground a focused control's outermost band is read against.
 *
 * Until #578 the kit named it: the ring painted its own gap in `--ring-gap`, which
 * was `var(--bg)`. An outline paints no gap, so there is no token to read and the
 * ground is simply the surface the control stands on — which for the picker in
 * these fixtures, with no card between it and the page, is the page.
 */
export function ringGround(theme, accent) {
  const vars = tokensFor(theme, accent);
  const colour = parseColour(substitute(vars.get('--bg'), vars));
  assert.ok(colour, `${theme} declares no --bg this gate can read`);
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
 * The band an `outline` shorthand declares, as `{ spread, colour, raw }`.
 *
 * `spread` is where its OUTER edge falls from the border box, so it sorts beside a
 * box-shadow band's spread: the offset carries the band out, and the band is as
 * wide as the outline. JSDOM leaves the shorthand as written, so this parses it.
 */
function outlineBand(style) {
  const text = String(style.outline || '').trim();
  if (!text || ['none', '0', '0px'].includes(text)) return null;
  const parts = splitTop(text, ' ');
  const widths = parts.filter((part) => /^(-?[\d.]+(px)?$|calc\()/.test(part));
  const keywords = parts.filter((part) => /^(solid|dashed|dotted|double|groove|ridge|inset|outset|auto|none)$/.test(part));
  const colour = parts.filter((part) => !widths.includes(part) && !keywords.includes(part)).join(' ');
  assert.equal(widths.length, 1, `an outline takes one width this gate can read: ${text}`);
  assert.deepEqual(keywords, ['solid'], `the kit's band is a solid outline: ${text}`);
  assert.ok(colour, `an outline with no colour: ${text}`);
  const offset = String(style.outlineOffset || '0').trim();
  return {
    spread: px(offset || '0') + px(widths[0]),
    width: px(widths[0]),
    colour: parseColour(colour),
    raw: colour,
    halo: false,
    carrier: 'outline',
  };
}

/**
 * Measure the focused selected swatch's edge and return its bands outward.
 *
 * `want.ring` is the PAGE accent, which is what the kit's focus ring paints.
 * `want.accents` is every accent colour this theme paints, and `want.selection`
 * is the selected swatch's own — one of them, and the one this edge must NOT
 * carry. Passing all three in is what makes this an assertion rather than a
 * reading, and it is what catches a second accent signal arriving on the edge.
 *
 * Both carriers are read together and sorted outward, because a second signal can
 * arrive on either: the band is an outline since #578 and the swatch keeps a
 * box-shadow of its own.
 *
 * Throws unless every pair of bands that touch clears BAND_FLOOR, which is the
 * check the mark gate cannot make: there, nothing is laid against anything.
 */
export function measureFocusedEdge(button, win, want) {
  const style = win.getComputedStyle(button);
  const ring = outlineBand(style);
  assert.ok(ring, 'a focused selected swatch draws the kit band, which is an outline since #578');

  const shadow = style.boxShadow;
  assert.ok(!String(shadow || '').includes('gradient('), 'a gradient cannot be a shadow colour');
  const layers = shadow && shadow !== 'none' ? splitTop(shadow, ',').map(layerOf) : [];

  // A shadow's layers are painted in source order, so they have to be written
  // outward or one hides under the next.
  const cast = layers.filter((layer) => !layer.halo);
  for (const [index, band] of cast.entries()) {
    if (index === 0) continue;
    assert.ok(band.spread > cast[index - 1].spread,
      `shadow bands paint outward in source order: ${cast[index - 1].spread}px then ${band.spread}px`);
  }
  // The two carriers are then read as one edge, outward. An outline is painted over
  // the cast whatever order the sheet writes them in, so position is the only thing
  // that puts it among them — and two bands at one spread means one is not drawn.
  const bands = [...cast, ring].sort((a, b) => a.spread - b.spread);
  assert.ok(bands.every((band) => band.colour && band.colour[3] === 1),
    `every band paints an opaque colour this gate can read: ${bands.map((b) => b.raw).join(' | ')}`);
  for (const [index, band] of bands.entries()) {
    if (index === 0) continue;
    assert.ok(band.spread > bands[index - 1].spread,
      `two bands reach ${band.spread}px, so one of them is painted over: `
      + `${bands[index - 1].raw} and ${band.raw}`);
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
  assert.equal(accented[0].carrier, 'outline',
    'the one accent band on this edge is the kit ring, and the kit ring is an outline (#578)');

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
