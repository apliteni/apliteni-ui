/* Rule: the sidebar rail's repaired declarations must keep reaching the element
 * they are written for, and the current row's mark must be a step and not a name.
 *
 * Every defect gated here was a rule that looked right in the stylesheet and
 * never applied, so this file resolves the cascade instead of reading it:
 * base.css + nav.css with their var() references substituted, real sidebarNav()
 * markup mounted in a JSDOM, getComputedStyle read back. Gate 2 then composites
 * what it reads down the ancestor chain, because the last defect here was the
 * right token on the wrong ground — a name no assertion on the name could catch.
 *
 * What this file mounts is a rail standing on the page. The rail inside the page
 * shell stands on --surface and is measured in stories/apps/shell-states.test.js.
 *
 * Resolve the winning declarations before measuring the result.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { effectiveBackground, ratio } from './lib/contrast.js';

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

const ITEMS = {
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
};
const MARKUP = sidebarNav(ITEMS);
const MARKUP_FOLDED = sidebarNav({ ...ITEMS, collapsed: true });
// `active` names one row, so the top-level current row is its own mount.
const MARKUP_TOP = sidebarNav({ ...ITEMS, active: 'revenue' });

/** Mount the rail under one theme/accent and hand back a resolver.
 *  `extra` is appended last, which is how the mutation at the foot of gate 2
 *  re-paints one declaration and runs the gate's own predicate against it. */
function rail(theme = 'dark', accent = 'default', markup = MARKUP, extra = '') {
  const vars = tokensFor(theme, accent);
  const css = desugar(substitute(decomment(read('src/styles/base.css') + '\n' + read('src/styles/nav.css') + '\n' + extra), vars));
  const w = new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head>`
    + `<body>${markup}</body></html>`,
    { pretendToBeVisual: true },
  ).window;
  // Stand-in for ::before on every row, so a rule written for one resolves — and
  // so a row that no ::before rule reaches reads back as the static element it was
  // handed. The resolver check at the foot is what proves the stand-in is live.
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
    /** What is actually behind a row — its rail, its list, the page under both. */
    ground: (sel) => effectiveBackground(q(sel).parentElement, w),
    /** The colour a row's own fill reaches the eye as, in a state or at rest. */
    fill: (sel, state = null) => {
      const el = q(sel);
      if (state) el.setAttribute('data-ui-state', state);
      const value = effectiveBackground(el, w);
      el.removeAttribute('data-ui-state');
      return value;
    },
  };
}

const SUB = '.ui-nav__sub';
const ACTIVE = '.ui-nav__item.is-active';
const ACTIVE_SUB = '.ui-nav__item--sub.is-active';
const ACTIVE_TOP = '.ui-nav__item.is-active:not(.ui-nav__item--sub)';
const FOLDED_PLATE = '.ui-nav__item.is-active > [data-pseudo="before"]';
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

// ---- 2. the current row's plate is a step a reader can see --------------
//
// Artur settled #475 on "plate only": the 3px --accent bar that used to stand in
// the row's own left padding comes off, so the plate is the whole mark. The round
// after that found what "plate only" had actually shipped — inside appShell() the
// rail is --surface and so was the plate, 1.000:1, leaving a hairline as the only
// resting mark on the row the reader was on. A gate that read the plate's token
// could not see it: --surface IS the right token, on the wrong ground.
//
// So this measures the step instead of naming it. The row's own fill is
// composited down to whatever is behind it and read against that ground, for the
// current row and for a row under the pointer, in every theme the kit ships
// crossed with every accent it discovers. layout.css moves both marks a rung for
// a rail inside the shell; stories/apps/shell-states.test.js measures that ground.

/** Discovered, not listed: a fifth accent has to be measured before it can ship. */
const ACCENTS = ['default', ...new Set(
  [...read('src/tokens/accents.css').matchAll(/\[data-accent="([\w-]+)"\]/g)].map((m) => m[1]),
)];
const PLAIN = '.ui-nav__item:not(.is-active):not(.is-danger):not(.is-disabled)';

/* What ships for a rail standing on the page: the plate is --surface over --bg,
 * and a hovered row is half that same fill, so it lands between the page and the
 * plate by construction rather than by a number someone picked. Both are recorded
 * here, so a paint that moves either is reviewed in the commit that moves it. */
const ON_THE_PAGE = {
  dark: { plate: 1.186, hover: 1.077 },
  light: { plate: 1.110, hover: 1.054 },
};
const BAND = 0.01;
const r3 = (n) => n.toFixed(3);

/** The two readings this gate is made of, for one mounted rail. */
const steps = (r, sel) => ({
  plate: ratio(r.fill(sel), r.ground(sel)),
  hover: ratio(r.fill(PLAIN, 'hover'), r.ground(PLAIN)),
});

test('the current row is a plate with a measurable step, and the pointer stays quieter', () => {
  assert.ok(
    ACCENTS.length >= 4,
    `only ${ACCENTS.length} accent(s) came out of src/tokens/accents.css, and the kit ships `
    + 'four — the reader that finds them stopped finding them.',
  );
  const measured = new Map();
  for (const theme of ['dark', 'light']) {
    for (const accent of ACCENTS) {
      const nested = rail(theme, accent);
      const top = rail(theme, accent, MARKUP_TOP);
      // Asserted to BE top level, so this half cannot quietly re-measure a nested row.
      assert.ok(top.q(ACTIVE_TOP), 'the top-level mount has no top-level current row');
      const want = ON_THE_PAGE[theme];

      for (const [what, r, sel] of [['a top-level', top, ACTIVE], ['a nested', nested, ACTIVE_SUB]]) {
        const got = steps(r, sel);
        measured.set(`${theme}/${accent}/${what}`, got);

        assert.ok(
          Math.abs(got.plate - want.plate) <= BAND,
          `${theme}/${accent}: ${what} current row's plate is ${r3(got.plate)}:1 against the ground `
          + `it stands on and what ships is ${r3(want.plate)}:1. At 1.000:1 the plate is its own `
          + 'ground and the row has no resting mark at all, which is the defect #475 round two was '
          + 'opened on. Above the band the step improved: move the number here in the same commit.',
        );
        assert.ok(
          Math.abs(got.hover - want.hover) <= BAND,
          `${theme}/${accent}: a hovered row is ${r3(got.hover)}:1 against its ground and what ships `
          + `is ${r3(want.hover)}:1. The hover wash is half the plate's own fill; a value off this `
          + 'band means it is no longer derived from the plate.',
        );
        assert.ok(
          got.plate > got.hover,
          `${theme}/${accent}: ${what} current row is ${r3(got.plate)}:1 and a row under the pointer `
          + `is ${r3(got.hover)}:1, so the row the reader is pointing at outranks the row they are `
          + 'on. Selection is the louder of the two marks or it is not a selection mark.',
        );
        // JSDOM leaves a property no rule writes as the empty string, so "nothing
        // is drawn" is the empty value or the keyword, and anything else is paint.
        const unpainted = (value) => value === '' || value === 'none';
        assert.ok(
          unpainted(r.css(sel, 'boxShadow')),
          `${what} current row resolves box-shadow ${r.css(sel, 'boxShadow')} at rest in `
          + `${theme}/${accent}. Artur's r34: a selected row is a background highlight and an `
          + 'outline means focus — box-shadow on this row is the focus ring and nothing else.',
        );
        for (const [state, drawn] of [['at rest', r.css(sel, 'outlineStyle')], ['on hover', r.inState(PLAIN, 'hover', 'outlineStyle')]]) {
          assert.ok(
            unpainted(drawn),
            `a rail row draws an outline ${state} in ${theme}/${accent} (${drawn}). An outline on a `
            + 'rail row means focus and only focus.',
          );
        }
        assert.equal(
          r.css(`${sel} > [data-pseudo="before"]`, 'position'), 'static',
          `${what} current row still has a ::before reaching it on an OPEN rail. That is where the `
          + 'accent bar #475 removed was drawn; only a folded rail paints a pseudo now.',
        );
      }
    }
  }
  assert.deepEqual(
    [...measured.keys()].sort(),
    ['dark', 'light'].flatMap((theme) => ACCENTS.flatMap(
      (accent) => ['a top-level', 'a nested'].map((what) => `${theme}/${accent}/${what}`),
    )).sort(),
    `${measured.size} cells were measured against ${4 * ACCENTS.length} theme x accent x row cells`,
  );
});

// The failing mutation for the gate above: it runs the gate's own two readings
// against a sheet that re-paints one declaration, and refuses to pass. Without
// this, a band wide enough to admit a plate with no fill would measure nothing —
// which is exactly what the token-name assertion this replaced did.
test('the step gate rejects a plate with no fill, and a pointer that reaches the plate', () => {
  const defects = [
    ['a plate painted the ground it stands on', '.ui-nav--side .ui-nav__item.is-active { background: var(--bg); }'],
    ['a hovered row painted the plate itself', '.ui-nav--side .ui-nav__item:hover { background: var(--surface); }'],
  ];
  for (const [what, mutation] of defects) {
    for (const theme of ['dark', 'light']) {
      const r = rail(theme, 'default', MARKUP, mutation);
      const got = steps(r, ACTIVE_SUB);
      assert.ok(
        Math.abs(got.plate - ON_THE_PAGE[theme].plate) > BAND || got.plate <= got.hover,
        `${what} passes the gate above in ${theme}: plate ${r3(got.plate)}:1, hovered row `
        + `${r3(got.hover)}:1. The readings are not reaching the declaration they measure.`,
      );
    }
  }
});

// ---- 2b. a folded rail standing on the page answers the pointer ---------
//
// The round above folded the hover wash away at this width, on the grounds that
// a pointer is answered "by the ink and the name". The name is layout.css's
// floating chip, scoped to .ui-app__rail, and nav.css holds .ui-nav__label at
// opacity 0 here; the rule also went without the :not(.is-danger):not(.is-active)
// guard both copies in layout.css carry, so it took --glow-pink off the
// destructive row too. Nothing in the suite mounted a folded standalone rail and
// hovered it, so the head stayed green. This reads what a pointer gets: an
// ordinary row, the destructive row, and the plate they are measured against.

const DANGER = '.ui-nav__item.is-danger';

/* A folded rail stands on the same --bg and marks the same row one rung off it,
 * so its plate and its wash are the open width's own numbers; the destructive
 * row's --glow-pink is a signal colour and does not move with the accent. */
const FOLDED_ON_THE_PAGE = {
  dark: { plate: 1.186, hover: 1.077, danger: 1.251 },
  light: { plate: 1.110, hover: 1.054, danger: 1.165 },
};
/* Below this a "wash" is the ground with a different name. 1.000:1 is the defect
 * itself — background: none — and the quietest reading here is 1.054:1, so the
 * floor sits between the two and names which it caught. */
const WASH = 1.02;

/** The three readings a folded rail is made of, each against the ground it stands on. */
const folded = (r) => ({
  plate: ratio(r.fill(FOLDED_PLATE), r.ground(FOLDED_PLATE)),
  hover: ratio(r.fill(PLAIN, 'hover'), r.ground(PLAIN)),
  danger: ratio(r.fill(DANGER, 'hover'), r.ground(DANGER)),
});

test('a folded rail on the page answers a pointer on an ordinary row and on the destructive one', () => {
  const measured = new Map();
  for (const theme of ['dark', 'light']) {
    for (const accent of ACCENTS) {
      const r = rail(theme, accent, MARKUP_FOLDED);
      // Asserted to BE folded, and asserted on the declaration that makes this
      // gate matter: the collapsed block is what holds the name at opacity 0, so
      // a reading taken here is a reading taken where the pointer has no label.
      assert.equal(
        r.css('.ui-nav__label', 'opacity'), '0',
        'the folded mount still shows its labels — the collapsed block is not resolving, so every '
        + 'reading below is an open rail wearing a folded rail\'s name',
      );
      const got = folded(r);
      measured.set(`${theme}/${accent}`, got);
      const want = FOLDED_ON_THE_PAGE[theme];

      for (const [what, sel] of [['an ordinary row', PLAIN], ['the destructive row', DANGER]]) {
        const key = sel === PLAIN ? 'hover' : 'danger';
        assert.ok(
          got[key] > WASH,
          `${theme}/${accent}: a pointer on ${what} of a folded rail leaves it at ${r3(got[key])}:1 `
          + 'against the rail — no wash at all. A folded rail has no floating name chip to answer '
          + "the pointer with (.ui-nav__label is opacity 0 here), so the row's own fill is the "
          + 'answer. Check that nothing after .ui-nav__item:hover is painting background: none '
          + 'across this width.',
        );
        assert.ok(
          Math.abs(got[key] - want[key]) <= BAND,
          `${theme}/${accent}: ${what} reads ${r3(got[key])}:1 under the pointer and what ships is `
          + `${r3(want[key])}:1. An ordinary row takes half the plate's own fill and the `
          + 'destructive row takes --glow-pink, both as they do at the open width.',
        );
      }
      assert.ok(
        Math.abs(got.plate - want.plate) <= BAND,
        `${theme}/${accent}: the folded plate is ${r3(got.plate)}:1 against the ground the rail `
        + `stands on and what ships is ${r3(want.plate)}:1. The plate is one rung off that ground `
        + 'at both widths; two rungs down (--surface-3 on --bg) it reads 1.028:1 in light, under '
        + 'the wash of the row beside it.',
      );
      assert.ok(
        got.plate > got.hover,
        `${theme}/${accent}: the folded plate is ${r3(got.plate)}:1 and a row under the pointer is `
        + `${r3(got.hover)}:1, so the row being pointed at outranks the row the reader is on — the `
        + 'same inversion r34 settled at the open width.',
      );
    }
  }
  assert.deepEqual(
    [...measured.keys()].sort(),
    ['dark', 'light'].flatMap((theme) => ACCENTS.map((accent) => `${theme}/${accent}`)).sort(),
    `${measured.size} cells were measured against ${2 * ACCENTS.length} theme x accent cells`,
  );
});

// The failing mutation for the gate above. The first two are the shipped defect
// and the half-fix of it that only guards the destructive row; the third is the
// plate left two rungs off its ground, which passes every reading but the one
// that puts selection above hover.
test('the folded gate rejects a pointer answered with nothing, and a plate under its own hover', () => {
  const COLLAPSED = '.ui-nav--side.is-collapsed .ui-nav__item';
  const defects = [
    ['the wash folded away for every row', `${COLLAPSED}:hover { background: none; }`, ['dark', 'light']],
    ['the wash folded away for an ordinary row', `${COLLAPSED}:not(.is-danger):not(.is-active):hover { background: none; }`, ['dark', 'light']],
    // Two rungs off --bg is 1.028:1 in light, under the hovered row beside it; in
    // dark the same token is 1.375:1 and only the banded reading catches it.
    ['the plate painted two rungs off its ground', `${COLLAPSED}.is-active::before { background: var(--surface-3); }`, ['dark', 'light']],
  ];
  for (const [what, mutation, themes] of defects) {
    for (const theme of themes) {
      const r = rail(theme, 'default', MARKUP_FOLDED, mutation);
      const got = folded(r);
      const want = FOLDED_ON_THE_PAGE[theme];
      const refused = got.hover <= WASH || got.danger <= WASH
        || Math.abs(got.hover - want.hover) > BAND
        || Math.abs(got.danger - want.danger) > BAND
        || Math.abs(got.plate - want.plate) > BAND
        || got.plate <= got.hover;
      assert.ok(
        refused,
        `${what} passes the gate above in ${theme}: plate ${r3(got.plate)}:1, ordinary row `
        + `${r3(got.hover)}:1, destructive row ${r3(got.danger)}:1. The readings are not reaching `
        + 'the declaration they measure.',
      );
    }
  }
});

// ---- 3. the active nested row keeps its focus ring -----------------------

for (const [theme, accent] of THEMES) {
  test(`every focusable row shows the ring on :focus-visible — ${theme} / ${accent}`, () => {
    const r = rail(theme, accent);
    // Resolve the width and the colour before comparing the band the row draws. It is
    // an `outline` since #578, which is also the property the kit's hover edge and the
    // folded rail's hairline use — so a row that loses the band loses it to one of those.
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
        r.inState(sel, 'focus-visible', 'outline'), ring,
        `${what} (${sel}) shows no focus ring when keyboard-focused in ${theme}/${accent} — `
        + 'WCAG 2.4.7. A later rule of equal specificity is cancelling '
        + '.ui-nav__item.is-active:focus-visible; resolve the conflict, do not stack another override.',
      );
    }
  });
}

// ---- 4. the current row is told apart by more than its fill --------------
//
// Gate 2 holds the step; this holds the half of the pair that survives a reader
// who cannot see it. The plate is 1.19:1 at its strongest, so type is what the
// row keeps when the fill is below somebody's threshold.

for (const [theme, accent] of THEMES) {
  test(`the current row keeps stronger type than a hovered one — ${theme} / ${accent}`, () => {
    const r = rail(theme, accent);
    const hoverWeight = r.inState('.ui-nav__item:not(.is-active)', 'hover', 'fontWeight');

    assert.ok(
      Number(r.css('.ui-nav__item.is-active', 'fontWeight')) > Number(hoverWeight),
      `the current row loses its type distinction in ${theme}/${accent}: it is `
      + `${r.css('.ui-nav__item.is-active', 'fontWeight')} against a hovered row's ${hoverWeight}`,
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

  // The ::before stand-in resolves a real rule where the kit writes one, which is
  // the folded rail's plate. Gate 2 reads an OPEN rail's stand-in being left
  // alone, and an inert stand-in would report exactly that against any sheet.
  const folded = rail('dark', 'default', MARKUP_FOLDED);
  assert.equal(
    folded.css(FOLDED_PLATE, 'position'), 'absolute',
    'the ::before stand-in resolves nothing on a folded rail either — gate 2 is reading an '
    + 'element no rule can reach, so it would pass against a sheet that still drew the bar',
  );
  assert.equal(
    folded.css(FOLDED_PLATE, 'backgroundColor'), colour(folded.vars.get('--surface')),
    "the folded rail's plate is not --surface — the resolver is not reading the collapsed block",
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
 * that is in the file can still lose. Recorded in docs/components.md under
 * The selected tab spends one accent.
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
