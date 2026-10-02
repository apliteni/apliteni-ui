/* Rule: the sidebar rail's three repaired declarations must keep reaching the
 * element they are written for.
 *
 * Every defect gated here was a rule that looked right in the stylesheet and
 * never applied, so this file resolves the cascade instead of reading it:
 * base.css + nav.css with their var() references substituted, real sidebarNav()
 * markup mounted in a JSDOM, getComputedStyle read back. The marker's position
 * is derived arithmetically, because JSDOM models no layout.
 *
 * Resolve the winning declarations before measuring the result.
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
const { sidebarNav, navTabs } = await import('../src/components/nav.js');

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
  // JSDOM drops calc() in a shadow length; Chromium coverage measures the real value.
  return out.replace(/calc\(([-\d.]+)px \+ ([-\d.]+)px\)/g, (_, a, b) => `${Number(a) + Number(b)}px`);
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
    // Resolve nested width, gap and colour tokens before comparing the composed shadow.
    const ring = substitute(r.vars.get('--ring') || '', r.vars).trim();
    assert.ok(ring, `no --ring token resolved for ${theme}/${accent} — the harness is not reading the kit`);
    assert.ok(!ring.includes('var('), `--ring did not resolve for ${theme}/${accent}: ${ring}`);

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
  test(`the current row keeps its reading surface and stronger type — ${theme} / ${accent}`, () => {
    const r = rail(theme, accent);
    const bg = colour(r.vars.get('--bg'));
    const active = r.css('.ui-nav__item.is-active', 'backgroundColor');
    const hoverWeight = r.inState('.ui-nav__item:not(.is-active)', 'hover', 'fontWeight');

    assert.notEqual(
      active, bg,
      `the current row fills with ${active}, which IS the page background in ${theme} — `
      + 'the row you are on has no surface at all, while a row under the pointer does. '
      + '--surface and --bg are the same value in the light theme; pick a surface that '
      + 'exists in both.',
    );
    assert.ok(
      Number(r.css('.ui-nav__item.is-active', 'fontWeight')) > Number(hoverWeight),
      `the current row loses its type distinction in ${theme}/${accent}`,
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
    r.css('.ui-nav__item.is-danger', 'color'), colour(r.vars.get('--text')),
    'the destructive row is not --text at rest — the resolver is not reading nav.css',
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

// ---- 5. one accent signal on the selected tab (#475) ---------------------

/* Artur chose this on round r22 of #475: a selected navigation item carries one
 * accent signal, not two. The pill appearance carried accent ink ON an accent
 * fill; it keeps the fill and takes the body ink `.ui-nav__tab.is-active`
 * already gives it, which is what the underline appearance has always used.
 *
 * Resolved rather than grepped, for this file's reason: `color: var(--accent)`
 * coming back on a later rule is exactly the regression this guards, and a rule
 * that is in the file can still lose. Recorded in docs/specification.md under
 * Text ink.
 */

const TAB_ITEMS = [
  { id: 'summary', label: 'Summary' },
  { id: 'payouts', label: 'Payouts', badge: 3 },
  { id: 'exports', label: 'Exports', disabled: true },
];

/** Mount one tab row under a theme/accent and hand back a resolver. */
function tabRow(variant, theme = 'dark', accent = 'default', sheet = read('src/styles/nav.css')) {
  const vars = tokensFor(theme, accent);
  const css = desugar(substitute(decomment(read('src/styles/base.css') + '\n' + sheet), vars));
  const w = new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head>`
    + `<body>${navTabs({ items: TAB_ITEMS, active: 'payouts', variant })}</body></html>`,
    { pretendToBeVisual: true },
  ).window;
  const q = (sel) => {
    const el = w.document.querySelector(sel);
    assert.ok(el, `the ${variant} row has no ${sel} — the fixture stopped exercising the rule under test`);
    return el;
  };
  return { vars, css: (sel, prop) => w.getComputedStyle(q(sel))[prop] };
}

const SELECTED_TAB = '.ui-nav__tab.is-active';

// The token file writes the wash as rgba(…, 0.10); JSDOM hands it back as 0.1.
const channels = (v) => String(v).match(/[\d.]+/g).map(Number);

for (const [theme, accent] of THEMES) {
  test(`the selected pill signals with its fill alone, in body ink — ${theme} / ${accent}`, () => {
    const r = tabRow('pill', theme, accent);
    const strong = colour(r.vars.get('--strong'));
    const accentInk = colour(r.vars.get('--accent'));

    assert.notEqual(
      r.css(SELECTED_TAB, 'color'), accentInk,
      `the selected pill resolves to the accent (${accentInk}) in ${theme}/${accent}, on an `
      + 'accent fill — two accent signals on one element. Artur chose one on round r22 of '
      + '#475: keep the fill, leave the ink alone.',
    );
    assert.equal(
      r.css(SELECTED_TAB, 'color'), strong,
      `the selected pill resolves to ${r.css(SELECTED_TAB, 'color')} rather than --strong `
      + `(${strong}) in ${theme}/${accent}. Body ink is what .ui-nav__tab.is-active already `
      + 'gives it and what the underline appearance uses; a third colour makes the two '
      + 'appearances disagree.',
    );
    assert.deepEqual(
      channels(r.css(SELECTED_TAB, 'backgroundColor')),
      channels(substitute('var(--glow-purple)', r.vars)),
      'the selected pill lost its accent fill. The fill is the one signal left after #475 — '
      + 'without it the selected tab is distinguished by nothing at all.',
    );
  });

  test(`the selected underline tab takes the same body ink — ${theme} / ${accent}`, () => {
    const r = tabRow('underline', theme, accent);
    assert.equal(
      r.css(SELECTED_TAB, 'color'), colour(r.vars.get('--strong')),
      `the selected underline tab is ${r.css(SELECTED_TAB, 'color')} in ${theme}/${accent}. `
      + 'Its accent signal is the rule under it; the ink is the half both appearances share.',
    );
  });
}

/* -- The mutation that kills the case above ---------------------------------- */

const PILL_INK = /(\.ui-nav--tabs\.is-pill \.ui-nav__tab\.is-active \{)/;

test('the selected-pill gate rejects the accent ink coming back', () => {
  const sheet = read('src/styles/nav.css');
  assert.match(
    sheet, PILL_INK,
    'the selected pill rule moved or was reworded, so this mutation re-adds the accent ink to '
    + 'nothing — move the mutation with the rule rather than deleting this test',
  );
  const r = tabRow('pill', 'dark', 'default', sheet.replace(PILL_INK, '$1 color: var(--accent);'));
  assert.equal(
    r.css(SELECTED_TAB, 'color'), colour(r.vars.get('--accent')),
    'the accent ink was put back on the selected pill and the resolver still reads --strong, '
    + 'so the gate above would pass with the regression in place and is measuring nothing',
  );
});
