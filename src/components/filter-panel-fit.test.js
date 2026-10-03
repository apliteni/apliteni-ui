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

/** A dropdown at `left` inside a row of `width`, both as the browser reports.
 *  `end` pins its menu to the dropdown's inline end; `asks` is what the panel
 *  declares as `--ui-filter-panel-ask`, as a browser computes the property. */
const row = (rowWidth, rowLeft) => ({
  getBoundingClientRect: () => ({ left: rowLeft, right: rowLeft + rowWidth, width: rowWidth }),
  closest: (sel) => (sel === '.ui-filter-bar' ? row(rowWidth, rowLeft) : null),
});
const panelOf = (end, asks) => ({
  classList: { contains: (cls) => cls === 'is-end' && end },
  ownerDocument: { defaultView: { getComputedStyle: () => ({ getPropertyValue: () => asks }) } },
});
const at = (left, rowWidth, rowLeft = 0, end = false, asks = null) => ({
  getBoundingClientRect: () => ({ left: rowLeft + left, right: rowLeft + left + 60, width: 60 }),
  querySelector: () => panelOf(end, asks),
  closest: (sel) => (sel === '.ui-filter-bar__chip' ? row(rowWidth, rowLeft) : null),
});

/** A dropdown in the row but not in a chip. Without an ask its panel is anchored
 *  to the row and sizes itself; with one — #518's add control — it is measured
 *  like a chip's, from its own trigger. */
const rowAnchored = (left, rowWidth, rowLeft = 0, asks = null) => ({
  getBoundingClientRect: () => ({ left: rowLeft + left, right: rowLeft + left + 60, width: 60 }),
  querySelector: () => (asks === null ? null : panelOf(false, asks)),
  closest: (sel) => (sel === '.ui-filter-bar' ? row(rowWidth, rowLeft) : null),
});

/** The same chip with its menu pinned to the dropdown's inline end. */
const endAt = (left, rowWidth, rowLeft = 0) => at(left, rowWidth, rowLeft, true);

test('the fit reports the floor it reached for', () => {
  // The published parameter has to reach the rendered width, not only the room:
  // the stylesheet reads this number back as --ui-filter-panel-floor.
  assert.equal(filterPanelFit(at(0, 1000)).floor, DD_MENU_FLOOR);
  assert.equal(filterPanelFit(at(0, 1000), 320).floor, 320);
  // A row narrower than the ask still decides.
  assert.equal(filterPanelFit(at(0, 180), 320).floor, 180);
});

test('a chip with room ahead takes the floor and does not move', () => {
  assert.deepEqual(filterPanelFit(at(146, 1200)), { room: 1054, shift: 0, floor: 240, end: false });
});

test('a chip short of room shifts back until the floor fits', () => {
  // finance-cells at 320: a 240px row, the chip 146 along, 94px of room ahead.
  // Shifting the missing 146px puts the menu at the row's start, not past it.
  assert.deepEqual(filterPanelFit(at(146, 240)), { room: 240, shift: 146, floor: 240, end: false });
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

test('a panel anchored to the row, not a chip, is not a subject', () => {
  /* A panel that resolves against the row is already bounded by it, and the slide
   * here is measured from a trigger's offset along the row, so applying it would
   * push that panel outside. Such a panel sets its own width. */
  assert.equal(filterPanelFit(rowAnchored(220, 288)), null);
  assert.equal(filterPanelFit(rowAnchored(220, 1248)), null);
  // The same position inside a chip is a subject, so it is the anchor that
  // decides and not the geometry.
  assert.notEqual(filterPanelFit(at(220, 288)), null);
});

test('a dropdown outside a filter row is not a subject', () => {
  assert.equal(filterPanelFit({ closest: () => null, getBoundingClientRect: () => ({}) }), null);
  assert.equal(filterPanelFit(null), null);
  assert.equal(filterPanelFit(undefined), null);
});

test('a caller may ask for a different floor', () => {
  assert.equal(filterPanelFit(at(0, 1000), 320).room, 1000);
  assert.equal(filterPanelFit(at(900, 1000), 320).shift, 220);
  // And the width it asked for comes back, which is what the stylesheet reads.
  assert.equal(filterPanelFit(at(900, 1000), 320).floor, 320);
});

test('an end-anchored menu measures the room behind it', () => {
  // `is-end` pins the panel's right edge to the dropdown's, so it grows
  // backwards: the room is what lies between that edge and the row's start.
  // Measured forwards, a chip at the row's start looked roomy and the menu went
  // off the page.
  const first = endAt(0, 1000);        // box.right = 60, so 60px behind it
  assert.equal(filterPanelFit(first).room, 240);
  assert.equal(filterPanelFit(first).shift, 180);
  assert.equal(filterPanelFit(first).end, true);
});

test('an end-anchored menu with room behind it does not move', () => {
  const late = endAt(600, 1000);       // box.right = 660, far more than the floor
  assert.deepEqual(
    { room: filterPanelFit(late).room, shift: filterPanelFit(late).shift },
    { room: 660, shift: 0 },
  );
});

test('an end-anchored shift never passes the row’s own end', () => {
  // 1000-wide row, chip at 940: only 0px of slack towards the end.
  const tight = endAt(940, 1000);
  assert.equal(filterPanelFit(tight).shift, 0);
  assert.equal(filterPanelFit(tight).room, 1000);
});

test('the two anchors are the same calculation read in opposite directions', () => {
  // A chip at the row's start, start-anchored, has all the room; end-anchored it
  // has least. Mirroring the position mirrors the answer.
  const startAnchored = filterPanelFit(at(0, 1000));
  const endAnchored = filterPanelFit(endAt(940, 1000));
  assert.equal(startAnchored.shift, endAnchored.shift);
  assert.equal(startAnchored.room, endAnchored.room);
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

/* The add control's menu asks for more than a chip's values — a catalogue with a
 * field over it — and says so in the sheet as `--ui-filter-panel-ask`. #496 */
test('a panel that asks for a wider floor in the sheet gets it, and the shift it needs', () => {
  // The same dropdown, 146px along a 400px row: 254px ahead, enough for the kit's
  // floor and not for a panel's, so only the asking one moves.
  assert.deepEqual(filterPanelFit(at(146, 400)), { room: 254, shift: 0, floor: 240, end: false });
  assert.deepEqual(filterPanelFit(at(146, 400, 0, false, '320px')), { room: 320, shift: 66, floor: 320, end: false });
});

test('a floor passed in still wins over the one the sheet asks for', () => {
  // The argument is the caller's override; the property is the panel's default.
  assert.deepEqual(filterPanelFit(at(146, 400, 0, false, '320px'), DD_MENU_FLOOR),
    { room: 254, shift: 0, floor: 240, end: false });
});

test("an unreadable or absent floor falls back to the kit's, rather than to nothing", () => {
  for (const asked of [null, '', 'wide', '0px', '-10px']) {
    assert.deepEqual(
      filterPanelFit(at(146, 400, 0, false, asked)), { room: 254, shift: 0, floor: 240, end: false },
      `a panel asking "${asked}" has to be read as asking for nothing`,
    );
  }
});

test('the row still decides when it is narrower than the floor asked for', () => {
  // A phone's row is 288px: the catalogue asks for 320 and gets the row.
  const fit = filterPanelFit(at(0, 288, 0, false, '320px'));
  assert.deepEqual(fit, { room: 288, shift: 0, floor: 288, end: false });
});

/* And one that is not a chip's but asks for a width — #518's add control, whose
 * menu is anchored at its own trigger like a chip's and carries a catalogue with
 * a field over it. The ask is what makes it a subject; nothing else changes. */
test('a menu that is not a chip\'s is measured when it asks for a width', () => {
  // 220px along a 1248px row: a panel's width fits ahead, so nothing slides.
  assert.deepEqual(filterPanelFit(rowAnchored(220, 1248, 0, '320px')),
    { room: 1028, shift: 0, floor: 320, end: false });
  // 220px along a 390px row leaves 170px ahead, so it slides back the missing 150.
  assert.deepEqual(filterPanelFit(rowAnchored(220, 390, 0, '320px')),
    { room: 320, shift: 150, floor: 320, end: false });
  // A row narrower than the ask decides, and the slide stops at the row's start.
  assert.deepEqual(filterPanelFit(rowAnchored(16, 288, 0, '320px')),
    { room: 288, shift: 16, floor: 288, end: false });
});

test('an asking menu takes the chip arithmetic and gives a chip none of it', () => {
  // The same dropdown with and without the ask: one is a subject, one is not,
  // and a chip at the same offset is measured exactly as it was before.
  assert.equal(filterPanelFit(rowAnchored(220, 390)), null);
  assert.ok(filterPanelFit(rowAnchored(220, 390, 0, '320px')));
  assert.deepEqual(filterPanelFit(at(220, 390)), { room: 240, shift: 70, floor: 240, end: false });
  // An ask on a chip's panel is still read — the chip rule is what the sheet
  // scopes, not the arithmetic — so a chip that asked for more would get it.
  assert.equal(filterPanelFit(at(0, 1000, 0, false, '320px')).floor, 320);
});
