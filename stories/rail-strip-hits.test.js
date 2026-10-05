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
    const column = own ?? (takes ? parentColumn : null);
    found.push({
      el,
      name: nameOf(el),
      declared: String(style.width ?? '').trim() || 'auto',
      column,
      // A `min-width` holds a box OPEN against the column it is laid out in, so it is
      // the second way a box ends up past the strip. The words take `max-content` to
      // keep their own width while they fade, which is a length no reading of the
      // cascade can fold — so it is read as a floor the walk cannot bound, and the
      // only thing that makes it safe is the `pointer-events: none` beside it.
      floor: String(style.minWidth ?? '').trim() || 'auto',
      floorPx: px(style.minWidth),
      inert: String(style.pointerEvents).trim() === 'none',
    });
    for (const kid of el.children) walk(kid, column);
  };
  for (const kid of root.children) walk(kid, px(win.getComputedStyle(root).width));
  return found;
}

/** A `min-width` that lets the box be as narrow as its column: nothing is held open. */
const FLOOR_IS_FREE = (value) => ['', 'auto', '0px', '0', 'inherit'].includes(String(value ?? '').trim());

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
    if (box.floorPx === null && !FLOOR_IS_FREE(box.floor) && !box.inert) {
      problems.push(`${box.name} is held open by min-width: ${box.floor}, which is no length this `
        + 'gate can bound against the strip, and it still takes the pointer');
      continue;
    }
    const widest = Math.max(box.column, box.floorPx ?? 0);
    if (widest <= strip) continue;
    if (box.inert) continue;
    problems.push(`${box.name} is laid out ${widest}px wide in a ${strip}px rail — `
      + `${widest - strip}px past the strip, where it draws nothing — and still takes the pointer`);
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

/* -- the fold's own clock ---------------------------------------------------------- */

// The checks above read the rail at REST, at either end of the fold, and passed while it
// still took 1,404 of 1,920 probe points on the page beside it for ~220ms of each close and
// 1,682 for ~190ms of each open. A hit area that is only right at rest is not the guarantee.
//
// The rule: a box with a width of ITS OWN travels it on the rail's clock — same duration,
// delay and curve — or it takes no pointer. A box with no width of its own has nothing to
// time; it follows the column around it frame for frame, which is why `auto` and `100%` are
// read as safe here exactly as they are above.
//
// Coverage limits:
// - The declaration, not the frames: no animation is run. Chrome walked the frames for
//   #588 in both directions and under reduced motion — 0 of 1,920 in all four walks.
// - JSDOM does not expand the `transition` shorthand, so it is parsed here. A sheet that
//   wrote the longhands would read as no clock, which is a finding rather than a pass.
// - A delay is the one part of a clock the reduced-motion net does not cap, so a delay the
//   rail does not have is a finding even on its own.
// - The rail's own rules and the ones the folded class adds, not a consumer's sheet.

/**
 * Split a value on a separator that is not inside brackets.
 *
 * `cubic-bezier(0.4, 0, 0.2, 1)` carries both separators the shorthand uses — commas
 * between its layers and spaces between a layer's parts — so neither can be split on
 * naively. Reading the curve as `cubic-bezier(0.4,` is how a clock that differs reads
 * as one that matches.
 */
const splitOutside = (value, separator) => {
  const out = [];
  let depth = 0; let current = '';
  for (const ch of String(value ?? '')) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === separator && depth === 0) { out.push(current); current = ''; continue; }
    current += ch;
  }
  out.push(current);
  return out.map((part) => part.trim().replace(/\s+/g, ' ')).filter(Boolean);
};
const layersOf = (value) => splitOutside(value, ',');

const TIME = /^(-?\d*\.?\d+)(ms|s)$/;
const ms = (token) => {
  const match = TIME.exec(token);
  return match ? Number(match[1]) * (match[2] === 's' ? 1000 : 1) : null;
};
const EASING = /^(linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end|cubic-bezier\(|steps\()/;

/**
 * What a box's `transition` says about one property: its duration, delay and curve.
 *
 * `null` when the box names no clock for it. The first time in a layer is the duration
 * and the second is the delay, which is the order the shorthand fixes.
 */
function clockFor(declaration, property) {
  for (const layer of layersOf(declaration)) {
    const tokens = splitOutside(layer, ' ');
    const times = tokens.filter((t) => ms(t) !== null).map(ms);
    const easing = tokens.filter((t) => EASING.test(t)).join(' ');
    const named = tokens.filter((t) => ms(t) === null && !EASING.test(t));
    if (!named.includes(property) && !named.includes('all')) continue;
    return { duration: times[0] ?? 0, delay: times[1] ?? 0, easing };
  }
  return null;
}

const sameClock = (a, b) => a !== null && b !== null
  && a.duration === b.duration && a.delay === b.delay && a.easing === b.easing;
const showClock = (c) => (c === null ? 'no clock of its own' : `${c.duration}ms after ${c.delay}ms, ${c.easing || 'no curve'}`);

/** The rail's own clock for `width`: the one every box inside it is measured against. */
function railClock(win, rail) {
  const clock = clockFor(win.getComputedStyle(rail).transition, 'width');
  assert.ok(clock && clock.duration > 0,
    `the rail names no clock for its own width (${showClock(clock)}), so there is nothing `
    + 'for the boxes inside it to travel on');
  return clock;
}

/**
 * The same box in the folded rail and in the open one, walked in lockstep.
 *
 * The two trees come from one factory with one flag between them, so position pairs them.
 * A reading that drifted would pair a row with a heading, which is why the tags are
 * checked rather than assumed.
 */
function pairs(win, folded, open) {
  const out = [];
  const walk = (a, b) => {
    assert.equal(a.tagName, b.tagName,
      `the folded and open rails no longer render the same tree: ${nameOf(a)} against ${nameOf(b)}`);
    out.push({ name: nameOf(a), folded: a, open: b });
    const kidsA = [...a.children]; const kidsB = [...b.children];
    assert.equal(kidsA.length, kidsB.length,
      `${nameOf(a)} renders ${kidsA.length} children folded and ${kidsB.length} open`);
    kidsA.forEach((kid, i) => walk(kid, kidsB[i]));
  };
  [...folded.children].forEach((kid, i) => walk(kid, [...open.children][i]));
  return out;
}

/**
 * The boxes that travel a width of their own on a clock that is not the rail's, each
 * named with what is wrong.
 *
 * Two boxes are not subjects. One with no width of its own is laid out in the column
 * around it and cannot lag behind it. One whose width is the SAME at both ends of the
 * fold — a glyph is 17px either way — never travels, so there is nothing to time; asking
 * it for a clock would make every fixed box in the rail a finding and the rule unreadable.
 *
 * `side` is which of the two rails is being asked, because the way in and the way out are
 * carried by different rules: a row takes an explicit strip width under the folded class
 * and the column of its list without it.
 */
function offTheRailsClock(win, railPairs, clock, side) {
  const problems = [];
  for (const pair of railPairs) {
    const el = pair[side];
    const here = px(win.getComputedStyle(el).width);
    if (here === null) continue;
    const there = px(win.getComputedStyle(pair[side === 'folded' ? 'open' : 'folded']).width);
    if (there !== null && there === here) continue;
    if (String(win.getComputedStyle(el).pointerEvents).trim() === 'none') continue;
    const own = clockFor(win.getComputedStyle(el).transition, 'width');
    if (sameClock(own, clock)) continue;
    problems.push(`${pair.name} is ${here}px wide on ${showClock(own)}, where the rail `
      + `travels its own width ${showClock(clock)} — so the two are different widths `
      + 'in the frames between');
  }
  return problems;
}

/** Both rails and the clock every box in them is measured against. */
function readFold(theme, extra = '') {
  const { win, rail } = readRail(theme, extra);
  const open = win.document.querySelector('#open .ui-nav--side');
  assert.ok(open, 'sidebarNav({ collapsed: false }) no longer renders an open rail');
  return { win, railPairs: pairs(win, rail, open), clock: railClock(win, rail) };
}

test('the fold has one clock, and every box inside the rail that has a width travels on it', () => {
  for (const theme of ['light', 'dark']) {
    const { win, railPairs, clock } = readFold(theme);
    const problems = offTheRailsClock(win, railPairs, clock, 'folded');
    assert.deepEqual(problems, [],
      `${theme}: a folded rail's boxes do not close when it does:\n  ${problems.join('\n  ')}\n`
      + '  give the box the rail\'s own width transition, let it take the column of the box '
      + 'around it, or give it pointer-events: none.');
  }
});

test('the way out is carried too: the open rail\'s blocks name the same clock', () => {
  // The fold is reversible, and the way out is the half no rest reading can see. When the
  // folded class goes, a block whose clock lives only under that class has no clock at all:
  // it snaps to the open column in one frame while the rail is still --ui-nav-strip wide.
  for (const theme of ['light', 'dark']) {
    const { win, railPairs, clock } = readFold(theme);
    const problems = offTheRailsClock(win, railPairs, clock, 'open');
    assert.deepEqual(problems, [],
      `${theme}: the open rail's boxes would not travel with it on the way out:\n  `
      + `${problems.join('\n  ')}`);
  }
});

test('every box this clock reading covers is one the rail renders', () => {
  // The count the two checks above are worth. A reading that reached no travelling box
  // would report the same green on a rail whose every block had drifted.
  for (const theme of ['light', 'dark']) {
    const { win, railPairs } = readFold(theme);
    const travels = railPairs.filter((pair) => {
      const here = px(win.getComputedStyle(pair.folded).width);
      const there = px(win.getComputedStyle(pair.open).width);
      return here !== null && here !== there
        && String(win.getComputedStyle(pair.folded).pointerEvents).trim() !== 'none';
    });
    assert.ok(travels.length >= 9,
      `${theme}: the clock reading covers ${travels.length} travelling box(es); the fixture `
      + 'folds two sections, six rows and a foot, so a reading that found fewer has broken. '
      + `Covered: ${travels.map((pair) => pair.name).join(', ')}`);
  }
});

test('the gate fails when a row waits out the words before it closes (#588)', () => {
  // Exactly what this head replaced: the row holding the open column for --dur-fast after
  // the fold the reader already has, inside a rail that left without it.
  const mutation = '.ui-nav--side.is-collapsed .ui-nav__item {'
    + ' transition: width var(--dur-fast) var(--ease) var(--dur-fast); }';
  const { win, railPairs, clock } = readFold('dark', substitute(mutation, tokensFor('dark')));
  const problems = offTheRailsClock(win, railPairs, clock, 'folded');
  assert.ok(problems.some((p) => /^\.ui-nav__item .* on 150ms after 150ms/.test(p)),
    `a row that waits out a delay the rail does not have must be reported; got:\n  ${
      problems.join('\n  ')}`);
});

test('the gate fails when a block travels the width faster than the rail', () => {
  // Not only delays: a block that closes in --dur-fast is AHEAD of the rail rather than
  // behind it, which costs the reader nothing — but the frame it is wrong in is the same
  // frame, and a rule that accepted it could not say which side of the rail a box was on.
  const mutation = '.ui-nav--side > * { transition: width var(--dur-fast) var(--ease); }';
  const { win, railPairs, clock } = readFold('dark', substitute(mutation, tokensFor('dark')));
  const problems = offTheRailsClock(win, railPairs, clock, 'folded');
  assert.ok(problems.some((p) => /^\.ui-nav__section .* on 150ms after 0ms/.test(p)),
    `a block on a shorter clock than the rail must be reported; got:\n  ${problems.join('\n  ')}`);
});

test('the gate fails when a block names no clock at all, which is the way out going wrong', () => {
  // The #588 unfold: the width changes in one frame because nothing carries it. `none` is
  // the shape that reads as "no clock" and it has to be a finding, not an absence.
  const mutation = '.ui-nav--side > * { transition: none; }';
  const { win, railPairs, clock } = readFold('dark', mutation);
  const problems = offTheRailsClock(win, railPairs, clock, 'open');
  assert.ok(problems.some((p) => /^\.ui-nav__section .* on no clock of its own/.test(p)),
    `a block that names no clock must be reported; got:\n  ${problems.join('\n  ')}`);
});

test('the gate fails when the words stop being inert while they keep their own width', () => {
  // The words hold `min-width: max-content` so they are not squeezed by the closing row,
  // which puts them past the strip on purpose. The `pointer-events: none` on them is the
  // whole of what makes that safe, and taking it away has to be a finding.
  const mutation = '.ui-nav--side.is-collapsed .ui-nav__label { pointer-events: auto; }';
  const { found, strip } = readRail('dark', mutation);
  const problems = takesHitsPastStrip(found, strip);
  assert.ok(problems.length && problems.every((p) => /^\.ui-nav__label is held open by min-width: max-content/.test(p)),
    `words held open past the strip that take the pointer must be reported, and that has to `
    + `be the only finding; got:\n  ${problems.join('\n  ')}`);
});
