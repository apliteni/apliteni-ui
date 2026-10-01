/* The accent picker's selection ring, measured through segmented.css.
 *
 * WHAT THIS READS: segmented.css alone, with the root tokens, the selected
 * button's own custom properties and the theme-resolved ring colour substituted
 * into the text, because JSDOM resolves no var() of its own. That is enough to say which
 * colour the ring resolves to and what it contrasts against, and it is where the
 * bug lived twice over: a gradient is not a valid <color>, so the declaration
 * was invalid and the ring computed to `none`; then var(--accent) made it valid
 * and wrong.
 *
 * WHAT IT CANNOT READ: browser paint, antialiased edges, the 12px halo in
 * var(--ring), and anything the rest of the cascade adds on a real page.
 * Browser captures cover those. It also reads two opaque colours out of the
 * shadow and nothing else, so a third shadow layer is a limit of this gate.
 *
 * THE CASE THAT MATTERS: the root is put on a DIFFERENT accent from the one
 * selected. A gate that sets the root tokens to the accent it then selects makes
 * "the ring matches the swatch" true by construction and cannot see a ring
 * painted in var(--accent) at all. See issue #429.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { desugar, tokensFor, substitute, parseColour, ratio } from './contrast.js';

const CSS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/styles/segmented.css');

/**
 * The value a swatch button's `prop` takes in `theme`.
 *
 * JSDOM resolves no var(), so every custom property has to be substituted into
 * the text before it gets there — which means resolving --swatch-ring's own
 * cascade here. The light declaration is both later and more specific than the
 * unstamped one, so the LAST matching rule wins for light and the stamped rule
 * is excluded for dark. The limit: this reads rules whose selector mentions
 * `.ui-accent-picker button`, so a declaration moved anywhere else goes unread
 * and the measurement below falls back to var(--accent) and fails loudly.
 */
function swatchProperty(css, prop, theme) {
  const found = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selector]) => selector.includes('.ui-accent-picker button'))
    .filter(([, selector]) => theme === 'light' || !selector.includes('data-theme="light"'))
    .flatMap(([, , body]) => body.split(';')
      .map((decl) => decl.split(':'))
      .filter(([name]) => name.trim() === prop)
      .map(([, ...rest]) => rest.join(':').trim()));
  assert.ok(found.length, `segmented.css declares no ${prop} on a swatch button`);
  return found.at(-1);
}

/**
 * segmented.css with the root on `rootAccent` for `theme`, and `swatchStyle` —
 * the properties the selected button really carries — resolved as the element's
 * own values.
 */
export function accentRingCss(theme, rootAccent, swatchStyle) {
  const css = readFileSync(CSS, 'utf8');
  const vars = tokensFor(theme, rootAccent);
  for (const [prop, value] of Object.entries(swatchStyle)) vars.set(prop, value);
  vars.set('--swatch-ring', substitute(swatchProperty(css, '--swatch-ring', theme), vars));
  return desugar(substitute(css, vars));
}

/** The accent a theme paints for `accent`, as the token files declare it. */
export function accentColour(theme, accent) {
  const vars = tokensFor(theme, accent);
  const colour = parseColour(substitute(vars.get('--accent'), vars));
  assert.ok(colour, `${theme} ${accent} declares no --accent this gate can read`);
  return colour;
}

/** What a colour paints, as numbers, so notation differences are not drift. */
export const paints = (c) => `rgb(${c.slice(0, 3).map(Math.round).join(', ')})`;

/**
 * Measure the selected swatch's ring and return its contrast against the gap.
 *
 * `want` is the colour the ring must be: the SELECTED accent's own --accent for
 * this theme, never the root's. Passing it in is what makes this an assertion
 * rather than a reading.
 */
export function measureAccentRing(button, win, want) {
  const shadow = win.getComputedStyle(button).boxShadow;
  assert.ok(shadow && shadow !== 'none', 'active swatch has a box-shadow');
  assert.ok(!shadow.includes('gradient('), 'a gradient cannot be a shadow colour');
  const colours = [...shadow.matchAll(/#[\da-f]{3,8}\b|rgba?\([^)]*\)/gi)].map(([colour]) => parseColour(colour));
  assert.equal(colours.length, 2, 'gap and solid ring colours resolve');
  assert.ok(colours.every((colour) => colour && colour[3] === 1), 'both colours are opaque');
  assert.equal(
    paints(colours[1]), paints(want),
    'the ring paints the accent the PAGE is on, not the swatch it rings. The picker is documented '
    + 'to run before the host has applied anything, so var(--accent) here puts a purple ring on a '
    + 'green swatch and makes selection the same hue as focus',
  );
  const contrast = ratio(colours[0], colours[1]);
  assert.ok(contrast >= 3, `ring against its surface: ${contrast.toFixed(2)}:1`);
  return contrast;
}
