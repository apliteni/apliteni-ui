/* Rule: the page shell reads the same at every width, in every theme, under
 * every accent — and nothing it draws goes missing at one of them.
 *
 * shell.test.js gates what markup comes out; this file gates what a reader can
 * reach once that markup meets the stylesheet, resolved through the real cascade
 * rather than grepped off a declaration.
 *
 * Two things JSDOM cannot do. It resolves no @media, so `narrow: true` lifts the
 * 720px block's body out and appends it where a browser applies it — that is all
 * "the viewport is 375px" means here, and no box is being laid out. And
 * getBoundingClientRect is always zero, so "does this row fit" is not a question
 * this file can ask; it asks whether the box that holds the rows can scroll.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import {
  tokensFor, substitute, desugar, parseColour, ratio, effectiveBackground, composite,
} from '../lib/contrast.js';
// The motion sweep's own reader: it keeps `!important` and the chain of at-rules
// around a rule, which is what the fold's travel is judged on below. Aliased
// because this file has a leafRules() of its own, on a different shape.
import { leafRules as motionRules, inNet, ms } from '../lib/motion-css.js';
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

// One rail drawn open and folded by the reader, with every block the rail has:
// the brand, a group holding the current page, sign out and the reader.
const PAIR = (collapsed) => appShell({
  word: 'Finance',
  nav: [
    { id: 'dashboard', icon: 'chart', label: 'Dashboard' },
    { icon: 'card', label: 'Payouts', items: [{ id: 'pending', icon: 'clock', label: 'Pending', badge: 3 }] },
  ],
  active: 'pending',
  account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' },
  signOutHref: '#logout',
  collapsible: true,
  collapsed,
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
  // The nav's own rows. The fold toggle is a rail row's skin on a control that
  // is not a place to go, and the strip is the only layout at this width, so it
  // is drawn nowhere here — see the 720px block.
  const rows = [...at.doc.querySelectorAll('.ui-app__rail .ui-nav__item:not(.ui-app__fold)')];
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

// ---- A1c. the reader's fold is the narrow fold (#277) ---------------------
//
// The reader folds the rail to the strip the viewport folds it to below 720px.
// A media query cannot share a block with a class, so the fold is written twice
// in layout.css, and two copies drift. Two gates stop them: the blocks compared
// rule for rule as text, which sees pseudo-elements, and every element of the
// rail resolved both ways, at rest and focused, which sees the cascade. The
// toggle is left out — it is meant to differ, drawn in one and gone in the other.

/** Split a selector list on its top-level commas. `:is(:hover, :focus-visible)`
 *  carries one of its own, and splitting on it made two selectors out of one and
 *  compared neither. */
const selectors = (list) => {
  const out = [];
  let buf = '';
  let depth = 0;
  for (const ch of list) {
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) { out.push(buf); buf = ''; continue; }
    buf += ch;
  }
  out.push(buf);
  return out.map((x) => x.trim().replace(/\s+/g, ' ')).filter(Boolean);
};

/** Every leaf rule of a sheet, each carrying the at-rules it is nested inside —
 *  brace-matched, so a rule inside @supports is read and is not mistaken for a
 *  second copy of the same selector outside it. */
function leafRules(css) {
  const out = [];
  const at = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const close = css.indexOf('}', i);
    if (close >= 0 && close < open) { at.pop(); i = close + 1; continue; }
    const head = css.slice(i, open).trim().replace(/\s+/g, ' ');
    const body = css.slice(open + 1);
    if (head.startsWith('@')) { at.push(head); i = open + 1; continue; }
    const end = css.indexOf('}', open);
    out.push({ at: at.join(' '), head, decls: css.slice(open + 1, end) });
    i = end + 1;
  }
  return out;
}

/** selector → its declarations, one entry per selector of a list, whitespace
 *  folded. A selector is keyed by the at-rules around it as well, so the same
 *  one may be written once outside @supports and once inside. A selector written
 *  twice in one context is reported rather than overwritten, since the second
 *  copy is exactly where a drift would hide. */
function ruleMap(css, keep) {
  const out = new Map();
  const twice = [];
  for (const rule of leafRules(css)) {
    const decls = rule.decls.split(';').map((d) => d.trim().replace(/\s+/g, ' ')).filter(Boolean).sort().join('; ');
    for (const one of selectors(rule.head)) {
      if (!keep(one)) continue;
      const key = rule.at ? `${rule.at} { ${one}` : one;
      if (out.has(key)) twice.push(key);
      out.set(key, decls);
    }
  }
  assert.deepEqual(twice, [], 'a fold writes one selector twice, so comparing the last copy says nothing about the first');
  return out;
}

/**
 * The one declaration the two folds are meant NOT to share, named here rather
 * than left to look like drift. Below 720px a finger is the only pointer the
 * strip has and a row is held to 44px; the reader's fold cannot take the same
 * floor, because a row is 35.4px open and growing it on the press would step
 * every glyph below it down the rail. Two gates under this one hold both halves:
 * the line is really in the narrow block, and it is really not in the other.
 *
 * An exclusion on its own would be a hole. This is the same shape as the fold
 * toggle, which is left out of both gates because it is drawn in one fold and
 * gone in the other — except that a value, unlike a control, can fall silently,
 * so the floor it names is measured rather than trusted.
 */
const PHONE_ONLY = { selector: '.ui-app__rail .ui-nav__item', prop: 'min-height', floor: 44 };

/** `map` without the phone strip's own declaration, and without a rule left empty by it. */
function withoutPhoneFloor(map) {
  const decls = map.get(PHONE_ONLY.selector);
  if (decls == null) return map;
  const kept = decls.split('; ').filter((d) => !d.startsWith(`${PHONE_ONLY.prop}:`));
  if (kept.length) map.set(PHONE_ONLY.selector, kept.join('; '));
  else map.delete(PHONE_ONLY.selector);
  return map;
}

test('the collapsed rail is the narrow rail, rule for rule', () => {
  const css = decomment(read('src/styles/layout.css'));
  const narrow = withoutPhoneFloor(ruleMap(unwrap(css, FOLD), (sel) => !sel.startsWith('.ui-app__main') && !sel.includes('.ui-app__fold')));
  const collapsed = new Map([...ruleMap(css, (sel) => sel.includes('.is-collapsed') && !sel.includes('.ui-app__fold'))]
    .map(([sel, decls]) => [sel.replace(/:where\(\.ui-app\.is-collapsed\)\s*/g, '').replace('.ui-app.is-collapsed', '.ui-app'), decls]));
  // A floor, not a count: it catches a sweep that has stopped finding the block,
  // and it sits under the real number so adding or removing one rule does not
  // have to be re-typed here. The fold is short on purpose now — it closes a box
  // over a column instead of laying every row out a second way.
  assert.ok(narrow.size >= 12, `only ${narrow.size} rules read out of the 720px fold — this gate compares nothing`);
  assert.deepEqual(
    Object.fromEntries(collapsed), Object.fromEntries(narrow),
    'the reader\'s fold and the narrow fold have drifted apart. Each rule under '
    + ':where(.ui-app.is-collapsed) in layout.css has a twin in the 720px block — change both.',
  );
});

test('the phone strip holds a row to the touch floor, and the reader\'s fold does not', () => {
  const { selector, prop, floor } = PHONE_ONLY;
  const row = (at) => Number.parseFloat(at.css(selector, prop)) || 0;

  const narrow = row(mount(PAIR(false), { narrow: true }));
  assert.ok(
    narrow >= floor,
    `a rail row resolves to ${prop}: ${narrow}px below 720px, under the ${floor}px touch floor. The `
    + 'strip is the whole of the rail at that width and a finger is the only pointer it has, so a row '
    + `is ${floor}px there (WCAG 2.5.5). Restore it in the 720px block of layout.css.`,
  );

  const folded = row(mount(PAIR(true)));
  assert.equal(
    folded, 0,
    `the reader's fold now sets ${prop}: ${folded}px on a rail row. A row is 35.4px open, so a floor `
    + 'that applies on the press grows every row and steps every glyph below it down the rail — the '
    + 'one thing the travel promises not to do. The floor belongs to the 720px block alone.',
  );
});

const nameOf = (el) => `${el.tagName.toLowerCase()}${[...el.classList].map((c) => `.${c}`).join('')}`
  + (el.getAttribute('aria-label') ? ` "${el.getAttribute('aria-label')}"` : '');
const railOf = (at) => [at.q('.ui-app'), ...at.doc.querySelectorAll('.ui-app__rail, .ui-app__rail *')]
  .filter((el) => !el.closest('.ui-app__fold-row'));

test('the collapsed rail is the narrow rail, element for element', () => {
  const diffs = [];
  for (const theme of ['dark', 'light']) {
    const narrow = mount(PAIR(false), { theme, narrow: true });
    const folded = mount(PAIR(true), { theme });
    const a = railOf(narrow);
    const b = railOf(folded);
    assert.equal(a.length, b.length, 'the two fixtures stopped drawing the same rail');
    assert.ok(a.length > 20, `only ${a.length} rail elements compared — the fixture lost its blocks`);
    const compare = (pairs, state) => {
      for (const [x, y] of pairs) {
        const cx = narrow.doc.defaultView.getComputedStyle(x);
        const cy = folded.doc.defaultView.getComputedStyle(y);
        for (const p of new Set([...Array.from(cx), ...Array.from(cy)])) {
          // The phone strip's touch floor — see PHONE_ONLY. Held apart there.
          if (p === PHONE_ONLY.prop && x.matches('.ui-nav__item')) continue;
          const vx = cx.getPropertyValue(p);
          const vy = cy.getPropertyValue(p);
          if (vx !== vy) diffs.push(`${theme}${state} ${nameOf(x)} ${p}: narrow "${vx}", collapsed "${vy}"`);
        }
      }
    };
    compare(a.map((x, i) => [x, b[i]]), '');
    a.forEach((row, i) => {
      if (!row.matches('.ui-nav__item')) return;
      row.setAttribute('data-ui-state', 'focus-visible');
      b[i].setAttribute('data-ui-state', 'focus-visible');
      const inside = [row, ...row.querySelectorAll('*')];
      const twin = [b[i], ...b[i].querySelectorAll('*')];
      compare(inside.map((x, j) => [x, twin[j]]), ` focused ${nameOf(row)} →`);
      row.removeAttribute('data-ui-state');
      b[i].removeAttribute('data-ui-state');
    });
  }
  assert.deepEqual(diffs, [], 'the two folds resolve differently, although their rules read alike');
});

test('every entry in the collapsed rail is drawn, the current page among them', () => {
  const at = mount(PAIR(true));
  const rows = [...at.doc.querySelectorAll('.ui-app__rail .ui-nav__item')];
  assert.ok(rows.length >= 5, 'the fixture stopped carrying a leaf, a group, its child, sign out and the toggle');
  const missing = rows.filter((row) => !at.shown(row)).map((row) => row.getAttribute('aria-label'));
  assert.deepEqual(missing, [], `${missing.length} rows are display:none in the collapsed rail, so the keyboard cannot reach them`);
  assert.equal(at.shown(at.q('[aria-current="page"]')), true, 'the fold hid the row of the page the reader is on');
});

// ---- A1a. the fold travels, and nothing inside it is laid out again -------
//
// The reference folds a 248px column to 64px by clipping it, so every glyph is
// where it was and only the width is on a clock. The kit does the same, and the
// strip it closes to is not a number somebody liked: it is twice a row's own
// glyph centre, which is the only width that leaves the glyph in the middle of
// the closed rail. These two gates hold that arithmetic to the rules it is read
// off, because a strip that drifts from it moves every glyph sideways on the
// press and nothing else would say so.

/** The first `prop` a selector sets in a sheet, as a number of px. */
function pxOf(file, selector, prop) {
  const css = decomment(read(file));
  for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!sel.split(',').map((x) => x.trim().replace(/\s+/g, ' ')).includes(selector)) continue;
    const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]+)`).exec(body);
    if (!m) continue;
    const n = /(-?[\d.]+)px/.exec(m[1].trim().split(/\s+/).at(prop === 'padding' ? -1 : 0));
    if (n) return Number(n[1]);
  }
  return null;
}

test('the strip is twice the glyph column, so the fold moves no glyph sideways', () => {
  const strip = pxOf('src/styles/nav.css', '.ui-nav--side', '--ui-nav-strip');
  const pad = pxOf('src/styles/nav.css', '.ui-nav__item', 'padding');
  const glyph = pxOf('src/styles/nav.css', '.ui-nav__ic svg', 'width');
  assert.ok(strip && pad && glyph, `read strip=${strip} pad=${pad} glyph=${glyph} — one of the three rules has moved and this gate is measuring nothing`);
  assert.equal(
    strip, 2 * (pad + glyph / 2),
    `the strip is ${strip}px and the glyph's centre is ${pad + glyph / 2}px from the row's edge, so the fold `
    + 'lands the glyph off the middle of the rail and every glyph steps sideways on the press. The strip is '
    + 'twice the centre, or it is a second geometry.',
  );
});

test('a row with no glyph puts its dot on that same column', () => {
  const css = decomment(read('src/styles/nav.css'));
  const dot = /:not\(:has\(\.ui-nav__ic\)\)::after\s*\{([^{}]*)\}/.exec(css);
  assert.ok(dot, 'nav.css draws no dot for an icon-less rail row — this gate is measuring nothing');
  const num = (prop) => Number(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?[\\d.]+)px`).exec(dot[1])?.[1]);
  const pad = pxOf('src/styles/nav.css', '.ui-nav__item', 'padding');
  const glyph = pxOf('src/styles/nav.css', '.ui-nav__ic svg', 'width');
  assert.equal(
    num('left') + num('width') / 2, pad + glyph / 2,
    'the dot sits off the column the glyphs beside it stand on, so an icon-less row is a mark in the wrong place '
    + 'rather than a row of the same rail',
  );
});

// ---- A1c. a folded row's name arrives beside it ---------------------------
//
// The reference draws a tooltip on hover AND on keyboard focus; `title` only
// ever had the first half. The label itself becomes the chip, so the words on
// screen and the words in the accessibility tree are one string. The rail is a
// scroll box and clips across as well as down, so the chip has to leave it:
// that is what `position: fixed` is doing, and the anchor block above puts it
// against the rail's edge and pins it to the row. Resolved here through the
// cascade in both states; that it lands beside the row after a scroll and a
// resize is a browser question, answered in the PR.

const CHIP_STATES = [['hover', 'a pointer resting on the glyph'], ['focus-visible', 'the keyboard reaching it']];

for (const [state, who] of CHIP_STATES) {
  test(`a folded row gives its name back to ${who}`, () => {
    for (const at of [mount(PAIR(true)), mount(PAIR(false), { narrow: true })]) {
      const row = at.doc.querySelector('.ui-app__rail .ui-nav__item[aria-label]');
      row.setAttribute('data-ui-state', state);
      const label = row.querySelector('.ui-nav__label');
      const cs = at.of(label, 'position');
      assert.equal(cs, 'fixed', `the name stays inside the rail's own clip under ${state}, where nothing can see it`);
      assert.equal(at.of(label, 'opacity'), '1', `the name is still faded out under ${state}`);
      row.removeAttribute('data-ui-state');
      assert.equal(at.of(label, 'opacity'), '0', 'a folded row shows its label with nothing pointing at it');
    }
  });
}

// The cascade above says the chip leaves the flow; it cannot say where it lands,
// because JSDOM resolves no anchor positioning. This reads the two branches as
// text instead, and holds each to the job the browser measurement in the PR
// checked it doing: without anchor positioning the chip is placed from the
// rail's own width, which is right until the rail scrolls; with it, both ends
// are pinned to the row and the near edge to the rail, which is what survives a
// scroll and a resize. Both copies of the fold are read, so neither can lose
// its anchored branch quietly.

const ANCHORED = '@supports (anchor-name: --a) and (anchor-scope: --a)';
const CHIP = '.ui-nav__item:is(:hover, :focus-visible) > .ui-nav__label';

/** The chip rule of one fold, plain and anchored, keyed by the at-rules around it. */
function chipRules(css) {
  const out = { plain: null, anchored: null };
  for (const rule of leafRules(css)) {
    if (!selectors(rule.head).some((one) => one.endsWith(CHIP))) continue;
    const decls = Object.fromEntries(rule.decls.split(';').map((d) => d.trim()).filter(Boolean)
      .map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()]));
    out[rule.at.includes('anchor-name') ? 'anchored' : 'plain'] = decls;
  }
  return out;
}

test('a folded row\'s chip is placed twice: from the rail\'s width, and from the row itself', () => {
  const css = decomment(read('src/styles/layout.css'));
  const folds = {
    'the reader\'s fold': chipRules(css.replace(unwrap(css, FOLD), '')),
    'the 720px fold': chipRules(unwrap(css, FOLD)),
  };
  for (const [which, { plain, anchored }] of Object.entries(folds)) {
    assert.ok(plain, `${which} draws no chip at all — a folded row has nothing but its glyph`);
    assert.equal(plain.position, 'fixed',
      `${which} places its chip inside the rail, which is a scroll box and clips it away`);
    assert.match(plain.left, /--ui-rail-w/,
      `${which} writes the chip's near edge as something other than the rail's own width, so the two can drift`);

    assert.ok(anchored, `${which} lost its \`${ANCHORED}\` branch — the chip no longer follows a scrolled row`);
    assert.equal(anchored['position-anchor'], '--ui-rail-row',
      `${which} anchors its chip to something other than the row it names`);
    assert.match(anchored.left, /anchor\(--ui-rail right\)/,
      `${which} takes the chip's near edge from somewhere other than the rail's own edge`);
    for (const side of ['top', 'bottom']) {
      assert.match(anchored[side] ?? '', /^anchor\(/,
        `${which} pins the chip's ${side} to something other than the row, so it drifts as the rail scrolls`);
    }
  }
});

test('an open rail leaves its labels where they are, in both states', () => {
  const at = mount(PAIR(false));
  const row = at.doc.querySelector('.ui-app__rail .ui-nav__item[aria-label]');
  const label = row.querySelector('.ui-nav__label');
  for (const [state] of CHIP_STATES) {
    row.setAttribute('data-ui-state', state);
    assert.equal(at.of(label, 'position'), 'static', `an open rail turns its label into a chip under ${state}`);
    row.removeAttribute('data-ui-state');
  }
  assert.equal(at.of(label, 'opacity'), '1', 'an open rail fades its own labels');
});

test('the fold toggle is drawn wherever there is a fold to choose, and only there', () => {
  const on = (html, opts) => { const at = mount(html, opts); return at.shown(at.q('.ui-app__fold')); };
  assert.equal(on(PAIR(false)), true, 'the wide rail has no control to fold it');
  assert.equal(
    on(PAIR(true)), true,
    'the collapsed rail lost the control that opens it, so a reader who folded it cannot unfold it',
  );
  assert.equal(on(PAIR(false), { narrow: true }), false, 'below 720px the toggle is drawn over a fold it cannot change');
});

// ---- A1d. the fold is on a clock ------------------------------------------
//
// The width is the whole of the animation, and motion-coverage.test.js cannot
// see it. Its MOVES list is closed and carries no `width`; what the fold
// re-points is --ui-rail-w, a custom property, so no rule under a state hook
// declares the property that travels. Both `transition: width` lines could be
// deleted and eight gates stayed green while the fold snapped from 249px to
// 74px in one frame — the travel is what version 1 of #277 was sent back for,
// and it was the one claim on this branch with nothing under it.
//
// Read off the declarations rather than through the cascade, because JSDOM
// expands no `transition` shorthand: getComputedStyle(rail).transitionDuration
// answers `0s` whatever the sheet says. Text is the right reading anyway — what
// has to be there is the tokens, and a literal that happens to resolve to 250ms
// is a second tempo, which is the whole of what motion-tokens.test.js says
// about every other transition the kit writes.

const TRAVELS = [
  { file: 'src/styles/layout.css', selector: '.ui-app__rail', which: 'the rail the shell draws' },
  { file: 'src/styles/nav.css', selector: '.ui-nav--side', which: 'the nav column inside it' },
];
const NET = 'src/styles/reduced-motion.css';

/** The `transition` a selector writes, with the at-rules around it, or null. */
function travelOf({ file, selector }) {
  for (const rule of motionRules(read(file))) {
    if (!selectors(rule.selector).includes(selector)) continue;
    const decl = rule.decls.find((d) => d.prop === 'transition');
    if (decl) return { ...decl, rule };
  }
  return null;
}

test('the fold travels, and both halves of it read the motion tokens', () => {
  for (const { file, selector, which } of TRAVELS) {
    const at = `${selector} in ${file}`;
    const decl = travelOf({ file, selector });
    assert.ok(
      decl,
      `${which} (${at}) declares no transition, so the fold arrives in one frame. The rail closes `
      + 'from the open column to the strip; with nothing on a clock the words are cut through by an '
      + 'edge that is already past them, which is what #277 was reworked to stop.',
    );
    assert.match(
      decl.value, /(^|,)\s*width(\s|,|$)/,
      `${at} transitions \`${decl.value}\`, which does not carry width — the one property the fold moves`,
    );
    const travel = decl.value.split(',').map((p) => p.trim()).find((p) => /^width(\s|$)/.test(p));
    assert.match(
      travel, /\bvar\(--dur-med\)/,
      `${at} times the fold with \`${travel}\` instead of --dur-med. 250ms is the surface tempo the `
      + 'kit ships, and a literal here is a second one nothing else in the sheet reads.',
    );
    assert.match(
      travel, /\bvar\(--ease\)/,
      `${at} curves the fold with \`${travel}\` instead of --ease. The CSS keyword \`ease\` is a `
      + 'different curve and the two read alike in a stylesheet.',
    );
    assert.ok(
      !inNet(decl.rule),
      `${at} writes its travel inside a reduced-motion block, so the fold animates only for the `
      + 'reader who asked it not to',
    );
  }
});

test('the fold arrives at once for a reader who asked for less motion', () => {
  for (const { file, selector, which } of TRAVELS) {
    // A travel that is not there outranks nothing; the test above owns its
    // absence and says so in one line rather than two.
    assert.ok(
      !travelOf({ file, selector })?.important,
      `${which} (${selector} in ${file}) writes its transition !important, which outranks the `
      + `reduced-motion net in ${NET} — the fold would travel for 250ms in front of a reader who `
      + 'asked for none',
    );
  }
  const clamp = motionRules(read(NET)).filter(inNet)
    .flatMap((rule) => rule.decls)
    .find((d) => d.prop === 'transition-duration' && d.important);
  assert.ok(
    clamp && ms(clamp.value) <= 1,
    `${NET} no longer clamps transition-duration with !important, so nothing stops the fold — or any `
    + 'other transition — for a reader who asked for less motion. stories/reduced-motion.test.js holds '
    + 'the net itself; this is the half of it the fold depends on.',
  );
});

// ---- A1e. the mark is the state ------------------------------------------
//
// The toggle draws one mark at both widths — a frame that holds still and a seam
// that crosses it — so nothing about the control says which way to press and the
// reader reads the state instead. That only works while the seam actually moves,
// and a seam that does not is the same control drawn twice: no gate above would
// notice, because the mark is one glyph in the one place the equality gates leave
// out (it is meant to differ between the folds).
//
// The distance is held to the mark's own geometry rather than compared with a
// number written here. src/components/shell.js draws the frame and the seam; the
// seam is mirrored about the frame's centre when the rail is folded, so the
// compartment it cuts off changes sides. A travel written by hand that is not
// that mirror lands the seam somewhere the frame does not explain.

const MARK = 'src/components/shell.js';

/** The mark's frame and seam, read out of the component that draws them. */
function markGeometry() {
  const js = read(MARK);
  const rect = /<rect x="(-?[\d.]+)" y="-?[\d.]+" width="([\d.]+)"/.exec(js);
  assert.ok(rect, `${MARK} no longer draws the toggle's frame as a <rect> this gate can read`);
  const seam = /<path class="ui-app__fold-seam" d="M([\d.]+) [\d.]+v[\d.]+"/.exec(js);
  assert.ok(seam, `${MARK} no longer draws the toggle's seam as a vertical path this gate can read`);
  const x = Number(rect[1]);
  const width = Number(rect[2]);
  return { x, width, centre: x + width / 2, seam: Number(seam[1]) };
}

/** The `translateX()` the folded rail puts on the seam, in the mark's own units. */
function seamTravel() {
  const css = decomment(read('src/styles/layout.css'));
  for (const rule of leafRules(css)) {
    if (!selectors(rule.head).some((one) => one.endsWith('.ui-app__fold-seam') && one.includes('.is-collapsed'))) continue;
    const m = /transform\s*:\s*translateX\(\s*(-?[\d.]+)px\s*\)/.exec(rule.decls);
    return m ? Number(m[1]) : null;
  }
  return null;
}

test('the toggle is the glyph column, at both widths, so the mark holds its place', () => {
  const pad = pxOf('src/styles/nav.css', '.ui-nav__item', 'padding');
  const glyph = pxOf('src/styles/nav.css', '.ui-nav__ic svg', 'width');
  assert.ok(pad && glyph, `read pad=${pad} glyph=${glyph} — the rules the column is derived from have moved`);
  const declared = /\.ui-app__fold\s*\{[^{}]*width\s*:\s*([^;}]+)/.exec(decomment(read('src/styles/layout.css')));
  assert.match(
    declared?.[1] ?? '', /var\(--ui-nav-strip\)/,
    `.ui-app__fold is ${declared ? `\`${declared[1].trim()}\` wide` : 'given no width of its own'}. The `
    + 'column is --ui-nav-strip, declared once in nav.css and read by the closed rail as well; a literal '
    + 'here is a second copy of it that the arithmetic below cannot keep in step.',
  );
  const widths = [mount(PAIR(false)), mount(PAIR(true))].map((at) => at.css('.ui-app__fold', 'width'));
  const [open, folded] = widths;
  assert.equal(
    open, folded,
    `the control is ${open} on an open rail and ${folded} on a folded one, so the mark steps sideways `
    + 'on the press — the one thing the travel promises not to do. One box, written once, at both widths.',
  );
  assert.equal(
    Number.parseFloat(open), 2 * pad + glyph,
    `the control is ${open} wide against a glyph column of ${2 * pad + glyph}px — a row's padding either `
    + 'side of a glyph. A control wider than the column puts its mark off the line every glyph above it '
    + 'stands on; a narrower one is a target the rail does not have room for. It is --ui-nav-strip, '
    + 'which is that column and the width the closed rail is derived from.',
  );
});

test('the seam moves when the rail folds, so the mark is the state and not a direction', () => {
  const open = mount(PAIR(false));
  const folded = mount(PAIR(true));
  const at = (w) => w.of(w.q('.ui-app__fold .ui-app__fold-seam'), 'transform');
  const [a, b] = [at(open), at(folded)];
  assert.notEqual(
    a, b,
    `the seam resolves to \`${a}\` on an open rail and \`${b}\` on a folded one. The toggle draws one `
    + 'mark at both widths, so a seam that holds still is the same control twice and the state is '
    + 'readable only from the accessible name.',
  );
  assert.match(
    b, /translateX/,
    `the folded rail moves the seam with \`${b}\` rather than along the frame, which is the one axis a `
    + 'seam dividing a panel can travel on',
  );
  assert.equal(
    open.of(open.q('.ui-app__fold .ui-app__fold-seam'), 'transform'), 'none',
    'the open rail puts a transform on the seam of its own, so the travel is measured from somewhere '
    + 'other than where the mark is drawn',
  );
});

test('the seam\'s travel is the frame\'s own mirror, not a number in the stylesheet', () => {
  const { x, width, centre, seam } = markGeometry();
  const travel = seamTravel();
  assert.ok(
    travel != null,
    'the folded rail writes no translateX() on the seam, so nothing here is holding a distance — see '
    + 'the test above, which is the one that notices a seam that stopped moving',
  );
  assert.ok(
    seam > x && seam < x + width,
    `the seam is drawn at ${seam}, outside the frame's ${x}..${x + width}, so it divides nothing`,
  );
  assert.equal(
    travel, 2 * (centre - seam),
    `the seam stands at ${seam} and travels ${travel}, which lands it at ${seam + travel} in a frame `
    + `centred on ${centre}. Mirrored, it lands at ${2 * centre - seam}: the narrow compartment the seam `
    + 'cuts off changes sides and the frame stays the same frame. Any other distance is a position the '
    + `mark drawn in ${MARK} does not explain.`,
  );
});

test('the seam arrives with the rail\'s own edge, and stops when the rail does', () => {
  const travel = travelOf({ file: 'src/styles/layout.css', selector: '.ui-app__fold .ui-app__fold-seam' });
  assert.ok(
    travel,
    'the seam declares no transition, so the mark reports the fold finished while the rail is still '
    + 'closing. It is one `transition: transform` on .ui-app__fold .ui-app__fold-seam in layout.css.',
  );
  assert.match(
    travel.value, /^transform\s/,
    `the seam transitions \`${travel.value}\`, which is not the property that moves it`,
  );
  for (const [token, why] of [
    ['--dur-med', 'the rail\'s width travels on --dur-med, and a seam on any other clock arrives '
      + 'before or after the edge it is reporting'],
    ['--ease', 'the CSS keyword `ease` is a different curve from --ease, and the two read alike in a '
      + 'stylesheet'],
  ]) {
    assert.ok(
      travel.value.includes(`var(${token})`),
      `the seam is timed \`${travel.value}\` rather than with ${token} — ${why}`,
    );
  }
  assert.ok(
    !travel.important,
    'the seam writes its travel !important, which outranks the reduced-motion net — the mark would '
    + 'slide for a reader who asked for none while the rail it reports on arrives in one frame',
  );
  assert.ok(
    !inNet(travel.rule),
    'the seam\'s travel is inside a reduced-motion block, so it moves only for the reader who asked '
    + 'it not to',
  );
});

// ---- A1b. an icon-less row is not a blank target -------------------------
//
// sidebarNav() documents `icon` as optional at every level, and the folded rail
// shows the icon and nothing else. So a top-level leaf, a group head and a
// group's child are all 44px of empty box when they carry no glyph. The dot
// fallback started life scoped to `--sub`, which covered the children only.
//
// JSDOM implements no getComputedStyle for pseudo-elements, so this cannot be
// resolved through the cascade the way the rules above are. It resolves the
// SELECTOR instead — the fold's own ::after rules, asked of real rail rows via
// Element.matches(), which is the same engine the browser matches with.

const ICONLESS = appShell({
  nav: [
    { id: 'plain', label: 'Plain leaf' },
    { label: 'Group head', items: [{ id: 'child', label: 'Child' }, { id: 'kid', icon: 'clock', label: 'Kid' }] },
    { id: 'iconed', icon: 'chart', label: 'Iconed' },
  ],
  active: 'child',
  signOutHref: '#logout',
});

/** Every selector in the fold that draws an ::after, with the pseudo dropped. */
function foldMarkSelectors() {
  const body = unwrap(decomment(read('src/styles/layout.css')), FOLD);
  assert.ok(body, `layout.css no longer folds at ${FOLD}`);
  return [...body.matchAll(/([^{}]+)::after\s*\{/g)]
    .flatMap(([, sel]) => sel.split(',').map((s) => s.trim()).filter(Boolean));
}

const railRows = (html) => {
  const doc = new JSDOM(`<!doctype html><html lang="en"><body>${html}</body></html>`).window.document;
  return [...doc.querySelectorAll('.ui-app__rail .ui-nav__item')];
};

test('every icon-less row in the folded rail is given a mark of its own', () => {
  const marks = foldMarkSelectors();
  assert.ok(marks.length, 'the folded rail draws no ::after at all — this gate measures nothing');
  const blank = railRows(ICONLESS).filter((row) => !row.querySelector('.ui-nav__ic'));
  assert.ok(
    blank.length >= 3,
    'the fixture stopped carrying an icon-less leaf, an icon-less group head and an icon-less child',
  );
  const unmarked = blank.filter((row) => !marks.some((sel) => row.matches(sel)));
  assert.deepEqual(
    unmarked.map((row) => row.getAttribute('aria-label')),
    [],
    `${unmarked.length} of ${blank.length} icon-less rows draw nothing below 720px, so each is a `
    + 'blank 44px target. sidebarNav() documents `icon` as optional at every level — the dot '
    + 'fallback has to cover every level too, not a group\'s children alone.',
  );
});

test('a row that has an icon is not given a second mark beside it', () => {
  const marks = foldMarkSelectors();
  const iconed = railRows(ICONLESS).filter((row) => row.querySelector('.ui-nav__ic'));
  assert.ok(iconed.length >= 3, 'the fixture stopped carrying rows with icons');
  const doubled = iconed.filter((row) => marks.some((sel) => row.matches(sel)));
  assert.deepEqual(
    doubled.map((row) => row.getAttribute('aria-label')), [],
    'a row draws its glyph and a dot beside it — the fallback is for rows that have nothing',
  );
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
  for (const [mode, html, narrow] of [['wide', SHELL, false], ['folded', SHELL, true], ['collapsed', PAIR(true), false]]) {
    const at = mount(html, { narrow });
    for (const side of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) {
      const got = Number.parseFloat(at.css('.ui-app__rail', side));
      assert.ok(
        got >= need,
        `the ${mode} rail has ${got}px of ${side} against a ${need}px `
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

// The one row with no hover response was the row the reader is standing on:
// .is-active rests on --surface-3 and the rail's hover rule painted --surface-3
// over it, an exact no-op. Every state in this kit is designed, and "the pointer
// is on the current page" is a state.
test('hovering the row the reader is standing on is a response, in both themes', () => {
  for (const theme of ['dark', 'light']) {
    const at = mount(SHELL, { theme });
    const rail = at.bg('.ui-app__rail');
    const rest = parseColour(at.css('.ui-app__rail .ui-nav__item.is-active', 'backgroundColor'));
    const hover = parseColour(at.inState('.ui-app__rail .ui-nav__item.is-active', 'hover', 'backgroundColor'));
    assert.ok(rest && rest[3] > 0, `the current row paints no resting background in ${theme}`);
    assert.ok(hover && hover[3] > 0, `the current row paints no hovered background in ${theme}`);
    const moved = ratio(composite(hover, rail), composite(rest, rail));
    assert.ok(
      moved > 1.02,
      `the current row is ${r2(moved)}:1 against its own resting state in ${theme} — hovering `
      + 'the row you are on does nothing, and it is the only row in the rail that does nothing',
    );
    assert.ok(
      ratio(composite(hover, rail), rail) > ratio(composite(rest, rail), rail),
      `hovering the current row in ${theme} moves it back towards the rail. Every other row `
      + 'steps away from the rail under the pointer; the current one must not recede.',
    );
  }
});

// The rail's other rows keep the step they had — an active-row rule that also
// caught them would flatten the difference between "here" and "under the pointer".
test('a resting row still hovers to the step below the current row', () => {
  for (const theme of ['dark', 'light']) {
    const at = mount(SHELL, { theme });
    const rail = at.bg('.ui-app__rail');
    const plain = parseColour(at.inState('.ui-app__rail .ui-nav__item:not(.is-active)', 'hover', 'backgroundColor'));
    const active = parseColour(at.inState('.ui-app__rail .ui-nav__item.is-active', 'hover', 'backgroundColor'));
    assert.ok(
      ratio(composite(active, rail), rail) > ratio(composite(plain, rail), rail),
      `a hovered resting row and the hovered current row read the same in ${theme}`,
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

// A pointer reaching the row is one way of being about to click it; a Tab key
// landing on it is the other. Only the first was painted, so the reader with no
// pointer got the ring and no colour — the destructive signal was pointer-only.
test('the keyboard reaches sign out the same way the pointer does', () => {
  for (const theme of ['dark', 'light']) {
    const at = mount(SHELL, { theme });
    assert.equal(
      at.inState('.ui-nav__item.is-danger', 'focus-visible', 'color'),
      at.inState('.ui-nav__item.is-danger', 'hover', 'color'),
      `sign out is --pink under the pointer and something else under the keyboard in ${theme}. `
      + 'The focus ring says where you are; it does not say that this row is the destructive one.',
    );
    assert.equal(
      at.inState('.ui-nav__item.is-danger', 'focus-visible', 'backgroundColor'),
      at.inState('.ui-nav__item.is-danger', 'hover', 'backgroundColor'),
      `the danger wash is pointer-only in ${theme}`,
    );
  }
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
//
// accountShell() is not in that set and must not be pulled into it: the preset
// keeps its topbar, because dropping it would take the theme toggle and the
// account menu off every consuming /account page. So the gate is about the
// screens built directly on appShell(), and it finds them by asking each story
// file which factory it imports rather than by a list somebody keeps by hand.
// The four the demo set has always had are pinned below, so a file cannot leave
// the gate simply by importing the preset.

const DEMO_SCREENS = ['Access', 'EmptyStates', 'FinanceReport', 'Preferences'];

const storyFiles = () => readdirSync(path.join(root, 'stories/apps'))
  .filter((f) => f.endsWith('.stories.js')).sort();

// `title`, `sub` and `body` are raw-HTML slots — that is what lets a title carry
// a badge — so the caller owes them markup, not text. The demo set was passing
// `title: 'Access & agents'`, and a bare `&` is a parse error in the very string
// that IS escaped on the same screen when it travels through a nav label or a
// crumb. An & that starts no character reference is the whole test: nothing else
// distinguishes text handed to a markup slot from markup.
const BARE_AMP = /&(?!#\d+;|#x[0-9a-fA-F]+;|[a-zA-Z][a-zA-Z0-9]*;)/g;

test('no example screen writes text into a markup slot and calls it markup', async () => {
  const bad = [];
  for (const file of storyFiles()) {
    const mod = await import(`./${file}`);
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || typeof story?.render !== 'function') continue;
      for (const m of story.render().matchAll(BARE_AMP)) {
        bad.push(`${file}:${name} — …${story.render().slice(Math.max(0, m.index - 24), m.index + 16)}…`);
      }
    }
  }
  assert.deepEqual(
    bad, [],
    'an example screen ships a bare & into raw HTML, so the kit\'s own demo is invalid markup '
    + 'where the identical string is escaped a few nodes away:\n  ' + bad.join('\n  '),
  );
});

// The import list, not any mention of the name: these files talk about the
// preset in their comments, and a comment is not a call.
const importsFactory = (src, name) =>
  new RegExp(String.raw`import\s*\{[^}]*\b${name}\b[^}]*\}\s*from`).test(src);

// A screen composes the shell either in the story file or through the demo
// module beside it — the finance portal's two screens now share one call in
// _finance-nav.js rather than each writing their own. So the question is
// followed one import deep instead of being answered off the story file alone;
// a screen that moves its composition into a shared module is still one of the
// screens this gate holds together, which is the point of moving it.
const localModules = (src) => [...src.matchAll(/from\s+'\.\/(_[\w-]+\.js)'/g)].map((m) => m[1]);
const composesWith = (file, name) => {
  const src = read(path.join('stories/apps', file));
  return importsFactory(src, name)
    || localModules(src).some((m) => importsFactory(read(path.join('stories/apps', m)), name));
};

/** Story files that draw a screen with appShell() itself, preset callers aside. */
const appShellFiles = () => storyFiles()
  .filter((f) => composesWith(f, 'appShell') && !composesWith(f, 'accountShell'));

test('every example screen built on appShell() makes the same call about the topbar', async () => {
  const files = appShellFiles().map((f) => f.replace('.stories.js', ''));
  for (const want of DEMO_SCREENS) {
    assert.ok(
      files.includes(want),
      `${want}.stories.js is no longer one of the appShell() demo screens this gate holds `
      + 'together — importing accountShell() into it takes it out of the set rather than '
      + 'settling what shape the set is',
    );
  }
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

// The finance portal's nav was written out twice — once in EmptyStates and once
// in FinanceReport — with a comment in each pointing at the other. That is the
// defect this issue exists to remove, rebuilt in the demo layer. Rendering both
// and comparing proves nothing: two copies of four entries look identical. What
// proves derivation is changing the one definition and watching both follow.
test('the two finance screens draw one nav definition, not two copies of it', async () => {
  const { FINANCE_NAV } = await import('./_finance-nav.js');
  const probe = { id: 'probe-127-demo', icon: 'gear', label: 'Probe & drift' };
  FINANCE_NAV.push(probe);
  try {
    for (const file of ['EmptyStates', 'FinanceReport']) {
      const mod = await import(`./${file}.stories.js`);
      const drawn = Object.entries(mod)
        .filter(([name, story]) => name !== 'default' && typeof story?.render === 'function')
        .map(([, story]) => story.render())
        .join('');
      assert.match(
        drawn, /href="#probe-127-demo"/,
        `${file}.stories.js keeps a copy of the finance nav of its own, so the two agree only `
        + 'for as long as somebody keeps editing both',
      );
    }
  } finally {
    const at = FINANCE_NAV.indexOf(probe);
    if (at >= 0) FINANCE_NAV.splice(at, 1);
  }
  assert.equal(FINANCE_NAV.some((i) => i.id === 'probe-127-demo'), false, 'the probe outlived its test');
});

// The nav was the first copy; the composition around it was the second. Empty
// states declared a wrapper of its own and the finance report called appShell()
// straight, passing `maxWidth: '960px'` — so one portal's two screens read at
// two column widths and each rebuilt the Finance crumb by hand. Same shape as
// the nav, one layer out. A width is the measurable half: it is written into
// the <main> style attribute, so the two screens either agree or they do not.
test('the two finance screens are one composition — one column, one trail root', async () => {
  const screens = [];
  for (const file of ['EmptyStates', 'FinanceReport']) {
    const mod = await import(`./${file}.stories.js`);
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || typeof story?.render !== 'function') continue;
      const html = story.render();
      const doc = new JSDOM(`<!doctype html><html lang="en"><body>${html}</body></html>`).window.document;
      const crumbs = [...doc.querySelectorAll('nav[aria-label="Breadcrumb"] a, nav[aria-label="Breadcrumb"] [aria-current]')];
      screens.push({
        at: `${file}.${name}`,
        column: (/--ui-app-main:\s*([^";]+)/.exec(html) || [])[1]?.trim(),
        root: crumbs[0]?.textContent.trim(),
      });
    }
  }
  assert.ok(screens.length >= 3, 'the fixture stopped finding the finance screens');
  const widths = new Set(screens.map((s) => s.column));
  assert.equal(
    widths.size, 1,
    'the finance portal draws its screens on different columns: '
    + screens.map((s) => `${s.at} ${s.column}`).join(', ')
    + '. One portal, two answers about how wide a page is — the drift the shared nav '
    + 'beside them was extracted to remove.',
  );
  assert.equal(
    new Set(screens.map((s) => s.root)).size, 1,
    'the finance screens each build their own crumb trail: '
    + screens.map((s) => `${s.at} "${s.root}"`).join(', '),
  );
});

// The preset's topbar composition is the newest thing in the shell and the one
// thing no story drew: a sticky .topbar over a rail that sticks under it. A
// story is what makes it visible; this is what makes it discoverable.
test('a story renders accountShell(), so the preset\'s own composition is on screen somewhere', async () => {
  const drawn = [];
  for (const file of storyFiles()) {
    if (!importsFactory(read(path.join('stories/apps', file)), 'accountShell')) continue;
    const mod = await import(`./${file}`);
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || typeof story?.render !== 'function') continue;
      const out = story.render();
      if (out.includes('class="ui-app-page"') && out.includes('<header class="topbar"')) {
        drawn.push(`${file}:${name}`);
      }
    }
  }
  assert.ok(
    drawn.length,
    'no story in stories/apps renders accountShell(). Its topbar composition — --ui-app-top, '
    + 'the sticky topbar, the rail offset beneath it — is new code the workbench never draws, '
    + 'so nobody sees it break.',
  );
});

// --ui-app-top is a hand-copied duplicate of .topbar's height in topbar.css.
// Nothing makes the copy follow the original, and a stale one either overlaps
// the rail's first row or leaves a strip of page above it.
test('the shell offsets its rail by exactly the height the topbar actually is', () => {
  const tall = /\.topbar\s*\{[^}]*?\bheight:\s*([^;]+);/.exec(decomment(read('src/styles/topbar.css')));
  assert.ok(tall, 'premise: .topbar no longer declares a fixed height — re-derive this offset');
  const offset = /--ui-app-top:\s*([^;}]+)/.exec(decomment(read('src/styles/layout.css')));
  assert.ok(offset, 'layout.css no longer offsets the shell below the topbar');
  assert.equal(
    offset[1].trim(), tall[1].trim(),
    `.ui-app-page offsets the shell by ${offset[1].trim()} while .topbar is ${tall[1].trim()} `
    + 'tall. The two are separate literals: the rail either starts under the topbar or leaves '
    + 'a strip of page above itself, and neither shows up in a unit test of either file alone.',
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
