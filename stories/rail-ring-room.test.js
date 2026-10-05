// Rule: a folded rail does not cut off its rows' focus ring.
//
// The kit ring is drawn OUTSIDE the border box of the thing that has focus — one pixel
// of offset and two of band, from --ring-gap-width and --ring-width. stories/
// panel-ring-room.test.js asks a menu panel to leave that spread a way out: padding
// inside its own box, or no clip at its edge. A folded rail has to answer the same
// question and ONE MORE, because its rows are not cut to its width. The rail is
// --ui-nav-strip wide and a row is laid out from --ui-nav-col, so a row that keeps the
// open column runs five times the rail's width and its right band is drawn off the
// rail whether the rail clips or not. Both halves are the rule here: a row FITS the
// column the rail lays it out in, and the rail leaves the ring a way out of its own box.
//
// #575 is what the first half cost. `.ui-nav--side.is-collapsed` was `overflow-x: clip`
// over rows that kept the open column, so Chrome drew the ring's top and bottom bands
// across the strip and cut both ends away: the reader met two accent bars, the shape
// #519 had just left on the account menu. Measured in Chrome at 1280 and 390 in both
// themes before and after — the ring's ink spanned exactly the 41px strip, and now
// spans -3 to 43.5 around a 41px row.
//
// Subjects are discovered, not listed: every element inside a rendered folded rail
// that draws the kit ring when it is focused. A rail that grows a new kind of row has
// that row measured here the day it is added, and a reading that finds fewer than the
// rail renders stops the gate rather than passing over them.
//
// Coverage limits:
// - Pixels. This resolves the kit's sheets with the tokens substituted and
//   `:focus-visible` desugared to an attribute, so JSDOM computes a real outline and a
//   real width; it lays nothing out and paints nothing. The band is an `outline` since
//   #578 — it was a three-layer box-shadow when this gate was written, and the property
//   is the only thing that changed: the band is still 2px standing 1px off the border
//   box, so every number below is the number it was written against. Chrome measured the ring
//   itself for #575, before and after, at both widths in both themes.
// - Whether the row takes the ring AT ALL is stories/focus-ring.test.js's question.
//   This gate reads only the rows that already draw it, and a rail whose rows lost
//   their ring entirely would leave this one with nothing to measure — which is what
//   the count below is for.
// - A width this gate cannot resolve to a length — `100%`, `auto`, a calc it cannot
//   fold — is a failure, not a pass. It cannot tell what `100%` of a parent is without
//   laying the rail out, and the whole defect was a row whose width came from one.
// - The column, not the outline. A rail's padding and border come OUT of the width it
//   lays a row out in, so a row is measured against that column and not against the
//   rail's own width. #588 is what reading the outline cost: this gate certified
//   `overflow-x: clip; padding: 3px` over rows still cut to the whole strip, and Chrome
//   put those rows 3px past the content box and took 6px of every ring. The premise is
//   that the kit makes every box a border box; JSDOM does not apply that universal rule,
//   so it is read off the sheet and held by a test of its own.
// - Ancestors. A rail that clips nothing itself can still stand inside something that
//   clips; this gate asks the rail.
// - The rail's own base rule and the rules the folded class adds, not what a media
//   query or a consumer's sheet does to either.
// - The page shell draws its OWN folded rail (`.ui-app__rail`), whose rows keep the
//   open column so the fold lays none of them out again, and which clips with
//   `overflow-x: hidden` beside a scrolling `overflow-y`. It is a different box with a
//   different answer and it is not this gate's subject; its ring was measured and
//   reported on #575.
//
// why: docs/specification.md#a-menu-panel-does-not-cut-off-its-rows-ring
// Weaken the rule and confirm that its test fails.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { STYLE_FILES, desugar, substitute, tokensFor } from './lib/contrast.js';
import { sidebarNav } from '../src/components/nav.js';

const source = STYLE_FILES.map((file) => readFileSync(file, 'utf8')).join('\n');

/** The rail the gate measures, with a row of every kind the factory can draw. */
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

/** 1px of offset and 2px of band: what --ring draws outside the border box. --ring-offset
 *  is --ring-gap-width, so the spread is the same three pixels an outline leaves. */
const spread = (() => {
  const tokens = readFileSync('src/tokens/tokens.css', 'utf8');
  const read = (name) => Number(/^(-?\d+(?:\.\d+)?)px$/.exec(
    new RegExp(`${name}\\s*:\\s*([^;]+)`).exec(tokens)[1].trim(),
  )[1]);
  return read('--ring-gap-width') + read('--ring-width');
})();

/**
 * The rail staged in JSDOM with the sheets resolved, plus the reference ring.
 *
 * `extra` is appended last, so a mutation below can put a declaration back without
 * touching anything on disk.
 */
function stage(theme, extra = '') {
  const css = `${desugar(substitute(source, tokensFor(theme)))}\n${extra}`;
  const html = `<style>${css}</style><div id="folded">${railMarkup(true)}</div>`
    + `<div id="open">${railMarkup(false)}</div>`
    + '<button class="ui-focusable" id="ref">Reference</button>';
  return new JSDOM(html).window;
}

const focus = (el) => el.setAttribute('data-ui-state', 'focus-visible');

/** px, or null for a width no reading can turn into one — `100%`, `auto`, a bare calc. */
const px = (value) => {
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(String(value ?? '').trim());
  return match ? Number(match[1]) : null;
};

/** The sides a `padding` shorthand sets, smallest first; null if any is unreadable. */
const roomIn = (style) => {
  const sides = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']
    .map((side) => px(style[side]) ?? (/^0+(?:\.0+)?$/.test(String(style[side]).trim()) ? 0 : null));
  return sides.some((side) => side === null) ? null : Math.min(...sides);
};

/**
 * The column a rail lays a row out in: its width, less what its padding and border take.
 *
 * The kit makes every box a border box, so a PADDED rail lays its rows out in less than
 * its own width — and a row cut to the whole width stands past the clip with its ring.
 * That is what #588 found this gate reading past: it certified `padding: 3px` over rows
 * still cut to the strip, and Chrome took 6px of the ring off the right of every one.
 * JSDOM does not apply the universal `box-sizing` rule, so the premise is read off the
 * sheet and held by the first test below rather than taken from the cascade.
 */
const columnIn = (style, width) => {
  const edges = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth']
    .map((side) => px(style[side]) ?? (/^0+(?:\.0+)?$/.test(String(style[side]).trim()) ? 0 : null));
  return edges.some((edge) => edge === null) ? null : width - edges.reduce((a, b) => a + b, 0);
};

/** `*, *::before, *::after { box-sizing: border-box }` — what columnIn is written against. */
const BORDER_BOX = /\*\s*,\s*\*::before\s*,\s*\*::after\s*\{[^}]*box-sizing:\s*border-box/
  .test(source);

/** Whether the box clips at its own edge: any overflow side that is not `visible`. */
const clips = (style) => ['overflow', 'overflowX', 'overflowY']
  .some((prop) => style[prop] && !['visible', ''].includes(String(style[prop]).trim()));

/**
 * Every box in `root` that draws the kit ring when it is focused, with its width.
 *
 * Discovery, not a list: the ring is read off the reference control on the same page,
 * so a row is a subject because it paints what that control paints and for no other
 * reason.
 */
function ringCarriers(win, root, ring) {
  const found = [];
  for (const el of root.querySelectorAll('*')) {
    focus(el);
    const style = win.getComputedStyle(el);
    const draws = style.outline && style.outline.trim() === ring;
    el.removeAttribute('data-ui-state');
    if (!draws) continue;
    found.push({
      el,
      name: `.${[...el.classList].join('.')}`,
      width: win.getComputedStyle(el).width,
    });
  }
  return found;
}

/**
 * The rows a folded rail cuts the ring off, each named with what is wrong. `find` is
 * injectable so a mutation can be read without writing it.
 */
function cutsOff(win, { rail, rows, extra = '' }) {
  const railStyle = win.getComputedStyle(rail);
  const railWidth = px(railStyle.width);
  const problems = [];
  if (railWidth === null) {
    problems.push(`the rail's own width reads ${railStyle.width}, which is no measurement for the rows inside it`);
    return problems;
  }
  const room = roomIn(railStyle);
  if (room === null) problems.push(`the rail writes a padding this gate cannot resolve: ${railStyle.padding}`);
  const column = columnIn(railStyle, railWidth);
  if (column === null) {
    problems.push(`the rail writes a padding or border this gate cannot resolve: ${railStyle.padding}`);
  }
  // Way out one: the ring lands in the rail's own padding. Way out two: nothing clips.
  if (clips(railStyle) && (room ?? 0) < spread) {
    problems.push(`the rail clips at its edge with ${room}px of padding for a ${spread}px ring`);
  }
  for (const row of rows) {
    const width = px(row.width);
    if (width === null) {
      problems.push(`${row.name} is ${row.width} wide, and a row cut from the open column draws its ring off the rail`);
    } else if (column !== null && width > column) {
      // The two readings are one rule. An unpadded rail lays its rows out in its own
      // width, and the row is simply too wide for the rail; a padded one lays them out
      // in less, and a row that fills the rail stands past the padding meant to hold
      // its ring. Each says which it is, because the way out differs.
      problems.push(column === railWidth
        ? `${row.name} is ${width}px wide on a ${railWidth}px rail, so its ring is drawn past the rail's edge`
        : `${row.name} is ${width}px wide in the ${column}px a ${railWidth}px rail lays a row out in, `
          + `so it stands past the padding keeping the ring's ${spread}px and is clipped with it`);
    }
  }
  return problems.map((p) => (extra ? `${p} [${extra}]` : p));
}

/** Everything a check below needs, read once per theme. */
function readRail(theme, extra = '') {
  const win = stage(theme, extra);
  const doc = win.document;
  const reference = doc.querySelector('#ref');
  focus(reference);
  const ring = win.getComputedStyle(reference).outline.trim();
  assert.ok(ring && ring !== 'none', `the kit ring resolved nothing in ${theme}`);
  const rail = doc.querySelector('#folded .ui-nav--side.is-collapsed');
  assert.ok(rail, 'sidebarNav({ collapsed: true }) no longer renders a folded rail');
  return { win, doc, ring, rail, rows: ringCarriers(win, rail, ring) };
}

/* -- the gate -------------------------------------------------------------------- */

test('the ring\'s spread is still the three pixels every check below is written against', () => {
  assert.equal(spread, 3, 'the ring\'s spread changed; the rail\'s room has to be re-read against it');
});

test('every row a folded rail renders is a row this gate measures', () => {
  for (const theme of ['light', 'dark']) {
    const { doc, rows } = readRail(theme);
    // What the rail renders, against what draws the ring. The two have to agree:
    // a row that quietly stopped taking the ring would leave this gate measuring
    // less and reporting the same green.
    const rendered = [...doc.querySelectorAll('#folded .ui-nav__item')];
    assert.ok(rendered.length >= 6,
      `${theme}: the fixture renders ${rendered.length} rows; it draws a leaf, a counter, a group `
      + 'toggle, two nested rows and a destructive footer row, so a reading that found fewer has broken');
    const missing = rendered.filter((el) => !rows.some((row) => row.el === el))
      .map((el) => `.${[...el.classList].join('.')}`);
    assert.deepEqual(missing, [],
      `${theme}: ${missing.length} row(s) of the folded rail draw no ring, so nothing here measures them: `
      + `${missing.join(', ')}. stories/focus-ring.test.js is the gate that asks a stop for a ring.`);
  }
});

test('no folded rail cuts its rows\' focus ring off', () => {
  for (const theme of ['light', 'dark']) {
    const { win, rail, rows } = readRail(theme);
    assert.deepEqual(cutsOff(win, { rail, rows }), [],
      `${theme}: a folded rail cuts its rows' focus ring away:\n  `
      + `${cutsOff(win, { rail, rows }).join('\n  ')}\n`
      + '  close the rows to --ui-nav-strip and leave the rail nothing to clip, or keep the '
      + 'ring\'s spread inside the rail as padding.');
  }
});

test('the open rail is left alone: its rows still keep the open column', () => {
  // The fold is the only place the rule applies. A reading that closed every rail
  // would pass the checks above and shrink the rail nobody asked about.
  for (const theme of ['light', 'dark']) {
    const { win, doc, ring } = readRail(theme);
    const open = doc.querySelector('#open .ui-nav--side');
    const rows = ringCarriers(win, open, ring);
    assert.ok(rows.length, `${theme}: the open rail draws no ring at all`);
    const closed = rows.filter((row) => px(row.width) !== null);
    assert.deepEqual(closed.map((row) => `${row.name} ${row.width}`), [],
      `${theme}: the open rail's rows are no longer laid out from the column around them`);
  }
});

test('the gate fails when the rail clips across its rows again (#575)', () => {
  // The #575 state, exactly: the clip back on, over rows that keep the open column.
  // Both halves live in this string; nothing on disk is touched.
  const mutation = '.ui-nav--side.is-collapsed { overflow-x: clip; overflow-y: visible; }'
    + '.ui-nav--side.is-collapsed .ui-nav__item { width: var(--ui-nav-col); }';
  const { win, rail, rows } = readRail('dark', substitute(mutation, tokensFor('dark')));
  const problems = cutsOff(win, { rail, rows });
  assert.ok(problems.some((p) => /clips at its edge with 0px of padding for a 3px ring/.test(p)),
    `putting the clip back on an unpadded rail has to be reported; got:\n  ${problems.join('\n  ')}`);
  assert.ok(problems.some((p) => /216px wide on a 41px rail/.test(p)),
    `a row that keeps the open column has to be reported; got:\n  ${problems.join('\n  ')}`);
});

test('the gate fails for a row off the rail even when the rail clips nothing', () => {
  // The half a menu panel's rule does not have. The rail lets the ring cross its edge,
  // and the row is still five times the rail wide, so the right band is drawn off it.
  const mutation = '.ui-nav--side.is-collapsed .ui-nav__item { width: var(--ui-nav-col); }';
  const { win, rail, rows } = readRail('dark', substitute(mutation, tokensFor('dark')));
  const problems = cutsOff(win, { rail, rows });
  assert.ok(problems.length && problems.every((p) => /216px wide on a 41px rail/.test(p)),
    `an unclipped rail with rows off its edge has to be reported, and only for that; got:\n  ${
      problems.join('\n  ')}`);
});

test('the rail\'s room is read as a border box, which is what the kit makes every box', () => {
  assert.ok(
    BORDER_BOX,
    'src/styles/base.css no longer makes `*, *::before, *::after` a border box. Every reading '
    + 'below takes a rail\'s padding and border OUT of the column its rows are laid out in, and '
    + 'that is only true of a border box. JSDOM does not apply the universal rule, so this gate '
    + 'cannot read the answer out of the cascade and has to be re-derived against what the kit '
    + 'sets now.',
  );
});

/** The strip, read from the cascade rather than written here twice. */
const stripWidth = (theme = 'dark') => {
  const { win, rail } = readRail(theme);
  return px(win.getComputedStyle(rail).width);
};

test('the other way out is real: a rail that keeps the room may clip', () => {
  // The arrangement a menu panel takes — the ring lands in the rail's own padding —
  // reads as no finding, so the rule is a pair of ways out and not one rule written
  // twice. The row closes to what the padding LEAVES, which is the half #588 cost:
  // a border-box rail spends its padding out of the column, so a row still cut to the
  // whole strip stands past the clip rather than inside it. Measured in Chrome, this
  // fixture: rail 24..65, row 27..62, ring ink at 24,25 and 63,64 — inside the clip
  // edge on both sides. The current plate closes with the row, because a plate left at
  // the strip paints OVER the ring's right band: it is a z-index: -1 ::before, which
  // paints after its row's own background.
  const strip = stripWidth();
  const mutation = `.ui-nav--side.is-collapsed { overflow-x: clip; padding: ${spread}px; }`
    + `.ui-nav--side.is-collapsed .ui-nav__item { width: ${strip - 2 * spread}px; }`
    + '.ui-nav--side.is-collapsed .ui-nav__item.is-active::before '
    + `{ width: ${strip - 2 * spread}px; }`;
  const { win, rail, rows } = readRail('dark', substitute(mutation, tokensFor('dark')));
  assert.deepEqual(cutsOff(win, { rail, rows }), [],
    'a folded rail that keeps the ring\'s spread inside its own box, over rows that close to '
    + 'what the padding leaves, may clip at its edge');
});

test('the gate fails for a padded rail whose rows still span the whole strip (#588)', () => {
  // What this gate certified and Chrome refused. `padding: 3px` on a border-box rail
  // lays its rows out in 6px less than the strip, so a row still cut to the strip
  // stands 3px past the content box and draws its ring 6px past the clip. Measured in
  // Chrome: rail x 24..65, row 27..68, the ring's right band to 71, clipped at 65.
  const strip = stripWidth();
  const column = strip - 2 * spread;
  const mutation = `.ui-nav--side.is-collapsed { overflow-x: clip; padding: ${spread}px; }`;
  const { win, rail, rows } = readRail('dark', substitute(mutation, tokensFor('dark')));
  const problems = cutsOff(win, { rail, rows });
  assert.ok(
    rows.length && problems.length === rows.length
      && problems.every((p) => p.includes(`is ${strip}px wide in the ${column}px`)),
    `${rows.length} row(s) of a padded rail that still span it have to be reported, and the `
    + `padding itself is not the finding — it is ${spread}px and holds the ring; got:\n  `
    + `${problems.join('\n  ')}`,
  );
});

test('the gate fails when a row\'s width stops being a length it can read', () => {
  // `100%` of what? The rail is 41px and the column 216px, and the defect was a row
  // that took the second. A width this gate cannot fold is a failure, not a pass.
  const mutation = '.ui-nav--side.is-collapsed .ui-nav__item { width: 100%; }';
  const { win, rail, rows } = readRail('dark', mutation);
  const problems = cutsOff(win, { rail, rows });
  assert.ok(problems.length && problems.every((p) => /is 100% wide, and a row cut from the open column/.test(p)),
    `a row whose width is a percentage has to be reported; got:\n  ${problems.join('\n  ')}`);
});
