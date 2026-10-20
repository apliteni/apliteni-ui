/* One part of the Accessibility minimums walks. Each entry file in stories/guidelines/ calls one of
 * these once, and the deal is held in stories/lib/floor-parts.js.
 *
 * Each part runs only its own jobs on the worker pool and registers the tests that read them. The
 * claims over the whole set (every cell has one owner, every entry file exists) are in the main
 * file, so a part that is missing or repeated fails there.
 * why: #562
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { runJobs } from './job-pool.js';
import { THEMES } from './accessibility-walks.js';
import { ringCellsOf } from './floor-parts.js';
import {
  RING_MIN, RING_FLOOR, DISABLED_MIN, DISABLED_FLOOR,
} from '../guidelines/_accessibility-floor.js';

const WALKS = new URL('./accessibility-walks.js', import.meta.url);

/** The target walk. The main file asserts on what it returns. */
export async function targetPart() {
  const [targetRun] = await runJobs(WALKS, [{ fn: 'targetRun' }]);
  return targetRun;
}

/** The ring walk of every accent in one theme. */
export async function ringPart(theme) {
  const cells = ringCellsOf(theme);
  const runs = await runJobs(WALKS, cells.map((c) => ({ fn: 'ringCell', args: [c.theme, c.accent] })));
  const ringRun = Object.fromEntries(runs.map((c) => [`${c.theme}/${c.accent}`, c]));
  const keys = Object.keys(ringRun);

  test(`ring: this part walked every ${theme} cell, and only those [${theme}]`, () => {
    assert.deepEqual(keys, cells.map((c) => `${c.theme}/${c.accent}`));
    assert.ok(keys.length > 0, `no ${theme} cell was walked`);
    for (const run of runs) assert.equal(run.theme, theme);
  });

  test(`ring: every selector the sheet paints a ring on is landed somewhere by a story [${theme}]`, () => {
    for (const key of keys) {
      const run = ringRun[key];
      assert.ok(run.selectors.length >= 15, `${key}: only ${run.selectors.length} ring selectors found in the sheet`);
      const landed = new Set(run.landings.map((l) => l.selector));
      // `.ui-focusable` is the kit's opt-in class. No vanilla component wears it and no vanilla
      // story renders one, so it has no ground to be measured against. React's Tooltip trigger
      // wears it and is swept elsewhere. It is named so it cannot quietly become two. A ring
      // selector the sheet already paints is the subject here, so a control with no ring rule at
      // all is caught by the control walk in stories/focus-ring.test.js, not by this one.
      const orphans = run.selectors.filter((s) => !landed.has(s));
      assert.deepEqual(orphans, ['.ui-focusable:focus-visible'], `${key}: a ring selector no story renders is a ring nobody measured`);
    }
  });

  // Every accent is swept, not just the two themes: the ring is var(--accent) and each
  // sub-theme re-points it, so one accent is a different ring on the same surfaces.
  test(`ring: ${RING_MIN}:1 against every ground it lands on, in every ${theme} accent`, () => {
    const failing = keys.flatMap((key) => ringRun[key].landings
      .filter((l) => l.ratio != null && l.ratio < RING_MIN)
      .map((l) => `${key}: ${l.selector} on ${l.ground} — ${l.ratio.toFixed(2)}:1`));
    assert.deepEqual(
      failing, [],
      `${failing.length} ring landings under the ${RING_MIN}:1 of WCAG 1.4.11:\n  ${failing.join('\n  ')}`,
    );
  });

  // The bar above is what WCAG asks; this is what the kit actually reaches. The ratchet catches a
  // token moving the ring down long before it reaches the bar. It is the measured worst, so it
  // moves only by being re-measured.
  test(`ring: nothing has drifted below ${RING_FLOOR}:1, the worst the kit measures today [${theme}]`, () => {
    const worse = keys.flatMap((key) => ringRun[key].landings
      .filter((l) => l.ratio != null && Math.round(l.ratio * 100) / 100 < RING_FLOOR)
      .map((l) => `${key}: ${l.selector} on ${l.ground} — ${l.ratio.toFixed(2)}:1`));
    assert.deepEqual(worse, [], 'a token moved a ring landing below the worst #218 measured');
  });

  return ringRun;
}

/** The disabled walk of both themes. */
export async function disabledPart() {
  const runs = await runJobs(WALKS, THEMES.map((theme) => ({ fn: 'disabledCell', args: [theme] })));
  const disabledRun = Object.fromEntries(THEMES.map((theme, i) => [theme, runs[i]]));

  test('disabled: every rule that dims a control is found, and a story renders it', () => {
    const subjects = disabledRun.dark.subjects;
    assert.ok(subjects.length >= 5, `only ${subjects.length} disabled rules found in the sheet`);
    for (const theme of THEMES) {
      assert.ok(disabledRun[theme].found.length > 0, `${theme}: no disabled text measured at all`);
    }
  });

  test(`disabled: every label a disabled control shows clears ${DISABLED_MIN}:1, in both themes`, () => {
    const under = THEMES.flatMap((theme) => disabledRun[theme].found
      .filter((f) => f.labelled && f.ratio < DISABLED_MIN)
      .map((f) => `${theme} ${f.path} at opacity ${f.opacity} — ${f.ratio.toFixed(2)}:1`));
    assert.deepEqual(under, [], `disabled labels under the ${DISABLED_MIN}:1 floor #220 settled`);
  });

  test(`disabled: nothing has drifted below ${DISABLED_FLOOR}:1, the worst the kit measures today`, () => {
    for (const theme of THEMES) {
      const worse = disabledRun[theme].found
        .filter((f) => f.labelled && Math.round(f.ratio * 100) / 100 < DISABLED_FLOOR)
        .map((f) => `${f.path} at opacity ${f.opacity} — ${f.ratio.toFixed(2)}:1`);
      assert.deepEqual(worse, [], `${theme}: a token moved a disabled pair below the ratchet`);
    }
  });

  // The second half of the rule: a control could pass any legibility floor by looking enabled. The
  // comparison is the same element with the disabled state taken off it.
  test('disabled: the state repaints — off never looks the same as on', () => {
    const same = THEMES.flatMap((theme) => disabledRun[theme].found
      .filter((f) => !f.repaints)
      .map((f) => `${theme} ${f.path} — ${f.selector} paints exactly what the enabled control paints`));
    assert.deepEqual(same, [], 'a disabled control that is indistinguishable from an enabled one');
  });

  // `opacity` under a disabled selector drags a label and its box toward the ground together, and
  // the pair left is wherever the composite lands. A control with a label under it takes a paint,
  // not a fade. The switch track is what is left: there is nothing written inside it to fade.
  test('disabled: a rule that fades with opacity has no label under it', () => {
    const faded = THEMES.flatMap((theme) => disabledRun[theme].found
      .filter((f) => f.opacity < 1 && f.labelled)
      .map((f) => `${theme} ${f.path} — ${f.selector} at opacity ${f.opacity}`));
    assert.deepEqual(faded, [], 'a disabled label faded by opacity instead of painted');
  });

  return disabledRun;
}
