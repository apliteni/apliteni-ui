/* Rule: a signal colour's ink clears WCAG AA on the surface it actually sits on.
 *
 * 10px uppercase badge text is not large text, so 4.5:1 is the bar, and the
 * 13-14px form text and menu rows below are not large either. The trap is that
 * these rules do not sit on --bg: most of them paint the signal onto its own
 * translucent glow, and a hue picked to read on the dark canvas is nowhere near
 * dark enough once that wash lands on white. That is why the kit carries
 * deepened --chip-*-ink / --chip-*-fill pairs for the white app.
 *
 * Two fixes are gated here, and they are deliberately different shapes:
 *
 *   success — the chip pair already existed and already cleared AA, so every
 *   green-on-glow-green rule is simply repointed at --chip-success-ink /
 *   --chip-success-fill. No token value moves. Reading the ink and the fill out
 *   of each stylesheet means pointing any of them back at --green turns this red.
 *
 *   danger — the failing consumers are not chips. A nav row on hover and a form
 *   error cannot borrow --chip-danger-ink without giving a chip token a second
 *   job its own comment disclaims, so --pink itself moved: darker in light
 *   (#d63c72 -> #b63361), lighter in dark (#e35b8f -> #e97ca5). Every rule below
 *   inherits that, so this gate is what stops the token drifting back.
 *
 * Modelling choices, all deliberate:
 *   - each rule names the surface it lands on, because they differ: a nav badge
 *     sits on --bg, a dropdown badge sits inside a --surface-2 menu, and a
 *     danger menu row is read while its row is hovered to --surface. Where a
 *     rule declares its own background, that background is composited over the
 *     named surface first.
 *   - compositing rounds to 8 bits, because that is what the browser paints.
 *   - accents (Phoenix, Ocean, Emerald) redefine only the purple family, so the
 *     signal ratios below are the same under every accent. One theme axis is
 *     enough.
 *
 * What this does NOT cover, and is worse for the dark --pink move: the solid
 * danger toast (src/styles/callout.css:53 + :87) paints --danger-contrast
 * (#ffffff) ON --pink. White on the old dark pink was already 3.41:1 — under AA
 * before this branch — and on #e97ca5 it is 2.66:1. The two constraints are
 * opposed (fill-ink wants pink lighter, white-on-fill wants it darker) so no
 * single dark pink satisfies both; dark needs its own --danger-contrast or its
 * own deepened chip pair, which is a separate token decision. Gating it here
 * would only pin a failure this branch is not authorised to fix.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

/** Blank out comments, keeping newlines so line numbers stay true. */
const decomment = (css) =>
  css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/** The CSS a source file contributes. An .html page carries its rules in
 *  <style>, so take those blocks and nothing else — the markup around them has
 *  no braces to confuse the rule scanner, but attribute soup might. */
function cssOf(rel) {
  const raw = read(rel);
  if (!rel.endsWith('.html')) return decomment(raw);
  const blocks = [...raw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  assert.ok(blocks.length, `${rel} has no <style> block to read`);
  return decomment(blocks.join('\n'));
}

const TOKENS = cssOf('../src/tokens/tokens.css');

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

/* ---- the rules this gate owns --------------------------------------------
 * `on` is the surface the rule is read against. Where the rule declares its own
 * `background`, that background is composited over `on` and becomes the real
 * ground; where it only declares `color`, `on` is the ground directly. */
const GATED = [
  /* success — chips that were painting --green on --glow-green */
  { file: '../src/styles/badge.css', selector: '.ui-pill--live', on: 'var(--bg)' },
  { file: '../src/styles/badge.css', selector: '.ui-badge--live', on: 'var(--bg)' },
  { file: '../src/styles/nav.css', selector: '.ui-nav__badge.is-live', on: 'var(--bg)' },
  // both menus draw their panel on --surface-2, which is the harsher of the two
  // grounds a badge inside them can land on.
  { file: '../src/styles/dropdown.css', selector: '.ui-dropdown__badge.is-live', on: 'var(--surface-2)' },
  { file: '../src/styles/topbar.css', selector: '.vbadge.live', on: 'var(--surface-2)' },
  { file: '../site/changelog.html', selector: '.tag--added', on: 'var(--bg)' },

  /* info */
  { file: '../src/styles/badge.css', selector: '.ui-badge--info', on: 'var(--bg)' },

  /* danger — everything that follows --pink and renders as text */
  // a badge lives on a card, and in dark --surface is a lighter ground than --bg,
  // so the card is where the danger chip measures worst. That is the surface the
  // dark --pink value was chosen against.
  { file: '../src/styles/badge.css', selector: '.ui-badge--danger', on: 'var(--surface)' },
  { file: '../src/styles/nav.css', selector: '.ui-nav__item.is-danger:hover', on: 'var(--bg)' },
  { file: '../src/styles/nav.css', selector: '.ui-nav__badge.is-danger', on: 'var(--bg)' },
  { file: '../src/styles/input.css', selector: '.ui-field__req', on: 'var(--bg)' },
  { file: '../src/styles/input.css', selector: '.ui-field__error', on: 'var(--bg)' },
  { file: '../src/styles/button.css', selector: '.ui-btn--danger:hover', on: 'var(--bg)' },
  // a danger menu row is only --pink while its row is hovered, and the hover
  // paints the row --surface. That is the ground, not the menu panel.
  { file: '../src/styles/dropdown.css', selector: '.ui-dropdown__item.is-danger:hover .ui-dropdown__label', on: 'var(--surface)' },
  { file: '../src/styles/topbar.css', selector: '.amenu a.aout:hover', on: 'var(--surface)' },
  { file: '../src/styles/feedback.css', selector: '.ui-fbc__err', on: 'var(--bg)' },
  { file: '../site/changelog.html', selector: '.tag--removed', on: 'var(--bg)' },
  { file: '../site/changelog.html', selector: '.ui-badge--breaking', on: 'var(--bg)' },
];

const SOURCES = new Map();
const sourceOf = (file) => {
  if (!SOURCES.has(file)) SOURCES.set(file, cssOf(file));
  return SOURCES.get(file);
};

/** The `color` and (optional) `background` a rule declares in its own file. */
function paintOf({ file, selector }) {
  for (const [, sel, body] of sourceOf(file).matchAll(RULE)) {
    if (sel.trim() !== selector) continue;
    const pick = (prop) => {
      const m = new RegExp(`(?:^|[;{])\\s*${prop}\\s*:\\s*([^;]+)`).exec(body);
      return m ? m[1].trim() : undefined;
    };
    const ink = pick('color');
    if (ink) return { ink, fill: pick('background') };
  }
  return undefined;
}

/** Measured ratio of a gated rule in a theme, plus the colours it resolved to. */
function measure(rule, theme) {
  const vars = tokensFor(theme);
  const paint = paintOf(rule);
  assert.ok(paint, `${rule.selector} not found in ${rule.file.replace('../', '')}`);

  const surface = resolve(rule.on, vars);
  assert.strictEqual(surface.alpha, 1, `${rule.on} must be opaque to serve as a ground`);

  const ground = paint.fill ? composite(resolve(paint.fill, vars), surface.rgb) : surface.rgb;
  const ink = composite(resolve(paint.ink, vars), ground);
  return { ratio: contrast(ink, ground), ink, ground, paint };
}

const show = (n) => n.toFixed(2);

for (const theme of ['dark', 'light']) {
  for (const rule of GATED) {
    test(`${rule.selector} clears WCAG AA where it is read — ${theme}`, () => {
      const { ratio, paint } = measure(rule, theme);
      assert.ok(
        ratio >= AA,
        `${rule.selector} in ${theme} measures ${show(ratio)}:1, under the ${AA}:1 AA bar.\n`
        + `It paints color: ${paint.ink}`
        + (paint.fill ? ` on background: ${paint.fill}` : '')
        + `, read on ${rule.on}.\n`
        + 'Either point it at the deepened --chip-*-ink / --chip-*-fill pair for its\n'
        + 'family, or move the signal token itself — but do not leave it here.',
      );
    });
  }
}

/* ---- the glows stay tints of their own token -----------------------------
 * A glow is its own signal at low alpha, and --pink is spent at 10% in two
 * different places: --glow-pink, and the color-mix in .ui-btn--danger:hover. If
 * --pink moves and --glow-pink does not, those two washes become visibly
 * different pinks sitting next to each other in the same app. */
test('--glow-pink is --pink at its own alpha, in both themes', () => {
  for (const theme of ['dark', 'light']) {
    const vars = tokensFor(theme);
    const pink = resolve('var(--pink)', vars);
    const glow = resolve('var(--glow-pink)', vars);
    assert.deepStrictEqual(
      glow.rgb, pink.rgb,
      `--glow-pink in ${theme} is rgb(${glow.rgb}) but --pink is rgb(${pink.rgb}).\n`
      + 'A glow is its own signal at low alpha. Re-tint it, or .ui-btn--danger:hover\n'
      + '(which mixes --pink at 10% itself) will paint a different wash from every\n'
      + 'rule that uses --glow-pink.',
    );
    assert.ok(glow.alpha > 0 && glow.alpha < 1, `--glow-pink in ${theme} is not translucent`);
  }
});

/* ---- anti-vacuity --------------------------------------------------------
 * Every assertion above is generated from a list and a set of file reads. If
 * the list emptied, a selector were renamed, or a parse silently returned
 * nothing, the gate would pass by measuring nothing at all. */
test('the contrast gate actually measures something', () => {
  assert.strictEqual(GATED.length, 18, 'the gated-rule list changed size unexpectedly');

  // Every file in the list must really be contributing rules — an .html page
  // whose <style> block moved, or a stylesheet that was split, would otherwise
  // just stop being checked.
  const files = new Set(GATED.map((r) => r.file));
  assert.strictEqual(files.size, 8, 'the gate stopped reading one of its source files');
  for (const file of files) {
    assert.ok([...sourceOf(file).matchAll(RULE)].length > 3, `${file} parsed to almost no rules`);
  }

  for (const theme of ['dark', 'light']) {
    const vars = tokensFor(theme);
    assert.ok(vars.size > 20, `${theme} token table looks empty (${vars.size} entries)`);

    for (const rule of GATED) {
      const { ratio, ink, ground } = measure(rule, theme);
      assert.ok(Number.isFinite(ratio) && ratio > 1, `${rule.selector} (${theme}) produced no real ratio`);
      assert.notDeepStrictEqual(ink, ground, `${rule.selector} (${theme}) resolved ink and ground to the same colour`);
    }
  }

  // The two themes must genuinely resolve differently, or one of them is being
  // measured twice and the light-theme failures this gate exists for are invisible.
  assert.notStrictEqual(
    tokensFor('dark').get('--bg'),
    tokensFor('light').get('--bg'),
    'both themes resolved the same --bg — the theme split is not working',
  );
  assert.notStrictEqual(
    tokensFor('dark').get('--pink'),
    tokensFor('light').get('--pink'),
    'both themes resolved the same --pink — the two moves went the same way',
  );
});
