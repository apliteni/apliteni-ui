// Scroll arithmetic only; the browser evidence check measures real 390px layouts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { revealCurrentNav, revealFocusedNav } from './nav.js';

/** The attribute calls `fitNav` makes, read back with `hasAttribute`. */
const attributes = () => {
  const held = new Set();
  return {
    setAttribute: (name) => held.add(name),
    removeAttribute: (name) => held.delete(name),
    hasAttribute: (name) => held.has(name),
  };
};

/** Does the row say it has room for its links? */
const fits = (nav) => nav.hasAttribute('data-nav-fit');

/** A row whose current link sits at `rect`, in a row `scrollWidth` wide. */
const row = ({ scrollWidth, clientWidth = 310, rect }) => ({
  scrollLeft: 0, scrollWidth, clientWidth,
  ...attributes(),
  ownerDocument: { defaultView: { getComputedStyle: () => ({ paddingLeft: '4px', paddingRight: '4px' }) } },
  querySelector: () => (rect ? { getBoundingClientRect: () => rect } : null),
  getBoundingClientRect: () => ({ left: 40, right: 350 }),
  contains: () => true,
});

/** A tab as `revealFocusedNav` reads one: an event target that answers `closest`. */
const tab = (rect) => {
  const el = { getBoundingClientRect: () => rect };
  el.closest = (selector) => (selector === '.ui-nav__tab' ? el : null);
  return el;
};

test('reveals the current link at either edge without changing an already visible link', () => {
  let rect = { left: 360, right: 450 };
  const nav = { ...row({ scrollWidth: 600 }), querySelector: () => ({ getBoundingClientRect: () => rect }) };
  revealCurrentNav(nav);
  assert.equal(nav.scrollLeft, 104);
  rect = { left: 30, right: 120 };
  revealCurrentNav(nav);
  assert.equal(nav.scrollLeft, 90);
  rect = { left: 50, right: 140 };
  revealCurrentNav(nav);
  assert.equal(nav.scrollLeft, 90);
});

test('a row with no current link is left alone', () => {
  // Overflowing, so `!current` is the only half of the guard that can stop it.
  const nav = row({ scrollWidth: 600, rect: null });
  revealCurrentNav(nav);
  assert.equal(nav.scrollLeft, 0);
});

test('a row that fits is left alone even when its current link measures outside it', () => {
  // A row short enough to need no scrolling cannot be scrolled: scrollLeft stays
  // at 0 whatever the rects say. The rect is deliberately past the right edge, so
  // only the fits-in-row half of the guard keeps this row still — see the mutation
  // below, which is what proves that.
  const nav = row({ scrollWidth: 200, rect: { left: 360, right: 450 } });
  revealCurrentNav(nav);
  assert.equal(
    nav.scrollLeft, 0,
    'a row no wider than its viewport was scrolled anyway, which in a browser moves '
    + 'nothing and in a stale layout moves the row to a position it cannot hold',
  );
});

/* -- A link the keyboard lands on -------------------------------------------- */
//
// The numbers are the ones measured in Chromium at 390px on round r1's clipped
// frames: the scrollport ends at x=354 and the third link at x=354.859, with
// scrollLeft left at 0. The row's 4px padding is the room its links' rings are
// painted in, so bringing the link to the CONTENT edge is what puts the band back
// inside — 3px of it, --ring-gap-width plus --ring-width.

const PHONE_ROW = {
  scrollLeft: 0, scrollWidth: 456, clientWidth: 318,
  ...attributes(),
  ownerDocument: { defaultView: { getComputedStyle: () => ({ paddingLeft: '4px', paddingRight: '4px' }) } },
  getBoundingClientRect: () => ({ left: 36, right: 354 }),
  contains: () => true,
};

test('reveals a link the keyboard landed on, clearing the row for its ring', () => {
  const nav = { ...PHONE_ROW };
  revealFocusedNav(nav, tab({ left: 290, right: 354.859375 }));
  assert.equal(
    nav.scrollLeft, 4.859375,
    'the link was brought to the row\'s content edge: its right side lands at 350 with '
    + 'the scrollport ending at 354, so the 3px band has 4px of room and clears it',
  );
});

test('a focused link already clear of the edges does not move the row', () => {
  const nav = { ...PHONE_ROW };
  revealFocusedNav(nav, tab({ left: 120, right: 250 }));
  assert.equal(nav.scrollLeft, 0);
});

test('a focus that did not land on a tab leaves the row alone', () => {
  const nav = { ...PHONE_ROW };
  revealFocusedNav(nav, { closest: () => null });
  assert.equal(nav.scrollLeft, 0);
  revealFocusedNav(nav, null);
  assert.equal(nav.scrollLeft, 0, 'a focusin with no target is not a tab either');
});

test('a tab belonging to another row leaves this row alone', () => {
  // One delegated listener serves every row on the page, so the row it scrolls has
  // to be the row the link is in.
  const nav = { ...PHONE_ROW, contains: () => false };
  revealFocusedNav(nav, tab({ left: 290, right: 354.859375 }));
  assert.equal(nav.scrollLeft, 0);
});

/* -- Whether the row is a scroll box at all ---------------------------------- */
//
// A scroll box clips its children's PAINT at its padding edge, so a row that scrolls
// nothing still cut the ring's halo off every link in it — 4px of the roughly 14px it
// reaches survived, at 1280 as much as at 390. `data-nav-fit` is the row saying it has
// room, and the sheet takes the overflow back off it. The numbers below are the two
// states a reader meets: a desktop column with 513px of links in it, and the same row
// at 390.

test('a row with room for its links stops being a scroll box', () => {
  const nav = row({ scrollWidth: 513, clientWidth: 1208, rect: { left: 60, right: 150 } });
  revealCurrentNav(nav);
  assert.equal(
    fits(nav), true,
    'a row whose links fit is still marked as scrolling, so the sheet goes on clipping '
    + 'the halo of every ring painted in it at a width where nothing scrolls',
  );
});

test('a row whose links overflow stays a scroll box', () => {
  const nav = row({ scrollWidth: 521, clientWidth: 318, rect: { left: 60, right: 150 } });
  revealCurrentNav(nav);
  assert.equal(
    fits(nav), false,
    'an overflowing row was marked as fitting, which takes the overflow off the one box '
    + 'that holds a narrow row inside the page',
  );
});

test('a pixel between the two numbers still counts as room', () => {
  // A fractional column leaves the two measurements a sub-pixel apart, and a row that
  // flipped between the states on that would clip at some widths and not others. One
  // pixel of a link spilling lands in the 4px the row already bleeds into the gutter.
  const spare = row({ scrollWidth: 319, clientWidth: 318, rect: null });
  revealCurrentNav(spare);
  assert.equal(fits(spare), true, 'one pixel of slack was read as an overflowing row');
  const scrolls = row({ scrollWidth: 320, clientWidth: 318, rect: null });
  revealCurrentNav(scrolls);
  assert.equal(fits(scrolls), false, 'two pixels over is an overflow and has to scroll');
});

test('a row with no layout yet keeps what the sheet wrote', () => {
  // Folded away, or a tree with no layout engine: 0 and 0 would read as a fitting row
  // and take the containment off a row nobody has measured.
  const nav = row({ scrollWidth: 0, clientWidth: 0, rect: null });
  revealCurrentNav(nav);
  assert.equal(fits(nav), false, 'an unmeasured row was marked as fitting');
});

/* -- The mutation that kills the fit case ------------------------------------ */

const FIT = "nav.setAttribute('data-nav-fit', '')";

test('the fit case fails when the row stops being marked as fitting', async () => {
  const source = readFileSync(new URL('./nav.js', import.meta.url), 'utf8');
  assert.equal(
    source.split(FIT).length - 1, 1,
    `the mutation found no single copy of \`${FIT}\` — the measurement moved or was `
    + 'reworded, so move the mutation with it rather than deleting this test',
  );
  const mutated = `data:text/javascript,${encodeURIComponent(source.replace(FIT, 'void 0'))}`;
  const { revealCurrentNav: unmarked } = await import(mutated);
  const nav = row({ scrollWidth: 513, clientWidth: 1208, rect: { left: 60, right: 150 } });
  unmarked(nav);
  assert.equal(
    fits(nav), false,
    'the mark was deleted and the fitting row still reads as fitting, so the case above '
    + 'would pass with the clipping back in place and is measuring nothing',
  );
});

/* -- The mutation that kills the ring-room case ------------------------------ */

const PADDING = ' - (parseFloat(style.paddingRight) || 0)';

test('the ring-room case fails when the row stops repaying its padding', async () => {
  const source = readFileSync(new URL('./nav.js', import.meta.url), 'utf8');
  assert.equal(
    source.split(PADDING).length - 1, 1,
    `the mutation found no single copy of \`${PADDING.trim()}\` — the arithmetic moved, so `
    + 'move the mutation with it rather than deleting this test',
  );
  const mutated = `data:text/javascript,${encodeURIComponent(source.replace(PADDING, ''))}`;
  const { revealFocusedNav: flush } = await import(mutated);
  const nav = { ...PHONE_ROW };
  flush(nav, tab({ left: 290, right: 354.859375 }));
  assert.equal(
    nav.scrollLeft, 0.859375,
    'without the padding the link is brought flush with the scrollport edge, which is '
    + 'exactly the clipped band round r1 measured — so the case above would pass with '
    + 'the repayment deleted and is measuring nothing',
  );
});

/* -- The mutation that kills the case above ---------------------------------- */

const GUARD = ' || nav.scrollWidth <= nav.clientWidth';

test('the fitting-row case fails when the fits-in-row guard is removed', async () => {
  const source = readFileSync(new URL('./nav.js', import.meta.url), 'utf8');
  assert.equal(
    source.split(GUARD).length - 1, 1,
    `the mutation found no single copy of \`${GUARD.trim()}\` — the guard moved or was reworded, `
    + 'so move the mutation with it rather than deleting this test',
  );
  const mutated = `data:text/javascript,${encodeURIComponent(source.replace(GUARD, ''))}`;
  const { revealCurrentNav: unguarded } = await import(mutated);
  const nav = row({ scrollWidth: 200, rect: { left: 360, right: 450 } });
  unguarded(nav);
  assert.notEqual(
    nav.scrollLeft, 0,
    'without the guard the fitting row is still left at 0, so the case above would pass '
    + 'with the guard deleted and is measuring nothing',
  );
});
