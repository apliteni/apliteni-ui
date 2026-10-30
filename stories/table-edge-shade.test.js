/* Rule: docs/components.md promises a shade "on whichever edge still has columns
 * behind it, and none on an edge that has been reached" — stated as one guarantee
 * covering both edges, not two separate ones. #434 review round 1 found only the
 * right edge actually drawn by a mechanism that survives the sticky header; the
 * left edge fell back to a radial-gradient layer painted under everything, which
 * the sticky header's own opaque background hides outright. Round 2's fix is
 * src/styles/table.css's `.ui-table-scroll::before`, built to mirror `::after`.
 *
 * Two halves, same split as stories/field-ground.test.js:
 *  - The source half (below, always on) reads table.css itself and checks the two
 *    pseudo-elements are structurally the same mechanism, mirrored, and that the
 *    radial-gradient fallback is turned off wherever the sticky pair takes over.
 *    It cannot see paint; a selector could mirror perfectly and still draw nothing.
 *  - The browser half (bottom of the file) is OFF unless EDGE_SHADE=1. It puts a
 *    real scrolled table in front of Chromium and reads the actual pixels, with
 *    and without the shade, at both edges and both bands:
 *
 *   UI_PLAYWRIGHT=… UI_CHROME=… EDGE_SHADE=1 node --test stories/table-edge-shade.test.js
 *
 * Limits: the browser half measures one fixture (a sticky-header table, scrolled to
 * the middle of its range so neither edge is reached) rather than every gallery —
 * the mechanism is one shared CSS rule, not a per-story one, so one subject that
 * exercises both bands and both edges is the coverage. CI runs the source half only;
 * report the browser half's output in the pull request, as AGENTS.md asks for a
 * browser-measured gate.
 *
 * The browser half also measures the pinned column's shade at rest, scrolled and
 * scrolled back, and a phone table's containment at 390x844 (#736). The containment
 * test reads the built Storybook, so run `npm run build-storybook` first. Each test
 * states its own limits beside it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitSelectorList } from '../scripts/lib/selector-list.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TABLE_CSS_PATH = path.join(root, 'src/styles/table.css');
const SOURCE = readFileSync(TABLE_CSS_PATH, 'utf8');

/** The one `@supports` block both mechanisms live in. */
const SUPPORTS_BLOCK = /@supports\s*\(container-type:\s*scroll-state\)\s*\{([\s\S]*)\n\}\n/;

/** What is wrong with one `@supports (container-type: scroll-state)` block, as
 *  lines. Checked as a function of the block's text, not asserted inline, so the
 *  mutation proof below runs the same check the real file is judged by rather than
 *  a second spelling of it. */
function shadeFindings(css) {
  const out = [];
  const match = css.match(SUPPORTS_BLOCK);
  if (!match) {
    return ["no @supports (container-type: scroll-state) block — the sticky-pseudo mechanism is gone"];
  }
  const block = match[1];

  // Both the base rule's radial pair must be zeroed here, not just the right one —
  // that pair is what the left edge fell back to, silently, in round 1.
  const sizes = block.match(/\.ui-table-scroll\s*\{[^}]*background-size:\s*([^;]+);/);
  if (!sizes) {
    out.push('no background-size override for .ui-table-scroll inside the @supports block');
  } else {
    const layers = sizes[1].split(',').map((s) => s.trim());
    if (layers.length !== 4) out.push(`background-size override has ${layers.length} layers, not 4`);
    if (layers[2] !== '0 100%') out.push(`the left radial-gradient layer is sized "${layers[2]}", not zeroed — it will paint under the sticky header and the right edge's fix will look like it covers both`);
    if (layers[3] !== '0 100%') out.push(`the right radial-gradient layer is sized "${layers[3]}", not zeroed`);
  }

  // Every leaf rule in the block — a selector followed by a brace-free declaration
  // list — found wherever it sits, including nested inside an @container. A
  // selector list such as `::before,\n  ::after {` is its own leaf rule shared by
  // both pseudo-elements, so a property declared there answers both at once.
  const leaves = [...block.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map(([, selector, decl]) => ({ selectors: splitSelectorList(selector), decl }));

  for (const [pseudo, side] of [['::before', 'left'], ['::after', 'right']]) {
    const own = `.ui-table-scroll${pseudo}`;
    const decl = leaves.filter((l) => l.selectors.includes(own)).map((l) => l.decl).join('\n');
    if (!decl) {
      out.push(`no .ui-table-scroll${pseudo} rule — the ${side} edge has no sticky shade mechanism`);
    } else {
      for (const prop of ['content', 'grid-area', 'position:\\s*sticky', 'top', 'width:\\s*var\\(--space-3\\)', 'z-index', 'pointer-events']) {
        if (!new RegExp(prop).test(decl)) {
          out.push(`.ui-table-scroll${pseudo} is missing a declaration matching /${prop}/`);
        }
      }
    }
    const container = new RegExp(
      `@container\\s+scroll-state\\(\\s*scrollable:\\s*${side}\\s*\\)\\s*\\{[^}]*\\.ui-table-scroll\\${pseudo}\\s*\\{[^}]*background:\\s*linear-gradient`,
    );
    if (!container.test(block)) {
      out.push(`no @container scroll-state(scrollable: ${side}) rule paints .ui-table-scroll${pseudo}`);
    }
  }

  return out;
}

test('both edges share one sticky-shade mechanism, mirrored', () => {
  assert.deepEqual(
    shadeFindings(SOURCE),
    [],
    'src/styles/table.css no longer draws the left and right edge shades the same way — review the '
    + '@supports (container-type: scroll-state) block against docs/components.md\'s symmetric guarantee',
  );
});

test('the gate rejects a block with only the right edge\'s mechanism', () => {
  // The state #434 review round 1 shipped: ::after and its query exist, ::before
  // does not, and the base radial pair is only half zeroed.
  const roundOne = `
@supports (container-type: scroll-state) {
  .ui-table-scroll {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    background-size: var(--space-6) 100%, var(--space-6) 100%, var(--space-3) 100%, 0 100%;
  }
  .ui-table-scroll > .ui-table { grid-area: 1 / 1; }
  .ui-table-scroll::after {
    content: '';
    grid-area: 1 / 1;
    position: sticky;
    top: 0;
    left: calc(100% - var(--space-3));
    right: 0;
    justify-self: end;
    width: var(--space-3);
    z-index: calc(var(--z-sticky) + 2);
    pointer-events: none;
  }
  @container scroll-state(scrollable: right) {
    .ui-table-scroll::after { background: linear-gradient(to left, var(--table-edge), transparent); }
  }
}
`;
  assert.deepEqual(shadeFindings(roundOne), [
    'the left radial-gradient layer is sized "var(--space-3) 100%", not zeroed — it will paint under '
    + "the sticky header and the right edge's fix will look like it covers both",
    'no .ui-table-scroll::before rule — the left edge has no sticky shade mechanism',
    'no @container scroll-state(scrollable: left) rule paints .ui-table-scroll::before',
  ]);
});

test('the gate rejects an empty block, and passes the file as it ships', () => {
  assert.deepEqual(shadeFindings('@supports (container-type: scroll-state) {\n}\n'), [
    'no background-size override for .ui-table-scroll inside the @supports block',
    'no .ui-table-scroll::before rule — the left edge has no sticky shade mechanism',
    'no @container scroll-state(scrollable: left) rule paints .ui-table-scroll::before',
    'no .ui-table-scroll::after rule — the right edge has no sticky shade mechanism',
    'no @container scroll-state(scrollable: right) rule paints .ui-table-scroll::after',
  ]);
  assert.deepEqual(shadeFindings(SOURCE), []);
});

/* -- The browser half -------------------------------------------------------- *
 *
 * The check above reads selectors; it cannot see that a selector actually paints
 * at least 15 of 255 darker (or, on a dark ground, that much lighter) at the row
 * a reader's eye is on. This half renders the same fixture twice — once with the
 * kit's own stylesheet, once with `--table-edge` forced transparent, which is the
 * one custom property every mechanism above reads its colour from — and diffs the
 * same four pixels between the two screenshots. OFF unless EDGE_SHADE=1:
 *
 *   UI_PLAYWRIGHT=… UI_CHROME=… EDGE_SHADE=1 node --test stories/table-edge-shade.test.js
 */
const RUN_BROWSER = process.env.EDGE_SHADE === '1';
const THEMES = ['light', 'dark'];
const THRESHOLD = 15;

test('measured in a browser: both edges darken (or, on dark, lighten) by at least 15/255', { skip: !RUN_BROWSER && 'set EDGE_SHADE=1' }, async (t) => {
  const { kitStylesheet, playwright } = await import('./lib/tap-zone.js');
  const { decodePNG, pixelAt, darkening, STRIP_SHADE, fixtureHTML, CENTER_SCROLL, readingPoints } =
    await import('./lib/table-edge-shade.js');

  const pw = await playwright();
  assert.ok(
    pw,
    'EDGE_SHADE=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one — '
    + 'scripts/evidence/README.md has the recipe — or leave the variable unset. A browser gate '
    + 'that quietly skipped would report the same green as one that measured.',
  );

  const browser = await pw.chromium.launch({
    executablePath: process.env.UI_CHROME || undefined,
    args: ['--no-sandbox'],
  });

  /** One screenshot of the fixture, scrolled to the middle of its range. */
  async function shoot(theme, css) {
    const ctx = await browser.newContext({ viewport: { width: 500, height: 400 }, deviceScaleFactor: 1 });
    try {
      const page = await ctx.newPage();
      await page.setContent(fixtureHTML(theme, css));
      const geo = await page.evaluate(CENTER_SCROLL);
      assert.ok(
        geo.scrollWidth > geo.clientWidth + 40,
        `${theme}: the fixture only scrolls ${geo.scrollWidth - geo.clientWidth}px — it is not wide `
        + 'enough to keep both edges unreached at the middle scroll position',
      );
      await page.waitForTimeout(150);
      return { img: decodePNG(await page.screenshot()), geo };
    } finally {
      await ctx.close();
    }
  }

  try {
    for (const theme of THEMES) {
      const kept = await shoot(theme, kitStylesheet());
      const lost = await shoot(theme, `${kitStylesheet()}\n${STRIP_SHADE}`);
      assert.equal(
        kept.geo.scrollLeft, lost.geo.scrollLeft,
        `${theme}: the stripped stylesheet scrolled to a different position, so the two shots are not comparable`,
      );

      await t.test(`${theme}: every row and edge`, () => {
        const points = readingPoints(kept.geo.clientWidth);
        for (const [label, [x, y]] of Object.entries(points)) {
          const before = pixelAt(lost.img, x, y); // no shade
          const after = pixelAt(kept.img, x, y); // the kit's shade
          const delta = darkening(before, after);
          t.diagnostic(`${theme} ${label}: no-shade ${before} → shaded ${after}, delta ${delta.toFixed(1)}`);
          assert.ok(
            Math.abs(delta) >= THRESHOLD,
            `${theme} ${label}: shaded pixel moved only ${delta.toFixed(1)}/255 from the unshaded one, `
            + `under the ${THRESHOLD} floor #434's review measured on the edge that already worked`,
          );
          if (theme === 'light') {
            assert.ok(delta > 0, `${theme} ${label}: the shade is supposed to darken a light ground, and it lightened it (${delta.toFixed(1)})`);
          } else {
            assert.ok(delta < 0, `${theme} ${label}: the shade is supposed to lighten a dark ground, and it darkened it (${delta.toFixed(1)})`);
          }
        }
      });
    }
  } finally {
    await browser.close();
  }
});

/* The pinned column's own shade (#736): none at rest, one after a scroll, none after
 * the scroll back, in both themes. Each reading diffs the kit's page against the
 * stripped page at the same scroll, 3px right of the pinned column. The same three
 * readings run with the shade's condition removed and reversed, and each must fail.
 * The target row's pinned cell must keep an opaque ground at each step, and its
 * other cells must keep the target wash.
 * Limits: one fixture and one pixel a reading, because the shade is one shared rule.
 * The ground check reads the computed colour, not the paint. */
const PINNED_STEPS = ['start', 'middle', 'start'];
const PINNED_NONE = 3;
// The pinned shade is softer than the edge shade: it measures 15/255 at its peak, 3px off.
const PINNED_FLOOR = 10;

/** What is wrong with one theme's three readings, as lines. */
function pinnedFindings(theme, deltas) {
  const out = [];
  deltas.forEach((delta, i) => {
    const step = `${theme} step ${i + 1} (${PINNED_STEPS[i]})`;
    if (PINNED_STEPS[i] === 'start' && Math.abs(delta) > PINNED_NONE) {
      out.push(`${step}: a shade of ${delta.toFixed(1)}/255 with nothing scrolled under the pinned column`);
    }
    if (PINNED_STEPS[i] === 'middle' && (Math.abs(delta) < PINNED_FLOOR || (theme === 'light') !== (delta > 0))) {
      out.push(`${step}: the shade moved the pixel ${delta.toFixed(1)}/255, not ${PINNED_FLOOR} the theme's way`);
    }
  });
  return out;
}

test('measured in a browser: the pinned column casts its shade only while scrolled', { skip: !RUN_BROWSER && 'set EDGE_SHADE=1' }, async (t) => {
  const { kitStylesheet, playwright } = await import('./lib/tap-zone.js');
  const { decodePNG, pixelAt, darkening, STRIP_SHADE, fixtureHTML, PINNED_SCROLL, pinnedShadeMutations } =
    await import('./lib/table-edge-shade.js');

  const pw = await playwright();
  assert.ok(pw, 'EDGE_SHADE=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME || undefined, args: ['--no-sandbox'] });

  /** The three readings of one theme under one sheet. */
  async function readings(theme, css) {
    const ctx = await browser.newContext({ viewport: { width: 500, height: 400 }, deviceScaleFactor: 1 });
    try {
      const [kept, lost] = await Promise.all([ctx.newPage(), ctx.newPage()]);
      await kept.setContent(fixtureHTML(theme, css, { pinned: true }));
      await lost.setContent(fixtureHTML(theme, `${css}\n${STRIP_SHADE}`, { pinned: true }));
      const deltas = [];
      const grounds = [];
      const washes = [];
      for (const to of PINNED_STEPS) {
        const at = await kept.evaluate(PINNED_SCROLL, to);
        const ref = await lost.evaluate(PINNED_SCROLL, to);
        assert.deepEqual(ref, at, `${theme} ${to}: the stripped page sits elsewhere, so the shots are not comparable`);
        if (to === 'middle') assert.ok(at.scrollLeft > 40, `${theme}: the pinned fixture scrolls only ${at.scrollLeft}px`);
        grounds.push(at.ground);
        washes.push(at.wash);
        const before = pixelAt(decodePNG(await lost.screenshot()), at.x, at.y);
        const after = pixelAt(decodePNG(await kept.screenshot()), at.x, at.y);
        t.diagnostic(`${theme} ${to}: no-shade ${before} → shaded ${after}`);
        deltas.push(darkening(before, after));
      }
      return { deltas, grounds, washes };
    } finally {
      await ctx.close();
    }
  }

  try {
    const kit = kitStylesheet();
    const broken = pinnedShadeMutations(kit);
    for (const theme of THEMES) {
      await t.test(`${theme}: none at rest, a shade after a scroll, none after the return`, async () => {
        const { deltas, grounds, washes } = await readings(theme, kit);
        assert.deepEqual(pinnedFindings(theme, deltas), []);
        // A translucent ground lets the scrolled columns show through the target row's pin.
        assert.ok(grounds.every((g) => !/rgba|color\(|\/ /.test(g)), `${theme}: the target row's pinned ground is ${grounds[1]}`);
        // The frame clears the row fills, and must not clear the target row's wash with them.
        assert.ok(washes.every((w) => w !== 'rgba(0, 0, 0, 0)'), `${theme}: the target row's cells lost the wash: ${washes[0]}`);
      });
      for (const [name, css] of Object.entries(broken)) {
        await t.test(`${theme}: rejects the shade with ${name}`, async () => {
          assert.notDeepEqual(pinnedFindings(theme, (await readings(theme, css)).deltas), [], `${theme}: ${name} still passed`);
        });
      }
    }
  } finally {
    await browser.close();
  }
});

/* A phone table never widens the page (#736): at 390x844, in both themes, every
 * DataTable story with a scroll frame keeps the page inside the screen and scrolls
 * the table inside its frame. It reads the built Storybook, so run
 * `npm run build-storybook` first. Limits: only stories whose ids start with
 * `react-datatable`, and only those the walk finds a frame in. The payouts story
 * must be one of them. */
const PHONE = { width: 390, height: 844 };
const PAYOUTS_STORY = 'react-datatable-ledgers--finance-data';

test('measured in a browser: a phone table scrolls inside its frame', { skip: !RUN_BROWSER && 'set EDGE_SHADE=1' }, async (t) => {
  const { existsSync } = await import('node:fs');
  const { playwright, serve, indexed, openStory, STORY_DONE } = await import('./lib/dropdown-contain.js');
  const { PHONE_FIT, phoneFitFindings, FRAME_UNCLIPPED } = await import('./lib/table-edge-shade.js');

  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const pw = await playwright();
  assert.ok(pw, 'EDGE_SHADE=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME || undefined, args: ['--no-sandbox'] });
  const server = await serve(build, path.join(build, 'iframe.html'));

  try {
    const stories = indexed(build).filter((s) => s.id.startsWith('react-datatable'));
    assert.ok(stories.some((s) => s.id === PAYOUTS_STORY), `${PAYOUTS_STORY} is not in the build`);
    for (const theme of THEMES) {
      const ctx = await browser.newContext({ viewport: PHONE });
      const page = await ctx.newPage();
      const measured = [];
      for (const story of stories) {
        const got = await openStory(page, story, { port: server.port, theme });
        assert.equal(got.phase, STORY_DONE, `${story.label} ${theme}: ${got.phase}`);
        await page.evaluate(() => document.fonts.ready);
        const fit = await page.evaluate(PHONE_FIT);
        if (!fit.frames.length && story.id !== PAYOUTS_STORY) continue;
        measured.push(story.id);
        t.diagnostic(`${theme} ${story.id}: ${JSON.stringify(fit)}`);
        assert.deepEqual(phoneFitFindings(fit), [], `${story.label} ${theme}`);
        if (story.id === PAYOUTS_STORY) {
          await page.addStyleTag({ content: FRAME_UNCLIPPED });
          assert.notDeepEqual(phoneFitFindings(await page.evaluate(PHONE_FIT)), [], `${theme}: an unclipped frame still passed`);
        }
      }
      // The payouts, the pinned payments and the pinned sortable table.
      assert.ok(measured.length >= 3, `${theme}: only ${measured.length} stories measured: ${measured.join(', ')}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
