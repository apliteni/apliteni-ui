/* Rule: a status chip's ink clears WCAG AA on the fill it actually sits on.
 *
 * 10px uppercase badge text is not large text, so 4.5:1 is the bar. The trap is
 * that a chip does not sit on --bg: it sits on its own fill, and in the light
 * app most of those fills are a translucent glow composited over white. A
 * signal hue picked to read on the dark canvas is nowhere near dark enough once
 * it lands on that pale wash — which is why the kit carries deepened
 * --chip-*-ink / --chip-*-fill pairs for the white app.
 *
 * This gate computes the ratio arithmetically from the token values, for the
 * chips this lane owns: the success pair (live pill + live badge) and the info
 * pair. It reads the ink and the fill out of badge.css rather than naming
 * tokens directly, so pointing a rule back at a raw signal token turns it red.
 *
 * Two deliberate modelling choices:
 *   - the ground under a translucent fill is --bg for that theme (white in
 *     light, #16151f in dark). A chip on --surface-2 measures slightly worse;
 *     --bg is the common case and the one the token pairs were tuned against.
 *   - compositing rounds to 8 bits, because that is what the browser paints.
 *
 * Scope is these three rules on purpose. A general walk of every story's
 * computed colours is a separate, planned piece of work.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

/** Blank out comments, keeping newlines so line numbers stay true. */
const decomment = (css) =>
  css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const TOKENS = decomment(read('../src/tokens/tokens.css'));
const BADGE = decomment(read('../src/styles/badge.css'));

const RULE = /([^{}]+)\{([^{}]*)\}/g;
const AA = 4.5;

/* ---- token table ---------------------------------------------------------
 * Custom properties as a theme resolves them, in document order: later wins.
 * The dark block's selector list includes a bare `:root`, so it also feeds the
 * light theme — and the light block, being more specific, overrides whatever
 * it redefines. Reading the file top to bottom reproduces that. */
function tokensFor(theme) {
  const skip = theme === 'dark' ? 'light' : 'dark';
  const vars = new Map();
  for (const [, selector, body] of TOKENS.matchAll(RULE)) {
    if (selector.includes(`data-theme="${skip}"`)) continue;
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) {
      vars.set(name, value.trim());
    }
  }
  return vars;
}

/* ---- colour ------------------------------------------------------------- */
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.%]+))?\s*\)$/i;
const VAR = /^var\(\s*(--[\w-]+)\s*(?:,([\s\S]+))?\)$/;
const MIX = /^color-mix\(\s*in srgb\s*,\s*([\s\S]+?)\s+([\d.]+)%\s*,\s*transparent\s*\)$/i;

/** A token value as { rgb: [r,g,b], alpha }. Throws on syntax it cannot read,
 *  so an unmodelled colour form fails loudly instead of passing quietly. */
function resolve(value, vars, seen = new Set()) {
  const v = value.trim();

  const varMatch = VAR.exec(v);
  if (varMatch) {
    const [, name, fallback] = varMatch;
    if (seen.has(name)) throw new Error(`token cycle at ${name}`);
    const next = vars.get(name) ?? fallback;
    if (next === undefined) throw new Error(`undefined token ${name}`);
    return resolve(next, vars, new Set(seen).add(name));
  }

  const mix = MIX.exec(v);
  if (mix) {
    const base = resolve(mix[1], vars, seen);
    return { rgb: base.rgb, alpha: base.alpha * (Number(mix[2]) / 100) };
  }

  if (HEX.test(v)) {
    const h = v.slice(1).length === 3 ? v.slice(1).replace(/./g, (c) => c + c) : v.slice(1);
    return { rgb: [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)), alpha: 1 };
  }

  const rgb = RGB.exec(v);
  if (rgb) {
    const a = rgb[4] === undefined ? 1
      : rgb[4].endsWith('%') ? Number(rgb[4].slice(0, -1)) / 100
        : Number(rgb[4]);
    return { rgb: [1, 2, 3].map((i) => Number(rgb[i])), alpha: a };
  }

  throw new Error(`cannot read colour value: ${value}`);
}

/** Paint `top` over an opaque `ground`, at 8 bits — what the browser shows. */
const composite = (top, ground) =>
  top.rgb.map((c, i) => Math.round(c * top.alpha + ground[i] * (1 - top.alpha)));

const relLuminance = (rgb) => {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
};

const contrast = (a, b) => {
  const [hi, lo] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/* ---- the chips this lane owns -------------------------------------------- */
const GATED = ['.ui-pill--live', '.ui-badge--live', '.ui-badge--info'];

/** The `color` and `background` a rule in badge.css declares. */
function paintOf(selector) {
  for (const [, sel, body] of BADGE.matchAll(RULE)) {
    if (sel.trim() !== selector) continue;
    const pick = (prop) => {
      const m = new RegExp(`(?:^|[;{])\\s*${prop}\\s*:\\s*([^;]+)`).exec(body);
      return m ? m[1].trim() : undefined;
    };
    const ink = pick('color');
    const fill = pick('background');
    if (ink && fill) return { ink, fill };
  }
  return undefined;
}

/** Measured ratio of a gated chip in a theme, plus the colours it resolved to. */
function measure(selector, theme) {
  const vars = tokensFor(theme);
  const paint = paintOf(selector);
  assert.ok(paint, `${selector} not found in src/styles/badge.css`);

  const ground = resolve('var(--bg)', vars);
  assert.strictEqual(ground.alpha, 1, '--bg must be opaque to serve as the ground');

  const fill = composite(resolve(paint.fill, vars), ground.rgb);
  const ink = composite(resolve(paint.ink, vars), fill);
  return { ratio: contrast(ink, fill), ink, fill, paint };
}

const show = (n) => n.toFixed(2);

for (const theme of ['dark', 'light']) {
  for (const selector of GATED) {
    test(`${selector} clears WCAG AA on its own fill — ${theme}`, () => {
      const { ratio, paint } = measure(selector, theme);
      assert.ok(
        ratio >= AA,
        `${selector} in ${theme} measures ${show(ratio)}:1, under the ${AA}:1 AA bar for\n`
        + `10px uppercase text. It paints color: ${paint.ink} on background: ${paint.fill}.\n`
        + 'Point it at the deepened --chip-*-ink / --chip-*-fill pair for its family.',
      );
    });
  }
}

/* ---- anti-vacuity --------------------------------------------------------
 * Every assertion above is generated from a list and a pair of file reads. If
 * the list emptied, a selector were renamed, or the parse silently returned
 * nothing, the gate would pass by measuring nothing at all. */
test('the contrast gate actually measures something', () => {
  assert.strictEqual(GATED.length, 3, 'the gated-chip list changed size unexpectedly');

  for (const theme of ['dark', 'light']) {
    const vars = tokensFor(theme);
    assert.ok(vars.size > 20, `${theme} token table looks empty (${vars.size} entries)`);

    for (const selector of GATED) {
      const { ratio, ink, fill } = measure(selector, theme);
      assert.ok(Number.isFinite(ratio) && ratio > 1, `${selector} (${theme}) produced no real ratio`);
      assert.notDeepStrictEqual(ink, fill, `${selector} (${theme}) resolved ink and fill to the same colour`);
    }
  }

  // The two themes must genuinely resolve differently, or one of them is being
  // measured twice and the light-theme failures this gate exists for are invisible.
  assert.notStrictEqual(
    tokensFor('dark').get('--bg'),
    tokensFor('light').get('--bg'),
    'both themes resolved the same --bg — the theme split is not working',
  );
});
