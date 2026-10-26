/* Rule: an open filter menu reaches the kit's menu floor without leaving its row.
 *
 * #536 made a chip print its value alone, so #484's bound to the trigger left a
 * 48px menu breaking options mid-letter — #549.
 * why: docs/components.md#a-filter-row-holds-its-panels
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
import { readFileSync } from 'node:fs';
import { filterPanelFit, DD_MENU_FLOOR, dropdownViewportFit } from './dropdown-placement.js';
import { WIDTHS, SLACK } from '../../stories/lib/dropdown-contain.js';

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

/* -- The viewport fit, swept (moved from stories/dropdown-contain.test.js, #429) ------- */
/* -- The arithmetic, swept -------------------------------------------------- */
/* Subjects are a sweep rather than a list: every trigger position along a row, at
 * each width the issue names, for both of the edges `align` offers and for both
 * panel widths the kit ships. The fit is handed boxes, as JSDOM hands the wiring
 * boxes everywhere else in this tree. */

/** A view that answers the two questions the fit asks of one. */
const viewOf = (width, edge = 8) => ({
  getComputedStyle: () => ({ getPropertyValue: () => `${edge}px` }),
  document: { documentElement: { clientWidth: width } },
  innerWidth: width,
});

/**
 * A panel as the browser would report it: `left` is where the sheet puts it and
 * `shift` is a translate already written, which the rect includes and the fit has
 * to take off again.
 */
const panelAt = (left, width, view, { shift = 0, edge = 8, bar = false } = {}) => ({
  ownerDocument: { defaultView: viewOf(view, edge) },
  style: { translate: shift ? `${shift}px` : '' },
  closest: (sel) => (bar && sel === '.ui-filter-bar' ? {} : null),
  classList: { contains: () => false },
  getBoundingClientRect: () => ({ left: left + shift, right: left + shift + width, width }),
});

/** The kit's two panel widths: the menu floor, and the search variant's. */
const PANELS = [240, 280];
/** A trigger's own box, and where along the row it sits. */
const TRIGGER = 96;
const STEPS = 9;
/** Both edges `align` offers, each as the left the sheet would put the panel at:
 *  the trigger's own start, or its end less the panel's width. */
const ANCHORS = {
  start: (x) => x,
  end: (x, width) => x + TRIGGER - width,
};

/** Every case in the sweep: one panel, at one width, from one trigger position. */
const sweep = () => {
  const cases = [];
  for (const view of WIDTHS) {
    for (const width of PANELS) {
      for (let step = 0; step < STEPS; step += 1) {
        // The trigger walks the row from its start to its end, ends included.
        const x = Math.round(((view - TRIGGER) * step) / (STEPS - 1));
        cases.push({ view, width, x, align: 'start', left: ANCHORS.start(x, width) });
        cases.push({ view, width, x, align: 'end', left: ANCHORS.end(x, width) });
      }
    }
  }
  return cases;
};

/* Recorded, not derived from the loop that fills it: a count computed from the
 * sweep can only restate the sweep, so a sweep that quietly stopped reaching half
 * its cases would still report "all of them". Raising this is a deliberate act. */
const FLOOR_CASES = 144;   // 4 widths × 2 panel widths × 9 positions × 2 anchors

test('every trigger position in a row keeps its panel inside the view', () => {
  const cases = sweep();
  assert.ok(
    cases.length >= FLOOR_CASES,
    `${cases.length} cases swept, and the floor is ${FLOOR_CASES}. The sweep IS the coverage here.`,
  );
  const outside = [];
  for (const c of cases) {
    const fit = dropdownViewportFit(panelAt(c.left, c.width, c.view));
    assert.ok(fit, `no fit for a ${c.width}px panel at ${c.left} in a ${c.view}px view`);
    const left = c.left + fit.shift;
    if (left < -SLACK || left + c.width > c.view + SLACK) {
      outside.push(`${c.view}px view, align:${c.align}, trigger at ${c.x} → ${left}…${left + c.width}`);
    }
  }
  assert.deepEqual(
    outside, [],
    `${outside.length} of ${cases.length} fitted panels are not inside their view:\n  `
    + `${outside.slice(0, 8).join('\n  ')}`,
  );
});

test('a panel that fits at the edge it asked for is not moved', () => {
  // The other half of the ask: containment overrides `align`, and only then.
  const kept = sweep().filter((c) => {
    const edge = Math.max(0, Math.min(8, (c.view - c.width) / 2));
    return c.left >= edge && c.left + c.width <= c.view - edge;
  });
  assert.ok(
    kept.length >= 40,
    `${kept.length} of the swept cases already fit. A sweep where almost nothing fits would pass `
    + 'the rule below while proving nothing about it.',
  );
  for (const c of kept) {
    assert.equal(
      dropdownViewportFit(panelAt(c.left, c.width, c.view)).shift, 0,
      `a ${c.width}px panel at ${c.left} in a ${c.view}px view fits and was moved anyway`,
    );
  }
});

test('the fit is the same answer however many times it is asked', () => {
  // The wiring measures again on every resize and on every open, over a panel that
  // is already carrying the last answer. A fit measured from where it left the
  // panel rather than from where the sheet puts it would walk it off the screen.
  for (const c of sweep()) {
    const first = dropdownViewportFit(panelAt(c.left, c.width, c.view)).shift;
    const again = dropdownViewportFit(panelAt(c.left, c.width, c.view, { shift: first })).shift;
    assert.equal(again, first, `a ${c.width}px panel at ${c.left} in ${c.view} drifted on re-measure`);
  }
});

test('the gap is what the view can afford, and the start is what it keeps', () => {
  // 320 − 8 − 8 leaves 304 for a panel, so a 310px one has no room for both gaps
  // and a 400px one cannot honour both edges at all. It keeps its start, so the
  // reader meets the beginning of the rows; the sheet's max-width is what stops
  // the second case arising at all.
  const tight = dropdownViewportFit(panelAt(60, 310, 320));
  assert.equal(tight.edge, 5, 'the gap halves the slack when the slack is all there is');
  assert.equal(tight.left, 5);
  const over = dropdownViewportFit(panelAt(60, 400, 320));
  assert.equal(over.edge, 0, 'a panel wider than the view has no gap to keep');
  assert.equal(over.left, 0, 'and keeps its start');
});

test('the gap comes off the panel, so a page may set its own', () => {
  assert.equal(dropdownViewportFit(panelAt(0, 240, 320, { edge: 0 })).shift, 0);
  assert.equal(dropdownViewportFit(panelAt(0, 240, 320, { edge: 24 })).shift, 24);
});

test('a panel in a filter row is not this fit\'s subject', () => {
  // The row bounds its panels to itself, which is already inside the view, and
  // #549's slide is measured from a chip's offset along that row. Two fits writing
  // one panel's position would be two answers.
  assert.equal(dropdownViewportFit(panelAt(-200, 240, 320, { bar: true })), null);
  assert.notEqual(dropdownViewportFit(panelAt(-200, 240, 320)), null);
});

test('nothing to measure answers nothing', () => {
  assert.equal(dropdownViewportFit(null), null);
  assert.equal(dropdownViewportFit(undefined), null);
  // A view that lays nothing out — JSDOM is one — reports no width and no box. A
  // fit invented from zeroes would move every panel to the origin.
  assert.equal(dropdownViewportFit(panelAt(40, 0, 320)), null);
  assert.equal(dropdownViewportFit(panelAt(40, 240, 0)), null);
});

/* The mutation: the placement as #572 found it. `align` picks an edge of the
 * trigger and the panel hangs from it, unmeasured — which is the same sweep with
 * every shift set to zero. It has to put panels outside the view, or this gate's
 * sweep is measuring a geometry that was never wrong. */
test('this gate rejects a panel hung from its trigger and never measured', () => {
  const cases = sweep();
  const outside = cases.filter((c) => c.left < -SLACK || c.left + c.width > c.view + SLACK);
  assert.ok(
    outside.length >= cases.length / 3,
    `the unmeasured placement leaves ${outside.length} of ${cases.length} panels outside the view. `
    + 'A sweep that cannot catch the defect in most of its own cases is sweeping the wrong row: '
    + 'the positions have to reach both ends of it.',
  );
  // And both ends of the row are reached, not one: `align` moves the clipping from
  // one side to the other, so a sweep that only caught one side would pass with
  // half the fix.
  assert.ok(outside.some((c) => c.left < 0), 'no case clips at the view’s start');
  assert.ok(outside.some((c) => c.left + c.width > c.view), 'no case clips at the view’s end');
});


/* -- The stylesheet half (moved from stories/dropdown-contain.test.js, #429) -- */
const SHEET = readFileSync(new URL('../styles/dropdown.css', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

test('the gap a panel keeps from the view\'s edge is one named number', () => {
  // One declaration on the panel, and one phone override inside the 720px query: the page
  // margin, which is the step the shell's own gutter takes at that width.
  const declared = [...SHEET.matchAll(/--ui-dropdown-edge:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.deepEqual(declared, ['8px', 'var(--space-4)'],
    `dropdown.css declares --ui-dropdown-edge ${declared.length} times (${declared.join(', ') || 'never'}); `
    + 'the fit and the width bound both read it, so a second gap is two different gaps for one panel');
  assert.ok(/@media \(max-width: 720px\) \{[^{}]*\{[^{}]*--ui-dropdown-edge:\s*var\(--space-4\);/.exec(SHEET),
    'the second declaration is the phone override, inside the 720px query');
});

test('the panel keeps the floor that makes a menu readable', () => {
  const panel = SHEET.split(/\.ui-dropdown__panel\s*\{/)[1]?.split('}')[0] ?? '';
  assert.match(panel, /min-width:\s*240px/,
    'dropdown.css no longer floors .ui-dropdown__panel at 240px; the panel is moved, not narrowed (#549)');
});
