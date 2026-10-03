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
import { CHART_FLOOR, bridgeWalk, chartScale } from './chart.js';

const source = readFileSync(new URL('./chart.js', import.meta.url), 'utf8');

/* -- the subjects, read from the source rather than listed ------------------ */

const exported = [...source.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]).sort();
const exercised = { CHART_FLOOR, chartScale, bridgeWalk };

test('every exported name is one this file exercises', () => {
  assert.deepEqual(exported, Object.keys(exercised).sort());
  assert.equal(exported.length, 3, 'the module grew or shrank; add the case before the export');
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
