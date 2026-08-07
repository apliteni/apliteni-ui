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
 * The second half of this file gates a different shape of the same rule: the
 * SOLID toast, where a signal stops being ink and becomes the fill. See the
 * comment above SOLID_STATUSES.
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
const hex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;

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

/* ---- the solid toast: a signal that has become the fill --------------------
 * Every rule above paints a signal AS INK. The solid toast inverts that: the
 * signal becomes the background and something else has to read on top of it.
 *
 * The defect this gates is structural, not three bad numbers. callout.css set
 * the fill (--toast-accent) from the status and the ink (--toast-on) from one of
 * two globals, on independent axes, so nothing made a status's fill and its ink
 * clear each other. Four of the ten status x theme combinations did not: dark
 * danger (white on #e97ca5, 2.66), dark neutral (white on #948fa8, 3.11), light
 * success (near-black on #1c8a2c, 4.40) and light neutral (near-black on
 * #5c6270, 3.16). Light success is the proof that no ink could rescue it — that
 * fill sits mid-range, near-black measures 4.40 and white 4.45, so the FILL had
 * to move. Fill and ink are one choice.
 *
 * The rule that replaces the two axes: a solid fill is the status at its
 * theme's extreme, and the ink is the pole opposite it. Dark fills are the
 * bright signals, so one ink (near-black) clears all five; light fills are the
 * deepened ones, so one ink (white) clears all five. A new status adds one
 * token, --signal-solid-<status>, on the correct side of its theme's midline,
 * and inherits the ink — there is no per-status ink decision left to get wrong.
 *
 * Both inks a solid toast paints are gated, because the quieter one is where
 * the pair used to leak away: .ui-toast__text is the message copy, and diluting
 * it undoes the contrast the pair was picked for. The declared `opacity` is
 * folded into the ink's alpha here for exactly that reason. */
const SOLID_STATUSES = ['success', 'danger', 'warn', 'info', 'neutral'];
const CALLOUT = cssOf('../src/styles/callout.css');

/** Selectors of a rule, comma list split out and trimmed. */
const selectorsOf = (sel) => sel.split(',').map((s) => s.trim());

/** Custom properties in scope on a `.ui-toast--<status>.ui-toast--solid`, in
 *  source order so the later rule wins exactly as the cascade makes it win. */
function solidVars(theme, status) {
  const vars = new Map(tokensFor(theme));
  let sawStatus = false;
  let sawSolid = false;
  for (const [, sel, body] of CALLOUT.matchAll(RULE)) {
    const sels = selectorsOf(sel);
    const isStatus = sels.includes(`.ui-toast--${status}`);
    const isSolid = sels.includes('.ui-toast--solid');
    if (!isStatus && !isSolid) continue;
    sawStatus ||= isStatus;
    sawSolid ||= isSolid;
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) vars.set(name, value.trim());
  }
  assert.ok(sawStatus, `.ui-toast--${status} is gone from callout.css`);
  assert.ok(sawSolid, '.ui-toast--solid is gone from callout.css');
  return vars;
}

/** `background` / `color` / `opacity` a `.ui-toast--solid …` selector declares,
 *  accumulated across every rule that names it. */
function solidDecl(suffix) {
  const want = suffix ? `.ui-toast--solid ${suffix}` : '.ui-toast--solid';
  const out = {};
  for (const [, sel, body] of CALLOUT.matchAll(RULE)) {
    if (!selectorsOf(sel).includes(want)) continue;
    for (const [, prop, value] of body.matchAll(/(?:^|;)\s*(background|color|opacity)\s*:\s*([^;]+)/g)) {
      out[prop] = value.trim();
    }
  }
  return out;
}

/** The two inks a solid toast reads as text, measured on the fill it sits on. */
function measureSolid(status, theme) {
  const vars = solidVars(theme, status);
  const base = solidDecl('');
  assert.ok(base.background, '.ui-toast--solid declares no background');
  assert.ok(base.color, '.ui-toast--solid declares no color');

  const fill = resolve(base.background, vars);
  assert.strictEqual(fill.alpha, 1, `a solid toast's fill must be opaque, got ${base.background}`);
  const ground = composite(fill, resolve('var(--bg)', vars).rgb);

  const inkOf = (suffix) => {
    const decl = { ...base, ...solidDecl(suffix) };
    const paint = resolve(decl.color, vars);
    const alpha = paint.alpha * (decl.opacity === undefined ? 1 : Number(decl.opacity));
    return { rgb: composite({ rgb: paint.rgb, alpha }, ground), source: decl.color, opacity: decl.opacity };
  };

  const title = inkOf('.ui-toast__title');
  const text = inkOf('.ui-toast__text');
  return {
    ground,
    fill: base.background,
    title: { ...title, ratio: contrast(title.rgb, ground) },
    text: { ...text, ratio: contrast(text.rgb, ground) },
  };
}

for (const theme of ['dark', 'light']) {
  for (const status of SOLID_STATUSES) {
    test(`solid ${status} toast clears WCAG AA on its own fill — ${theme}`, () => {
      const m = measureSolid(status, theme);
      for (const [part, ink] of [['title', m.title], ['body text', m.text]]) {
        assert.ok(
          ink.ratio >= AA,
          `the ${part} of a solid ${status} toast in ${theme} measures ${show(ink.ratio)}:1, `
          + `under the ${AA}:1 AA bar.\n`
          + `It paints color: ${ink.source}`
          + (ink.opacity === undefined ? '' : ` at opacity ${ink.opacity}`)
          + ` on background: ${m.fill}, which resolves to ${hex(m.ground)}.\n`
          + 'A solid fill and its ink are ONE choice: the fill is the status at its\n'
          + "theme's extreme, the ink is the pole opposite it. Moving one without the\n"
          + 'other is what this gate exists to stop.',
        );
      }
    });
  }
}

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

test('the solid-toast gate actually measures something', () => {
  assert.strictEqual(SOLID_STATUSES.length, 5, 'the solid status list changed size unexpectedly');
  assert.ok([...CALLOUT.matchAll(RULE)].length > 20, 'callout.css parsed to almost no rules');

  // The two inks must be read from real declarations, not defaulted into
  // existence: .ui-toast--solid has to state both halves of the pair itself.
  const base = solidDecl('');
  assert.ok(base.background && base.color, '.ui-toast--solid stopped declaring its fill and ink');

  for (const theme of ['dark', 'light']) {
    const grounds = new Set();
    for (const status of SOLID_STATUSES) {
      const m = measureSolid(status, theme);
      for (const ink of [m.title, m.text]) {
        assert.ok(Number.isFinite(ink.ratio) && ink.ratio > 1, `solid ${status} (${theme}) produced no real ratio`);
        assert.notDeepStrictEqual(ink.rgb, m.ground, `solid ${status} (${theme}) resolved ink and fill to the same colour`);
      }
      // the body copy is diluted, so it can only ever be the weaker of the two;
      // if it measured better, the dilution is not being modelled at all.
      assert.ok(m.text.ratio <= m.title.ratio + 0.01, `solid ${status} (${theme}): the body ink is not being diluted`);
      grounds.add(hex(m.ground));
    }
    assert.strictEqual(grounds.size, 5, `${theme}: the five solid statuses do not paint five distinct fills`);
  }

  // Light and dark must resolve genuinely different fills, or one theme is
  // being measured twice and half the matrix is invisible.
  assert.notStrictEqual(
    hex(measureSolid('success', 'dark').ground),
    hex(measureSolid('success', 'light').ground),
    'both themes resolved the same solid success fill — the theme split is not working',
  );
});
