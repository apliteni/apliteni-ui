/* The chart's arithmetic: the band a series is drawn in, and the walk a bridge
 * takes. Subjects are discovered from the source, every documented option has
 * to change a result, and the whole-unit rule carries the mutation that kills
 * its case.
 *
 * What this does NOT reach: pixels, the DOM, the readout's wording, and the
 * caller's formatter. React's own use of these two functions is checked
 * separately in react/src/Chart.test.tsx — the calculation is shared, its
 * coverage is not.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHART_FLOOR, bridgeWalk, chartScale, pointTarget } from './chart.js';

const source = readFileSync(new URL('./chart.js', import.meta.url), 'utf8');

/* -- the subjects, read from the source rather than listed ------------------ */

const exported = [...source.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]).sort();
const exercised = { CHART_FLOOR, chartScale, bridgeWalk, pointTarget };

test('every exported name is one this file exercises', () => {
  assert.deepEqual(exported, Object.keys(exercised).sort());
  assert.equal(exported.length, 4, 'the module grew or shrank; add the case before the export');
  for (const name of exported) assert.notEqual(exercised[name], undefined, `${name} is not imported here`);
});

/* -- the band --------------------------------------------------------------- */

test('the band holds every value, and the axis prints whole units', () => {
  const scale = chartScale([38240, 40110, -31870, 16340]);
  assert.ok(scale.min <= -31870 && scale.max >= 40110, 'a value outside the band would be drawn outside the plot');
  assert.ok(scale.ticks.length >= 2, 'an axis needs two ticks to mean anything');
  for (const tick of scale.ticks) assert.equal(tick, Math.round(tick), `${tick} is not a whole unit`);
  assert.equal(scale.ticks[0], scale.min);
  assert.equal(scale.ticks.at(-1), scale.max);
  const gaps = new Set(scale.ticks.slice(1).map((t, i) => Math.round((t - scale.ticks[i]) * 1e6)));
  assert.equal(gaps.size, 1, 'the ticks are not evenly spaced, so the axis labels would lie about the gridlines');
});

test('a 2.5 step is taken where it is whole, and refused where it is not', () => {
  // 83,420 over four steps wants 20,855. 2 × 10^4 is under it and 5 × 10^4
  // halves the axis to three ticks, so the step that fits is 2.5 × 10^4.
  const money = chartScale([49300, -34120]);
  assert.equal(money.step, 25000);
  assert.equal(money.ticks.length, 5);
  // The same arithmetic one decade too low would want 2.5 itself.
  const small = chartScale([4.93, -3.41]);
  assert.ok(Number.isInteger(small.step), `a ${small.step} step would print half units`);
});

test('bars are read from zero, so the band keeps the zero line', () => {
  assert.equal(chartScale([120, 180, 240]).min, 0, 'a positive series still starts the band at zero');
  assert.equal(chartScale([-120, -180]).max, 0, 'a negative series still ends the band at zero');
  assert.ok(chartScale([200, 201], { zero: false, nice: false }).min > 0,
    'zero: false is what lets a line be read against itself');
});

test('a series that barely moves is not drawn as a cliff', () => {
  const flat = [1000, 1001, 1000.5, 1002];
  const tight = chartScale(flat, { zero: false, nice: false, floor: 0 });
  const floored = chartScale(flat, { zero: false, nice: false, floor: CHART_FLOOR });
  assert.equal(Math.round((tight.max - tight.min) * 100), 200, 'without a floor the band is the series’ own 2 units');
  assert.ok(floored.max - floored.min >= 1002 * CHART_FLOOR,
    `the floored band is ${floored.max - floored.min}, under ${1002 * CHART_FLOOR}`);
  const share = (flat.at(-1) - flat[0]) / (floored.max - floored.min);
  assert.ok(share < 0.02, `a 0.2% move takes ${(share * 100).toFixed(1)}% of the plot, which still reads as a cliff`);
});

test('a flat series and an empty one are still drawable', () => {
  const flat = chartScale([5, 5], { zero: false, nice: false });
  assert.ok(flat.max > flat.min, 'a band of zero height divides by zero wherever it is used');
  const none = chartScale([]);
  assert.deepEqual([none.min, none.max], [0, 1]);
  const nonsense = chartScale([Number.NaN, Infinity, 42]);
  assert.ok(nonsense.max >= 42, 'a NaN beside a real value must not take the band with it');
});

test('every documented option changes a result', () => {
  const documented = [...source.matchAll(/@param \{[^}]+\} \[options\.(\w+)\]/g)].map((m) => m[1]);
  assert.deepEqual(documented, ['ticks', 'zero', 'floor', 'nice'], 'the options moved; the cases below name them');
  // Each option is compared against the same call without it, so a case that
  // happens to land on the default result is reported rather than passed.
  const cases = {
    ticks: [[12, 48, 97], {}, { ticks: 10 }],
    zero: [[12, 48, 97], { nice: false }, { nice: false, zero: false }],
    floor: [[100, 101], { zero: false, nice: false }, { zero: false, nice: false, floor: CHART_FLOOR }],
    nice: [[12, 48, 97], {}, { nice: false }],
  };
  const unmeasured = documented.filter((name) => {
    const [values, without, with_] = cases[name];
    return JSON.stringify(chartScale(values, without)) === JSON.stringify(chartScale(values, with_));
  });
  assert.deepEqual(unmeasured, [], 'an option the module documents changed nothing here, so nothing holds it');
});

// The rule under test, taken back out. A step list carrying 2.5 is the real
// mistake: it is the conventional nice step everywhere else, and it puts half
// units on an axis the kit says prints whole ones.
test('a half-unit step is refused', () => {
  const brokenStep = (raw) => {
    const decade = 10 ** Math.floor(Math.log10(raw));
    return [1, 2, 2.5, 5, 10].find((s) => s * decade >= raw) * decade;
  };
  const step = brokenStep(2.2);
  const ticks = [0, step, step * 2];
  assert.throws(
    () => { for (const t of ticks) assert.equal(t, Math.round(t)); },
    /Expected values to be strictly equal/,
    'the whole-unit assertion passes a half-unit axis, so it is not holding the rule',
  );
});

/* -- the walk --------------------------------------------------------------- */

test('a bridge walks from a starting total through its components to a result', () => {
  const bars = bridgeWalk([
    { label: 'Opening', value: 120000 },
    { label: 'Subscriptions', value: 42000 },
    { label: 'Refunds', value: -8000 },
    { label: 'Payroll', value: -61000 },
    { label: 'Closing', kind: 'total' },
  ]);
  assert.deepEqual(bars.map((b) => b.kind), ['total', 'change', 'change', 'change', 'total']);
  assert.deepEqual(bars.map((b) => [b.from, b.to]), [
    [0, 120000], [120000, 162000], [162000, 154000], [154000, 93000], [0, 93000],
  ]);
  assert.equal(bars.at(-1).value, 93000, 'the closing total is the walk’s own sum, not a number the caller repeats');
  assert.deepEqual(bars.map((b) => b.label).slice(0, 2), ['Opening', 'Subscriptions'], 'the step’s own fields survive the walk');
});

test('a total inside the walk restates the running total, and a missing amount is zero', () => {
  const bars = bridgeWalk([
    { label: 'Opening', value: 100 },
    { label: 'Fees', value: -10 },
    { label: 'Half year', kind: 'total' },
    { label: 'Unknown' },
    { label: 'Fees', value: -5 },
  ]);
  assert.deepEqual(bars.map((b) => b.to), [100, 90, 90, 90, 85]);
  assert.deepEqual(bars[2], { label: 'Half year', kind: 'total', value: 90, from: 0, to: 90 });
  assert.equal(bars[3].value, 0, 'a step with no amount must not make the running total NaN');
});

test('an explicit opening change does not silently become a total', () => {
  const bars = bridgeWalk([{ label: 'Interest', value: 25, kind: 'change' }]);
  assert.deepEqual([bars[0].kind, bars[0].from, bars[0].to], ['change', 0, 25]);
});

/* -- the pointer target over a point ---------------------------------------- */

/* The sparkline a stat tile draws on a 390px phone, which is the layout #543's
 * re-review measured a missed tap in: eleven closed months in a 308px slot, so
 * 28px columns, and 32px of drawing. The phone floor is 44 and the AA floor the
 * kit holds at every width is 24.
 *
 * What this does NOT reach: the DOM, the SVG the component writes, and real
 * hit-testing. That the rectangles computed here are the ones a browser
 * actually answers a tap with is the browser half of
 * stories/chart-target.test.js. */
const SPARK = {
  columns: 11, colWidth: 28, drawn: 32, floor: 44, min: 24,
  get plotWidth() { return this.columns * this.colWidth; },
  get boxHeight() { return Math.max(this.drawn, this.floor); },
  get boxTop() { return -(this.boxHeight - this.drawn) / 2; },
};
const sparkBox = () => ({
  left: 0, right: SPARK.plotWidth, top: SPARK.boxTop, bottom: SPARK.boxTop + SPARK.boxHeight,
});
/** Where a sparkline puts the point of column `i` carrying `value` of `span`. */
const sparkPoint = (i, value, span = 1) => ({
  x: (i + 0.5) * SPARK.colWidth,
  y: 2 + (1 - value / span) * (SPARK.drawn - 4),
});
/** Every column's target, for a series that reaches both edges of the band. */
const sparkTargets = (values) => {
  const span = Math.max(...values);
  return values.map((v, i) => pointTarget(sparkPoint(i, v, span), {
    floor: SPARK.floor, min: SPARK.min, box: sparkBox(),
    column: [i * SPARK.colWidth, (i + 1) * SPARK.colWidth],
  }));
};
const VALUES = [1, 9, 3, 7, 2, 8, 4, 6, 5, 9, 1];

test('every point of a phone sparkline gets the whole phone floor, unclipped', () => {
  const targets = sparkTargets(VALUES);
  assert.equal(targets.length, 11, 'the sweep is the coverage: eleven columns, eleven targets');
  const box = sparkBox();
  const bad = targets
    .map((t, i) => ({ i, t }))
    .filter(({ t }) => t.h < SPARK.floor || t.y < box.top - 1e-9 || t.y + t.h > box.bottom + 1e-9);
  assert.deepEqual(
    bad.map(({ i, t }) => `column ${i}: ${t.w}x${t.h} at y=${t.y}, box ${box.top}..${box.bottom}`),
    [],
    'A target shorter than the floor, or reaching past the box the chart draws in, is the '
    + 'failure this function exists to prevent: the chart clips its own overflow, so the '
    + 'reader can touch only the part inside the box.',
  );
});

test('the two end points are named, because those are the ones that were clipped', () => {
  // The first and last columns carry the band's highest and lowest values here,
  // so their centres sit against the top and the bottom of the drawing — where
  // a target centred on the point loses half of itself over the edge.
  const first = pointTarget(sparkPoint(0, 9, 9), {
    floor: SPARK.floor, min: SPARK.min, box: sparkBox(), column: [0, SPARK.colWidth],
  });
  const last = pointTarget(sparkPoint(10, 0, 9), {
    floor: SPARK.floor, min: SPARK.min, box: sparkBox(),
    column: [10 * SPARK.colWidth, 11 * SPARK.colWidth],
  });
  assert.deepEqual(
    { x: first.x, y: first.y, w: first.w, h: first.h }, { x: 0, y: -6, w: 28, h: 44 },
    'The point at the top of the band reads 28x44 inside the box, which is what the review '
    + 'measured at 28x19.4.',
  );
  assert.deepEqual(
    { x: last.x, y: last.y, w: last.w, h: last.h }, { x: 280, y: -6, w: 28, h: 44 },
    'And the point at the bottom of the band, at the other end of the line.',
  );
  // Each still covers the point it belongs to, which is the whole purpose.
  for (const [name, t, p] of [['first', first, sparkPoint(0, 9, 9)], ['last', last, sparkPoint(10, 0, 9)]]) {
    assert.ok(
      p.x >= t.x && p.x <= t.x + t.w && p.y >= t.y && p.y <= t.y + t.h,
      `the ${name} target was moved off its own point`,
    );
  }
});

test('this gate rejects a target that is centred on the point and left clipped', () => {
  // The mutation: the arithmetic the component used before — centre the floor
  // on the point, cap it at the drawing's own height, and let the edge take
  // what falls outside. Every attribute still reads 28 wide, which is why a
  // check on the attributes alone passed over this.
  // The box that came with it was the drawing itself, 0 to 32 — growing the box
  // is half of the fix, so the mutation has to give that back too.
  const was = { top: 0, bottom: SPARK.drawn };
  const naive = (i, value, span) => {
    const p = sparkPoint(i, value, span);
    const h = Math.min(SPARK.floor, SPARK.drawn);
    return { x: p.x - SPARK.colWidth / 2, y: p.y - h / 2, w: SPARK.colWidth, h };
  };
  const clipped = (t, box) => Math.min(t.y + t.h, box.bottom) - Math.max(t.y, box.top);
  const before = naive(0, 9, 9);
  assert.ok(
    clipped(before, was) < SPARK.floor,
    'The mutation has to reproduce the defect, or it proves nothing: this target should lose '
    + `height to the box's edge and it kept ${clipped(before, was)}.`,
  );
  assert.ok(
    clipped(before, was) <= 20,
    `the review measured 19.4px of usable height and this reads ${clipped(before, was)}`,
  );
  const after = sparkTargets(VALUES.map((v, i) => (i === 0 ? 9 : v)))[0];
  assert.equal(
    clipped(after, sparkBox()), SPARK.floor,
    'and the same point, placed by pointTarget, has to come back whole or the fix is not held',
  );
});

test('a target stops at the midpoint to the next point in its column, not short of it', () => {
  // Two lines 30px apart in a 216px plot: the full 44 does not fit between
  // them, so each takes everything from its own side to the midpoint. Shrinking
  // both to 30 — the distance between them — would give away room neither
  // point's neighbour wants.
  const box = { left: 0, right: 480, top: 0, bottom: 216 };
  const upper = 60;
  const lower = 90;
  const at = (y, apart) => pointTarget({ x: 24, y }, {
    floor: 44, min: 24, box, column: [0, 48], apart,
  });
  const a = at(upper, [lower]);
  const b = at(lower, [upper]);
  assert.equal(a.h, 44, 'the upper point has the room above it to take the whole floor');
  assert.equal(a.y + a.h, 75, 'and stops exactly at the midpoint between the two points');
  assert.equal(b.y, 75, 'the lower point starts there, so the two meet and never overlap');
  assert.ok(b.h >= 24, 'and keeps at least the AA floor');
});

test('a column narrower than the AA floor keeps the floor rather than shrinking', () => {
  // A four-column sparkline in 64px: 16px columns. Growing a target to 44
  // across would make one point answer for nearly three periods, so it takes
  // the AA floor and no more — and is still held inside the box, so the first
  // and last points are whole.
  const box = { left: 0, right: 64, top: -6, bottom: 38 };
  const first = pointTarget({ x: 8, y: 2 }, { floor: 44, min: 24, box, column: [0, 16] });
  const last = pointTarget({ x: 56, y: 30 }, { floor: 44, min: 24, box, column: [48, 64] });
  assert.deepEqual([first.w, first.x], [24, 0], 'the first target is whole and starts at the edge');
  assert.deepEqual([last.w, last.x + last.w], [24, 64], 'and the last one ends at the other edge');
  assert.equal(first.h, 44, 'down there is nothing to share the column with');
});

test('a point in the middle of a roomy box is centred on itself', () => {
  // The placement only moves a target that would otherwise be clipped or would
  // cross a neighbour; everywhere else the target sits on its point.
  const t = pointTarget({ x: 100, y: 100 }, {
    floor: 44, min: 24, box: { left: 0, right: 480, top: 0, bottom: 216 }, column: [76, 124],
  });
  assert.deepEqual(t, { x: 78, y: 78, w: 44, h: 44 });
});
