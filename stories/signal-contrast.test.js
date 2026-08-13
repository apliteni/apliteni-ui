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
 *   - compositing rounds to 8 bits because that is closer to a framebuffer than
 *     full precision, not because it is what the browser paints. The two models
 *     disagree by at most a few hundredths, and a value that close to the bar is
 *     chosen to clear under either. See
 *     docs/adr/0006-the-accent-is-measured-against-its-own-wash.md.
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

/** Paint `top` over an opaque `ground`, rounded to 8 bits — closer to a
 *  framebuffer than full precision, though not what the browser paints. See the
 *  modelling note at the top of this file. */
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
 * A glow is its own colour at low alpha — nothing more. That is not decoration:
 * the same hue gets spent at low alpha in places that do NOT read --glow-*, so a
 * glow that drifts off its token puts two different washes of one colour side by
 * side in the same app. --pink is the worked example: it is spent at 10% both as
 * --glow-pink and as the color-mix in .ui-btn--danger:hover, and --green the
 * same, as the color-mix in the .ui-dot.is-live pulse.
 *
 * Every glow is gated, in BOTH themes. Dark belongs here for the same reason
 * light does — it is the same invariant, it already holds for all four, and a
 * gate that only watched light would let the next hand-authored dark value in
 * unchallenged. There is no property of a wash that makes drift acceptable in
 * one theme and not the other.
 *
 * Three of the four glows tint a token that means the same thing in both
 * themes. --glow-purple does not, so it is gated separately, below, across both
 * token files. */
const GLOW_PAIRS = {
  '--glow-green': '--green',
  '--glow-cyan': '--cyan',
  '--glow-pink': '--pink',
};

for (const theme of ['dark', 'light']) {
  for (const [glowName, tokenName] of Object.entries(GLOW_PAIRS)) {
    test(`${glowName} is ${tokenName} at its own alpha — ${theme}`, () => {
      const vars = tokensFor(theme);
      const token = resolve(`var(${tokenName})`, vars);
      const glow = resolve(`var(${glowName})`, vars);
      assert.deepStrictEqual(
        glow.rgb, token.rgb,
        `${glowName} in ${theme} is rgb(${glow.rgb}) but ${tokenName} is rgb(${token.rgb}).\n`
        + 'A glow is its own colour at low alpha and nothing else. Re-tint it from\n'
        + `${tokenName}, or every rule that washes with ${glowName} will paint a\n`
        + `different colour from every rule that mixes ${tokenName} down itself.`,
      );
      assert.ok(
        glow.alpha > 0 && glow.alpha < 1,
        `${glowName} in ${theme} is not translucent (alpha ${glow.alpha}) — a glow that is\n`
        + 'opaque is a fill, and the rules that wash with it are no longer washing.',
      );
    });
  }
}

/* ---- --glow-purple: the same invariant, against a token that moves ---------
 * The three glows above tint a token that means one thing in both themes.
 * --glow-purple tints the accent family, and there the theme changes WHICH
 * member is the display hue:
 *
 *   dark  — --accent IS the display hue, and --glow-purple tints it.
 *   light — --accent is a text INK, and --purple-light is the display hue, so
 *           --glow-purple tints --purple-light.
 *
 * Light's --accent is deepened on purpose. Issue #96 (shipped in #101) found the
 * light Phoenix and Emerald accents failing AA as text on white — Phoenix
 * #d64a12 at 4.33:1, Emerald #0b9c68 at 3.52:1 — and deepened ONLY --accent, to
 * #a8370c (6.53:1) and #087a52 (5.36:1). Before that commit those two cells held
 * --accent and --purple-light at the same value, so every light cell agreed with
 * either reading and the split below did not exist to be seen.
 *
 * Be straight about provenance: no comment in either token file says the washes
 * were deliberately left behind. #101 scoped itself to the AA failure and moved
 * nothing else. So the light rule is what that narrow commit LEFT, and this gate
 * is the first place it is written down. It is still the right rule: a 10% wash
 * is not text and gains nothing from AA, and dragging it down with the ink would
 * darken every accented surface in the light app to fix a problem those surfaces
 * do not have. --ring was left the same way and agrees, cell for cell.
 *
 * So do NOT "fix" the light glows onto --accent to make the two themes agree.
 * That uniformity would undo #96's reasoning and mud every light wash. This gate
 * is here to stop exactly that edit, and the mutation it was written against was
 * that edit.
 *
 * Read across BOTH token files. tokens.css carries the default accent (nebula);
 * accents.css carries Phoenix, Ocean and Emerald as :root[data-theme][data-accent]
 * blocks that override the theme's purple family. Eight cells in total, and the
 * rule holds in all eight. */
const GLOW_PURPLE_SOURCE = { dark: '--accent', light: '--purple-light' };

const ACCENTS = cssOf('../src/tokens/accents.css');

/** A cell's own selector — theme and accent both, which is what makes it a cell
 *  rather than one of the single-attribute theme blocks over in tokens.css. */
const CELL_SELECTOR = /^:root\[data-theme="(dark|light)"\]\[data-accent="([\w-]+)"\]$/;

/** Every accent × theme cell accents.css declares, each resolved the way the
 *  cascade resolves it: the theme's tokens first, then the cell's overrides on
 *  top. Anything in the file that is NOT such a cell is refused rather than
 *  skipped — a block this parser silently walked past would be a block whose
 *  --glow-purple nobody is reading. */
function accentCells() {
  const cells = [];
  for (const [, sel, body] of ACCENTS.matchAll(RULE)) {
    const m = CELL_SELECTOR.exec(sel.trim());
    assert.ok(
      m,
      `accents.css declares a rule this gate cannot place: ${sel.trim()}\n`
      + 'Every block in that file is expected to be one accent × theme cell. If a\n'
      + 'new shape of rule belongs there, teach this parser about it — do not let\n'
      + 'it fall through, because a cell that is not parsed is a cell that is not gated.',
    );
    const [, theme, accent] = m;
    const vars = new Map(tokensFor(theme));
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) vars.set(name, value.trim());
    cells.push({ theme, accent, file: 'src/tokens/accents.css', vars });
  }
  return cells;
}

/** All eight cells: the two default (nebula) cells tokens.css declares, plus the
 *  six accents.css overrides. */
const PURPLE_CELLS = [
  ...['dark', 'light'].map((theme) => ({
    theme, accent: 'nebula', file: 'src/tokens/tokens.css', vars: tokensFor(theme),
  })),
  ...accentCells(),
];

/** Does this cell tell the two candidate sources apart? Where --accent and
 *  --purple-light hold the same value the cell satisfies BOTH readings, so it
 *  proves nothing about intent — but it is still asserted, because if either
 *  token later moves, the cell has to land on the correct side of the rule. */
const discriminates = (cell) =>
  hex(resolve('var(--accent)', cell.vars).rgb) !== hex(resolve('var(--purple-light)', cell.vars).rgb);

for (const cell of PURPLE_CELLS) {
  const source = GLOW_PURPLE_SOURCE[cell.theme];
  test(`--glow-purple tints ${source} — ${cell.theme} ${cell.accent}`, () => {
    const token = resolve(`var(${source})`, cell.vars);
    const glow = resolve('var(--glow-purple)', cell.vars);
    const other = GLOW_PURPLE_SOURCE[cell.theme === 'dark' ? 'light' : 'dark'];
    assert.deepStrictEqual(
      glow.rgb, token.rgb,
      `--glow-purple in ${cell.theme} ${cell.accent} (${cell.file}) is ${hex(glow.rgb)}, `
      + `but ${source} is ${hex(token.rgb)}.\n`
      + `In ${cell.theme} the wash is tinted from ${source}`
      + (hex(resolve(`var(${other})`, cell.vars).rgb) === hex(glow.rgb)
        ? `, and this value is ${other} — the other theme's source.\n`
          + 'The two themes do not share one source, and making them share one is not a\n'
          + 'fix. See the comment above GLOW_PURPLE_SOURCE and issue #96.\n'
        : '.\n')
      + 'A glow is its own colour at low alpha and nothing else.',
    );
    assert.ok(
      glow.alpha > 0 && glow.alpha < 1,
      `--glow-purple in ${cell.theme} ${cell.accent} is not translucent (alpha ${glow.alpha}) —\n`
      + 'a glow that is opaque is a fill, and the rules that wash with it are no\n'
      + 'longer washing.',
    );
  });
}

/* The purple gate is generated from a file scan, so a parser that quietly found
 * fewer cells — or a rule table that emptied — would pass by measuring nothing.
 * Two separate things are pinned: that all eight cells are there, and that the
 * rule is actually PROVEN rather than merely satisfied. Two of the eight cells
 * (dark nebula and light nebula) hold --accent and --purple-light at the same
 * value, so they agree with either reading; if a theme's cells were ALL like
 * that, this gate would be asserting nothing about that theme's half of the rule
 * and would keep passing if the rule were written backwards. Light ocean was a
 * third until #157 deepened its --accent away from --purple-light, the way #96
 * had already deepened light phoenix and light emerald. */
test('the --glow-purple gate actually measures something', () => {
  assert.strictEqual(PURPLE_CELLS.length, 8, 'the purple cell list changed size unexpectedly');
  assert.strictEqual(
    accentCells().length, 6,
    'accents.css stopped parsing to six accent × theme cells',
  );

  // Every --glow-purple accents.css declares must belong to a cell this gate
  // read. A block the selector regex failed to place would otherwise vanish.
  const declared = [...ACCENTS.matchAll(/--glow-purple\s*:/g)].length;
  assert.strictEqual(
    declared, 6,
    `accents.css declares ${declared} --glow-purple values but this gate parsed 6 cells`,
  );

  for (const theme of ['dark', 'light']) {
    const cells = PURPLE_CELLS.filter((c) => c.theme === theme);
    assert.strictEqual(cells.length, 4, `${theme} lost an accent cell`);
    assert.ok(
      cells.some(discriminates),
      `no ${theme} cell tells --accent and --purple-light apart any more, so the\n`
      + `${theme} half of this rule is no longer being proven — every ${theme} cell would\n`
      + 'now pass with the rule written either way round. Either a token moved, or a\n'
      + 'cell was dropped. Look before you trust the green.',
    );
    for (const cell of cells) {
      const glow = resolve('var(--glow-purple)', cell.vars);
      assert.ok(glow.rgb.every(Number.isFinite), `--glow-purple (${theme} ${cell.accent}) resolved to no colour`);
      assert.strictEqual(
        resolve(`var(${GLOW_PURPLE_SOURCE[theme]})`, cell.vars).alpha, 1,
        `${GLOW_PURPLE_SOURCE[theme]} (${theme} ${cell.accent}) is not an opaque colour to tint from`,
      );
    }
  }

  // The two themes must genuinely take different sources, or the split this gate
  // exists to hold is not being exercised at all.
  assert.notStrictEqual(
    GLOW_PURPLE_SOURCE.dark, GLOW_PURPLE_SOURCE.light,
    'both themes now name the same source — the two-rule split has been flattened',
  );
  // and the accents must really override the defaults, or accents.css is being
  // measured as six copies of tokens.css.
  const phoenix = PURPLE_CELLS.find((c) => c.theme === 'dark' && c.accent === 'phoenix');
  const nebula = PURPLE_CELLS.find((c) => c.theme === 'dark' && c.accent === 'nebula');
  assert.notStrictEqual(
    hex(resolve('var(--glow-purple)', phoenix.vars).rgb),
    hex(resolve('var(--glow-purple)', nebula.vars).rgb),
    'dark Phoenix and dark nebula resolved the same --glow-purple — the accent\n'
    + 'overrides are not being applied on top of the theme',
  );
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
const CALLOUT = cssOf('../src/styles/callout.css');

/** Selectors of a rule, comma list split out and trimmed. */
const selectorsOf = (sel) => sel.split(',').map((s) => s.trim());

/** The statuses the toast matrix declares, discovered rather than typed out: a
 *  `.ui-toast--<name>` rule that sets --toast-accent is a status. The style
 *  modifiers — soft, solid, outline — set no accent, so they are not. */
function toastStatuses() {
  const found = new Map();
  for (const [, sel, body] of CALLOUT.matchAll(RULE)) {
    if (!/--toast-accent\s*:/.test(body)) continue;
    for (const s of selectorsOf(sel)) {
      const m = /^\.ui-toast--([a-z]+)$/.exec(s);
      if (m) found.set(m[1], body);
    }
  }
  return found;
}
const SOLID_STATUSES = [...toastStatuses().keys()];

/* A status half-declared is the failure this catches: it would still be found
 * above, and every gate that walks the list would then measure a token that
 * falls through to whatever a neighbouring rule happened to leave in scope. */
test('every toast status declares the whole set of paint tokens', () => {
  assert.ok(SOLID_STATUSES.length >= 5, `only ${SOLID_STATUSES.length} toast statuses found — the scan is broken`);
  for (const [status, body] of toastStatuses()) {
    const missing = ['--toast-accent', '--toast-action-ink', '--toast-glow', '--toast-on', '--toast-solid']
      .filter((token) => !new RegExp(`${token}\\s*:`).test(body));
    assert.deepStrictEqual(
      missing, [],
      `.ui-toast--${status} declares no ${missing.join(', ')}.\n`
      + 'Every style below reads all five, so the ones missing here resolve to whatever\n'
      + 'is in scope instead of to this status — and every gate over them measures that.',
    );
  }
});

/** Custom properties in scope on a toast carrying every one of `selectors`,
 *  over the theme's tokens — walked in source order, so the later rule wins
 *  exactly as the cascade makes it win. `seen` reports which of the selectors
 *  actually turned up, so a caller can name the one that went missing. */
function toastVars(theme, selectors) {
  const vars = new Map(tokensFor(theme));
  const seen = new Set();
  for (const [, sel, body] of CALLOUT.matchAll(RULE)) {
    const sels = selectorsOf(sel);
    const hit = selectors.filter((s) => sels.includes(s));
    if (!hit.length) continue;
    for (const s of hit) seen.add(s);
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) vars.set(name, value.trim());
  }
  return { vars, seen };
}

/** Custom properties in scope on a `.ui-toast--<status>.ui-toast--solid`. */
function solidVars(theme, status) {
  const status_ = `.ui-toast--${status}`;
  const { vars, seen } = toastVars(theme, [status_, '.ui-toast--solid']);
  assert.ok(seen.has(status_), `.ui-toast--${status} is gone from callout.css`);
  assert.ok(seen.has('.ui-toast--solid'), '.ui-toast--solid is gone from callout.css');
  return vars;
}

/** Paint properties a selector declares, across every rule that names it. */
function declOf(selector, props = 'background|color') {
  const want = new RegExp(`(?:^|;)\\s*(${props})\\s*:\\s*([^;]+)`, 'g');
  const out = {};
  for (const [, sel, body] of CALLOUT.matchAll(RULE)) {
    if (!selectorsOf(sel).includes(selector)) continue;
    for (const [, prop, value] of body.matchAll(want)) out[prop] = value.trim();
  }
  return out;
}

/** `background` / `color` / `opacity` a `.ui-toast--solid …` selector declares. */
const solidDecl = (suffix) =>
  declOf(suffix ? `.ui-toast--solid ${suffix}` : '.ui-toast--solid', 'background|color|opacity');

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

/* ---- the stroked glyph: 3:1 is the bar, and the stroke is what earns it ----
 * Two families in callout.css paint a status as a mark instead of as text, and
 * both are stroked outlines drawn in a 24-unit box:
 *
 *   .ui-toast__icon    a 13px glyph on an opaque 22px --toast-accent circle
 *   .ui-callout__icon  an 18px glyph straight on the callout's own wash
 *
 * WCAG 1.4.11 asks 3:1 of a graphical object. #206 asked what the standard does
 * not answer: is 3:1 the right bar for a stroke this thin? The ruling is that
 * 3:1 is the right bar for a GRAPHIC, and a stroke has to be wide enough to be
 * one. Its width is stated in the glyph's own box, so what a reader sees is
 * stroke-width x box / 24 — 1.8 at 18px was 1.35 CSS px, 2 at 13px was 1.08 —
 * and under 1.5 CSS px a mark is optically a text stem, so it takes the text
 * bar instead. Why 1.5, why 4.5:1 could not simply be declared, and what
 * GLYPH_FLOOR is doing here:
 * docs/adr/0010-a-stroked-glyph-earns-the-graphic-bar-by-its-width.md.
 *
 * The circle's fill is still not free to move — --toast-accent also paints the
 * 3px left marker and the outline border, so a circle that left the accent
 * would put two different pinks in one toast. The ink is what moves, to the
 * pole that clears THIS accent. Dark does that with one value, because its five
 * accents are the bright signals; light cannot, because the accents there are
 * deepened to read as ink on white, so it keeps a per-status ink. */
const GRAPHIC_AA = 3;      // WCAG 1.4.11, for a graphical object
const SOLID_STROKE = 1.5;  // CSS px at which a stroke paints as one
const GLYPH_FLOOR = 4.39;  // a ratchet on where the twenty pairs landed, not a bar
const VIEWBOX = 24;        // the box every kit glyph is drawn in

/** The bar a mark is held to, decided by the width its stroke renders at. */
const barFor = (px) => (px >= SOLID_STROKE ? GRAPHIC_AA : AA);

test('the bar a stroked glyph is held to follows its width', () => {
  assert.strictEqual(barFor(SOLID_STROKE), GRAPHIC_AA, 'a stroke at the line is a graphic');
  assert.strictEqual(barFor(SOLID_STROKE - 0.01), AA, 'a stroke under it is a text stem');
});

test('every kit glyph is drawn in the box these stroke widths are read against', () => {
  const factory = /export const icon =[\s\S]*?viewBox="0 0 (\d+) (\d+)"/
    .exec(read('../src/assets/icons.js'));
  assert.ok(factory, 'src/assets/icons.js no longer emits a viewBox this gate can read');
  assert.deepStrictEqual(
    [Number(factory[1]), Number(factory[2])], [VIEWBOX, VIEWBOX],
    `the icon factory draws in a ${factory[1]}x${factory[2]} box, not ${VIEWBOX}x${VIEWBOX}.\n`
    + 'Every rendered width below is stroke-width x box / 24, so a different viewBox\n'
    + 'changes what the reader sees without changing a single stylesheet.',
  );
});

/** The width a family's stroke renders at, in CSS px. `width: 100%` on the svg
 *  hands the box to the slot, so the slot's own width is read instead. */
function strokePx(family) {
  const svg = declOf(`${family} svg`, 'stroke-width|width');
  const px = (v) => Number(/^([\d.]+)px$/.exec(v ?? '')?.[1] ?? NaN);
  const box = svg.width === '100%' ? px(declOf(family, 'width').width) : px(svg.width);
  const width = Number(svg['stroke-width']);
  assert.ok(box > 0, `${family} gives its glyph no px box to be drawn in`);
  assert.ok(width > 0, `${family} svg declares no stroke-width`);
  return (width * box) / VIEWBOX;
}

/** Every stroked glyph in this stylesheet that carries a status: an `__icon`
 *  slot whose svg is stroked. Discovered rather than listed, so a third one is
 *  gated the day it lands. `.ui-toast__close` is deliberately not one — it is a
 *  control's glyph, carries no status, and has no pair to keep. */
function glyphFamilies() {
  const found = new Set();
  for (const [, sel, body] of CALLOUT.matchAll(RULE)) {
    if (!/stroke-width\s*:/.test(body)) continue;
    for (const s of selectorsOf(sel)) {
      const m = /^(\.[\w-]+__icon) svg$/.exec(s);
      if (m) found.add(m[1]);
    }
  }
  return [...found];
}

/** The statuses a callout paints, discovered the way the toast's are. The base
 *  rule is the fifth: `.ui-callout` with no modifier is the neutral one, and it
 *  comes back as undefined so its caller reads it from the base rule. */
function calloutStatuses() {
  const found = new Set();
  for (const [, sel, body] of CALLOUT.matchAll(RULE)) {
    for (const s of selectorsOf(sel)) {
      const m = /^\.ui-callout--([a-z]+)$/.exec(s);
      if (m && /(?:^|;)\s*background\s*:/.test(body)) found.add(m[1]);
    }
  }
  return [undefined, ...found];
}

/* The opaque surfaces a callout is read on. Its status washes are translucent,
 * so what sits behind decides the ground, and the three differ: --surface-2 is
 * the harsher one in light, --surface in dark. Every pair is held on all three
 * rather than on a guess about where callouts get used. */
const CALLOUT_ON = ['var(--bg)', 'var(--surface)', 'var(--surface-2)'];

/** The glyph on its own circle, for one status. The circle is opaque, so the
 *  card under it cannot change this — which is why one measurement stands for
 *  both soft and outline, and why the assertion below that no style rule
 *  re-paints the icon is the thing keeping that true. */
function toastGlyph(theme, status) {
  const status_ = `.ui-toast--${status}`;
  const { vars, seen } = toastVars(theme, [status_]);
  assert.ok(seen.has(status_), `${status_} is gone from callout.css`);
  const decl = declOf('.ui-toast__icon');
  assert.ok(decl.background, '.ui-toast__icon declares no background');
  assert.ok(decl.color, '.ui-toast__icon declares no color');

  const fill = resolve(decl.background, vars);
  assert.strictEqual(fill.alpha, 1, `the icon circle must be opaque, got ${decl.background}`);
  const glyph = composite(resolve(decl.color, vars), fill.rgb);
  return [{
    on: decl.background, ink: decl.color, ground: fill.rgb, glyph,
    ratio: contrast(glyph, fill.rgb),
  }];
}

/** The glyph on the callout's own wash, for one status — once per surface the
 *  wash can be read over, or once outright where the wash is opaque. */
function calloutGlyph(theme, status) {
  const vars = tokensFor(theme);
  const neutral = status === 'neutral';
  const wash = declOf(neutral ? '.ui-callout' : `.ui-callout--${status}`).background;
  const ink = declOf(neutral ? '.ui-callout__icon' : `.ui-callout--${status} .ui-callout__icon`).color;
  assert.ok(wash, `the ${status} callout declares no background to read its icon on`);
  assert.ok(ink, `the ${status} callout paints its icon no colour`);

  const tint = resolve(wash, vars);
  const over = tint.alpha === 1 ? [undefined] : CALLOUT_ON;
  return over.map((on) => {
    const ground = on ? composite(tint, resolve(on, vars).rgb) : tint.rgb;
    const glyph = composite(resolve(ink, vars), ground);
    return { on: on ?? `${wash}, which is opaque`, ink, ground, glyph, ratio: contrast(glyph, ground) };
  });
}

/* Discovery finds the subjects; this says what each one is measured with. A
 * family that turns up without an entry here is a failure, not a silence. */
const GLYPH = {
  '.ui-toast__icon': { statuses: () => SOLID_STATUSES, measure: toastGlyph },
  '.ui-callout__icon': { statuses: () => calloutStatuses().map((s) => s ?? 'neutral'), measure: calloutGlyph },
};

test('every stroked status glyph in callout.css is measured here', () => {
  const families = glyphFamilies();
  assert.ok(families.length >= 2, `only ${families.length} stroked status glyph(s) found — the scan is broken`);
  assert.deepStrictEqual(
    families.filter((f) => !(f in GLYPH)), [],
    'a stroked status glyph landed in callout.css that nothing below measures.\n'
    + 'Give it an entry in GLYPH saying what its ink and its ground are, or, if it\n'
    + 'carries no status, name it in the comment above glyphFamilies() and exclude it.',
  );
});

test('both stroked-glyph families carry the same statuses', () => {
  assert.deepStrictEqual(
    [...GLYPH['.ui-callout__icon'].statuses()].sort(),
    [...GLYPH['.ui-toast__icon'].statuses()].sort(),
    'a callout and a toast no longer report the same set of statuses.\n'
    + 'One of them gained a status the other cannot express, which is a design\n'
    + 'decision and not a gate change — make it deliberately or undo it.',
  );
});

for (const theme of ['dark', 'light']) {
  for (const [family, { statuses, measure }] of Object.entries(GLYPH)) {
    for (const status of statuses()) {
      test(`the ${status} ${family} glyph clears the bar its stroke earns — ${theme}`, () => {
        const px = strokePx(family);
        const bar = barFor(px);
        for (const m of measure(theme, status)) {
          assert.ok(
            m.ratio >= bar,
            `the ${status} ${family} glyph in ${theme} measures ${show(m.ratio)}:1 on ${m.on}, `
            + `under the ${bar}:1 bar its stroke earns.\n`
            + `It paints color: ${m.ink} (${hex(m.glyph)}) on ${hex(m.ground)}, at a stroke `
            + `rendering ${px.toFixed(2)} CSS px.\n`
            + (bar === AA
              ? `A stroke under ${SOLID_STROKE} CSS px is read the way a text stem is, so it is\n`
                + `held at ${AA}:1. Widen the stroke back to a graphic's width, or move the ink.`
              : 'The accent cannot move — the left marker and the outline border are the same\n'
                + 'value — so the ink is what moves, to the pole that clears THIS accent.'),
          );
          assert.ok(
            m.ratio >= GLYPH_FLOOR,
            `the ${status} ${family} glyph in ${theme} measures ${show(m.ratio)}:1 on ${m.on}, `
            + `under the ${GLYPH_FLOOR}:1 these pairs were left at.\n`
            + `It paints color: ${m.ink} (${hex(m.glyph)}) on ${hex(m.ground)}.\n`
            + 'This is a ratchet, not the bar: something moved a token under a pair that was\n'
            + 'measured above it. Either put the pair back, or lower GLYPH_FLOOR on purpose\n'
            + 'and say in ADR 0010 what it bought.',
          );
        }
      });
    }
  }
}

/* One circle, two styles. Soft and outline share .ui-toast__icon untouched, and
 * the measurement above is only good for both while that stays true — a style
 * rule that re-painted the circle or the glyph would make ten of the twenty
 * combinations unmeasured. Solid is excluded on purpose: it re-paints the icon
 * from --toast-ink, and the block above already gates that pair. */
test('soft and outline leave the status icon alone', () => {
  for (const style of ['soft', 'outline']) {
    const decl = declOf(`.ui-toast--${style} .ui-toast__icon`);
    assert.deepStrictEqual(
      decl, {},
      `.ui-toast--${style} .ui-toast__icon re-paints the circle (${JSON.stringify(decl)}).\n`
      + 'The icon gate measures the base rule once and reads it as covering both\n'
      + 'styles. Gate this override too, or drop it.',
    );
  }
  // and the solid override, which is the one that DOES exist, still does.
  const solid = declOf('.ui-toast--solid .ui-toast__icon');
  assert.ok(
    solid.background && solid.color,
    '.ui-toast--solid .ui-toast__icon stopped re-painting the circle — it is now the\n'
    + 'accent circle on a solid fill, which this gate does not measure.',
  );
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

/* The glow gate is generated from GLOW_PAIRS, so an emptied or stale table would
 * pass by measuring nothing. The check that matters is not the count: it is that
 * every --glow-* the tokens declare is gated SOMEWHERE. A fifth glow added to
 * tokens.css and listed in neither table would otherwise slip in ungated. */
test('the glow gate actually measures something', () => {
  const declared = new Set([...TOKENS.matchAll(/(--glow-[\w-]+)\s*:/g)].map((m) => m[1]));
  assert.ok(declared.size > 0, 'tokens.css declares no --glow-* at all');
  assert.deepStrictEqual(
    [...declared].sort(), [...Object.keys(GLOW_PAIRS), '--glow-purple'].sort(),
    'the glow tables and the --glow-* tokens in tokens.css have come apart.\n'
    + 'Every glow the tokens declare has to name the colour it is a tint of —\n'
    + 'here if its source is the same token in both themes, or in\n'
    + 'GLOW_PURPLE_SOURCE if the theme decides which token that is.',
  );

  for (const theme of ['dark', 'light']) {
    const vars = tokensFor(theme);
    for (const [glowName, tokenName] of Object.entries(GLOW_PAIRS)) {
      const glow = resolve(`var(${glowName})`, vars);
      const token = resolve(`var(${tokenName})`, vars);
      assert.strictEqual(token.alpha, 1, `${tokenName} (${theme}) is not an opaque colour to tint from`);
      assert.ok(glow.rgb.every(Number.isFinite), `${glowName} (${theme}) resolved to no colour`);
    }
  }

  // The themes must genuinely differ, or one is being measured twice and half
  // the table is invisible. --glow-green is the pair this gate was written for.
  assert.notDeepStrictEqual(
    resolve('var(--glow-green)', tokensFor('dark')).rgb,
    resolve('var(--glow-green)', tokensFor('light')).rgb,
    'both themes resolved the same --glow-green — the theme split is not working',
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
