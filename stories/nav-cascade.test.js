/* Rule: the sidebar rail's three repaired declarations must keep reaching the
 * element they are written for.
 *
 * Every defect this file gates was a rule that LOOKED right in the stylesheet
 * and never applied: the nested indent lost to the `.ui-nav ul` reset, the
 * active child's marker was offset against that missing indent and painted
 * outside the nav box, and the active nested row's focus ring was cancelled by
 * a later rule of equal specificity. Grepping the file for those declarations
 * would have passed on every one of them — they were all present, all dead.
 *
 * So this file resolves the cascade instead of reading it. It loads the two
 * stylesheets the rail actually ships with (base.css + nav.css) with their
 * var() references substituted from the token files, mounts real sidebarNav()
 * markup in a JSDOM, and reads getComputedStyle — JSDOM applies author rules by
 * specificity and source order, so a declaration that loses to another author
 * rule resolves to the winner's value here exactly as it does in a browser.
 * Author rules are the whole of that guarantee: JSDOM does not rank by origin,
 * so a bare type selector loses to the user-agent sheet it would beat in a
 * browser — `a { color }` on a linked <a> reads back as the UA's blue. Every
 * selector asserted on below carries a class, and a class outranks the UA sheet
 * correctly.
 *
 * Two things JSDOM cannot do, and how they are modelled without weakening the
 * gate. Both rewrites are specificity-preserving, so the cascade being tested is
 * the shipped one:
 *
 *   :hover / :focus-visible  never match in JSDOM. Each is rewritten to an
 *                            attribute selector — also (0,1,0) — that the test
 *                            sets on the element it is exercising.
 *   ::before                 is not computed in JSDOM. Each `X::before` rule is
 *                            rewritten to `X > [data-pseudo="before"]` and a
 *                            stand-in child is injected. Every ::before rule
 *                            gains the same (0,1,0), so their order among
 *                            themselves is untouched.
 *
 * Layout is not modelled — JSDOM has none. The marker's position is derived
 * arithmetically from resolved values; the derivation is validated against the
 * running Storybook, where the unrepaired rail measured markerX = navLeft − 11px
 * and this file's arithmetic gave −11 for the same CSS.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

// A DOM has to exist before the kit's factories are imported — the same
// arrangement stories/keyboard.test.js uses.
const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'Event']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}
const { sidebarNav } = await import('../src/components/nav.js');

// ---- token resolution ----------------------------------------------------

const RULE = /([^{}]+)\{([^{}]*)\}/g;
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Custom properties in effect for a theme + accent, in cascade order. */
function tokensFor(theme, accent) {
  const wanted = [
    ':root',
    `:root[data-theme="${theme}"]`,
    ...(accent === 'default' ? [] : [`:root[data-theme="${theme}"][data-accent="${accent}"]`]),
  ];
  const vars = new Map();
  for (const file of ['src/tokens/brand.generated.css', 'src/tokens/tokens.css', 'src/tokens/accents.css']) {
    for (const [, selector, body] of decomment(read(file)).matchAll(RULE)) {
      const sels = selector.split(',').map((s) => s.trim());
      if (!sels.some((s) => wanted.includes(s))) continue;
      for (const decl of body.split(';')) {
        const i = decl.indexOf(':');
        if (i < 0) continue;
        const name = decl.slice(0, i).trim();
        if (name.startsWith('--')) vars.set(name, decl.slice(i + 1).trim());
      }
    }
  }
  return vars;
}

/** Substitute var() references until none are left (tokens reference tokens). */
function substitute(css, vars) {
  let out = css;
  for (let pass = 0; pass < 12 && out.includes('var('); pass++) {
    out = out.replace(/var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)/g, (m, name, fallback) =>
      vars.has(name) ? vars.get(name) : (fallback != null ? fallback.trim() : m));
  }
  return out;
}

// JSDOM hands colours back as rgb(); the token file writes them as hex.
const colour = (v) => {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(v).trim());
  if (!hex) return String(v).trim();
  const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
  return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`;
};

// State pseudo-classes → attribute selectors of identical (0,1,0) weight.
const STATES = ['hover', 'focus-visible', 'focus', 'active'];
function desugar(css) {
  let out = css;
  for (const s of STATES) out = out.split(`:${s}`).join(`[data-ui-state~="${s}"]`);
  out = out.replace(/::before/g, ' > [data-pseudo="before"]');
  return out;
}

// ---- the rail, resolved --------------------------------------------------

const MARKUP = sidebarNav({
  ariaLabel: 'Primary',
  sections: [{
    label: 'Finance',
    items: [
      { id: 'revenue', icon: 'chart', label: 'Revenue' },
      {
        icon: 'card', label: 'Payouts', open: true,
        items: [
          { id: 'payouts-pending', label: 'Pending', badge: 3 },
          { id: 'payouts-history', label: 'History' },
        ],
      },
      { id: 'settings', icon: 'gear', label: 'Settings', disabled: true },
    ],
  }],
  active: 'payouts-pending',
  footer: '<a class="ui-nav__item is-danger" href="#logout"><span class="ui-nav__label">Sign out</span></a>',
});

/** Mount the rail under one theme/accent and hand back a resolver. */
function rail(theme = 'dark', accent = 'default') {
  const vars = tokensFor(theme, accent);
  const css = desugar(substitute(decomment(read('src/styles/base.css') + '\n' + read('src/styles/nav.css')), vars));
  const w = new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head>`
    + `<body>${MARKUP}</body></html>`,
    { pretendToBeVisual: true },
  ).window;
  // Stand-in for ::before on every row, so the marker's own rules resolve.
  for (const item of w.document.querySelectorAll('.ui-nav__item')) {
    const p = w.document.createElement('i');
    p.setAttribute('data-pseudo', 'before');
    item.prepend(p);
  }
  const q = (sel) => {
    const el = w.document.querySelector(sel);
    assert.ok(el, `the rail has no ${sel} — the fixture stopped exercising the rule under test`);
    return el;
  };
  return {
    window: w,
    vars,
    q,
    css: (sel, prop) => w.getComputedStyle(q(sel))[prop],
    /** Resolve a property with a state pseudo-class active on the element. */
    inState: (sel, state, prop) => {
      const el = q(sel);
      el.setAttribute('data-ui-state', state);
      const value = w.getComputedStyle(el)[prop];
      el.removeAttribute('data-ui-state');
      return value;
    },
    px: (sel, prop) => Number.parseFloat(w.getComputedStyle(q(sel))[prop] || '0'),
  };
}

const SUB = '.ui-nav__sub';
const ACTIVE_SUB = '.ui-nav__item--sub.is-active';
const THEMES = [['dark', 'default'], ['dark', 'phoenix'], ['light', 'default'], ['light', 'phoenix']];

// ---- 1. the nested indent survives the list reset ------------------------

test('the nested group is actually indented — .ui-nav ul does not eat .ui-nav__sub', () => {
  const r = rail();
  const margin = r.px(SUB, 'marginLeft');
  const padding = r.px(SUB, 'paddingLeft');

  assert.ok(
    margin > 0 && padding > 0,
    'a nested group renders flush against the rail: .ui-nav__sub resolves to '
    + `margin-left ${margin}px / padding-left ${padding}px. The reset on .ui-nav ul, `
    + 'ol is (0,1,1) and .ui-nav__sub is (0,1,0) — the indent is being overridden. '
    + 'Raise the indent rule above the reset, do not append an override.',
  );
  for (const [name, value] of [['margin-left', margin], ['padding-left', padding]]) {
    assert.equal(
      value % 4, 0,
      `.ui-nav__sub ${name} is ${value}px — off the kit's 4px spacing scale. `
      + 'The repair spends no new design values; keep the indent on --space-*.',
    );
  }
});

// ---- 2. the active child's marker paints inside the nav ------------------

test("the active nested row's marker paints inside the nav box", () => {
  const r = rail();
  // The row is a flex child of .ui-nav__sub, so its padding-box left edge sits
  // at margin + border + padding from the rail's own left edge; the marker is
  // absolutely positioned against that edge.
  const indent = r.px(SUB, 'marginLeft') + r.px(SUB, 'borderLeftWidth') + r.px(SUB, 'paddingLeft');
  const offset = r.px(`${ACTIVE_SUB} > [data-pseudo="before"]`, 'left');
  const x = indent + offset;

  assert.ok(
    x >= 0,
    `the marker on the active nested row lands ${-x}px to the LEFT of the nav's own box `
    + `(indent ${indent}px, ::before left ${offset}px). Any shell with overflow: hidden `
    + 'deletes it, and the reader loses the only mark of where they are.',
  );
  assert.ok(
    offset < 0,
    `the marker is at left: ${offset}px — it is supposed to hang back onto the guide `
    + 'hairline, not sit inside the row with the label.',
  );
});

// ---- 3. the active nested row keeps its focus ring -----------------------

for (const [theme, accent] of THEMES) {
  test(`every focusable row shows the ring on :focus-visible — ${theme} / ${accent}`, () => {
    const r = rail(theme, accent);
    const ring = r.vars.get('--ring');
    assert.ok(ring, `no --ring token resolved for ${theme}/${accent} — the harness is not reading the kit`);

    const rows = {
      'a plain row': '.ui-nav__item:not(.is-active):not(.is-danger):not(.is-disabled)',
      'the destructive row': '.ui-nav__item.is-danger',
      'the ACTIVE NESTED row': ACTIVE_SUB,
    };
    for (const [what, sel] of Object.entries(rows)) {
      assert.equal(
        r.inState(sel, 'focus-visible', 'boxShadow'), ring,
        `${what} (${sel}) shows no focus ring when keyboard-focused in ${theme}/${accent} — `
        + 'WCAG 2.4.7. A later rule of equal specificity is cancelling '
        + '.ui-nav__item.is-active:focus-visible; resolve the conflict, do not stack another override.',
      );
    }
  });
}

// ---- 4. the row you are on is never quieter than the row under the pointer

for (const [theme, accent] of THEMES) {
  test(`the current row has a fill of its own — ${theme} / ${accent}`, () => {
    const r = rail(theme, accent);
    const bg = colour(r.vars.get('--bg'));
    const active = r.css('.ui-nav__item.is-active', 'backgroundColor');
    const hover = r.inState('.ui-nav__item:not(.is-active)', 'hover', 'backgroundColor');

    assert.notEqual(
      active, bg,
      `the current row fills with ${active}, which IS the page background in ${theme} — `
      + 'the row you are on has no surface at all, while a row under the pointer does. '
      + '--surface and --bg are the same value in the light theme; pick a surface that '
      + 'exists in both.',
    );
    assert.notEqual(
      active, hover,
      `the current row and a hovered row both fill with ${active} in ${theme}/${accent} — `
      + 'hovering anything erases where you are',
    );
  });
}

// ---- the gates above are only worth anything if they reach the kit -------

test('the resolver reaches the real cascade', () => {
  const r = rail();

  // The list reset is still live — it just no longer outranks the component
  // rules. Gate 1 is resolving a real conflict, not a stylesheet someone
  // quietly deleted the reset from.
  assert.equal(
    r.px('.ui-nav__list', 'paddingLeft'), 0,
    'a plain nav list is no longer reset to padding 0 — the reset is gone, so '
    + 'gate 1 is no longer proving that .ui-nav__sub beats it',
  );

  // Cascade order is being honoured: .ui-nav__item.is-danger:hover must beat
  // the plain .ui-nav__item:hover written above it.
  assert.equal(
    r.inState('.ui-nav__item.is-danger', 'hover', 'color'), colour(r.vars.get('--pink')),
    'the destructive row does not resolve to --pink on hover — the desugared '
    + 'state selectors are not matching, so the focus gate is checking nothing',
  );
  assert.equal(
    r.css('.ui-nav__item.is-danger', 'color'), colour(r.vars.get('--muted')),
    'the destructive row is not --muted at rest — the resolver is not reading nav.css',
  );

  // The ::before stand-in resolves the marker's own declarations.
  assert.equal(
    r.css(`${ACTIVE_SUB} > [data-pseudo="before"]`, 'position'), 'absolute',
    'the ::before stand-in resolves nothing — gate 2 is checking an empty element',
  );

  // A row that cannot be used must not be reachable.
  assert.equal(
    r.css('.ui-nav__item.is-disabled', 'pointerEvents'), 'none',
    'the disabled row is still interactive',
  );
});
