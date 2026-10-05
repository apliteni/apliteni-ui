/* Rule: a published motion helper whose declaration accepts a missing element
 * answers its documented value for one, in an engine that HAS a window.
 *
 * `transitionMs()` shipped declaring `Element | null | undefined` and fell back
 * to the global window, reaching `getComputedStyle(null)` — a `TypeError` in
 * every real engine. Its unit tests passed because `node --test` installs no
 * `window`, the one environment the fault cannot appear in, so the source half
 * here installs a jsdom one and the browser half asks Chromium.
 *
 * Subjects come from src/motion.d.ts; rejection is proved by removing a guard.
 * why: docs/foundations.md#motion
 */

/* State what this test cannot measure.
 *
 * WHAT THIS GATE DOES NOT REACH:
 *   - A parameter admitting a missing element only through an optional `?`.
 *     `initReveal(root?)` is not read as a promise about one.
 *   - Anything outside the declaration: a text node, a window, a wrapper object.
 *   - What a helper does with a real element. The arithmetic is held by
 *     src/motion.test.js, the panel's 250ms by scripts/evidence/filter-bar-fit.mjs.
 *   - Engines other than jsdom and the Chromium the browser half launches.
 *   - Whether a caller sizes a timer from the answer, held by its own suite.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

const SOURCE = 'src/motion.js';
const TYPES = 'src/motion.d.ts';
const src = read(SOURCE);

/* The declaration is the promise a consumer's editor shows them, so it is what
 * the subject set comes from: every exported function whose element parameter
 * spells out `null` or `undefined`. */
const DECLARED = /export declare function (\w+)\(([^)]*)\)\s*:\s*([^;]+);/g;
const subjects = [...read(TYPES).matchAll(DECLARED)]
  .map(([, name, params, returns]) => ({
    name,
    param: params.split(',')[0].trim(),
    returns: returns.trim(),
  }))
  .filter((s) => /\b(?:null|undefined)\b/.test(s.param));

/** What a missing element is documented to answer: a duration of 0, else nothing. */
const documented = (s) => (s.returns === 'number' ? 0 : undefined);

const MISSING = [['null', null], ['undefined', undefined]];

/* The guard is the first statement of the function, after any comment above it.
 * Taking it out is this gate's mutation: the helper then reaches the DOM call
 * the declaration promised it would not. */
const guard = (name) => new RegExp(
  `(export function ${name}\\([^)]*\\) \\{\\n(?:[ \\t]*//[^\\n]*\\n)*)[ \\t]*if \\([^\\n]*\\) return[^\\n]*;\\n`,
);

/** The module source with one subject's guard removed, or null when it has none. */
function without(name) {
  const cut = src.replace(guard(name), '$1');
  return cut === src ? null : cut;
}

/** Import a module from source text, so a mutation needs no file on disk. */
const load = (code) =>
  import(`data:text/javascript;base64,${Buffer.from(code, 'utf8').toString('base64')}`);

/* -- The subject set -------------------------------------------------------- */

test('every helper declaring a missing element is a subject, and is published', () => {
  assert.ok(
    subjects.length >= 3,
    `${subjects.length} helpers in ${TYPES} declare a missing element and the sweep found them. `
    + 'The sweep is the coverage: a set that collapsed to one would pass while leaving the other '
    + 'promises unmeasured.',
  );

  // A declaration a consumer never sees is not a contract this gate has to hold.
  const entry = read('src/index.js');
  assert.match(
    entry, /export \* from '\.\/motion\.js';/,
    'src/index.js no longer re-exports src/motion.js, so these helpers are not the published '
    + 'surface this gate claims to measure. Point the gate at whatever publishes them.',
  );

  for (const s of subjects) {
    assert.ok(
      without(s.name),
      `${s.name}() declares ${s.param} and ${SOURCE} has no guard to take out of it. Either the `
      + 'helper reaches a DOM call with the missing element its declaration admits, or its guard '
      + 'is not written as the first statement this gate can find and remove — and then the '
      + 'mutation below proves nothing.',
    );
  }
});

/* -- The source half: a window is present, as it is everywhere real ---------- */

test('a missing element is answered, not thrown at, with a global window', async (t) => {
  assert.equal(
    typeof globalThis.window, 'undefined',
    'This process already had a window, so installing one below proves nothing about the engine '
    + 'the cases ran in.',
  );
  const { window } = new JSDOM('<div id="x" style="transition-duration: 250ms"></div>');
  globalThis.window = window;
  try {
    assert.throws(
      () => window.getComputedStyle(null),
      /Element/,
      'This jsdom does not refuse getComputedStyle a non-element, so the environment cannot show '
      + 'the defect and every case below would pass without a guard.',
    );

    let measured = 0;
    for (const s of subjects) {
      const mod = await load(src);
      for (const [label, value] of MISSING) {
        await t.test(`${s.name}(${label})`, () => {
          assert.equal(
            mod[s.name](value), documented(s),
            `${s.name}(${label}) is declared ${s.param} and did not answer what a missing element `
            + 'is documented to get. A duration that is not 0 sizes a backstop timer that fires '
            + 'late or never.',
          );
        });
        measured += 1;
      }
    }
    assert.equal(
      measured, subjects.length * MISSING.length,
      `${measured} of ${subjects.length * MISSING.length} cases ran. An unmeasured case is a `
      + 'failure here: a sweep that skipped one reports the same green as one that held it.',
    );

    // The mutation: without its guard each helper reaches the DOM call and throws.
    let rejected = 0;
    for (const s of subjects) {
      const mod = await load(without(s.name));
      for (const [label, value] of MISSING) {
        let threw = null;
        try { mod[s.name](value); } catch (e) { threw = e; }
        assert.ok(
          threw instanceof TypeError,
          `${s.name}(${label}) answered ${threw ? `as ${threw}` : 'cleanly'} with its guard taken `
          + 'out, so this gate would pass over the defect it exists for. Check that the guard '
          + 'removed above is the one doing the work.',
        );
        rejected += 1;
      }
    }
    assert.equal(
      rejected, subjects.length * MISSING.length,
      `${rejected} of ${subjects.length * MISSING.length} mutations were rejected. A mutation that `
      + 'passes means the guard it removed is not what keeps the helper up.',
    );
  } finally {
    delete globalThis.window;
    window.close();
  }
});

/* -- The browser half ------------------------------------------------------- *
 * The engine a consumer ships against, not jsdom. OFF unless MOTION_GUARDS=1,
 * because Playwright is deliberately not a dependency of this package — the
 * gate's largest limit, and the measurement is reported by hand in the PR:
 *
 *   MOTION_GUARDS=1 UI_PLAYWRIGHT=/path/to/playwright/index.mjs \
 *     node --test stories/motion-missing-element.test.js
 */

const RUN = process.env.MOTION_GUARDS === '1';

test('the same sweep in a real browser window', { skip: !RUN && 'set MOTION_GUARDS=1' }, async (t) => {
  let pw = null;
  try {
    pw = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  } catch { /* reported below */ }
  assert.ok(
    pw,
    'MOTION_GUARDS=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one — '
    + 'scripts/evidence/README.md has the recipe — or leave the variable unset. A browser gate '
    + 'that quietly skipped would report the same green as one that measured.',
  );

  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="x" style="transition: opacity 250ms linear"></div>');

    /* Both arms run inside the page: the module is imported from its own source as
     * a blob, which is the published code with nothing between it and the engine. */
    const sweep = async (code) => page.evaluate(async ({ code: text, names, values }) => {
      const url = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
      const mod = await import(url);
      const out = [];
      for (const name of names) {
        for (const label of values) {
          const value = label === 'null' ? null : undefined;
          try {
            out.push({ name, label, answer: mod[name](value) });
          } catch (e) {
            out.push({ name, label, error: String(e) });
          }
        }
      }
      // The element is the control: it proves the module really ran in this engine.
      out.push({ name: 'element', label: 'attached', answer: mod.transitionMs(document.getElementById('x')) });
      return out;
    }, { code, names: subjects.map((s) => s.name), values: MISSING.map(([label]) => label) });

    const held = await sweep(src);
    const control = held.pop();
    assert.equal(
      control.answer, 250,
      `An element with a 250ms transition measured ${control.answer ?? control.error} in Chromium, `
      + 'so the module under test did not run there and the cases below measured nothing.',
    );
    assert.equal(
      held.length, subjects.length * MISSING.length,
      `${held.length} of ${subjects.length * MISSING.length} cases ran in the browser.`,
    );

    for (const row of held) {
      const s = subjects.find((one) => one.name === row.name);
      await t.test(`${row.name}(${row.label}) in Chromium`, () => {
        assert.equal(
          row.error, undefined,
          `${row.name}(${row.label}) threw in a real browser: ${row.error}. This is the defect — `
          + `the declaration says ${s.param} and the engine refuses a non-element.`,
        );
        assert.equal(row.answer, documented(s), `${row.name}(${row.label}) in Chromium`);
      });
    }

    // The same mutation, rejected by the same engine a consumer ships against.
    let rejected = 0;
    for (const s of subjects) {
      const rows = (await sweep(without(s.name))).filter((r) => r.name === s.name);
      for (const row of rows) {
        assert.ok(
          row.error,
          `${s.name}(${row.label}) answered ${row.answer} in Chromium with its guard taken out. `
          + 'The browser half would then pass over the defect it exists for.',
        );
        rejected += 1;
      }
    }
    assert.equal(
      rejected, subjects.length * MISSING.length,
      `${rejected} of ${subjects.length * MISSING.length} mutations were rejected in the browser.`,
    );
  } finally {
    await browser.close();
  }
});
