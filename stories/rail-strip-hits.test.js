// Rule: a folded rail takes the pointer only where it draws.
//
// The rail is --ui-nav-strip wide and lays its rows out from --ui-nav-col, so the fold
// has to close the boxes inside it as well as the rail itself. A block that keeps the
// open column paints nothing at this width and is hit-testable all the same: 216px of
// box inside a 41px rail, 175px of it over the page beside the rail. Nothing moves and
// nothing paints, so the reader gets no cue — clicks and taps simply stop landing.
//
// #575 took the clip off `.ui-nav--side.is-collapsed`, because that clip was cutting the
// rows' focus ring; stories/rail-ring-room.test.js is the gate on that half. The clip was
// also the only thing containing the blocks, and #588 is what dropping it cost before they
// closed too: beside a `position: sticky` folded rail, a band probe at 4px spacing took 5,848
// of 7,840 points on the page away from it, and left 0 of 5 targets beside it reachable. The
// two gates are a pair — pad or clip for the ring there, close the boxes here — because the one
// declaration was doing both jobs.
//
// Subjects are discovered, not listed: every box a rendered folded rail contains, with the
// column it is laid out in, so a rail that grows a new kind of block has that block measured
// the day it is added. A box past the strip has one way out, which is to take no pointer.
//
// Coverage limits:
// - Widths, not offsets or hit testing. This resolves the kit's sheets with the tokens
//   substituted and reads the cascade; it lays nothing out and hit-tests nothing. A box
//   pushed past the strip by a margin or a transform is not read here. Chrome measured the
//   hit area itself for #588, before and after: 5,848 of 7,840 probe points on the page beside
//   a sticky rail taken by it, then 0, with 5 of 5 targets reachable at 1280 and 390 in both
//   themes, vanilla and React.
// - `pointer-events` has to be on the box that is past the strip. It is an inherited
//   property, and the cascade this gate reads does not inherit it, so an `auto` box inside
//   a `none` one reads as `auto`. Conservative on purpose: the box past the strip is where
//   the declaration belongs, and a reading that guessed would miss one that re-enabled.
// - A width this gate cannot fold into a length is a failure, not a pass — except `auto`
//   and `100%`, which take the column of the box around them and are followed as such.
// - The rail's own rules and the ones the folded class adds, not what a media query or a
//   consumer's sheet does to either.
// - The page shell draws its OWN folded rail (`.ui-app__rail`), whose rows keep the open
//   column and which contains them with `overflow: hidden auto`. Different box, different
//   answer, and not this gate's subject — see #589.
// - Whether a row is big enough to hit is stories/tap-zone.test.js's question. This one
//   asks the opposite: whether anything claims a hit area it does not draw.
//
// why: docs/specification.md#a-folded-rail-takes-the-pointer-only-where-it-draws
// Weaken the rule and confirm that its test fails.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { STYLE_FILES, desugar, substitute, tokensFor } from './lib/contrast.js';
import { sidebarNav } from '../src/components/nav.js';

const source = STYLE_FILES.map((file) => readFileSync(file, 'utf8')).join('\n');

/** A rail with a block of every kind the factory can draw: headings, lists, a group, a foot. */
const SECTIONS = [
  {
    label: 'Overview',
    items: [
      { id: 'home', icon: 'chart', label: 'Dashboard' },
      { id: 'activity', icon: 'bolt', label: 'Activity', badge: 4 },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        icon: 'card',
        label: 'Payouts',
        items: [{ id: 'pending', label: 'Pending', badge: 3 }, { id: 'history', label: 'History' }],
      },
    ],
  },
];
const SIGN_OUT = '<a class="ui-nav__item is-danger" href="#logout">'
  + '<span class="ui-nav__label">Sign out</span></a>';

const railMarkup = (collapsed) => sidebarNav({
  ariaLabel: 'Primary', sections: SECTIONS, active: 'pending', collapsed, footer: SIGN_OUT,
});

/**
 * Both rails staged in JSDOM with the sheets resolved.
 *
 * `extra` is appended last, so a mutation below can put a width or a declaration back
 * without touching anything on disk.
 */
function stage(theme, extra = '') {
  const css = `${desugar(substitute(source, tokensFor(theme)))}\n${extra}`;
  const html = `<style>${css}</style><div id="folded">${railMarkup(true)}</div>`
    + `<div id="open">${railMarkup(false)}</div>`;
  return new JSDOM(html).window;
}

/** px, or null for a width no reading can turn into one. */
const px = (value) => {
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(String(value ?? '').trim());
  return match ? Number(match[1]) : null;
};

/** A width that is the column of the box around it rather than one of its own. */
const TAKES_THE_COLUMN = (value) => ['', 'auto', '100%', 'inherit'].includes(String(value ?? '').trim());

const nameOf = (el) => (el.classList.length
  ? `.${[...el.classList].join('.')}`
  : `<${el.tagName.toLowerCase()}>`);

/**
 * Every box inside `root`, with the column it is laid out in and whether it takes a pointer.
 *
 * The column walks down: a box with a width of its own sets it, and a box that takes the
 * column of the one around it carries its parent's. That is the half a reading of the rail
 * alone cannot see — a list that is `auto` inside a 216px section is 216px wide, and it was
 * the sections that #588 left open.
 */
function boxes(win, root) {
  const found = [];
  const walk = (el, parentColumn) => {
    const style = win.getComputedStyle(el);
    const own = px(style.width);
    const takes = own === null && TAKES_THE_COLUMN(style.width);
    found.push({
      el,
      name: nameOf(el),
      declared: String(style.width ?? '').trim() || 'auto',
      column: own ?? (takes ? parentColumn : null),
      inert: String(style.pointerEvents).trim() === 'none',
    });
    for (const kid of el.children) walk(kid, own ?? (takes ? parentColumn : null));
  };
  for (const kid of root.children) walk(kid, px(win.getComputedStyle(root).width));
  return found;
}

/**
 * The boxes a folded rail lays out past its strip while they still take the pointer, each
 * named with what is wrong.
 */
function takesHitsPastStrip(found, strip) {
  const problems = [];
  for (const box of found) {
    if (box.column === null) {
      problems.push(`${box.name} is ${box.declared} wide, and a box this gate cannot fold into a `
        + 'length is no measurement of what it takes the pointer over');
      continue;
    }
    if (box.column <= strip) continue;
    if (box.inert) continue;
    problems.push(`${box.name} is laid out ${box.column}px wide in a ${strip}px rail — `
      + `${box.column - strip}px past the strip, where it draws nothing — and still takes the pointer`);
  }
  return problems;
}

/** Everything a check below needs, read once per theme. */
function readRail(theme, extra = '') {
  const win = stage(theme, extra);
  const doc = win.document;
  const rail = doc.querySelector('#folded .ui-nav--side.is-collapsed');
  assert.ok(rail, 'sidebarNav({ collapsed: true }) no longer renders a folded rail');
  const strip = px(win.getComputedStyle(rail).width);
  assert.ok(strip !== null,
    `${theme}: the folded rail's own width reads ${win.getComputedStyle(rail).width}, `
    + 'which is no strip to measure the boxes inside it against');
  return { win, doc, rail, strip, found: boxes(win, rail) };
}

/* -- the gate -------------------------------------------------------------------- */

test('the folded rail is still one strip wide, which every check below is measured against', () => {
  for (const theme of ['light', 'dark']) {
    const { strip } = readRail(theme);
    assert.equal(strip, 41,
      `${theme}: the folded rail is ${strip}px wide; --ui-nav-strip moved, and the hit area `
      + 'readings below have to be re-taken against it');
  }
});

test('every block a folded rail renders is a box this gate measures', () => {
  for (const theme of ['light', 'dark']) {
    const { doc, found } = readRail(theme);
    // What the rail renders, against what the walk reached. A box the walk never
    // descended into would leave this gate measuring less and reporting the same green.
    const rendered = [...doc.querySelectorAll(
      '#folded .ui-nav__section, #folded .ui-nav__cap, #folded .ui-nav__list, '
      + '#folded .ui-nav__sub, #folded .ui-nav__foot, #folded .ui-nav__item',
    )];
    assert.ok(rendered.length >= 13,
      `${theme}: the fixture renders ${rendered.length} blocks and rows; it draws two sections, `
      + 'two headings, two lists, a nested list, a foot and six rows, so a reading that found '
      + 'fewer has broken');
    const missing = rendered.filter((el) => !found.some((box) => box.el === el)).map(nameOf);
    assert.deepEqual(missing, [],
      `${theme}: ${missing.length} box(es) the folded rail renders were never reached by the `
      + `walk, so nothing here measures them: ${missing.join(', ')}`);
  }
});

test('no folded rail takes the pointer past its strip', () => {
  for (const theme of ['light', 'dark']) {
    const { found, strip } = readRail(theme);
    assert.deepEqual(takesHitsPastStrip(found, strip), [],
      `${theme}: a folded rail claims hit area it does not draw:\n  `
      + `${takesHitsPastStrip(found, strip).join('\n  ')}\n`
      + '  close the box to --ui-nav-strip with the rail, or give it pointer-events: none if it '
      + 'has to keep the open column.');
  }
});

test('the open rail is left alone: its blocks still keep the open column', () => {
  // The fold is the only place the rule applies. A reading that closed every rail would
  // pass the check above and shrink the rail nobody asked about.
  for (const theme of ['light', 'dark']) {
    const { win, doc, strip } = readRail(theme);
    const open = doc.querySelector('#open .ui-nav--side');
    const wide = boxes(win, open).filter((box) => box.column !== null && box.column > strip);
    assert.ok(wide.some((box) => box.name.includes('ui-nav__section')),
      `${theme}: the open rail's sections are no longer laid out from the open column, so the `
      + 'fold is not what closes them');
  }
});

test('the gate fails when the blocks keep the open column again (#588)', () => {
  // The #588 state, exactly: the rows closed, the blocks around them left open.
  const mutation = '.ui-nav--side.is-collapsed > * { width: var(--ui-nav-col); }';
  const { found, strip } = readRail('dark', substitute(mutation, tokensFor('dark')));
  const problems = takesHitsPastStrip(found, strip);
  assert.ok(problems.some((p) => /^\.ui-nav__section is laid out 216px wide in a 41px rail — 175px past/.test(p)),
    `a section that keeps the open column has to be reported; got:\n  ${problems.join('\n  ')}`);
});

test('the gate follows the column down into a box with no width of its own', () => {
  // The half that reading the blocks alone would miss. A list is `auto`, so it is as wide
  // as the section around it, and a reading that stopped at the declared widths would call
  // it 41px and pass it.
  const mutation = '.ui-nav--side.is-collapsed .ui-nav__section { width: var(--ui-nav-col); }';
  const { found, strip } = readRail('dark', substitute(mutation, tokensFor('dark')));
  const problems = takesHitsPastStrip(found, strip);
  assert.ok(problems.some((p) => /^\.ui-nav__list is laid out 216px wide/.test(p)),
    `a list that is auto inside a 216px section has to be reported at 216px; got:\n  ${
      problems.join('\n  ')}`);
});

test('the gate fails when a row is laid out past the strip', () => {
  // The row is the box that draws, so this is the same mutation rail-ring-room.test.js
  // rejects for the ring — and it is a finding here too, for the hit area the row claims
  // beyond the rail rather than for the ring the rail cut.
  const mutation = '.ui-nav--side.is-collapsed .ui-nav__item { width: var(--ui-nav-col); }';
  const { found, strip } = readRail('dark', substitute(mutation, tokensFor('dark')));
  const problems = takesHitsPastStrip(found, strip);
  assert.ok(problems.length && problems.every((p) => /is laid out 216px wide in a 41px rail/.test(p))
    && problems.some((p) => p.startsWith('.ui-nav__item')),
    `rows laid out from the open column have to be reported, and only for that; got:\n  ${
      problems.join('\n  ')}`);
});

test('the gate fails when the one box that keeps the open column takes the pointer', () => {
  // The heading is the exception: it keeps --ui-nav-col so its line breaks are the open
  // rail's and the fold changes no height. The exception is the `pointer-events: none`
  // beside it, and nothing else, so taking that away has to be a finding.
  const mutation = '.ui-nav--side.is-collapsed .ui-nav__cap { pointer-events: auto; }';
  const { found, strip } = readRail('dark', mutation);
  const problems = takesHitsPastStrip(found, strip);
  assert.ok(problems.length && problems.every((p) => p.startsWith('.ui-nav__cap')),
    `a heading at the open column that takes the pointer has to be reported, and it has to be `
    + `the only finding; got:\n  ${problems.join('\n  ')}`);
});

test('the gate fails when a width stops being one it can fold into a length', () => {
  // `max-content` of what? It is as wide as the longest run of text in the box, which no
  // reading of the cascade can fold into a length — and it is the one keyword that can be
  // WIDER than the box around it, so a pass would leave the hole open. Unreadable is a
  // failure; `auto` and `100%` are not, because they take the column of the box around
  // them and the walk follows that down.
  const mutation = '.ui-nav--side.is-collapsed .ui-nav__cap { width: max-content; pointer-events: auto; }';
  const { found, strip } = readRail('dark', mutation);
  const problems = takesHitsPastStrip(found, strip);
  assert.ok(problems.some((p) => /^\.ui-nav__cap is max-content wide, and a box this gate cannot fold/.test(p)),
    `a width this gate cannot fold has to be reported; got:\n  ${problems.join('\n  ')}`);
});
