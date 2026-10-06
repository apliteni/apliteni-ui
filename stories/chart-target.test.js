/* Rule: every point of a React chart's line answers a tap over its whole
 * declared box, and the chart's own edge clips none of it.
 *
 * Two halves. The SOURCE half runs in CI. The BROWSER half is the measurement —
 * only an engine answers a hit test, and #543 found a point declaring 28x32
 * whose usable area was 28x19.4 — and it is OFF unless CHART_TARGETS=1, because
 * Playwright is deliberately not a dependency here. That is this gate's largest
 * limit; the others are stated beside the tests they belong to.
 *
 *   npm run build-storybook -w react
 *   UI_PLAYWRIGHT=... CHART_TARGETS=1 node --test stories/chart-target.test.js
 *
 * why: docs/components.md#react-charts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TAP_MIN, TARGET_MIN } from './guidelines/_accessibility-floor.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const COMPONENT = 'react/src/Chart.tsx';
const SHEET = 'src/styles/chart.css';
const STAT = 'src/styles/stat.css';
const STORIES = 'react/src/Chart.stories.tsx';

const component = read(COMPONENT);
const sheet = decomment(read(SHEET));
const statSheet = decomment(read(STAT));

/* -- the subjects, discovered rather than listed ---------------------------- */

/** Every story in the chart's file, with whether it draws a line. */
const storySubjects = () => {
  const src = read(STORIES);
  return [...src.matchAll(/^export const (\w+): StoryObj = \{([\s\S]*?)\n\};/gm)].map((m) => ({
    name: m[1],
    id: `react-chart--${m[1].replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`,
    spark: /variant="spark"/.test(m[2]),
    line: /shape: 'line'/.test(m[2]) || /\bseries\}/.test(m[2]) || /\{\.\.\.series/.test(m[2]),
  }));
};

test('the chart has stories that draw a line, and at least one at text size', () => {
  const stories = storySubjects();
  assert.ok(
    stories.length >= 5,
    `${stories.length} chart stories found in ${STORIES}. The sweep is the coverage, and a `
    + 'discovery that collapsed to a handful would pass while measuring almost nothing.',
  );
  const lines = stories.filter((s) => s.line);
  assert.ok(
    lines.length >= 4,
    `${lines.length} of them draw a line. A point target with no story that draws a point is `
    + 'not measured by anything below.',
  );
  const sparks = stories.filter((s) => s.spark);
  assert.ok(
    sparks.length >= 1,
    'No story draws a sparkline. The sparkline is the one variant whose drawing is shorter '
    + `than the ${TAP_MIN}px floor, so it is the subject this gate exists for.`,
  );
});

/* -- the source half: one copy of the arithmetic ---------------------------- */

test('the component asks the kit for a point\u2019s target and keeps no copy of it', () => {
  assert.match(
    component, /\bpointTarget\(/,
    `${COMPONENT} does not call pointTarget. The placement is shared arithmetic (src/logic/`
    + 'chart.js); a second copy in the component is a second thing to get wrong, and only one '
    + 'of them would be the one src/logic/chart.test.js measures.',
  );
  // The shape the component used before: centre the floor on the point and cap
  // it at the drawing's own height. Every attribute still read 28 wide.
  const inlined = /hit\s*=\s*\{\s*\n?\s*w:\s*Math\.max\(/.test(component)
    || /Math\.min\(floor,\s*plotHeight/.test(component);
  assert.equal(
    inlined, false,
    `${COMPONENT} computes a point's target inline again. Whatever it computes, the component `
    + 'is not the file whose arithmetic has a test.',
  );
});

/* -- the source half: the box is grown to hold the target ------------------- */

/** The one expression the component may size its box with. */
const BOX = /const boxHeight = Math\.max\(plotHeight, floor\);/;

test('the box the chart draws in is the larger of its drawing and the floor', () => {
  assert.match(
    component, BOX,
    `${COMPONENT} no longer derives its box from the pointer floor. A 32px sparkline cannot `
    + `hold a ${TAP_MIN}px target, and the part that falls outside the box is clipped by the `
    + 'chart\u2019s own edge — which is exactly what #543\u2019s review measured.',
  );
  // The svg's own two attributes and the target's box all have to come from
  // that one number, or they drift and the attributes stop describing the box.
  for (const [what, re] of [
    ['height', /height=\{px\(boxHeight\)\}/],
    ['viewBox', /viewBox=\{`0 \$\{px\(boxTop\)\} \$\{px\(plotWidth\)\} \$\{px\(boxHeight\)\}`\}/],
    ['the target\u2019s box', /bottom: boxTop \+ boxHeight/],
    ['the custom property the sheet reads', /'--ui-chart-box': `\$\{px\(boxHeight\)\}px`/],
  ]) {
    assert.match(
      component, re,
      `${COMPONENT} does not write the box into ${what}. The svg's attributes, the custom `
      + 'property and the rectangle a pointer is tested against have to be the same number.',
    );
  }
});

test('this gate rejects a component that sizes the svg from its drawing again', () => {
  // The likeliest regression: put plotHeight back on the svg and leave the rest.
  const mutated = component.replace('height={px(boxHeight)}', 'height={plotHeight}');
  assert.notEqual(mutated, component, 'the mutation changed nothing, so it proves nothing');
  assert.equal(
    /height=\{px\(boxHeight\)\}/.test(mutated), false,
    'The same reading that passes above has to come back failing once the svg is sized from '
    + 'the drawing, or it is not holding the two ends together.',
  );
});

/* -- the source half: the cascade that decides the sparkline's height ------- */

/** Specificity of one compound selector, as [ids, classes, types]. */
const specificity = (selector) => {
  const one = selector.trim();
  const ids = (one.match(/#[\w-]+/g) || []).length;
  const classes = (one.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)(?!is\()[\w-]+/g) || []).length;
  const types = (one.replace(/[.#:[][^\s>+~]*/g, ' ').match(/\b[a-zA-Z][\w-]*\b/g) || []).length;
  return [ids, classes, types];
};
const beats = (a, b) => {
  const [x, y] = [specificity(a), specificity(b)];
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};
/** Every selector in `css` whose body sets `height` on an svg in a stat trend. */
const trendHeightRules = (css) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter((m) => /(^|[;\s])height\s*:/.test(m[2]))
  .flatMap((m) => m[1].split(',').map((s) => s.trim()))
  .filter((s) => /\.ui-stat__trend\b/.test(s) && /\bsvg\b/.test(s));

const SPARK_RULE = '.ui-chart--spark .ui-chart__svg';

test('the chart\u2019s own height outranks the one the stat band sizes a trend with', () => {
  const mine = [...sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => m[1].includes('.ui-chart__svg') && /height\s*:\s*var\(--ui-chart-box\)/.test(m[2]))
    .flatMap((m) => m[1].split(',').map((s) => s.trim()));
  assert.ok(
    mine.includes(SPARK_RULE),
    `${SHEET} does not size ${SPARK_RULE} from --ui-chart-box. Without it the svg's height `
    + `attribute is what decides, and ${STAT} overrides that for a trend slot — the box would `
    + 'go back to 32 and clip the target again.',
  );
  const rivals = trendHeightRules(statSheet);
  assert.ok(
    rivals.length >= 1,
    `${STAT} no longer sizes a trend's svg, so this gate has no rival to outrank and the `
    + 'reading below would pass over anything. Point it at the rule that is there.',
  );
  const lost = rivals.filter((r) => !beats(SPARK_RULE, r));
  assert.deepEqual(
    lost, [],
    `${SPARK_RULE} does not outrank ${lost.join(', ')} in ${STAT}, so a sparkline in a stat `
    + 'tile is sized by the band and not by the component that knows the floor. Cascade order '
    + 'cannot be relied on here: the two sheets are bundled together.',
  );
});

test('this gate rejects a chart rule scoped too weakly to win', () => {
  // One class is (0,1,0) and the stat band's rule is (0,1,1), so the obvious
  // spelling loses and loses silently — the height just goes back to 32.
  assert.equal(
    beats('.ui-chart__svg', '.ui-stat__trend svg'), false,
    'The comparison has to come back false for the weaker spelling, or it is not reading '
    + 'specificity at all and the check above means nothing.',
  );
  assert.equal(
    beats(SPARK_RULE, '.ui-stat__trend svg'), true,
    'and true for the one the sheet writes',
  );
});

/* -- the browser half ------------------------------------------------------- */

/* Limits of the half below: Chromium only, an emulated coarse pointer rather
 * than touch hardware, and the sparkline story alone — the arithmetic every
 * variant shares is src/logic/chart.test.js, and the markup the component
 * writes is react/src/Chart.test.tsx. The readout's wording is measured
 * nowhere here. */
const RUN = process.env.CHART_TARGETS === '1';
const BUILT = path.join(root, 'react/storybook-static');

test(
  `every point of a sparkline answers a tap over its whole box at 390, coarse`,
  { skip: !RUN && 'set CHART_TARGETS=1' },
  async (t) => {
    const pw = await (async () => {
      try { return await import(process.env.UI_PLAYWRIGHT || 'playwright'); } catch { return null; }
    })();
    assert.ok(
      pw,
      'CHART_TARGETS=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one '
      + '— scripts/evidence/README.md has the recipe — or leave the variable unset. A browser '
      + 'gate that quietly skipped would report the same green as one that measured.',
    );
    assert.ok(
      existsSync(path.join(BUILT, 'iframe.html')),
      `${BUILT} holds no built Storybook. Run "npm run build-storybook -w react" first; a `
      + 'measurement with nothing to measure is not a pass.',
    );

    const served = await new Promise((resolve, reject) => {
      const proc = spawn(process.execPath, [
        path.join(root, 'scripts/evidence/serve.mjs'), BUILT, path.join(BUILT, 'iframe.html'),
      ]);
      proc.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc }));
      proc.stderr.on('data', (d) => process.stderr.write(d));
      proc.once('error', reject);
    });
    const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      // What moves Chromium's (pointer: coarse) and (hover: none). Checked
      // below before anything here is believed: a rig that quietly ran as a
      // mouse would measure the desktop floor and call it green.
      hasTouch: true,
      reducedMotion: 'reduce',
    });

    try {
      const page = await ctx.newPage();
      const spark = storySubjects().find((s) => s.spark);
      await page.goto(
        `http://127.0.0.1:${served.port}/iframe.html?id=${spark.id}&globals=theme:light`,
        { waitUntil: 'load' },
      );
      await page.waitForFunction(
        () => document.getElementById('storybook-root')?.childElementCount > 0,
      );
      await page.waitForFunction(() => document.querySelectorAll('.ui-chart__hit').length > 0);
      await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));

      const media = await page.evaluate(() => ({
        coarse: matchMedia('(pointer: coarse)').matches,
        hover: matchMedia('(hover: hover)').matches,
        width: window.innerWidth,
      }));
      assert.deepEqual(
        media, { coarse: true, hover: false, width: 390 },
        'The rig did not report a coarse pointer at 390, so the phone floor never applied and '
        + 'everything below would have measured the desktop target and called it green.',
      );

      /* Every point in the story, measured by asking the page who owns the
       * pixel — not by reading the rect's attributes back, which is the check
       * that passed over this defect in the first place. The corners are taken
       * on pixel centres: a tap lands on a pixel, and an edge at 249.56 sampled
       * at 249.06 flaps between runs that differ nowhere else. */
      const points = await page.evaluate((floor) => {
        const inset = (lo, hi) => {
          const a = Math.ceil(lo) + 0.5 > lo + 1 ? Math.floor(lo) + 0.5 : Math.ceil(lo) + 0.5;
          const b = Math.floor(hi) - 0.5 < hi - 1 ? Math.ceil(hi) - 0.5 : Math.floor(hi) - 0.5;
          return [a, b];
        };
        return [...document.querySelectorAll('.ui-chart__hit')].map((hit) => {
          const group = hit.closest('[data-mark]');
          const id = group.getAttribute('data-mark');
          const b = hit.getBoundingClientRect();
          const [x0, x1] = inset(b.left, b.right);
          const [y0, y1] = inset(b.top, b.bottom);
          const asked = [[x0, y0], [x1, y0], [x0, y1], [x1, y1],
            [(x0 + x1) / 2, (y0 + y1) / 2]];
          const missed = asked.filter(([x, y]) => {
            const el = document.elementFromPoint(x, y);
            return el?.closest('[data-mark]')?.getAttribute('data-mark') !== id;
          });
          return {
            id,
            w: Math.round(b.width * 100) / 100,
            h: Math.round(b.height * 100) / 100,
            // How much of the declared box the page actually hands to this
            // mark, after every ancestor's clipping.
            missed: missed.length,
            floorMiss: [Math.max(0, floor - b.width), Math.max(0, floor - b.height)]
              .map((n) => Math.round(n * 100) / 100),
          };
        });
      }, TAP_MIN);

      assert.ok(
        points.length >= 11,
        `${points.length} points measured in ${spark.id}. The count is the coverage; a `
        + 'collapse here is a selector that stopped matching, not a chart that got smaller.',
      );

      await t.test('no declared pixel of a point belongs to something else', () => {
        const stolen = points.filter((p) => p.missed > 0);
        assert.deepEqual(
          stolen.map((p) => `${p.id}: ${p.missed} of 5 probes answered by another element`), [],
          'A point declares a box the page does not give it. This is the #543 failure: the '
          + 'rect reached past the chart\u2019s edge, the chart clipped it, and a tap inside '
          + 'the declared rectangle landed on the card behind the chart and opened nothing.',
        );
      });

      await t.test('every point reaches the phone floor down, and its column across', () => {
        // Down there is nothing to share a sparkline's column with, so the
        // whole floor is owed. Across, a 28px column is all a point may take —
        // widening it would make one point answer for its neighbours, which is
        // the one thing the floor must not do — so the claim is the AA floor
        // and the column, not 44.
        const shortDown = points.filter((p) => p.floorMiss[1] > 0.5);
        assert.deepEqual(
          shortDown.map((p) => `${p.id}: ${p.w}x${p.h}`), [],
          `A point is under ${TAP_MIN}px tall. The box the chart draws in is grown to hold the `
          + 'floor precisely so this cannot happen.',
        );
        const thin = points.filter((p) => p.w < TARGET_MIN - 0.5);
        assert.deepEqual(
          thin.map((p) => `${p.id}: ${p.w}px wide`), [],
          `A point is under the kit's ${TARGET_MIN}px floor across.`,
        );
        t.diagnostic(`${points.length} points, each ${points[0].w}x${points[0].h}`);
      });

      await t.test('a tap on either end point opens that point\u2019s readout', async () => {
        // The two the review found: a tap at (55, 212.77) inside the first
        // point's declared rectangle opened nothing at all.
        const ends = [points[0], points[points.length - 1]];
        for (const end of ends) {
          const box = await page.evaluate((id) => {
            const hit = document.querySelector(`[data-mark="${id}"] .ui-chart__hit`);
            const b = hit.getBoundingClientRect();
            return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
          }, end.id);
          await page.touchscreen.tap(box.x, box.y);
          // Asked of the chart that owns this point: the readout span is always
          // in the markup and carries `is-open` when it has something to say,
          // so an unscoped query would read the other sparkline's empty one.
          const said = await page.evaluate((id) => {
            const chart = document.querySelector(`[data-mark="${id}"]`).closest('.ui-chart');
            const tip = chart.querySelector('.ui-tip.is-open');
            return tip ? (tip.textContent || '').replace(/\s+/g, ' ').trim() : null;
          }, end.id);
          assert.ok(
            said,
            `A tap at the centre of ${end.id}'s own box opened no readout. That is the missed `
            + 'tap #543\u2019s review reproduced, at the other end of the fix.',
          );
          t.diagnostic(`${end.id} tapped at ${Math.round(box.x)},${Math.round(box.y)} → ${said}`);
          await page.touchscreen.tap(box.x, box.y);
        }
      });
    } finally {
      await ctx.close();
      await browser.close();
      served.proc.kill();
    }
  },
);
