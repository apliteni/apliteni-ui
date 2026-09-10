/* Rule: a disabled button is legible on every ground the kit paints, not just on
 * the one it was first photographed against.
 *
 * #220 gave every disabled control an ink and a surface of its own, and the whole
 * kit landed in a band 5.56–6.11:1. The band is narrow for one reason: the pair
 * composites predictably, because the ink is read on the surface beside it rather
 * than on whatever is behind the button.
 *
 * `.ui-btn--ghost` kept a `background: transparent` through that change — "a ghost
 * button draws no box when it is on, so it draws none when it is off" — which
 * quietly made it the one control in the kit whose legibility was a property of
 * its placement. Nobody measured it, because no story had put one on a card. One
 * did in #273 (a pager's First and Prev, disabled on the first page, inside the
 * .ui-card every table in the finance portal sits in) and it measured 5.18:1 —
 * outside the band, and 4.66:1 on --surface-3, which nothing had rendered at all.
 *
 * So this gate does not read the ghost rule. It measures the ink against EVERY
 * surface token in both themes, which is the check that would have caught it in
 * #220 and the one that catches the next variant to opt out.
 *
 * why: docs/specification.md#pagination
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DISABLED_FLOOR } from '../../stories/guidelines/_accessibility-floor.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, rel), 'utf8');
const BUTTON_CSS = read('button.css');
const TOKENS = read('../tokens/tokens.css');

/* The grounds a button can land on. Every one is a background the kit itself
 * paints, so a disabled label can end up over any of them — discovered from the
 * token file rather than listed, so a fifth surface joins this gate by existing.
 * why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them */
const GROUNDS = [...new Set(
  [...TOKENS.matchAll(/^\s*(--(?:bg|surface(?:-\d)?))\s*:/gm)].map((m) => m[1]),
)].sort();

/* One theme block's declarations. The themes redeclare the same names, so a
 * block is read whole rather than the file being scanned for a name. */
const themeVars = (theme) => {
  const at = TOKENS.indexOf(`:root[data-theme="${theme}"]`);
  assert.notEqual(at, -1, `no :root[data-theme="${theme}"] block in tokens.css`);
  const body = TOKENS.slice(at, TOKENS.indexOf('\n}', at));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)]
    .map((m) => [m[1], m[2].trim()]));
};

const resolve = (vars, name, depth = 0) => {
  const value = vars[name];
  if (value === undefined || depth > 12) return value;
  const alias = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value);
  return alias ? resolve(vars, alias[1], depth + 1) : value;
};

const rgb = (hex) => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  assert.ok(m, `not a hex colour this gate can measure: ${hex}`);
  const full = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

/* WCAG 2.x relative luminance and contrast, the same arithmetic
 * stories/contrast.test.js runs. */
const luminance = (colour) => {
  const [r, g, b] = rgb(colour).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const THEMES = ['dark', 'light'];

test('the surfaces a disabled label can land on are discovered, not listed', () => {
  assert.ok(GROUNDS.length >= 4,
    `only ${GROUNDS.length} ground tokens found — the sweep is reading almost nothing`);
  assert.ok(GROUNDS.includes('--surface-3'),
    '--surface-3 is the worst ground the ghost button reached, so it has to be in the set');
});

/* The invariant the fix creates: a disabled button paints --disabled-surface, so
 * its ink is only ever read on that one ground and lands in #220's band wherever
 * the button is put. This is the check that has to stay green. */
test(`disabled ink clears ${DISABLED_FLOOR}:1 on the surface a disabled button paints for itself`, () => {
  const under = [];
  for (const theme of THEMES) {
    const vars = themeVars(theme);
    const ratio = contrast(resolve(vars, '--disabled-ink'), resolve(vars, '--disabled-surface'));
    if (Math.round(ratio * 100) / 100 < DISABLED_FLOOR) {
      under.push(`${theme} — ${ratio.toFixed(2)}:1`);
    }
  }
  assert.deepEqual(under, [], 'the disabled pair itself has drifted below the band #220 settled');
});

/* And the reason the guard above it exists, as measurements rather than as a
 * sentence. These are the ratios a disabled label WOULD be read at if a variant
 * painted no surface and inherited the ground — the numbers the comment in
 * button.css argues from, and the case #273 met on a real page.
 *
 * Pinned exactly, so the argument and the arithmetic cannot drift apart: if a
 * token moves, this fails and the comment gets rewritten with it. At least one
 * of them being under the floor is the whole reason the ghost exemption went,
 * and that is asserted rather than left to a reader's arithmetic.
 * why: CONTRIBUTING.md#a-number-a-comment-argues-for-is-pinned-by-a-measured-test */
test('the grounds a transparent disabled button would have fallen back to are pinned', () => {
  const measured = {};
  for (const theme of THEMES) {
    const vars = themeVars(theme);
    const ink = resolve(vars, '--disabled-ink');
    for (const ground of GROUNDS) {
      measured[`${theme} ${ground}`] = Number(contrast(ink, resolve(vars, ground)).toFixed(2));
    }
  }
  assert.deepEqual(measured, {
    'dark --bg': 5.82,
    'dark --surface': 5.18,
    'dark --surface-2': 5.56,
    'dark --surface-3': 4.66,
    'light --bg': 6.11,
    'light --surface': 6.11,
    'light --surface-2': 5.66,
    'light --surface-3': 5.26,
  }, 'a surface or the disabled ink moved — rewrite the numbers in button.css with these');

  const below = Object.entries(measured)
    .filter(([, ratio]) => ratio < DISABLED_FLOOR)
    .map(([where]) => where);
  assert.deepEqual(below, ['dark --surface', 'dark --surface-3', 'light --surface-3'],
    'the set of grounds that cannot carry a transparent disabled button has changed');
});

/* The mutation that puts the defect back. A variant that paints no surface when
 * it is disabled inherits the ground, and the test above stops being about that
 * variant at all — it would keep passing while the button on screen failed. */
test('no disabled rule hands its background back to the ground', () => {
  const offenders = [];
  /* Every rule whose selector carries a disabled state, with its declarations. */
  for (const [, selector, body] of BUTTON_CSS.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (!/:disabled|\[aria-disabled="true"\]/.test(selector)) continue;
    const background = /background(?:-color)?:\s*([^;]+)/.exec(body);
    if (background && /transparent|none/.test(background[1])) {
      offenders.push(`${selector.trim().replace(/\s+/g, ' ')} → background: ${background[1].trim()}`);
    }
  }
  assert.deepEqual(offenders, [],
    'a disabled button variant paints no surface of its own, so its label is read against'
    + ' whatever is behind it — the exemption #273 removed from .ui-btn--ghost.');
});

test('the disabled pair is still declared, so the rule above is checking something', () => {
  assert.match(BUTTON_CSS, /\.ui-btn:disabled[\s\S]*?background:\s*var\(--disabled-surface\)/,
    '.ui-btn:disabled no longer paints --disabled-surface');
  assert.match(BUTTON_CSS, /\.ui-btn:disabled[\s\S]*?color:\s*var\(--disabled-ink\)/,
    '.ui-btn:disabled no longer paints --disabled-ink');
});
