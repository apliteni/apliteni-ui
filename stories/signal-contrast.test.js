/* Rule: a signal colour's ink clears WCAG AA on the surface it actually sits on.
 *
 * 11px badge text is not large text, so 4.5:1 is the bar, and the
 * 13-14px form text and menu rows below are not large either. Most of these
 * rules do not sit on --bg: they paint the signal onto its own translucent glow,
 * which is why the kit carries deepened --chip-*-ink / --chip-*-fill pairs for
 * the white app, and why --pink itself moved rather than borrowing one.
 *
 * Each rule names the surface it lands on, because they differ. Both themes are
 * read; accents are not, since they redefine only the purple family.
 *
 * Measure signal ink against the surface beneath it.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { SOLID_STROKE, VIEWBOX } from './lib/glyph-stroke.js';

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
  if (v === 'transparent') return { rgb: [0, 0, 0], alpha: 0 };

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
  // both menus draw their panel on --bg-elevated, the floating step. They were read
  // on --surface-2 until #459, which is a ground neither of them paints: that token
  // is the sunken grey, and in dark it is DARKER than the panel, so a light signal
  // ink was being measured on an easier ground than the one it lands on.
  { file: '../src/styles/dropdown.css', selector: '.ui-dropdown__badge.is-live', on: 'var(--bg-elevated)' },
  { file: '../src/styles/topbar.css', selector: '.vbadge.live', on: 'var(--bg-elevated)' },
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
  // and the same row under the keyboard, which paints the row --surface too. Sign
  // out is a row of this menu since #286, so the state a reader with no pointer
  // reaches it in is read here rather than left to the hover above it.
  { file: '../src/styles/dropdown.css', selector: '.ui-dropdown__item.is-danger:focus-visible .ui-dropdown__label', on: 'var(--surface)' },
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

/** The `color` and (optional) `background` a rule declares in its own file.
 *  A rule head is a LIST, so each of its selectors is looked at: two states that
 *  paint alike are one rule with two selectors, and matching the head as one
 *  string reported the second of them as a rule that is not in the sheet. */
const heads = (sel) => sel.split(',').map((one) => one.trim().replace(/\s+/g, ' '));

function paintOf({ file, selector }) {
  for (const [, sel, body] of sourceOf(file).matchAll(RULE)) {
    if (!heads(sel).includes(selector)) continue;
    const pick = (prop) => {
      const m = new RegExp(`(?:^|[;{])\\s*${prop}\\s*:\\s*([^;]+)`).exec(body);
      return m ? m[1].trim() : undefined;
    };
    const ink = pick('color');
    if (ink) return { ink, fill: pick('background') };
  }
  return undefined;
}

/** A { ink, fill } pair measured on an opaque ground, in a theme. Taken apart from
 *  the rule it came out of so a planted pair can be put through the same arithmetic
 *  as a shipped one, which is what the mutations below rely on. */
function measurePaint(paint, on, theme) {
  const vars = tokensFor(theme);
  const surface = resolve(on, vars);
  assert.strictEqual(surface.alpha, 1, `${on} must be opaque to serve as a ground`);

  const ground = paint.fill ? composite(resolve(paint.fill, vars), surface.rgb) : surface.rgb;
  const ink = composite(resolve(paint.ink, vars), ground);
  return { ratio: contrast(ink, ground), ink, ground, paint };
}

/** Measured ratio of a gated rule in a theme, plus the colours it resolved to.
 *  A rule that declares only `color` can still be read on a fill of its own: the
 *  menu's state chip is the menu's chip with its ink swapped. `fillFrom` names the
 *  rule that paints that fill, and it is read from the sheet rather than copied
 *  here, so the two cannot drift apart. */
function measure(rule, theme) {
  const paint = paintOf(rule);
  assert.ok(paint, `${rule.selector} not found in ${rule.file.replace('../', '')}`);

  let { fill } = paint;
  if (!fill && rule.fillFrom) {
    const base = paintOf({ file: rule.file, selector: rule.fillFrom });
    assert.ok(base?.fill, `${rule.fillFrom} paints no fill for ${rule.selector} to be read on`);
    fill = base.fill;
  }
  return measurePaint({ ...paint, fill }, rule.on, theme);
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

/* ---- the neutral chip's ink, across the whole ladder ----------------------
 * Every rule above is read on the one ground it lands on. The neutral tone is
 * the exception, because docs/foundations.md publishes its ink as a floor over
 * the whole ladder: a record between states takes this tone wherever it is
 * drawn, so the page states a figure for every ground rather than for one.
 *
 * Three figures are published and all three are held here — 4.5:1 on the four
 * grounds a component can hand a chip, 4.51:1 as the worst of those cells, and
 * 4.25:1 on the sunken grey, which no component hands a chip: a data row paints
 * the table's own surface, hovered as well as at rest, and a menu panel floats.
 * The grey is measured anyway, because a reader of that page can read the
 * figure and a consumer can build the ground by hand.
 *
 * The tone gate next door reads fills and blinds chip ink by design; the menu's
 * own chip is measured in rendered stories by stories/dropdown-state-contrast.test.js,
 * on the panel alone. Neither holds the pair across the ladder, which is this.
 *
 * Measure signal ink against the surface beneath it. */

/** The grounds the neutral tone is read on, and whether a component can hand it
 *  one. The sunken grey is in the ladder and in no component's chip. */
const NEUTRAL_GROUNDS = [
  { on: 'var(--bg)', reachable: true, what: 'the page, where a chip sits outside a card' },
  { on: 'var(--surface)', reachable: true, what: 'a card' },
  { on: 'var(--bg-elevated)', reachable: true, what: 'a floating surface — a menu panel, a drawer, a modal' },
  { on: 'var(--table-bg)', reachable: true, what: "a data table's own ground" },
  { on: 'var(--surface-2)', reachable: false, what: 'the sunken grey, which no component hands a chip' },
];

/** The figures docs/foundations.md publishes for this tone. The floor is the AA
 *  bar; the other two are cells, pinned so the page cannot quietly stop being
 *  true — a pair that moves has to move the sentence with it.
 *
 *  Pinned within a hundredth, not to the digit. The page's numbers were measured
 *  in a browser and this gate composites at 8 bits, the way a framebuffer does
 *  (see the note above composite()), so the two models part company in the third
 *  decimal: the sunken-grey cell is 4.245 here and 4.253 rendered. The gap is an
 *  order of magnitude smaller than the smallest move either half of the pair can
 *  make, so a drift is still caught. */
const NEUTRAL_WORST = 4.51; // light, on the page — the worst cell a reader reaches
const NEUTRAL_SUNKEN = 4.25; // light, on the sunken grey — the cell nothing hands it
const NEUTRAL_PIN = 0.02;

/** What each rule reading the neutral pair takes as its ink. `state` is the pair's
 *  own quiet ink, held to the floor; `body` is body ink, which is the other half of
 *  the same page — a count is not a status, so a metadata chip keeps body ink. */
const NEUTRAL_INK = {
  'src/styles/badge.css|.ui-badge': 'state',
  'src/styles/badge.css|.ui-badge--neutral': 'state',
  'src/styles/dropdown.css|.ui-dropdown__badge': 'body',
  'src/styles/dropdown.css|.ui-dropdown__badge.is-state': 'state',
};

const NEUTRAL_SHEETS = ['../src/styles/badge.css', '../src/styles/dropdown.css'];
const neutralKey = (rule) => `${rule.file.replace('../', '')}|${rule.selector}`;

/** Every rule that reads the neutral pair, discovered from the sheets rather than
 *  listed: the rules that paint the wash, and the rules that swap the ink of one
 *  that paints it without painting a fill of their own. A tone with a fill of its
 *  own is not one of these — it is a family of its own and is gated above. */
function neutralRules() {
  const found = [];
  for (const file of NEUTRAL_SHEETS) {
    const rules = [...sourceOf(file).matchAll(RULE)]
      .flatMap(([, sel, body]) => heads(sel).map((selector) => ({ selector, body })));
    const washed = rules.filter((r) => /background\s*:\s*var\(\s*--chip-neutral-fill\s*\)/.test(r.body));
    for (const { selector } of washed) found.push({ file, selector });
    for (const { selector, body } of rules) {
      if (/(?:^|[;{])\s*background(?:-color)?\s*:/.test(body)) continue;
      if (!/(?:^|[;{])\s*color\s*:/.test(body)) continue;
      const base = washed.find((w) => w.selector !== selector && selector.startsWith(w.selector));
      if (base) found.push({ file, selector, fillFrom: base.selector });
    }
  }
  return found;
}

const neutralOf = (kind) => neutralRules().filter((rule) => NEUTRAL_INK[neutralKey(rule)] === kind);

/** Every cell of a rule × the ladder, in one theme. */
const neutralCells = (rule, theme) => NEUTRAL_GROUNDS
  .map((ground) => ({ ...ground, ...measure({ ...rule, on: ground.on }, theme) }));

test('every rule that reads the neutral chip pair is measured here', () => {
  const found = neutralRules();
  assert.ok(found.length >= 4, `the neutral-pair scan found only ${found.length} rules — it is broken`);
  assert.deepStrictEqual(
    found.map(neutralKey).filter((key) => !(key in NEUTRAL_INK)), [],
    'a rule takes --chip-neutral-fill, or swaps the ink of one that does, and nothing\n'
    + 'here measures it. Name it in NEUTRAL_INK and say which ink it takes: the page\n'
    + 'publishes a floor for the state ink and a rule for body ink, and an unnamed rule\n'
    + 'is covered by neither.',
  );
  assert.deepStrictEqual(
    Object.keys(NEUTRAL_INK).filter((key) => !found.map(neutralKey).includes(key)), [],
    'NEUTRAL_INK names a rule the sheets no longer have — a figure is being held\n'
    + 'against a rule that left, which is a gate measuring its own table.',
  );
  assert.ok(neutralOf('state').length >= 3, 'the state-ink half of the table emptied');
  assert.ok(neutralOf('body').length >= 1, 'the body-ink half of the table emptied');
});

for (const theme of ['dark', 'light']) {
  for (const rule of neutralOf('state')) {
    test(`${rule.selector} holds the neutral ink floor where a chip lands — ${theme}`, () => {
      const cells = neutralCells(rule, theme).filter((c) => c.reachable);
      assert.strictEqual(cells.length, 4, 'a ground a component hands a chip went unmeasured');
      for (const cell of cells) {
        assert.ok(
          cell.ratio >= AA,
          `${rule.selector} in ${theme} measures ${show(cell.ratio)}:1 on ${cell.on} — `
          + `${cell.what} — under the ${AA}:1 floor docs/foundations.md publishes for it.\n`
          + `It paints color: ${cell.paint.ink} on background: ${cell.paint.fill}.\n`
          + 'The ink and the fill are one pair: deepening the wash spends the ink\'s\n'
          + 'headroom, and moving the ink spends the chip\'s. Move them together, or\n'
          + 'move the figure on that page and say what it bought.',
        );
      }
    });
  }
}

test('the two cells the page states by number are the cells measured', () => {
  const pinned = (label, measured, published) => assert.ok(
    Math.abs(measured - published) <= NEUTRAL_PIN,
    `the neutral chip's ink measures ${show(measured)}:1 ${label}, and docs/foundations.md\n`
    + `says ${published.toFixed(2)}:1. Both figures are published, so the page moves with the\n`
    + 'pair or the pair goes back. See the pinning note above NEUTRAL_WORST for why this\n'
    + 'is a hundredth and not a digit.',
  );
  for (const rule of neutralOf('state')) {
    const reachable = ['dark', 'light'].flatMap((theme) => neutralCells(rule, theme).filter((c) => c.reachable));
    pinned('at its worst reachable ground', Math.min(...reachable.map((c) => c.ratio)), NEUTRAL_WORST);
    const sunken = neutralCells(rule, 'light').find((c) => !c.reachable);
    pinned('on light\'s sunken grey', sunken.ratio, NEUTRAL_SUNKEN);
  }
});

test('a chip that is not a status keeps body ink on the same wash', () => {
  for (const rule of neutralOf('body')) {
    const paint = paintOf(rule);
    assert.strictEqual(
      paint.ink.replace(/\s+/g, ''), 'var(--text)',
      `${rule.selector} takes the neutral wash and paints color: ${paint.ink}.\n`
      + 'A count is not a status, so a metadata chip keeps body ink; a chip that has\n'
      + 'become a status reads the pair\'s own ink and moves to the state half of\n'
      + 'NEUTRAL_INK, where the published floor holds it.',
    );
    for (const theme of ['dark', 'light']) {
      for (const cell of neutralCells(rule, theme)) {
        assert.ok(cell.ratio >= AA, `${rule.selector} in ${theme} measures ${show(cell.ratio)}:1 on ${cell.on}`);
      }
    }
  }
});

/* ---- the mutations -------------------------------------------------------- */

test('the floor rejects a wash deepened under the ink it carries', () => {
  // The edit this is written against is "make the neutral chip easier to see". The
  // wash is the half that can move without touching an ink token, and every fill
  // gate in the kit gets HAPPIER as it deepens — the chip is more separable from
  // its ground, not less. At 25% the chip's own text is what gives way.
  const planted = { ink: 'var(--chip-neutral-ink)', fill: 'color-mix(in srgb, var(--muted) 25%, transparent)' };
  const failed = [];
  for (const theme of ['dark', 'light']) {
    for (const ground of NEUTRAL_GROUNDS.filter((g) => g.reachable)) {
      const { ratio } = measurePaint(planted, ground.on, theme);
      if (ratio < AA) failed.push(`${theme} ${ground.on} ${show(ratio)}:1`);
      // and it really is a wash that got deeper, not a different colour
      assert.ok(resolve(planted.fill, tokensFor(theme)).alpha > resolve('var(--chip-neutral-fill)', tokensFor(theme)).alpha,
        'the planted wash is not deeper than the shipped one');
    }
  }
  assert.ok(failed.length >= 2, `a 25% wash has to fail the floor in both themes; it failed on ${failed.join(', ') || 'nothing'}`);
});

test('the published figures reject an ink that clears the floor and moves them', () => {
  // --disabled-ink-bare is the nearest grey the tokens hold, and it clears AA on
  // every ground in both themes — so the floor alone would take it while both
  // figures on the reader page quietly stopped being true. The pins are what
  // catches it, which is why they are exact and not a band.
  const planted = { ink: 'var(--disabled-ink-bare)', fill: 'var(--chip-neutral-fill)' };
  const light = NEUTRAL_GROUNDS.map((ground) => ({ ...ground, ...measurePaint(planted, ground.on, 'light') }));
  for (const theme of ['dark', 'light']) {
    for (const ground of NEUTRAL_GROUNDS) {
      assert.ok(measurePaint(planted, ground.on, theme).ratio >= AA,
        'the planted ink has to pass the floor, or it proves nothing about the pins');
    }
  }
  assert.ok(Math.abs(light.find((c) => !c.reachable).ratio - NEUTRAL_SUNKEN) > NEUTRAL_PIN,
    'the sunken-grey pin did not move under the planted ink');
  assert.ok(Math.abs(Math.min(...light.filter((c) => c.reachable).map((c) => c.ratio)) - NEUTRAL_WORST) > NEUTRAL_PIN,
    'the worst-cell pin did not move under the planted ink');
});

test('every --chip-* fill ships the ink it is one half of, in both themes', () => {
  // The defect #459 shipped first: --chip-neutral-fill arrived without a
  // --chip-neutral-ink, and the badge paired the new wash with body ink. Fill and
  // ink are one pair, read here off the token file rather than trusted — and read
  // per theme, because a theme block answering one half is the shape the defect
  // had: light declared the wash and left the ink to be found in the dark block.
  const families = new Set([...TOKENS.matchAll(/--chip-([\w-]+)-(?:fill|ink)\s*:/g)].map((m) => m[1]));
  assert.ok(families.size >= 5, `only ${families.size} --chip-* families found — the scan is broken`);
  for (const theme of ['dark', 'light']) {
    const vars = tokensFor(theme);
    assert.deepStrictEqual(
      [...families].filter((f) => !(vars.has(`--chip-${f}-fill`) && vars.has(`--chip-${f}-ink`))), [],
      `a --chip-* tone ships one half of its pair in ${theme}. A fill with no ink leaves\n`
      + 'whatever ink was already on the rule standing on a ground it was not chosen\n'
      + 'against, which is the inversion #459 shipped in light.',
    );
  }
});

/* ---- the glows stay tints of their own token -----------------------------
 * A glow is its own colour at low alpha — nothing more. The same hue is spent at
 * low alpha in places that do NOT read --glow-*, so a glow that drifts off its
 * token puts two washes of one colour side by side in the same app. Gated in
 * both themes; --glow-purple is gated separately below, because the accent
 * family's display hue is a different token in each theme.
 *
 * Measure signal ink against the surface beneath it. */
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
 * dark  — --accent IS the display hue, and --glow-purple tints it.
 * light — --accent is a text INK deepened by #96, and --purple-light is the
 *         display hue, so --glow-purple tints --purple-light.
 *
 * Do NOT "fix" the light glows onto --accent to make the two themes agree; that
 * edit is the mutation this gate was written against.
 * Measure signal ink against the surface beneath it.
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

/** The bare form a dark cell also answers to, so `data-accent` paints in the
 *  attribute-less state the default theme already paints in (#250). It names no
 *  theme, so it cannot place a cell on its own — it is read here only to be
 *  recognised, and refused when it disagrees with the stamped line above it. */
const BARE_SELECTOR = /^:root\[data-accent="([\w-]+)"\]$/;

/** Every accent × theme cell accents.css declares, each resolved the way the
 *  cascade resolves it: the theme's tokens first, then the cell's overrides on
 *  top. Anything in the file that is NOT such a cell is refused rather than
 *  skipped — a block this parser silently walked past would be a block whose
 *  --glow-purple nobody is reading. */
function accentCells() {
  const cells = [];
  for (const [, sel, body] of ACCENTS.matchAll(RULE)) {
    const parts = sel.trim().split(',').map((s) => s.trim().replace(/\s+/g, ' '));
    const stamped = parts.map((s) => CELL_SELECTOR.exec(s)).filter(Boolean);
    const bare = parts.map((s) => BARE_SELECTOR.exec(s)).filter(Boolean);
    assert.equal(
      stamped.length + bare.length, parts.length,
      `accents.css declares a rule this gate cannot place: ${sel.trim()}\n`
      + 'Every block in that file is expected to be one accent × theme cell, on its\n'
      + 'stamped selector and optionally the bare :root[data-accent="…"] beside it.\n'
      + 'If a new shape of rule belongs there, teach this parser about it — do not\n'
      + 'let it fall through, because a cell that is not parsed is a cell that is\n'
      + 'not gated.',
    );
    assert.equal(
      stamped.length, 1,
      `accents.css gives ${sel.trim()} ${stamped.length} stamped selectors. A cell is placed by\n`
      + 'its [data-theme][data-accent] line and there has to be exactly one: the bare\n'
      + 'line names no theme, so a block carrying only bare selectors would be judged\n'
      + "against a theme this parser had to guess, and two stamped lines would mean one\n"
      + 'body is two cells at once.',
    );
    const [, theme, accent] = stamped[0];
    assert.deepEqual(
      bare.map((m) => m[1]), bare.length ? [accent] : [],
      `accents.css pairs ${sel.trim()} with a bare selector for a different accent. The bare\n`
      + 'line exists so this cell paints without data-theme; pointing it at another\n'
      + "accent's name hands that accent this cell's ramp.",
    );
    assert.ok(
      !bare.length || theme === 'dark',
      `accents.css puts a bare :root[data-accent="${accent}"] on the LIGHT cell. The bare form\n`
      + 'is what an unstamped document gets, and an unstamped document is dark (see\n'
      + 'src/tokens/tokens.css:118 `:root,`) — so it belongs on the dark cell only. On the light\n'
      + "one it would paint light values over the dark theme's surfaces.",
    );
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

/* Toast source measurements cover both themes; browser captures verify layout. */

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
      + 'The tone mapping must remain complete; missing fields resolve to whatever\n'
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
    const decl = { ...base, ...declOf(suffix), ...solidDecl(suffix) };
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
          + 'Text must clear the neutral card in every tone and theme.',
        );
      }
    });
  }
}

/* ---- the stroked glyph: 3:1 is the bar, and the stroke is what earns it ----
 * Two families in callout.css paint a status as a mark instead of as text, both stroked outlines
 * drawn in a 24-unit box:
 *
 *   .ui-toast__icon    a 16px glyph on the neutral toast surface
 *   .ui-callout__icon  an 18px glyph straight on the callout's own wash
 *
 * WCAG 1.4.11 asks 3:1 of a graphical object; #206 ruled that 3:1 is the bar for a GRAPHIC and a
 * stroke has to be wide enough to be one. What a reader sees is stroke-width x box / 24, and
 * under 1.5 CSS px a mark is optically a text stem, so it takes the text bar instead. Why 1.5,
 * and what GLYPH_FLOOR is doing here: docs/foundations.md#icons-and-glyphs.
 *
 */
const GRAPHIC_AA = 3;      // WCAG 1.4.11, for a graphical object
/* A ratchet on where the twenty pairs landed, not a bar; the closest is still well
 * over GRAPHIC_AA. It came down at #295 with the four callout glyphs, which are
 * painted on the callout's own wash over a light page that is no longer white.
 * why: docs/foundations.md#elevation */
const GLYPH_FLOOR = 3.85;
/* SOLID_STROKE — the 1.5 CSS px line — and VIEWBOX are imported rather than
 * declared: #217 extended the same line to every stroked glyph in the kit, and
 * stories/glyph-stroke.test.js holds them to it. Two gates reading one number
 * from one file is the point; two gates each carrying their own copy of 1.5 is
 * how the line moves in one of them. */

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
  const px = (v) => {
    const token = /^var\((--[\w-]+)\)$/.exec(v ?? '');
    return Number(/^([\d.]+)px$/.exec(token ? tokensFor('light').get(token[1]) : v ?? '')?.[1] ?? NaN);
  };
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

/** Unfilled glyph measured on the opaque card; style overrides are rejected below. */
function toastGlyph(theme, status) {
  const status_ = `.ui-toast--${status}`;
  const { vars, seen } = toastVars(theme, [status_]);
  assert.ok(seen.has(status_), `${status_} is gone from callout.css`);
  const decl = declOf('.ui-toast__icon');
  assert.ok(decl.background, '.ui-toast__icon declares no background');
  assert.ok(decl.color, '.ui-toast__icon declares no color');

  const card = resolve(declOf('.ui-toast').background, vars);
  assert.strictEqual(card.alpha, 1, 'toast surface must be opaque');
  const fill = { rgb: composite(resolve(decl.background, vars), card.rgb), alpha: 1 };
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
              : 'The accent cannot move — the icon circle and the outline border are the same\n'
                + 'value — so the ink is what moves, to the pole that clears THIS accent.'),
          );
          assert.ok(
            m.ratio >= GLYPH_FLOOR,
            `the ${status} ${family} glyph in ${theme} measures ${show(m.ratio)}:1 on ${m.on}, `
            + `under the ${GLYPH_FLOOR}:1 these pairs were left at.\n`
            + `It paints color: ${m.ink} (${hex(m.glyph)}) on ${hex(m.ground)}.\n`
            + 'This is a ratchet, not the bar: something moved a token under a pair that was\n'
            + 'measured above it. Either put the pair back, or lower GLYPH_FLOOR on purpose\n'
            + 'and say in docs/foundations.md#elevation what it bought.',
          );
        }
      });
    }
  }
}

/* All legacy styles share the glyph measured above. */
test('every toast style leaves the status glyph unfilled', () => {
  const styles = [...CALLOUT.matchAll(RULE)].flatMap(([, sel]) => selectorsOf(sel))
    .filter(sel => /^\.ui-toast--/.test(sel) && !sel.includes(' ') && !toastStatuses().has(sel.slice(11)) && sel !== '.ui-toast--compact');
  assert.deepStrictEqual([...new Set(styles)].sort(), ['.ui-toast--outline', '.ui-toast--soft', '.ui-toast--solid']);
  for (const style of styles) {
    assert.deepStrictEqual(declOf(`${style} .ui-toast__icon`), {});
    assert.equal(declOf(style).background, declOf('.ui-toast').background);
  }
  assert.equal(declOf('.ui-toast__icon').background, 'transparent');
});

/* ---- anti-vacuity --------------------------------------------------------
 * Every assertion above is generated from a list and a set of file reads. If
 * the list emptied, a selector were renamed, or a parse silently returned
 * nothing, the gate would pass by measuring nothing at all. */
test('the contrast gate actually measures something', () => {
  assert.strictEqual(GATED.length, 19, 'the gated-rule list changed size unexpectedly');

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
      // Body ink must be no stronger than the title ink.
      assert.ok(m.text.ratio <= m.title.ratio + 0.01, `solid ${status} (${theme}): the body ink exceeds title contrast`);
      grounds.add(hex(m.ground));
    }
    assert.strictEqual(grounds.size, 1, `${theme}: toast tones must share one neutral surface`);
  }

  // Light and dark must resolve genuinely different fills, or one theme is
  // being measured twice and half the matrix is invisible.
  assert.notStrictEqual(
    hex(measureSolid('success', 'dark').ground),
    hex(measureSolid('success', 'light').ground),
    'both themes resolved the same solid success fill — the theme split is not working',
  );
});
