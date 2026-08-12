/* Rule: the page shell reads the same at every width, in every theme, under
 * every accent — and nothing it draws goes missing at one of them.
 *
 * shell.test.js gates the shell's composition: what markup comes out. This file
 * gates what a reader can reach and see once that markup meets the stylesheet —
 * so every assertion here is resolved through the real cascade rather than
 * grepped off a declaration.
 *
 * Two things JSDOM cannot do, and how each is handled:
 *
 *   @media   JSDOM resolves no media block at all (src/styles/icon-size.test.js
 *            says the same about icon sizes), so the narrow-rail rules would be
 *            invisible to getComputedStyle. `narrow: true` lifts the 720px
 *            block's body out and appends it where a browser applies it — after
 *            every rule before it. That is what "the viewport is 375px" means to
 *            the cascade, and it is the only claim being made: no box is being
 *            laid out here.
 *
 *   layout   getBoundingClientRect is always zero, so "does this row fit" is not
 *            a question this file can ask. It asks the structural one instead —
 *            can the box that holds the rows scroll — and the measured answer
 *            lives in the lane report.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import {
  tokensFor, substitute, desugar, parseColour, ratio, effectiveBackground, composite,
} from '../lib/contrast.js';
import { appShell } from '../../src/components/shell.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

// The three sheets the shell's own rail is drawn by, in the order index.css
// imports them — layout.css last, which is what lets it override nav.css at
// equal weight.
const SHEETS = ['src/styles/base.css', 'src/styles/nav.css', 'src/styles/layout.css'];
const FOLD = '@media (max-width: 720px)';

/** One at-rule's body, brace-matched — the regex the other resolvers use cannot nest. */
function unwrap(css, query) {
  const at = css.indexOf(query);
  if (at < 0) return null;
  const open = css.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') { depth -= 1; if (depth === 0) return css.slice(open + 1, i); }
  }
  return null;
}

const SHELL = appShell({
  word: 'Finance',
  nav: [
    { id: 'dashboard', icon: 'chart', label: 'Dashboard' },
    { id: 'payouts', icon: 'card', label: 'Payouts' },
  ],
  active: 'payouts',
  navLabel: 'Finance',
  crumbs: [{ label: 'Finance', href: '#' }, { label: 'Payouts' }],
  title: 'Payouts',
  sub: 'Company cashflow at a glance.',
  account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' },
  signOutHref: '#logout',
});

// A grouped nav with the reader standing on a child of the group — the shape
// the folded rail used to lose entirely.
const GROUPED = appShell({
  nav: [
    { id: 'dashboard', icon: 'chart', label: 'Dashboard' },
    { icon: 'card', label: 'Payouts', items: [{ id: 'pending', icon: 'clock', label: 'Pending' }] },
  ],
  active: 'pending',
  signOutHref: '#logout',
});

function mount(html, { theme = 'dark', accent = 'default', narrow = false } = {}) {
  const vars = tokensFor(theme, accent);
  let raw = decomment(SHEETS.map(read).join('\n'));
  if (narrow) {
    const body = unwrap(raw, FOLD);
    assert.ok(body, `layout.css no longer folds at ${FOLD} — this gate is measuring nothing`);
    raw += `\n${body}`;
  }
  const css = desugar(substitute(raw, vars));
  const win = new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head>`
    + `<body>${html}</body></html>`,
    { pretendToBeVisual: true },
  ).window;
  const doc = win.document;
  const q = (sel) => {
    const el = doc.querySelector(sel);
    assert.ok(el, `the shell has no ${sel} — the fixture stopped exercising the rule under test`);
    return el;
  };
  return {
    vars,
    doc,
    q,
    css: (sel, prop) => win.getComputedStyle(q(sel))[prop],
    of: (el, prop) => win.getComputedStyle(el)[prop],
    inState: (sel, state, prop) => {
      const el = q(sel);
      el.setAttribute('data-ui-state', state);
      const value = win.getComputedStyle(el)[prop];
      el.removeAttribute('data-ui-state');
      return value;
    },
    /** The colour actually composited beneath an element. */
    bg: (sel) => effectiveBackground(q(sel), win),
    /** Is this node on screen — or does something above it say display:none? */
    shown: (el) => {
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        if (n.hasAttribute('hidden')) return false;
        const cs = win.getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      }
      return true;
    },
    /** A stroked glyph's ratio against what it is painted on, opacity included. */
    glyph: (sel) => {
      const svg = q(sel);
      const cs = win.getComputedStyle(svg);
      const ink = parseColour(cs.stroke === 'currentcolor' || !cs.stroke ? cs.color : cs.stroke)
        || parseColour(win.getComputedStyle(svg.closest('.ui-nav__item')).color);
      const under = effectiveBackground(svg.closest('.ui-nav__item'), win);
      const alpha = Number.parseFloat(cs.opacity);
      return {
        stroke: cs.stroke,
        opacity: Number.isFinite(alpha) ? alpha : 1,
        ratio: ratio(composite([...ink.slice(0, 3), Number.isFinite(alpha) ? alpha : 1], under), under),
      };
    },
  };
}

const r2 = (n) => Math.round(n * 100) / 100;

// ---- A1. a grouped nav is reachable at every width -----------------------
//
// The DoD item this lane exists to clear reads "navigation stays reachable at
// every viewport width the kit claims to support". A group's children were in
// a `display: none` list in the folded rail and nothing brought them back, so
// the toggle button announced aria-expanded="true" over a list that was not
// there and the row carrying aria-current="page" — the page the reader is
// standing on — could be neither seen nor focused.

test('every entry in the rail is on screen in the folded rail', () => {
  const at = mount(GROUPED, { narrow: true });
  const rows = [...at.doc.querySelectorAll('.ui-app__rail .ui-nav__item')];
  assert.ok(rows.length >= 4, 'the fixture stopped carrying a group, a leaf and a footer row');
  const missing = rows.filter((row) => !at.shown(row)).map((row) => row.getAttribute('aria-label'));
  assert.deepEqual(
    missing, [],
    `${missing.length} of ${rows.length} navigation rows are display:none below 720px, so a `
    + 'reader on a phone cannot see or focus them. The rail folds the label out of view; it '
    + 'must not fold a whole entry out of existence.',
  );
});

test('the row the reader is standing on is one of them', () => {
  const at = mount(GROUPED, { narrow: true });
  const current = at.doc.querySelector('[aria-current="page"]');
  assert.ok(current, 'the fixture stopped marking a current page');
  assert.equal(
    at.shown(current), true,
    'the current page\'s own rail row is hidden at 375px — the one row a reader most needs '
    + 'to see is the one the fold removes',
  );
});

test('an open group is not announced open over a list that is not drawn', () => {
  const at = mount(GROUPED, { narrow: true });
  const toggle = at.q('.ui-nav__toggle');
  const list = at.doc.getElementById(toggle.getAttribute('aria-controls'));
  assert.ok(list, 'the toggle points at no list');
  assert.equal(
    toggle.getAttribute('aria-expanded') === 'true', at.shown(list),
    `the toggle says aria-expanded="${toggle.getAttribute('aria-expanded')}" and the list it `
    + 'controls disagrees. wireNav() toggles the `hidden` attribute only, so a CSS rule that '
    + 'hides the list as well makes the button announce a state it cannot reach.',
  );
});

test('the group still opens and closes at that width — the attribute is what decides', () => {
  const at = mount(GROUPED, { narrow: true });
  const list = at.q('.ui-nav__sub');
  assert.equal(at.shown(list), true);
  list.setAttribute('hidden', '');
  assert.equal(
    at.shown(list), false,
    'the nested list ignores its own `hidden` attribute, so wireNav()\'s toggle does nothing '
    + 'at this width in the other direction either',
  );
});

test('the labels-visible rail is unchanged', () => {
  const at = mount(GROUPED);
  assert.equal(at.shown(at.q('[aria-current="page"]')), true);
  assert.equal(at.css('.ui-nav__label', 'display'), 'inline', 'a wide rail lost its labels');
});

// ---- A2. the rail can reach its own bottom -------------------------------
//
// The rail is pinned for the whole scroll of .ui-app at a height locked to the
// viewport, so a row past that height paints below the fold and document
// scrolling never brings it up. .ui-nav__foot { margin-top: auto } puts sign
// out last, so sign out is the first thing a short viewport costs.

test('the rail is a fixed-height box, so it has to be able to scroll', () => {
  const at = mount(SHELL);
  assert.notEqual(
    at.css('.ui-app__rail', 'height'), 'auto',
    'premise: the rail is no longer height-locked to the viewport, so this gate is asking '
    + 'the wrong question — re-derive it',
  );
  assert.match(
    at.css('.ui-app__rail', 'position'), /sticky/,
    'premise: the rail no longer sticks, so document scrolling could reach its bottom',
  );
  assert.ok(
    ['auto', 'scroll'].includes(at.css('.ui-app__rail', 'overflowY')),
    `the rail is overflow-y: ${at.css('.ui-app__rail', 'overflowY')} at a height it cannot `
    + 'grow past. At 375x667 that ceiling is about twelve entries, and about five at the 200% '
    + 'zoom WCAG 1.4.4 requires — sign out goes first.',
  );
});

test('the nav inside the rail keeps its own height, so the rail is what scrolls', () => {
  const at = mount(SHELL);
  assert.match(
    at.css('.ui-app__rail .ui-nav--side', 'flex'), /1 1 auto/,
    'premise: the rail nav stopped growing to fill the rail',
  );
  assert.notEqual(
    at.css('.ui-app__rail .ui-nav--side', 'minHeight'), '0px',
    'a flex item floored at 0 shrinks instead of overflowing, so the rows past the fold end '
    + 'up painting over the reader block inside a rail that has nothing to scroll',
  );
});

// overflow clips at the padding box, so a spread-only box-shadow survives
// exactly as far as the scroll container's own padding.
test('the rail\'s scroll box has room for a focus ring at every edge', () => {
  const spread = /0\s+0\s+0\s+(\d+(?:\.\d+)?)px/.exec(tokensFor('dark').get('--ring'));
  assert.ok(spread, '--ring is no longer a spread-only shadow — re-derive what clips it');
  const need = Number(spread[1]);
  for (const narrow of [false, true]) {
    const at = mount(SHELL, { narrow });
    for (const side of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) {
      const got = Number.parseFloat(at.css('.ui-app__rail', side));
      assert.ok(
        got >= need,
        `the ${narrow ? 'folded' : 'wide'} rail has ${got}px of ${side} against a ${need}px `
        + 'focus ring. overflow clips at the padding box, so the ring on the row nearest that '
        + 'edge is cut off and a keyboard reader loses the only thing telling them where they are.',
      );
    }
  }
});

// ---- C1. the rail is a surface in both themes ----------------------------

test('the rail reads as its own surface against the page, in both themes', () => {
  for (const theme of ['dark', 'light']) {
    const at = mount(SHELL, { theme });
    const got = ratio(at.bg('.ui-app__rail'), at.bg('.ui-app'));
    assert.ok(
      got >= 1.04,
      `the rail is ${r2(got)}:1 against the page in ${theme}. --bg-elevated resolves to --bg `
      + 'itself in light, an exact no-op, which left a 1px border as the whole of the rail.',
    );
  }
});

test('a hovered rail row is still a step above the rail it sits in', () => {
  for (const theme of ['dark', 'light']) {
    const at = mount(SHELL, { theme });
    const hover = parseColour(at.inState('.ui-app__rail .ui-nav__item:not(.is-active)', 'hover', 'backgroundColor'));
    const rail = at.bg('.ui-app__rail');
    assert.ok(hover && hover[3] > 0, `a hovered rail row paints no background in ${theme}`);
    const got = ratio(composite(hover, rail), rail);
    assert.ok(
      got > 1.02,
      `hover is ${r2(got)}:1 against the rail in ${theme} — the rail took the surface its own `
      + 'hover was using, so hovering a row now does nothing visible',
    );
  }
});

// ---- C2. the active row is the brightest by construction -----------------

test('the active glyph is the brightest in the rail, whatever the accent is', () => {
  for (const theme of ['dark', 'light']) {
    for (const accent of ['default', 'phoenix', 'ocean', 'emerald']) {
      const at = mount(SHELL, { theme, accent });
      const on = at.glyph('.ui-nav__item.is-active .ui-nav__ic svg');
      const off = at.glyph('.ui-nav__item:not(.is-active):not(.is-danger) .ui-nav__ic svg');
      assert.ok(
        on.ratio > off.ratio,
        `${theme}/${accent}: the active glyph is ${r2(on.ratio)}:1 and a resting one is `
        + `${r2(off.ratio)}:1, so the row that should shout has less presence than the rows `
        + 'that should whisper. Painting it in --accent makes which row wins depend on which '
        + 'accent is loaded — and the accents are not this lane\'s to hold still.',
      );
    }
  }
});

test('the active glyph takes no colour from the accent at all', () => {
  const strokes = new Set();
  for (const accent of ['default', 'phoenix', 'ocean', 'emerald']) {
    const at = mount(SHELL, { theme: 'dark', accent });
    strokes.add(at.glyph('.ui-nav__item.is-active .ui-nav__ic svg').stroke);
  }
  assert.equal(
    strokes.size, 1,
    `the active glyph is stroked ${[...strokes].join(', ')} across the four accents. The bar `
    + 'beside the row is what carries the hue; the glyph is a structural signal.',
  );
});

test('a resting glyph is dimmer but still legible on its own', () => {
  for (const theme of ['dark', 'light']) {
    const at = mount(SHELL, { theme });
    const off = at.glyph('.ui-nav__item:not(.is-active):not(.is-danger) .ui-nav__ic svg');
    assert.ok(
      off.ratio >= 4.5,
      `a resting glyph is ${r2(off.ratio)}:1 against the rail in ${theme}. Below 720px the `
      + 'glyph is the whole of the row on screen, so dropping it a step cannot drop it out of '
      + 'reach — WCAG 1.4.11 asks 3:1 of it and the kit holds text-grade.',
    );
  }
});

// ---- C3. one rule at the bottom of the rail ------------------------------

// A width with no style paints nothing, and JSDOM hands back the initial
// `medium` for a border nobody declared — so the style is what says "hairline".
test('the bottom of the rail draws one rule, not two twenty pixels apart', () => {
  const at = mount(SHELL);
  const ruled = ['.ui-nav__foot', '.ui-app__user'].filter((sel) =>
    !['none', 'hidden', ''].includes(at.css(sel, 'borderTopStyle'))
    && Number.parseFloat(at.css(sel, 'borderTopWidth')) > 0);
  assert.deepEqual(
    ruled.length, 1,
    `${ruled.length} hairlines close the rail (${ruled.join(' + ') || 'none'}). Two of them `
    + 'twenty pixels apart box sign out into a compartment of its own, which reads as a third '
    + 'region of the rail rather than as the last row of the nav.',
  );
});

test('sign out rests in the rail\'s own ink and turns --pink on the way to being clicked', () => {
  const at = mount(SHELL);
  const text = at.css('.ui-nav__item:not(.is-active):not(.is-danger)', 'color');
  assert.equal(
    at.css('.ui-nav__item.is-danger', 'color'), text,
    'sign out is the quietest thing in the rail while also being the most fenced-off. It is a '
    + 'navigation row: it rests like one, and the danger intent belongs on hover.',
  );
  assert.equal(
    at.inState('.ui-nav__item.is-danger', 'hover', 'color'),
    at.vars.get('--pink').trim().replace(/^#(\w\w)(\w\w)(\w\w)$/, (m, r, g, b) =>
      `rgb(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`),
    'raising the resting ink swallowed the hover step — the two-step is the whole point',
  );
});

// ---- C4. three ranks, not one block --------------------------------------

test('the crumb sits further from the title than the title sits from its subtitle', () => {
  const at = mount(SHELL);
  const crumb = Number.parseFloat(at.css('.ui-app__main .ui-nav--crumbs', 'marginBottom'));
  const title = Number.parseFloat(at.css('.ui-app__main h1', 'marginBottom'));
  assert.ok(
    crumb >= title * 2,
    `the crumb is ${crumb}px from the title and the title is ${title}px from its subtitle, so `
    + 'three ranks read as one block. The eye should find the crumb, then the title block.',
  );
});

test('the crumb is set smaller than the subtitle it is not part of', () => {
  const at = mount(SHELL);
  const crumb = Number.parseFloat(at.css('.ui-nav__crumb', 'fontSize'));
  const sub = Number.parseFloat(at.css('.ui-app__sub', 'fontSize'));
  assert.ok(
    crumb < sub,
    `page context is set at ${crumb}px against ${sub}px of page content, so it never recedes`,
  );
});

// ---- C5. the reading column centres --------------------------------------

// Read as the logical shorthand: JSDOM does not expand margin-inline into the
// physical pair, so asking for marginLeft here reports 0 either way. What the
// browser does with it is measured in the lane report, not here.
test('the reading column centres in the track it is given', () => {
  const at = mount(SHELL);
  assert.equal(
    at.css('.ui-app__main', 'marginInline'), 'auto',
    'a max-width inside a 1fr track with no margin hugs the rail — measured at 1728px wide, '
    + '519px of dead background on the right and none on the left',
  );
  // Learned the hard way: an auto inline margin takes a grid item out of
  // stretch, and Chrome then lays the column out at its max-content width. The
  // payout ledger's max-content is 845px, so a 375px phone gained 529px of
  // sideways scroll — the one thing the shell exists to prevent.
  assert.equal(
    at.css('.ui-app__main', 'width'), '100%',
    'the auto margins have nothing holding the column to its track, so the reading column '
    + 'sizes itself from its widest content and pushes the whole page sideways',
  );
});

// ---- E. the demo set agrees with itself ---------------------------------
//
// Empty states drew its screens with the topbar on and the finance report drew
// the same product, the same nav and the same rail with it off. Nothing tells
// you which is the kit's shape until you flip between two stories.

test('every example screen built on appShell() makes the same call about the topbar', async () => {
  const files = ['Access', 'EmptyStates', 'FinanceReport', 'Preferences'];
  const seen = [];
  for (const file of files) {
    const mod = await import(`./${file}.stories.js`);
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || typeof story?.render !== 'function') continue;
      const out = story.render();
      if (!out.includes('class="ui-app"')) continue;
      seen.push([`${file}.${name}`, out.includes('<header class="topbar"')]);
    }
  }
  assert.ok(seen.length >= 4, 'the fixture stopped finding the appShell() example screens');
  const split = new Set(seen.map(([, on]) => on));
  assert.equal(
    split.size, 1,
    'the example screens disagree about the topbar: '
    + seen.map(([n, on]) => `${n} ${on ? 'on' : 'off'}`).join(', ')
    + '. accountShell() keeps its topbar because dropping it would take the theme toggle and '
    + 'the account menu off every consuming /account page — but appShell() ships with none, '
    + 'and a demo set that shows both without saying why teaches neither.',
  );
});

// ---- C7. the reader block agrees with itself -----------------------------

test('the reader block is announced once, and by the same block that is on screen', () => {
  const at = mount(SHELL, { narrow: true });
  const av = at.q('.ui-app__av');
  assert.equal(at.shown(av), true, 'premise: the initials are what stays on screen at 375px');
  assert.notEqual(
    av.getAttribute('aria-hidden'), 'true',
    'the initials are on screen below 720px and .ui-app__who — the only named half of the '
    + 'pair — is display:none there, so the accessibility tree holds nothing at all while a '
    + 'divider is drawn around something',
  );
  const name = av.getAttribute('aria-label') || '';
  assert.match(name, /Ada Lovelace/, 'the block on screen does not say who is signed in');
  assert.match(name, /ada@apliteni\.com/);
  assert.equal(
    at.q('.ui-app__who').getAttribute('aria-hidden'), 'true',
    'the name is now in the tree twice — once on the block, once in its own text',
  );
});
