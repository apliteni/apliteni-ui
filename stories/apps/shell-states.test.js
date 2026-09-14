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

// The four sheets the shell's own rail is drawn by, in the order index.css
// imports them — layout.css last, which is what lets it override nav.css at
// equal weight, and dropdown.css before both because the reader's menu is the
// kit's own dropdown() and the rail only reskins its trigger (#286).
const SHEETS = [
  'src/styles/base.css', 'src/styles/dropdown.css', 'src/styles/nav.css', 'src/styles/layout.css',
];
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
  assert.ok(rows.length >= 3, 'the fixture stopped carrying a group, a leaf and the group\'s child');
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
 * The declarations the two folds are meant NOT to share, named here rather than
 * left to look like drift. Below 720px a finger is the only pointer the strip has,
 * so a control there is held to 44px — WCAG 2.5.5 (AAA). The reader's fold cannot
 * take the same floor: a row is 35.4px open and the account block 38px, and growing
 * either on the press would move a box the travel promises holds still. Two gates
 * under this one hold both halves: the line is really in the narrow block, and the
 * press really does not raise the box in the other.
 *
 * An exclusion on its own would be a hole. This is the same shape as the fold
 * toggle, which is left out of both gates because it is drawn in one fold and
 * gone in the other — except that a value, unlike a control, can fall silently,
 * so each floor named here is measured rather than trusted.
 */
const PHONE_ONLY = [
  { selector: '.ui-app__rail .ui-nav__item', prop: 'min-height', floor: 44, what: 'a rail row' },
  { selector: '.ui-app__rail .ui-app__user-trigger', prop: 'min-height', floor: 44, what: 'the account block' },
];

/**
 * The rules the 720px fold writes and the reader's fold must not, for the same
 * reason the toggle itself is left out of both gates: they are about a control
 * that is drawn in one fold and gone in the other. Below 720px the toggle is not
 * drawn, so a head band holding nothing else is padding and a hairline over
 * nothing; on the reader's fold that band holds the only control that opens the
 * rail. The rail's foot in the topbar layout is the same rule read at the other end —
 * it holds the toggle and nothing else. Each is measured both ways under this constant
 * rather than merely excluded.
 */
const PHONE_ONLY_RULES = ['.ui-app__head:not(:has(> .ui-app__brand))', '.ui-app__brand', '.ui-app__rail .ui-app__foot'];

/**
 * And the one rule the reader's fold writes that the 720px block must not, which is
 * the same exception read the other way. The toggle stands at the end of the brand
 * row and rides the closing edge back onto the glyph column, so the column it lands
 * on is the column the product's mark stands on and the lockup goes whole.
 *
 * This is the one entry that is an exception in BOTH lists, because the two blocks
 * write it in opposite directions rather than one of them writing it alone. Below
 * 720px the toggle is not drawn, so nothing arrives on the column the mark gives up
 * — and `.is-collapsed` is reachable at that width, out of the same cookie a desktop
 * press wrote or out of a documented `collapsed: true`. The 720px block therefore
 * gives the lockup back, and a rail folded on a phone keeps the product and the link
 * home. Both directions are measured under FOLD_ONLY rather than merely excluded.
 */
const FOLD_ONLY_RULES = ['.ui-app__brand'];

/** The same exception, by element and property, for the sweep that resolves the
 *  cascade rather than reading the sheet. */
const FOLD_ONLY = [
  { selector: '.ui-app__brand, .ui-app__brand *', props: ['opacity', 'visibility', 'pointer-events'] },
];

test('a folded rail keeps the product\'s mark in the layout where nothing takes its column', () => {
  const gone = mount(PAIR(true));
  assert.equal(
    gone.shown(gone.q('.ui-app__brand')), false,
    'premise: in the default layout the fold takes the lockup, because the toggle rides the closing '
    + 'edge onto the column the mark stands on',
  );
  const kept = mount(BANDED(true));
  assert.equal(
    kept.shown(kept.q('.ui-app__brand')), true,
    'the topbar layout folds the lockup away as well, and nothing arrives on the column it gave up — '
    + 'so the rail opens with a 52px band holding nothing, its hairline still under it, which is the '
    + 'defect the 720px block was written to avoid at the other width',
  );
  assert.equal(
    Number.parseFloat(kept.of(kept.q('.ui-app__brand span'), 'opacity')), 0,
    'the folded rail keeps the product\'s word as well as its mark, in a rail one glyph wide',
  );
});

/** `map` without the phone strip's own declarations, and without a rule left empty by one. */
function withoutPhoneFloor(map) {
  for (const { selector, prop } of PHONE_ONLY) {
    const decls = map.get(selector);
    if (decls == null) continue;
    const kept = decls.split('; ').filter((d) => !d.startsWith(`${prop}:`));
    if (kept.length) map.set(selector, kept.join('; '));
    else map.delete(selector);
  }
  return map;
}

test('the collapsed rail is the narrow rail, rule for rule', () => {
  const css = decomment(read('src/styles/layout.css'));
  const narrow = withoutPhoneFloor(ruleMap(unwrap(css, FOLD), (sel) => !sel.startsWith('.ui-app__main')
    && !sel.includes('.ui-app__fold') && !PHONE_ONLY_RULES.includes(sel)));
  const collapsed = new Map([...ruleMap(css, (sel) => sel.includes('.is-collapsed') && !sel.includes('.ui-app__fold'))]
    // The layout qualifier comes off with the fold's own: since #308 one rule is
    // written `:where(.ui-app:not(.ui-app--topbar).is-collapsed)`, because the
    // lockup only goes in the layout where the toggle arrives on its column. It is
    // the same rule under the same exception, so it normalises to the same key.
    .map(([sel, decls]) => [sel
      .replace(/:where\(\.ui-app(?::not\(\.ui-app--topbar\))?\.is-collapsed\)\s*/g, '')
      .replace('.ui-app.is-collapsed', '.ui-app'), decls])
    .filter(([sel]) => !FOLD_ONLY_RULES.includes(sel)));
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

test('the phone strip holds its controls to the touch floor, and the reader\'s fold does not', () => {
  for (const { selector, prop, floor, what } of PHONE_ONLY) {
    const box = (at) => Number.parseFloat(at.css(selector, prop)) || 0;

    const narrow = box(mount(PAIR(false), { narrow: true }));
    assert.ok(
      narrow >= floor,
      `${what} resolves to ${prop}: ${narrow}px below 720px, under the ${floor}px touch floor. The `
      + 'strip is the whole of the rail at that width and a finger is the only pointer it has, so a '
      + `control is ${floor}px there (WCAG 2.5.5). Restore it in the 720px block of layout.css.`,
    );

    // Two halves, and both are needed. "Did the press change it" catches a floor
    // added to the `.is-collapsed` copy; "is it under the floor at all" catches one
    // added OUTSIDE the media query, which raises both sides at once and leaves the
    // first half green — the same blindness the equality gates have, one level down.
    const open = box(mount(PAIR(false)));
    const folded = box(mount(PAIR(true)));
    assert.equal(
      folded, open,
      `the reader's fold takes ${what} from ${prop}: ${open}px to ${folded}px. A row is 35.4px open `
      + 'and the account block 38px, so a floor that applies on the press grows the box and moves '
      + 'what is under it — the one thing the travel promises not to do. The floor belongs to the '
      + '720px block alone.',
    );
    assert.ok(
      open < floor,
      `${what} resolves to ${prop}: ${open}px on a desktop, already at the ${floor}px the phone `
      + 'strip sets. A floor written outside the media query raises both folds together, so the '
      + 'test above cannot see it — and every row of every rail grows by it.',
    );
  }
});

// A shell whose product word is in the topbar, so the rail's head band holds the
// toggle and nothing else — the shape the rule below is about, and the one every
// /account page has.
const TOPPED = (collapsed) => appShell({
  word: 'Finance',
  topbar: { word: 'Finance' },
  nav: [{ id: 'dashboard', icon: 'chart', label: 'Dashboard' }],
  active: 'dashboard',
  account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' },
  signOutHref: '#logout',
  collapsible: true,
  collapsed,
});

// The second layout, where the reader's block is on the band and the fold's control
// has taken its place at the rail's foot.
const BANDED = (collapsed) => appShell({
  word: 'Finance',
  layout: 'topbar',
  search: 'states-cmdk',
  nav: [{ id: 'dashboard', icon: 'chart', label: 'Dashboard' }],
  active: 'dashboard',
  account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' },
  signOutHref: '#logout',
  collapsible: true,
  collapsed,
});

test('the phone strip drops the rail\'s foot with nothing left in it, and the reader\'s fold keeps it', () => {
  const narrow = mount(BANDED(false), { narrow: true });
  assert.equal(
    narrow.shown(narrow.q('.ui-app__foot')), false,
    'below 720px the toggle is not drawn, so the foot that holds it in the topbar layout is 20px of '
    + 'padding and a hairline over nothing at the bottom of the rail — the head band\'s rule, read '
    + 'at the other end of the rail',
  );

  const folded = mount(BANDED(true));
  assert.equal(
    folded.shown(folded.q('.ui-app__foot')), true,
    'the reader\'s fold took the rail\'s foot with it, and the toggle inside it is the only way back '
    + 'to an open rail. This rule belongs to the 720px block alone.',
  );
  assert.equal(folded.shown(folded.q('.ui-app__fold')), true, 'the folded rail cannot be opened again');
});

test('the phone strip drops a head band with nothing left to draw, and the reader\'s fold keeps it', () => {
  const narrow = mount(TOPPED(false), { narrow: true });
  assert.equal(
    narrow.shown(narrow.q('.ui-app__head')), false,
    'below 720px the toggle is not drawn, so a head band holding only the toggle is 12px of padding '
    + 'and a hairline over nothing at the top of the rail. Every shell with a topbar has one.',
  );

  const folded = mount(TOPPED(true));
  assert.equal(
    folded.shown(folded.q('.ui-app__head')), true,
    'the reader\'s fold took the head band with it, and the toggle inside it is the only way back to '
    + 'an open rail. This rule belongs to the 720px block alone.',
  );
  assert.equal(folded.shown(folded.q('.ui-app__fold')), true, 'the folded rail cannot be opened again');

  // And the band a wordmark is in stays at both, which is what keeps the rule
  // about an empty band rather than about the band.
  const branded = mount(PAIR(false), { narrow: true });
  assert.equal(
    branded.shown(branded.q('.ui-app__head')), true,
    'the rule reaches a head band that still has the product\'s mark in it, so a phone rail lost '
    + 'the brand as well as the control',
  );
});

test('the reader\'s fold takes the product\'s lockup whole, and the phone strip takes only its words', () => {
  const open = mount(PAIR(false));
  const folded = mount(PAIR(true));
  const narrow = mount(PAIR(false), { narrow: true });

  assert.equal(open.css('.ui-app__brand', 'opacity'), '1', 'the open rail fades out the mark that names the product');
  assert.equal(
    folded.css('.ui-app__brand', 'opacity'), '0',
    'the folded rail keeps the lockup on the glyph column the toggle rides onto, so the product\'s mark '
    + 'and the control that opens the rail are drawn one on top of the other. A folded rail is one '
    + 'column wide: the control takes it, and the lockup goes with the words it carries.',
  );
  assert.equal(
    folded.css('.ui-app__brand', 'visibility'), 'hidden',
    'the folded lockup is faded to nothing but still in the tab order, so the first Tab into the rail '
    + 'lands on an invisible link under the control that replaced it. `visibility` is what takes a box '
    + 'out of the tab order without taking its space — and the head band needs that space, or it loses '
    + 'the height it had on the open rail and every row below it steps up.',
  );
  assert.equal(folded.shown(folded.q('.ui-app__brand')), false, 'the folded lockup is still drawn');
  assert.equal(
    folded.css('.ui-app__brand', 'pointerEvents'), 'none',
    'the folded lockup still takes the pointer, over the control standing on the same column',
  );

  assert.equal(
    narrow.css('.ui-app__brand', 'opacity'), '1',
    'below 720px the toggle is not drawn, so nothing arrives on the mark\'s column — and this fade '
    + 'leaves the phone rail\'s head band empty. It belongs to the reader\'s fold alone.',
  );
  assert.equal(narrow.css('.ui-app__brand', 'visibility'), 'visible', '…and the phone strip takes the mark out of its own tab order too');
  assert.equal(
    narrow.css('.ui-app__brand span', 'opacity'), '0',
    'the phone strip keeps the product\'s word beside the mark, in a rail 74px wide',
  );

  // The state the rule above is really about, and the one an exclusion on its own
  // would hide: a rail that is BOTH below 720px and carrying `.is-collapsed`. Every
  // default shell is `data-rail="auto"` and takes the stored choice, so a reader who
  // folds on a desktop and opens the same site on a phone lands here, as does any
  // caller passing the documented `collapsed: true`. The toggle is display:none at
  // this width, so if the fade reached the mark there would be nothing in the band
  // and nothing to press.
  const narrowFolded = mount(PAIR(true), { narrow: true });
  assert.equal(
    narrowFolded.css('.ui-app__brand', 'opacity'), '1',
    'a rail folded on a phone fades the product\'s mark off a column nothing arrives on — the toggle '
    + 'is not drawn below 720px, so the head band is 41px of nothing over its own hairline. The fade '
    + 'belongs to the widths where the control replaces the mark it takes.',
  );
  assert.equal(
    narrowFolded.css('.ui-app__brand', 'visibility'), 'visible',
    'a rail folded on a phone takes the lockup out of the tab order, and with the toggle not drawn at '
    + 'this width that is the link home gone as well — the Tab walk into the rail starts at the first '
    + 'nav row and there is no way back to an open rail at all',
  );
  assert.equal(
    narrowFolded.css('.ui-app__brand', 'pointerEvents'), 'auto',
    'a rail folded on a phone keeps the mark drawn but refuses the tap on it',
  );
  assert.equal(narrowFolded.shown(narrowFolded.q('.ui-app__brand')), true, 'the phone rail\'s lockup is not drawn once it is folded');
  assert.equal(
    narrowFolded.css('.ui-app__brand span', 'opacity'), '0',
    'the folded phone rail keeps the product\'s word in a rail 74px wide',
  );
});

test('the lockup leaves on the words\' clock, and its visibility rides with the fade', () => {
  const travel = travelOf({ file: 'src/styles/layout.css', selector: '.ui-app__brand' });
  assert.ok(
    travel,
    'the lockup declares no transition, so the product\'s mark blinks out on the first frame of a fold '
    + 'that takes 250ms — while every word on the rows below it fades',
  );
  // `visibility` is discrete: it holds its old value for the whole duration, so a curve
  // buys nothing and one that leaves [0, 1] flips it mid-fade. stories/motion-tokens.test.js
  // holds that for every sheet; this pairs it with the clock the two share.
  for (const [prop, curve] of [['opacity', 'var(--ease)'], ['visibility', 'linear']]) {
    const one = travel.value.split(',').map((x) => x.trim()).find((x) => new RegExp(`^${prop}(\\s|$)`).test(x));
    assert.ok(one, `the lockup transitions \`${travel.value}\`, which does not carry ${prop} — the fold moves both`);
    assert.match(
      one, /\bvar\(--dur-fast\)/,
      `the lockup times its ${prop} with \`${one}\` instead of --dur-fast. The words on the rail leave on `
      + 'that clock and the mark leaves with them; --dur-med is the width\'s, and the mark would still be '
      + 'fading when the edge arrived.',
    );
    assert.ok(
      one.includes(curve),
      `the lockup curves its ${prop} with \`${one}\` rather than \`${curve}\``,
    );
  }
  assert.ok(
    !travel.important,
    'the lockup writes its transition !important, which outranks the reduced-motion net — the mark '
    + 'would fade for 150ms in front of a reader who asked for none',
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
          // The phone strip's touch floors — see PHONE_ONLY. Held apart there.
          if (PHONE_ONLY.some((e) => p === e.prop && x.matches(e.selector.split(' ').pop()))) continue;
          // The product's lockup — see FOLD_ONLY_RULES. Held apart there.
          if (FOLD_ONLY.some((e) => e.props.includes(p) && x.matches(e.selector))) continue;
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
  assert.ok(rows.length >= 4, 'the fixture stopped carrying a leaf, a group, its child and the toggle');
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
  const row = at.doc.querySelector('.ui-app__rail .ui-nav__item[aria-label]:not(.ui-app__fold)');
  const label = row.querySelector('.ui-nav__label');
  for (const [state] of CHIP_STATES) {
    row.setAttribute('data-ui-state', state);
    assert.equal(at.of(label, 'position'), 'static', `an open rail turns its label into a chip under ${state}`);
    row.removeAttribute('data-ui-state');
  }
  assert.equal(at.of(label, 'opacity'), '1', 'an open rail fades its own labels');
});

// The one row of the rail that is icon-only at BOTH widths, so it is the one
// whose chip is not scoped to the fold. why: docs/specification.md#the-page-shell
test('the toggle carries a name at both widths, because it is wordless at both', () => {
  for (const [rail, at] of [['an open', mount(PAIR(false))], ['a folded', mount(PAIR(true))]]) {
    const btn = at.q('.ui-app__fold');
    const label = btn.querySelector('.ui-nav__label');
    assert.equal(
      at.of(label, 'position'), 'static',
      `${rail} rail draws the toggle's chip with nothing pointing at it`,
    );
    for (const [state, who] of CHIP_STATES) {
      btn.setAttribute('data-ui-state', state);
      assert.equal(
        at.of(label, 'position'), 'fixed',
        `${rail} rail leaves the toggle's name in the flow for ${who}, where the glyph column is the `
        + 'whole of the control and `overflow: hidden` squeezes it to nothing. The toggle is its mark '
        + 'at both widths, so it owes the chip at both — the rule cannot be scoped to .is-collapsed.',
      );
      assert.equal(
        at.of(label, 'opacity'), '1',
        `${rail} rail hands ${who} a chip that is faded out`,
      );
      btn.removeAttribute('data-ui-state');
    }
  }
});

// The chip rule is what makes this a question: it lifts the name out of the flow,
// and the glyph left standing there is shorter than the line the name vacated, so
// the button shrank under the pointer and took the nav below it up with it.
// #282's rule is that a hover readout overlays the page and never reflows it.
// why: docs/specification.md#the-page-shell

/** The line a box sets, in px — what the name occupies while it is in the flow. */
const lineBox = (at, el) => {
  const lh = at.of(el, 'lineHeight');
  const line = /^[\d.]+$/.test(lh) ? Number(lh) * Number.parseFloat(at.of(el, 'fontSize')) : Number.parseFloat(lh);
  assert.ok(Number.isFinite(line), 'no line resolves on the toggle\'s name — this gate is measuring nothing');
  return line;
};

/** The glyph box's own height: the box it declares, or the mark it wraps. */
const glyphBox = (at, ic) => {
  const declared = Number.parseFloat(at.of(ic, 'height'));
  if (Number.isFinite(declared)) return declared;
  const svg = ic.querySelector('svg');
  assert.ok(svg, 'the toggle wraps no mark at all');
  return Number.parseFloat(at.of(svg, 'height'));
};

test('hovering the toggle draws the chip over the rail and does not move it', () => {
  for (const [rail, at] of [['an open', mount(PAIR(false))], ['a folded', mount(PAIR(true))]]) {
    const btn = at.q('.ui-app__fold');
    const label = btn.querySelector('.ui-nav__label');
    const ic = btn.querySelector('.ui-nav__ic');
    assert.ok(label && ic, 'the toggle is no longer a glyph and a name, so there is no pair for a hover to take apart');
    const glyph = glyphBox(at, ic);
    const line = lineBox(at, label);
    for (const [state, who] of CHIP_STATES) {
      btn.setAttribute('data-ui-state', state);
      const left = at.of(label, 'position');
      btn.removeAttribute('data-ui-state');
      assert.equal(left, 'fixed', `${rail} rail keeps the toggle's name in the flow for ${who} — see the gate above`);
    }
    assert.ok(
      r2(glyph) >= r2(line),
      `on ${rail} rail the toggle's glyph box is ${r2(glyph)}px inside a ${r2(line)}px line. The name `
      + `leaves the flow to become the chip, so the button falls to ${r2(glyph)}px the moment a pointer `
      + 'or the keyboard reaches it, and the nav under it — and every row in it — steps up the rail. '
      + 'A hover readout overlays the page; it does not reflow it. The glyph box has to carry the '
      + 'line, so the flow keeps its height whether the name is in it or not.',
    );
  }
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
// Why the travel is read as text and not through the cascade, and why
// motion-coverage.test.js cannot see it:
// why: CONTRIBUTING.md#the-rails-fold-is-read-off-the-declaration-not-through-the-cascade

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

// ---- A1f. the account block is a row of the same rail ---------------------
//
// The block is a control since #286 — the trigger of the reader's menu — and on a
// folded rail its avatar is the whole of it. Two numbers decide whether it reads as
// a row of the rail it closes rather than as a box parked under one: the inset that
// puts the avatar on the glyph column, and the height the box declares because the
// mark inside it is what gives it one. A floor JSDOM cannot resolve measures nothing
// and reports green, so the height is a literal in the sheet — and it is held to the
// two declarations it is made of here rather than left as a number somebody liked.
// why: CONTRIBUTING.md#an-unresolved-var-measures-nothing-and-reports-green

/** The avatar's own size, read off the one place layout.css writes it. */
function avatarSize() {
  const m = /--ui-app-av\s*:\s*([\d.]+)px/.exec(decomment(read('src/styles/layout.css')));
  assert.ok(m, 'layout.css no longer declares --ui-app-av, so the two rules derived from it have nothing to read');
  return Number(m[1]);
}

test('the avatar is inset by the arithmetic between the column and itself, not by a third number', () => {
  const css = decomment(read('src/styles/layout.css'));
  const block = /\.ui-app__av\s*\{([^{}]*)\}/.exec(css);
  assert.ok(block, 'layout.css no longer draws the rail\'s avatar — this gate is measuring nothing');
  const inset = /margin-inline-start\s*:\s*([^;}]+)/.exec(block[1])?.[1] ?? '';
  for (const token of ['--ui-nav-strip', '--ui-app-av']) {
    assert.ok(
      inset.includes(`var(${token})`),
      `the avatar is inset by \`${inset.trim() || 'nothing'}\`, which does not read ${token}. Half the `
      + 'difference between the glyph column and the mark is what lands the avatar on the line every '
      + 'glyph above it stands on; a literal here is a third copy of a number written twice already, '
      + 'and it steps the block off that line the moment either changes.',
    );
  }
  const strip = pxOf('src/styles/nav.css', '.ui-nav--side', '--ui-nav-strip');
  const av = avatarSize();
  assert.ok(
    av < strip,
    `the avatar is ${av}px inside a ${strip}px column, so the inset the rule above computes is `
    + 'negative and the folded rail clips the mark it is meant to centre',
  );
});

test('the account block declares the height the mark inside it gives it', () => {
  const at = mount(SHELL);
  const pad = Number.parseFloat(at.css('.ui-app__user-trigger', 'paddingTop'));
  const floor = Number.parseFloat(at.css('.ui-app__user-trigger', 'minHeight'));
  const av = avatarSize();
  assert.ok(
    Number.isFinite(pad) && Number.isFinite(floor),
    `read padding=${pad} min-height=${floor} off the account block — one of them stopped resolving, `
    + 'and a floor nothing can read is a floor that reports green',
  );
  assert.equal(
    floor, av + 2 * pad,
    `the account block declares min-height: ${floor}px around a ${av}px mark and ${pad}px of padding, `
    + `which comes to ${av + 2 * pad}px. The two disagree, so the box the stylesheet states is not the `
    + 'box a browser lays out — and it is the stated one that stories/guidelines/accessibility-floor.'
    + 'test.js measures against the target floor.',
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
//
// The fold toggle carries a rail row's skin and stands above the rows, so it is
// what `.ui-nav__item` reaches first now. It is not one of them: it is the rail's
// own control, resting a step quieter on purpose, and it is measured against a
// control's floor in the test under these three rather than left out of all four.
const RESTING_GLYPH = '.ui-nav__item:not(.is-active):not(.is-danger):not(.ui-app__fold) .ui-nav__ic svg';


test('the active glyph is the brightest in the rail, whatever the accent is', () => {
  for (const theme of ['dark', 'light']) {
    for (const accent of ['default', 'phoenix', 'ocean', 'emerald']) {
      const at = mount(SHELL, { theme, accent });
      const on = at.glyph('.ui-nav__item.is-active .ui-nav__ic svg');
      const off = at.glyph(RESTING_GLYPH);
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
    const off = at.glyph(RESTING_GLYPH);
    assert.ok(
      off.ratio >= 4.5,
      `a resting glyph is ${r2(off.ratio)}:1 against the rail in ${theme}. Below 720px the `
      + 'glyph is the whole of the row on screen, so dropping it a step cannot drop it out of '
      + 'reach — WCAG 1.4.11 asks 3:1 of it and the kit holds text-grade.',
    );
  }
});

// The one glyph the three above leave out, measured here rather than dropped. The
// toggle rests in --dim, a step under the rows, because it is the rail talking about
// itself and not one of the places the rail goes — and it is a control, so WCAG
// 1.4.11 is the bar it answers to rather than the text grade the rows hold. Below
// that bar the mark is the state and the state has gone.
test('the toggle\'s own mark clears the floor a control answers to', () => {
  for (const theme of ['dark', 'light']) {
    const at = mount(SHELL, { theme });
    const mark = at.glyph('.ui-app__fold .ui-nav__ic svg');
    assert.ok(
      mark.ratio >= 3,
      `the toggle's mark is ${r2(mark.ratio)}:1 against the rail in ${theme}, under the 3:1 WCAG `
      + '1.4.11 asks of a user-interface component. The mark is the whole of this control at both '
      + 'widths and the seam inside it is the whole of the state, so a mark that fades out is a '
      + 'rail that no longer says which way it is folded.',
    );
  }
});

// ---- C2b. every block of the rail keeps the rail's open column -----------
//
// nav.css gives the column to its own blocks (`.ui-nav--side > *`). The head band
// and the reader block are siblings of the nav, so layout.css declares it for
// them, and the fold is what makes it matter: the box closes to the strip over a
// column that keeps its width. The toggle's cell is not one of them — it is a cell
// of the head band, at its end, and the gate under this one is the one that holds
// it there. why: docs/specification.md#the-page-shell

test('every block of the rail keeps the open column while the box closes over it', () => {
  const col = pxOf('src/styles/nav.css', '.ui-app', '--ui-nav-col');
  assert.ok(col, 'nav.css no longer declares --ui-nav-col, so the rail has no open column to keep');
  for (const [rail, at] of [['an open', mount(PAIR(false))], ['a folded', mount(PAIR(true))]]) {
    for (const sel of ['.ui-app__head', '.ui-app__user']) {
      assert.equal(
        Number.parseFloat(at.css(sel, 'width')), col,
        `${sel} is \`${at.css(sel, 'width')}\` wide on ${rail} rail instead of the ${col}px column `
        + 'nav.css declares. The fold closes the box over a column that holds its width, so a block '
        + 'that has not been given it is laid out a second way on the press: the wordmark wraps to '
        + 'two lines, the head grows, and the toggle and every row under it step down the rail — '
        + 'which is the one thing the travel promises does not happen.',
      );
      assert.equal(
        at.css(sel, 'flexShrink'), '0',
        `${sel} shrinks with the rail on ${rail} rail, so the column it declares is one the fold takes back`,
      );
    }
  }
});

// ---- C2c. the toggle stands at the end of the brand row -------------------
//
// Artur's call on 2026-09-13, over the round that had it stacked under the
// wordmark: *"no, show icon to the right."* The band is one line now, the mark at
// its start and the control at its end. That costs the toggle the glyph column on
// an open rail, which is the one thing the round before it had bought — so the
// three gates here hold what it keeps instead: the end of the band while the rail
// is open, the closing edge all the way down the travel, and the glyph column when
// the travel stops. why: docs/specification.md#the-page-shell

test('the toggle stands at the far end of the brand row, on the wordmark\'s own line', () => {
  const band = /\.ui-app__head\s*\{([^{}]*)\}/.exec(decomment(read('src/styles/layout.css')));
  assert.ok(band, 'layout.css no longer lays the head band out at all — this gate is measuring nothing');
  assert.doesNotMatch(
    band[1], /flex-direction\s*:\s*column/,
    'the head band stacks its two marks again, so the toggle is under the wordmark and not at the end '
    + 'of its line. That was the round before this one; Artur sent it back on 2026-09-13.',
  );
  for (const [rail, at] of [['an open', mount(PAIR(false))], ['a folded', mount(PAIR(true))]]) {
    assert.equal(at.css('.ui-app__head', 'display'), 'flex', `${rail} rail no longer lays the head band out as a flex line`);
    assert.equal(
      at.css('.ui-app__head', 'flexDirection'), 'row',
      `${rail} rail lays the head band out as a \`${at.css('.ui-app__head', 'flexDirection')}\`, so the `
      + 'mark and the control are stacked rather than sharing one line',
    );
    assert.equal(
      at.css('.ui-app__head', 'alignItems'), 'center',
      `${rail} rail aligns the band's two boxes with \`${at.css('.ui-app__head', 'alignItems')}\`, so the `
      + 'control and the wordmark sit on one line without sitting on one baseline',
    );
    assert.equal(
      at.css('.ui-app__fold-row', 'marginInlineStart'), 'auto',
      `on ${rail} rail nothing pushes the toggle's cell to the end of the band, so it stands against the `
      + 'wordmark — and, in a shell whose word is in the topbar, at the band\'s start with the whole '
      + 'column empty beside it. The auto margin is what puts it at the end in both shapes.',
    );
    assert.equal(
      at.css('.ui-app__fold-row', 'flexShrink'), '0',
      `on ${rail} rail the toggle's cell shrinks with the band, so a long product word squeezes the `
      + 'control off the glyph column it is drawn on',
    );
    assert.equal(
      Number.parseFloat(at.css('.ui-app__head > .ui-app__brand', 'minWidth')), 0,
      `on ${rail} rail the lockup keeps its automatic minimum, so a product word wider than the band `
      + 'pushes the control past the end of it — where the rail clips it away with the rail still '
      + 'open, and there is nothing left to fold it with',
    );
  }
  const at = mount(PAIR(false));
  assert.deepEqual(
    [...at.q('.ui-app__head').children].map((el) => el.className),
    ['ui-app__brand', 'ui-app__fold-row'],
    'the band draws its two boxes in the other order, so the reading order and the tab order disagree '
    + 'with what is on screen: the control is at the end of the line and first under the keyboard',
  );
});

test('the toggle rides the closing edge, and the edge lands it on the glyph column', () => {
  const col = pxOf('src/styles/nav.css', '.ui-app', '--ui-nav-col');
  const strip = pxOf('src/styles/nav.css', '.ui-app', '--ui-nav-strip');
  assert.ok(col && strip, `read col=${col} strip=${strip} — nav.css no longer declares the rail's two widths`);
  const open = mount(PAIR(false));
  const folded = mount(PAIR(true));
  assert.equal(
    Number.parseFloat(open.css('.ui-app__fold-row', 'insetInlineStart')) || 0, 0,
    'the open rail already offsets the toggle from the end of the band, so the travel below is measured '
    + 'from somewhere other than where the control is drawn',
  );
  assert.equal(
    Number.parseFloat(folded.css('.ui-app__fold-row', 'insetInlineStart')), strip - col,
    `the folded rail moves the toggle \`${folded.css('.ui-app__fold-row', 'insetInlineStart')}\` back `
    + `along the band, against the ${strip - col}px between the open column and the strip. The band keeps `
    + 'the open column and the control sits at its end, so exactly that distance is what lands the '
    + 'control on the strip — the glyph column every row of a folded rail stands on. Anything shorter '
    + 'leaves it outside the rail\'s clip, where a folded rail has no control to open it.',
  );
  // Scoped to the head band since #308: the topbar layout stands the same row at the
  // rail's foot, where the control is on the glyph column from the first frame and has
  // no edge to ride. The travel belongs to the band, so the rule that writes it says so.
  const declared = /:where\(\.ui-app\.is-collapsed\)\s*\.ui-app__head\s*>\s*\.ui-app__fold-row\s*\{([^{}]*)\}/
    .exec(decomment(read('src/styles/layout.css')));
  assert.ok(
    declared,
    'the reader\'s fold no longer moves the toggle in the head band, so a folded rail draws the one '
    + 'control that opens it 175px outside itself',
  );
  assert.match(
    declared[1], /calc\(\s*var\(--ui-nav-strip\)\s*-\s*var\(--ui-nav-col\)\s*\)/,
    `the fold offsets the toggle by \`${declared[1].trim()}\`. It is the two widths' own difference, and `
    + 'both are declared once in nav.css; a literal here is a third copy of a number the column and the '
    + 'strip already fix, and it drifts the moment either of them moves.',
  );
});

test('the toggle arrives with the rail\'s own edge, and stops when the rail does', () => {
  const travel = travelOf({ file: 'src/styles/layout.css', selector: '.ui-app__fold-row' });
  assert.ok(
    travel,
    'the toggle\'s cell declares no transition, so the control jumps to the glyph column on the first '
    + 'frame of a press while the edge it is riding is still 175px away from it',
  );
  assert.match(
    travel.value, /^inset-inline-start(\s|,|$)/,
    `the cell transitions \`${travel.value}\`, which is not the property that moves it`,
  );
  const one = travel.value.split(',').map((x) => x.trim()).find((x) => /^inset-inline-start(\s|$)/.test(x));
  assert.match(
    one, /\bvar\(--dur-med\)/,
    `the cell times the toggle with \`${one}\` instead of --dur-med. This mark is the one riding the `
    + 'closing edge, so it is on the width\'s clock and not the words\' --dur-fast — anything else and '
    + 'the control arrives somewhere the rail is not.',
  );
  assert.match(one, /\bvar\(--ease\)/, `the cell curves the toggle with \`${one}\` instead of --ease`);
  assert.ok(
    !travel.important,
    'the cell writes its travel !important, which outranks the reduced-motion net — the toggle would '
    + 'slide for 250ms in front of a reader who asked for none',
  );
});

// ---- C3. the rail is ruled at its two ends and nowhere between ------------

// A width with no style paints nothing, and JSDOM hands back the initial
// `medium` for a border nobody declared — so the style is what says "hairline".
const hairline = (at, sel, side) =>
  !['none', 'hidden', ''].includes(at.css(sel, `border${side}Style`))
  && Number.parseFloat(at.css(sel, `border${side}Width`)) > 0;

test('the rail draws one rule under its head and one over its foot, and none between', () => {
  const at = mount(SHELL);
  assert.equal(
    hairline(at, '.ui-app__head', 'Bottom'), true,
    'the head band — the product\'s mark and the control that folds the rail — is not ruled off '
    + 'from the rows below it, so the rail opens with a control standing among places to go',
  );
  assert.equal(
    hairline(at, '.ui-app__fold-row', 'Top'), false,
    'a second hairline inside the head boxes the toggle into a compartment of its own, eight '
    + 'pixels under the one below the band. The head is one band: the product\'s mark, and the '
    + 'rail\'s own control at the end of its line.',
  );
  assert.equal(
    hairline(at, '.ui-app__user', 'Top'), true,
    'nothing closes the rail. The nav\'s footer slot carried the hairline while sign out was in '
    + 'it; sign out is in the reader\'s menu now, so the rule belongs to the block that opens it.',
  );
  assert.equal(
    at.doc.querySelector('.ui-nav__foot'), null,
    'the nav still draws its footer slot, so the rail closes with an empty compartment under a '
    + 'hairline of its own — two rules twenty pixels apart',
  );
});

// Sign out left the nav list for the reader's menu (#286), so the two-step it
// rests in is the menu's. A destructive row is quiet until you reach for it —
// and reaching for it is a pointer OR the keyboard, which is the half that was
// painted nowhere until this row arrived.
const menuInk = (at, state) => {
  const row = at.q('.ui-app__user-panel .ui-dropdown__item.is-danger');
  if (state) row.setAttribute('data-ui-state', state);
  const value = at.of(row.querySelector('.ui-dropdown__label'), 'color');
  row.removeAttribute('data-ui-state');
  return value;
};
const hex = (v) => v.trim().replace(/^#(\w\w)(\w\w)(\w\w)$/, (m, r, g, b) =>
  `rgb(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`);

test('sign out rests quiet in the menu and turns --pink on the way to being clicked', () => {
  const at = mount(SHELL);
  assert.notEqual(
    menuInk(at, null), hex(at.vars.get('--pink')),
    'sign out is painted --pink at rest, so the menu opens with one row already shouting and the '
    + 'step that says "you are about to end this session" has nowhere left to go',
  );
  assert.equal(
    menuInk(at, 'hover'), hex(at.vars.get('--pink')),
    'the pointer resting on sign out does not reach --pink — the two-step is the whole point',
  );
});

// A pointer reaching the row is one way of being about to click it; a Tab key
// landing on it is the other. Only the first was painted, so the reader with no
// pointer got the ring and no colour — the destructive signal was pointer-only.
test('the keyboard reaches sign out the same way the pointer does', () => {
  for (const theme of ['dark', 'light']) {
    const at = mount(SHELL, { theme });
    assert.equal(
      menuInk(at, 'focus-visible'), menuInk(at, 'hover'),
      `sign out is --pink under the pointer and something else under the keyboard in ${theme}. `
      + 'The focus ring says where you are; it does not say that this row is the destructive one.',
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

test('the reader block is announced once, and by the words that are on screen', () => {
  const at = mount(SHELL, { narrow: true });
  const trigger = at.q('.ui-app__user-trigger');
  const av = at.q('.ui-app__av');
  const who = at.q('.ui-app__who');
  assert.equal(at.shown(av), true, 'premise: the initials are what stays on screen at 375px');
  assert.equal(
    at.shown(who), true,
    'the fold takes .ui-app__who out of the accessibility tree as well as off the screen, and it '
    + 'is what names the control — the trigger would be a button with nothing in it. The fold is '
    + 'an opacity, which a screen reader still reads.',
  );
  // The trigger is named by its own contents, so there is nothing to keep in step:
  // an aria-label here would be a second copy of the two lines under it, and the
  // avatar carrying one as well would announce the reader twice over.
  assert.equal(
    trigger.getAttribute('aria-label'), null,
    'the menu trigger writes a name of its own over the words inside it, which is a second copy '
    + 'of a string the block already carries and the one that goes stale',
  );
  assert.equal(
    av.getAttribute('aria-hidden'), 'true',
    'the initials are announced as well as the name they are made of, so the reader is named '
    + 'twice on one control',
  );
  assert.match(who.textContent, /Ada Lovelace/, 'the block on screen does not say who is signed in');
  assert.match(who.textContent, /ada@apliteni\.com/);
});

// ---- C8. the second layout, through the cascade (#308) --------------------

test('the band, the rail\'s head and the rail\'s foot are one height, and it is the kit\'s band height', () => {
  const tall = /\.topbar\s*\{[^}]*?\bheight:\s*([^;]+);/.exec(decomment(read('src/styles/topbar.css')));
  assert.ok(tall, 'premise: .topbar no longer declares a fixed height — re-derive this band');
  const band = /--ui-app-band:\s*([^;}]+)/.exec(decomment(read('src/styles/layout.css')));
  assert.ok(band, 'layout.css no longer declares --ui-app-band, so the banded layout has no height to share');
  assert.equal(
    band[1].trim(), tall[1].trim(),
    `the shell's band is ${band[1].trim()} while the kit's other band is ${tall[1].trim()} tall. Two `
    + 'literals for one row: a page that carries both draws them at two heights, and neither file '
    + 'says anything is wrong.',
  );
  const at = mount(BANDED(false));
  const px = (sel) => Number.parseFloat(at.css(sel, 'height'));
  assert.equal(
    px('.ui-app__bar'), Number.parseFloat(band[1]),
    'the band is not the height it declares, so nothing else can be measured against it',
  );
  for (const sel of ['.ui-app__head', '.ui-app__foot']) {
    assert.equal(
      px(sel), px('.ui-app__bar'),
      `the rail's ${sel === '.ui-app__head' ? 'head' : 'foot'} band is ${px(sel)}px against the band's `
      + `${px('.ui-app__bar')}px. The band stands BESIDE the rail and not over it, so the rule under `
      + 'the head lands level with the band\'s own only while the two agree — a step at that corner '
      + 'is the whole reason this layout puts the mark in the rail rather than the band. Level is '
      + 'all this holds: the rail insets its rule, so the two are not one continuous stroke.',
    );
  }
  assert.equal(
    at.css('.ui-app--topbar > .ui-app__rail', 'paddingTop'), '0px',
    'the rail keeps its top inset as well as declaring the band\'s height, so the head band is that '
    + 'much taller than the band beside it',
  );
});

test('the band sticks at the top of the page, and the rail is not pushed below it', () => {
  const at = mount(BANDED(false));
  assert.equal(at.css('.ui-app__bar', 'position'), 'sticky', 'the band scrolls away with the page, taking the way into the palette and the session menu with it');
  assert.equal(at.css('.ui-app__bar', 'top'), '0px', 'the band sticks somewhere other than the top of the page');
});

test('the two widths are one column at two caps, and the caller\'s number replaces either', () => {
  const measure = mount(SHELL).vars.get('--measure').trim();
  for (const layout of ['rail', 'topbar']) {
    const at = (width, extra) => mount(appShell({
      layout, width, title: 'T', account: { name: 'Ada Lovelace', email: 'a@apliteni.com' }, ...extra,
    }));
    assert.equal(
      at('centered').css('.ui-app__main', 'maxWidth'), measure,
      `on the ${layout} layout the centred column no longer falls through to --measure, which is the `
      + 'one place a page-scale width is written',
    );
    assert.equal(
      at('wide').css('.ui-app__main', 'maxWidth'), 'none',
      `on the ${layout} layout the wide column is still capped, so it does not fill the well — which `
      + 'is the only thing the name says',
    );
    // The caller's own number is a custom property on the element, which JSDOM does
    // not resolve — shell.test.js holds that half on the markup, where it is visible.
    for (const width of ['centered', 'wide']) {
      assert.equal(
        at(width).css('.ui-app__main', 'marginInline'), 'auto',
        `the ${width} column on the ${layout} layout does not centre in the track it is given`,
      );
    }
  }
});
