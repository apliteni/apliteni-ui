/* Rule: below the phone step a coarse pointer gets 44x44 where the layout has
 * the room, nothing is drawn differently, and no control loses a tap it had.
 *
 * Two halves. The SOURCE half runs in CI and reads src/styles/tap-zone.css.
 * The BROWSER half is the measurement, and it needs a real engine: JSDOM lays
 * nothing out, so a hit zone is invisible to every other gate here. It is OFF
 * unless TAP_ZONES=1, because Playwright is deliberately not a dependency of
 * this package — CI does not run it, and the measurement is reported by hand
 * in the pull request. That is this gate's largest limit.
 *
 *   TAP_ZONES=1 node --test stories/tap-zone.test.js
 *
 * Discover subjects from source and check the coverage count.
 * why: docs/specification.md#a-tap-reaches-the-floor-below-the-phone-step
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TAP_MIN, TAP_EXEMPT } from './guidelines/_accessibility-floor.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const SHEET = 'src/styles/tap-zone.css';
const css = decomment(read(SHEET));

/* -- The source half -------------------------------------------------------- */

test('the floor is a token, written once', () => {
  const declared = css.match(/--tap-min:\s*(\d+(?:\.\d+)?)px\s*;/);
  assert.ok(
    declared,
    `${SHEET} declares no --tap-min. The floor is the one number this sheet is about and `
    + 'it has to be nameable by a consumer who wants it somewhere else, so it is a custom '
    + 'property rather than a literal repeated at each use.',
  );
  assert.equal(
    Number(declared[1]), TAP_MIN,
    `${SHEET} declares --tap-min: ${declared[1]}px and the Accessibility minimums page states `
    + `${TAP_MIN}. Two numbers for one floor is the drift this gate exists to catch; move both `
    + 'or neither.',
  );

  // Every other px literal at the size of a target would be a second floor. A
  // media prelude is not one: a breakpoint is the one width a token cannot
  // express, and stories/breakpoints.test.js holds the list those come from.
  const strays = [...css.replace(/@media[^{]+\{/g, '').matchAll(/(\d+(?:\.\d+)?)px/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n >= 24 && n !== TAP_MIN);
  assert.deepEqual(
    strays, [],
    `${SHEET} writes ${strays.join(', ')} as a bare px literal at target scale. A size that `
    + 'large in this sheet is a floor, and a second floor nobody named is how the first one '
    + 'stops being true. Use --tap-min, or a spacing token for a clearance.',
  );
});

test('the query asks about the pointer as well as the width', () => {
  const queries = [...css.matchAll(/@media\s*([^{]+)\{/g)].map((m) => m[1].trim());
  assert.ok(queries.length > 0, `${SHEET} has no @media block, so the layer is live everywhere.`);
  for (const q of queries) {
    assert.match(
      q, /\(pointer:\s*coarse\)/,
      `${SHEET} gates a layer on "${q}", which a desktop window dragged narrow also matches. `
      + 'A transparent layer is a hover surface too, so with a mouse the control lights up '
      + 'with the cursor 8px off it. A coarse pointer has no hover, so the clause that earns '
      + 'the layer is the clause that removes the side effect.',
    );
    assert.match(
      q, /max-width:\s*560px/,
      `${SHEET} gates a layer on "${q}". The phone step is 560px — the list is in `
      + 'docs/specification.md#breakpoints and stories/breakpoints.test.js holds it.',
    );
  }
});

/** The selectors a `::after` layer is declared on, and the ones given a containing block. */
const listOf = (re) => {
  const m = css.match(re);
  if (!m) return [];
  return m[1].split(',').map((x) => x.trim()).filter(Boolean);
};
const carriers = listOf(/:where\(([^)]+)\)::after\s*\{/);
const positioned = listOf(/:where\(([^)]+)\)\s*\{\s*position:\s*relative;\s*\}/);

/** Every selector the kit's own stylesheets declare anything for. */
const kitCss = readdirSync(path.join(root, 'src/styles'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => decomment(read(`src/styles/${f}`)))
  .join('\n');
const declares = (selector) => kitCss.includes(selector);

test('every family that carries a layer has something to hang it on', () => {
  assert.ok(
    carriers.length >= 8,
    `${SHEET} declares a layer on ${carriers.length} selectors. The sheet exists to reach a `
    + 'list of families; a list this short means the rule was read out of the wrong block and '
    + 'the gate below would pass over most of the kit.',
  );
  const RELATIVE = /position:\s*(relative|absolute|sticky|fixed)/;
  for (const sel of carriers) {
    if (positioned.includes(sel)) continue;
    // `.ui-check input` and friends are handled by their own rule; these are the
    // :where() carriers, each of which must already be a containing block.
    const block = kitCss.split(/(?=\n\S)/).filter((r) => r.trimStart().startsWith(`${sel} {`));
    assert.ok(
      block.some((r) => RELATIVE.test(r)),
      `${SHEET} hangs a layer on ${sel} without putting it in the containing-block list above, `
      + 'and no kit rule positions it either. An absolutely positioned layer then measures '
      + 'against whatever ancestor happens to be positioned — a card, a panel, the page — and '
      + 'lands somewhere else entirely. Add it to the :where(…) { position: relative } list, '
      + 'or take it off the carrier list.',
    );
  }
});

test('every clearance names a container the kit declares', () => {
  const clearances = [...css.matchAll(/^\s*(\.[\w-]+(?:\s+\.[\w-]+)*)\s*\{\s*--tap-clear/gm)]
    .map((m) => m[1]);
  assert.ok(
    clearances.length >= 4,
    `${SHEET} declares ${clearances.length} container clearances. Each one is the gap a layout `
    + 'actually sets, and the sheet needs them wherever the kit packs controls closer than the '
    + 'default; finding almost none means the block was renamed and the clamp is no longer '
    + 'applied anywhere.',
  );
  for (const sel of clearances) {
    assert.ok(
      declares(sel.split(/\s+/).pop()),
      `${SHEET} declares a clearance for ${sel}, which no stylesheet under src/styles/ mentions. `
      + 'A clearance on a selector nothing matches is a clamp that never runs, and the layer it '
      + 'was meant to hold back reaches a neighbour instead.',
    );
  }
});

test('the exempt ledger is real, and nothing on it also carries a layer', () => {
  assert.ok(TAP_EXEMPT.length > 0, 'TAP_EXEMPT is empty, so the page claims the floor is universal.');
  for (const entry of TAP_EXEMPT) {
    const leaf = entry.selector.split(/\s+/).pop();
    assert.ok(
      declares(leaf),
      `TAP_EXEMPT names ${entry.selector}, which no stylesheet under src/styles/ declares. An `
      + 'entry for a control the kit no longer ships reads as a known gap that nobody can close.',
    );
    assert.ok(
      entry.why && entry.why.length > 60,
      `TAP_EXEMPT entry for ${entry.selector} gives no reason worth reading. An entry without `
      + 'the cause is a control quietly left under the floor.',
    );
    assert.ok(
      !carriers.includes(entry.selector),
      `TAP_EXEMPT names ${entry.selector} and ${SHEET} also gives it a layer. One of the two is `
      + 'out of date, and whichever it is, the page is telling a reader the opposite of the kit.',
    );
  }
});

test('the guideline page carries both rules, and its specimen redraws the real expression', () => {
  const page = read('guidelines/accessibility-floor.md');
  for (const id of ['tap-zone', 'tap-spacing']) {
    assert.match(
      page, new RegExp(`<!-- rule: ${id} -->`),
      `guidelines/accessibility-floor.md has no "${id}" rule. The sheet is the mechanism and the `
      + 'page is where a reader is told the spacing it needs; one without the other is a device '
      + 'nobody can apply.',
    );
  }
  // The specimen cannot reveal the real layer — it is gated on a coarse pointer
  // and a phone width — so it redraws it. Both expressions are read here so the
  // drawing cannot drift from the thing it draws.
  const sizeOf = (text) => {
    const w = text.match(/width:\s*(min\(max\(100%,\s*var\(--tap-min\)\),\s*calc\(100% \+ var\(--tap-clear-x\)\)\))/);
    const h = text.match(/height:\s*(min\(max\(100%,\s*var\(--tap-min\)\),\s*calc\(100% \+ var\(--tap-clear-y\)\)\))/);
    return [w && w[1], h && h[1]];
  };
  const sheet = sizeOf(css);
  const specimen = sizeOf(decomment(read('stories/guidelines/_accessibility-floor.js')));
  assert.deepEqual(
    specimen, sheet,
    'The Do specimen on the Accessibility minimums page draws a layer that is no longer the one '
    + `${SHEET} declares. The page would then be showing a reader a rule the kit does not run.`,
  );
});

test('this gate rejects a sheet that drops the pointer clause', () => {
  // The mutation the source half exists to catch, run against the checker rather
  // than asserted about it. why: AGENTS.md, new gates prove their own rejection.
  const mutated = css.replace('and (pointer: coarse)', '');
  const queries = [...mutated.matchAll(/@media\s*([^{]+)\{/g)].map((m) => m[1].trim());
  assert.ok(
    queries.some((q) => !/\(pointer:\s*coarse\)/.test(q)),
    'Removing the pointer clause left every query still matching it, so the check above would '
    + 'pass over a sheet that hovers controls under a mouse.',
  );
});

/* -- The browser half ------------------------------------------------------- */

const RUN = process.env.TAP_ZONES === '1';

test('measured at 390 on a coarse pointer', { skip: !RUN && 'set TAP_ZONES=1' }, async (t) => {
  const { storySubjects, kitStylesheet, pass, playwright, flatten, name } =
    await import('./lib/tap-zone.js');

  const pw = await playwright();
  assert.ok(
    pw,
    'TAP_ZONES=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one — '
    + 'scripts/evidence/README.md has the recipe — or leave the variable unset. A browser gate '
    + 'that quietly skipped would report the same green as one that measured.',
  );

  const { subjects, problems } = await storySubjects();
  assert.deepEqual(
    problems, [],
    'Stories that would not render are not skipped here: an unmeasured subject is a failure.',
  );
  assert.ok(
    subjects.length >= 150,
    `${subjects.length} stories rendered. The sweep is the coverage, and a sweep that collapsed `
    + 'to a handful would pass while measuring almost nothing.',
  );

  const withCss = kitStylesheet();
  const without = kitStylesheet({ without: ['styles/tap-zone.css'] });
  const browser = await (await playwright()).chromium.launch();

  try {
    const at = (width, coarse, sheet) =>
      pass(browser, { subjects, css: sheet, width, coarse, size: TAP_MIN, families: carriers });

    const before = await at(390, true, without);
    const after = await at(390, true, withCss);

    assert.deepEqual(
      after.media, { coarse: true, hover: false, width: 390 },
      'The rig did not report a coarse pointer at 390, so the sheet under test never applied and '
      + 'everything below would have measured the desktop kit and called it green.',
    );

    const A = flatten(before.rows);
    const B = flatten(after.rows);
    assert.equal(A.length, B.length, 'The two runs found different numbers of targets.');
    assert.ok(
      B.length >= 1000,
      `${B.length} targets measured at 390. The count is the coverage; a collapse here is a `
      + 'selector that stopped matching, not a kit that got smaller.',
    );

    await t.test('nothing is drawn differently', () => {
      const moved = B.filter((b, i) => b.drawn[0] !== A[i].drawn[0] || b.drawn[1] !== A[i].drawn[1]);
      assert.deepEqual(
        moved.map((b) => `${b.story} ${name(b)} ${A[B.indexOf(b)]}`), [],
        'A control changed size with the sheet loaded. The whole premise of #488’s answer is '
        + 'that the drawn control does not move; a layer that changes layout is a visible change '
        + 'the issue rejected.',
      );
    });

    await t.test('no control loses a tap it had', () => {
      const lost = [];
      for (let i = 0; i < B.length; i++) {
        const had = new Set(A[i].lost);
        const to = new Map(B[i].lostTo);
        for (const key of B[i].lost) {
          if (had.has(key)) continue;
          lost.push(
            `${B[i].story} — ${name(B[i])} lost (${Math.floor(key / 100000)}, ${key % 100000}) `
            + `to ${to.get(key) || 'another target'}`,
          );
        }
      }
      assert.deepEqual(
        lost.slice(0, 12), [],
        `${lost.length} point(s) on a control’s own drawn box changed hands when this sheet `
        + 'loaded. This is the failure the sheet is built around: a layer that reaches past the '
        + 'gap routes a tap into the neighbour, and on a menu that neighbour was the destructive '
        + 'row. Give the container a --tap-clear-x / --tap-clear-y matching its real gap, or take '
        + 'the family off the carrier list.',
      );
    });

    await t.test('the floor is reached where the layout has the room', () => {
      const reached = (rows) => rows.filter((r) => r.floorMiss === 0).length;
      const gained = reached(B) - reached(A);
      assert.ok(
        gained >= 100,
        `Only ${gained} more targets reach ${TAP_MIN}x${TAP_MIN} with the sheet than without `
        + `(${reached(A)} → ${reached(B)}). The sheet is meant to buy a measurable number of `
        + 'them; a drop means a carrier stopped matching or a clearance was clamped to nothing.',
      );

      // Every family the sheet names has to be LIVE — some target of it must
      // reach further than it did. A family that gains nothing is a selector
      // that stopped matching, or a clearance clamped to zero, and either way
      // the sheet claims a reach it does not deliver.
      //
      // Whether a family then CLEARS 44 is a question for the layout around
      // it, reported below and stated on the guideline page rather than
      // asserted here. The kit's own gaps are 8 to 12px, a layer may take only
      // half of one, and widening them is the visible change #488 ruled out —
      // so some families land in the high thirties and the honest place for
      // that is the page, not a ledger entry pretending it is an exception.
      const dead = [];
      const report = [];
      for (const sel of carriers) {
        const mine = B.map((b, i) => [b, A[i]]).filter(([b]) => (b.fam || []).includes(sel));
        const grew = mine.filter(([b, a]) => b.reach[0] > a.reach[0] || b.reach[1] > a.reach[1]);
        const atFloor = mine.filter(([b]) => b.floorMiss === 0).length;
        if (mine.length && !grew.length) dead.push(sel);
        const best = mine.reduce((m, [b]) => Math.max(m, Math.min(b.reach[0], b.reach[1])), 0);
        report.push(
          `${sel}: ${mine.length} seen, ${grew.length} grew, ${atFloor} at the floor, `
          + `best ${Math.round(best)}px`,
        );
      }
      assert.deepEqual(
        dead, [],
        'These families are named in the sheet and no target of theirs reaches a pixel further '
        + 'with it loaded, so the layer is not live for them at all.',
      );
      t.diagnostic(`targets at the floor: ${reached(A)} → ${reached(B)} of ${B.length}`);
      for (const line of report) t.diagnostic(line);
    });

    await t.test('a layer sized to the floor regardless of the gap is rejected', async () => {
      // The mutation. Unclamping the layer is exactly what #488's first pass did,
      // and the check above has to fail on it or it is checking nothing.
      const broken = withCss.replace(
        /--tap-clear-x: var\(--space-3, 12px\);\n\s*--tap-clear-y: var\(--space-3, 12px\);/,
        '--tap-clear-x: 999px;\n  --tap-clear-y: 999px;',
      );
      assert.notEqual(broken, withCss, 'The mutation did not apply, so it proves nothing.');
      const mutated = flatten((await at(390, true, broken)).rows);
      let lost = 0;
      for (let i = 0; i < mutated.length; i++) {
        const had = new Set(A[i].lost);
        for (const key of mutated[i].lost) if (!had.has(key)) lost += 1;
      }
      assert.ok(
        lost > 0,
        'An unclamped layer took no control’s drawn pixels, which means the check above '
        + 'would pass over the very defect it was written for.',
      );
      t.diagnostic(`unclamped layer costs ${lost} point(s) — the check rejects it`);
    });

    await t.test('1280 and a fine pointer are untouched', async () => {
      for (const [width, coarse] of [[1280, false], [390, false]]) {
        const off = flatten((await at(width, coarse, without)).rows);
        const on = flatten((await at(width, coarse, withCss)).rows);
        assert.equal(off.length, on.length, `${width}px: the two runs found different targets.`);
        const differing = on.filter((t2, i) =>
          JSON.stringify([t2.drawn, t2.reach, t2.floorMiss, t2.lost])
          !== JSON.stringify([off[i].drawn, off[i].reach, off[i].floorMiss, off[i].lost]));
        assert.deepEqual(
          differing.slice(0, 6).map((d) => `${d.story} ${name(d)}`), [],
          `At ${width}px with pointer ${coarse ? 'coarse' : 'fine'} the sheet changed `
          + `${differing.length} target(s). It is supposed to reach nothing there: 1280 is above `
          + 'the step, and a fine pointer is the clause that keeps a cursor off a layer it is '
          + 'not over.',
        );
      }
    });
  } finally {
    await browser.close();
  }
});
