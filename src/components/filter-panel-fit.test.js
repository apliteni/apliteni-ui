/* Rule: an open filter menu reaches the kit's menu floor without leaving its row.
 *
 * #536 made a chip print its value alone, so #484's bound to the trigger left a
 * 48px menu breaking options mid-letter — #549.
 * why: docs/specification.md#a-filter-row-holds-its-panels
 *
 * WHAT THIS GATE DOES NOT REACH:
 *   - Layout: rects are supplied here. That a real menu lands where this says is
 *     measured by scripts/evidence/filter-bar-fit.mjs, which `npm test` cannot run.
 *   - Whether the stylesheet reads the two properties this feeds, or falls back
 *     to the trigger's width when they are unset.
 *   - A row laid out right-to-left; every rect here is left-to-right.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterPanelFit, DD_MENU_FLOOR } from './dropdown.js';

/** A dropdown at `left` inside a row of `width`, both as the browser reports. */
const at = (left, rowWidth, rowLeft = 0) => ({
  getBoundingClientRect: () => ({ left: rowLeft + left, right: rowLeft + left + 60, width: 60 }),
  closest: (sel) => (sel === '.ui-filter-bar' ? {
    getBoundingClientRect: () => ({ left: rowLeft, right: rowLeft + rowWidth, width: rowWidth }),
  } : null),
});

test('the floor is the width `.ui-dropdown__panel` writes, so the two cannot drift', () => {
  assert.equal(DD_MENU_FLOOR, 240);
});

test('a chip with room ahead takes the floor and does not move', () => {
  assert.deepEqual(filterPanelFit(at(146, 1200)), { room: 1054, shift: 0 });
});

test('a chip short of room shifts back until the floor fits', () => {
  // finance-cells at 320: a 240px row, the chip 146 along, 94px of room ahead.
  // Shifting the missing 146px puts the menu at the row's start, not past it.
  assert.deepEqual(filterPanelFit(at(146, 240)), { room: 240, shift: 146 });
});

test('a shift never passes the row’s own start', () => {
  const fit = filterPanelFit(at(20, 100));
  assert.equal(fit.shift, 20);
  assert.equal(fit.room, 100);
});

test('a row narrower than the floor decides the width instead', () => {
  const fit = filterPanelFit(at(0, 214));
  assert.equal(fit.room, 214);
  assert.equal(fit.shift, 0);
});

test('the room reported is measured from where the menu ends up', () => {
  // room is what the stylesheet caps `max-width` with, so it has to count from
  // the shifted edge — otherwise a shifted menu is capped at its old width.
  const fit = filterPanelFit(at(100, 300));
  assert.equal(fit.shift, 40);
  assert.equal(fit.room, 240);
  assert.equal(fit.room, 300 - 100 + fit.shift);
});

test('the row offset is honoured, not assumed to start at zero', () => {
  assert.deepEqual(filterPanelFit(at(146, 240, 500)), filterPanelFit(at(146, 240, 0)));
});

test('a dropdown outside a filter row is not a subject', () => {
  assert.equal(filterPanelFit({ closest: () => null, getBoundingClientRect: () => ({}) }), null);
  assert.equal(filterPanelFit(null), null);
  assert.equal(filterPanelFit(undefined), null);
});

test('a caller may ask for a different floor', () => {
  assert.equal(filterPanelFit(at(0, 1000), 320).room, 1000);
  assert.equal(filterPanelFit(at(900, 1000), 320).shift, 220);
});

/* The mutations. Each is a way the arithmetic could be wrong and still look
 * plausible, and each has to be refused. */
test('a fit that ignored the row would let a menu leave it', () => {
  // The shape of the bug: floor first, room second. Shifting back by more than
  // the chip has behind it puts the menu past the row's start.
  const naive = (left, rowWidth) => ({ shift: Math.max(0, DD_MENU_FLOOR - (rowWidth - left)) });
  assert.equal(naive(20, 100).shift, 160);
  assert.equal(filterPanelFit(at(20, 100)).shift, 20);
});

test('a fit that ignored the floor would leave #549 in place', () => {
  // Bounded to the trigger, the menu is 60px wide wherever there is room.
  const fit = filterPanelFit(at(0, 1200));
  assert.ok(fit.room >= DD_MENU_FLOOR, 'a menu with a whole row ahead must reach the floor');
});
