/* The browser half of #499: every gap a stacked row draws, measured against the token it
 * owes, and the before/after frames the pull request shows.
 *
 * A gate rather than a shoot, and both. src/styles/table-stack.test.js resolves the
 * cascade in JSDOM and so says which declaration wins; JSDOM lays nothing out, so this
 * measures the boxes. What is swept, what is compared and why 320 and 1280 are here:
 * why: scripts/evidence/README.md
 *
 * argv: <checkout> [outDir]   outDir takes the frames and spacing.json.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { settle } from './settle.mjs';

// Playwright is not a dependency of this package. why: scripts/evidence/README.md
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [checkoutArg, outDirArg] = process.argv.slice(2);
const checkout = path.resolve(checkoutArg || '.');
const outDir = outDirArg ? path.resolve(outDirArg) : null;
const staticDir = path.join(checkout, 'storybook-static');
if (!existsSync(path.join(staticDir, 'index.json'))) {
  throw new Error(`no Storybook build at ${staticDir} — run: npm run build-storybook`);
}
if (outDir) mkdirSync(outDir, { recursive: true });

/* 390px is the phone #499 names; 320px is the narrowest still sold, and the width where
 * the pinned recipe's first line has to wrap. A bound that only holds at one width is a
 * coincidence. */
const WIDTHS = [320, 390];
/* 1280px joins the shoot but not the measurement: above the one-column step the modifier is
 * meant to do nothing, so there is no stacked row to read there. That claim is checked
 * instead by comparing the two frames — with the modifier and without it — pixel for pixel. */
const DESKTOP = 1280;
const THEMES = ['light', 'dark'];

/** The spacing scale, read rather than restated: a renamed step fails here, not silently. */
const TOKENS = (() => {
  const css = readFileSync(path.join(checkout, 'src/tokens/tokens.css'), 'utf8');
  const out = new Map();
  for (const [, n, px] of css.matchAll(/--space-(\d+):\s*(\d+)px/g)) out.set(`--space-${n}`, Number(px));
  if (!out.size) throw new Error('no --space-N tokens in src/tokens/tokens.css');
  return out;
})();
const step = (name) => {
  const px = TOKENS.get(name);
  if (px === undefined) throw new Error(`src/tokens/tokens.css no longer carries ${name}`);
  return px;
};

/* What a stacked row owes, named as tokens. The row's inset is the dense table's own
 * horizontal inset, so the hover outline keeps the clearance it had before the row
 * restacked; the values sit a dense column gap apart; the paragraph takes the smallest
 * step, because it belongs to the row above it and not to the next row. */
const EXPECTED = {
  rowPadBlock: '--space-3',
  rowPadInline: '--space-3',
  valueGap: '--space-3',
  paragraphGap: '--space-1',
  /* Two lines of values are two flex lines, so they are a row gap apart and not a column
     one: the same step the paragraph takes, read down the page instead of across it. */
  lineGap: '--space-1',
};
/* Half a pixel of slack: a flex gap is laid out in layout units and a wrapped line's
 * baseline box can land on a subpixel. Nothing here is allowed to be a step out. */
const SLACK = 0.5;

/* -- The reading, taken in the page ----------------------------------------- */

/** Every gap one stacked table draws, as numbers a caller can check. */
function readSpacing() {
  const px = (v) => Math.round(Number.parseFloat(v) * 100) / 100;
  /* Where a cell's lines actually start and end, rather than where its box does. The box
   * says what the cell was given; the lines say what it did with it, and the two part
   * company the moment a cell is given a height it cannot hold — which is the #532
   * re-review's compact row, 71.56px of paragraph in a 33px cell. */
  const textBox = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const box = range.getBoundingClientRect();
    if (!box.height) return null;
    // Distinct tops rather than rect count: one line of a value and its unit is two rects.
    const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
    return { top: box.top, bottom: box.bottom, lines };
  };
  const tables = [...document.querySelectorAll('.ui-table--stack')];
  return tables.map((table) => {
    const card = table.closest('.ui-card');
    // The card's text edge is its content box: getBoundingClientRect() is the border box,
    // so the card's own border counts as well as its padding.
    const cardBox = card.getBoundingClientRect();
    const cardCs = getComputedStyle(card);
    const edge = {
      left: cardBox.left + Number.parseFloat(cardCs.borderLeftWidth) + Number.parseFloat(cardCs.paddingLeft),
      right: cardBox.right - Number.parseFloat(cardCs.borderRightWidth) - Number.parseFloat(cardCs.paddingRight),
    };
    const rows = [...table.tBodies[0].rows].map((tr) => {
      const cs = getComputedStyle(tr);
      const cells = [...tr.cells].map((td, i) => ({
        name: td.className.replace('ui-table__', '') || `value ${i + 1}`,
        long: td.classList.contains('ui-table__long'),
        box: td.getBoundingClientRect(),
        text: textBox(td),
      }));
      const long = cells.find((c) => c.long) ?? null;
      const values = cells.filter((c) => !c.long);
      /* The lines the values sit on, as boxes rather than as a count: the step from one line
       * of values down to the next went counted and unmeasured until #532's re-review put a
       * 12px margin under the identity cell and watched this gate pass anyway.
       *
       * A line is found by vertical overlap and not by a shared top, because the row aligns
       * its cells on their baselines: the identity carries a 24px logo slot and the figures
       * beside it do not, so two cells on one line start at different heights. Asking for a
       * shared top splits one line into three and reads the gaps between them as -22.53px. */
      const lines = [];
      for (const c of values) {
        const line = lines.find((l) => Math.min(l.bottom, c.box.bottom) - Math.max(l.top, c.box.top) > 0);
        if (line) {
          line.top = Math.min(line.top, c.box.top);
          line.bottom = Math.max(line.bottom, c.box.bottom);
          line.cells.push(c);
        } else lines.push({ top: c.box.top, bottom: c.box.bottom, cells: [c] });
      }
      lines.sort((a, b) => a.top - b.top);
      // Only the pairs that share a line: at 320 the pinned recipe's values wrap, and the
      // step down to the next line of values is the row gap, not the column gap.
      const valueGaps = lines.flatMap((line) => line.cells.slice(1)
        .map((c, i) => px(c.box.left - line.cells[i].box.right)));
      const texts = cells.filter((c) => c.text);
      return {
        padBlock: [px(cs.paddingTop), px(cs.paddingBottom)],
        padInline: [px(cs.paddingLeft), px(cs.paddingRight)],
        border: px(cs.borderBottomWidth),
        valueGaps,
        valueLines: lines.length,
        lineGaps: lines.slice(1).map((line, i) => px(line.top - lines[i].bottom)),
        // The gap from the last line of values down to the paragraph.
        paragraphGap: long ? px(long.box.top - Math.max(...values.map((c) => c.box.bottom))) : null,
        // What each cell's text does with the box it was given. Positive is a spill.
        spills: texts.map((c) => ({ name: c.name, spill: px(c.text.bottom - c.box.bottom) })),
        // How many lines the paragraph took: a one-line paragraph challenges no row height.
        paragraphLines: long?.text ? long.text.lines : null,
        firstCellLeft: px(cells[0].box.left),
        lastCellRight: px(Math.max(...cells.map((c) => c.box.right))),
        contentTop: px(Math.min(...cells.map((c) => c.box.top))),
        contentBottom: px(Math.max(...cells.map((c) => c.box.bottom))),
        textTop: texts.length ? px(Math.min(...texts.map((c) => c.text.top))) : null,
        textBottom: texts.length ? px(Math.max(...texts.map((c) => c.text.bottom))) : null,
        top: px(tr.getBoundingClientRect().top),
        bottom: px(tr.getBoundingClientRect().bottom),
      };
    });
    const betweenRows = rows.slice(1).map((row, i) => {
      const above = rows[i];
      return {
        // What the sheet asks for: the row above's bottom padding, its separator, this
        // row's top padding.
        computed: px(above.padBlock[1] + above.border + row.padBlock[0]),
        /* What the browser did with it. The two agree here and need not — a margin on a
         * cell moves the second and leaves the first saying 25px — so the arithmetic is
         * checked against the boxes rather than reported in their place. */
        observed: px(row.contentTop - above.contentBottom),
        // And the reading a reader takes: the ink of one row against the ink of the next.
        textToText: px(row.textTop - above.textBottom),
      };
    });
    return {
      classes: table.className,
      inWrapper: Boolean(table.closest('.ui-table-scroll')),
      cardEdge: { left: px(edge.left), right: px(edge.right) },
      insetLeft: px(rows[0].firstCellLeft - edge.left),
      insetRight: px(edge.right - rows[0].lastCellRight),
      betweenRows,
      rows,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

/* -- The rule --------------------------------------------------------------- */

/** Everything a stacked row's spacing has to be, as lines a reader can act on. */
function spacingProblems(where, table) {
  const problems = [];
  const say = (s) => `${where}: ${s}`;
  const round = (n) => Math.round(n * 100) / 100;
  const want = (label, got, token) => {
    const px = step(token);
    if (Math.abs(got - px) > SLACK) problems.push(say(`${label} is ${got}px, not ${token} (${px}px)`));
  };

  for (const [i, row] of table.rows.entries()) {
    const at = `row ${i + 1}`;
    for (const [side, got] of [['top', row.padBlock[0]], ['bottom', row.padBlock[1]]]) {
      want(`${at} padding-${side}`, got, EXPECTED.rowPadBlock);
    }
    for (const [side, got] of [['left', row.padInline[0]], ['right', row.padInline[1]]]) {
      want(`${at} padding-${side}`, got, EXPECTED.rowPadInline);
    }
    for (const got of row.valueGaps) want(`${at} gap between two values on a line`, got, EXPECTED.valueGap);
    for (const got of row.lineGaps) want(`${at} gap between two lines of values`, got, EXPECTED.lineGap);
    /* A cell given a height it cannot hold keeps the height and lets the text out of the
     * bottom, so the row's own separator crosses the paragraph and its last line lands on
     * the next entry. --compact sets such a height for a one-line cell; this is the reading
     * that says the stacked row took it off. */
    for (const { name, spill } of row.spills) {
      if (spill > SLACK) {
        problems.push(say(`${at}: the ${name} cell's text runs ${spill}px out of the bottom of its box`));
      }
    }
    const inset = round(row.bottom - row.padBlock[1]);
    if (row.textBottom === null) problems.push(say(`${at} has no text in any of its cells`));
    else if (row.textBottom > inset + SLACK) {
      problems.push(say(
        `${at}: the text reaches ${row.textBottom} and the row's inset ends at ${inset}, `
        + `so ${round(row.textBottom - inset)}px of it is under the separator or past it`,
      ));
    }
    if (row.paragraphGap === null) {
      problems.push(say(`${at} has no paragraph cell, so this story is not a stacked subject`));
    } else {
      want(`${at} gap from the values to the paragraph`, row.paragraphGap, EXPECTED.paragraphGap);
    }
    // A separator the eye can find, and not a second one drawn by the last row.
    const last = i === table.rows.length - 1;
    if (last && row.border !== 0) problems.push(say(`${at} is the last row and still draws a ${row.border}px rule`));
    if (!last && row.border !== 1) problems.push(say(`${at} draws a ${row.border}px rule, not the kit's hairline`));
  }

  /* The row's inset is paid for by the card bleed, so the text still starts and ends on the
   * card's own text edge. This is the reading JSDOM cannot take, and the one the r3
   * re-review found 4px out. */
  for (const [side, got] of [['left', table.insetLeft], ['right', table.insetRight]]) {
    if (Math.abs(got) > SLACK) {
      problems.push(say(`the ${side} edge of a stacked row's text is ${got}px off the card's text edge`));
    }
  }
  // A stacked row is the answer to sideways scrolling, so it had better not cause any.
  if (table.pageOverflow > 0) {
    problems.push(say(`the page scrolls ${table.pageOverflow}px sideways with a stacked table on it`));
  }
  /* A row's own gaps have to stay smaller than the step between two rows, or the paragraph
   * reads as the next entry. Compared rather than asserted at a value, because the step
   * between rows is two paddings and a rule and so is not itself a token. The reading is
   * the observed one: the arithmetic cannot see a cell that overflows or a margin that
   * moves the boxes, which is the whole of #532's first finding. */
  for (const [i, gap] of table.betweenRows.entries()) {
    const at = `rows ${i + 1} and ${i + 2}`;
    if (Math.abs(gap.observed - gap.computed) > SLACK) {
      problems.push(say(
        `${at} sit ${gap.observed}px apart, not the ${gap.computed}px the row's padding and rule add up to`,
      ));
    }
    if (gap.observed <= step(EXPECTED.paragraphGap)) {
      problems.push(say(`${at} are ${gap.observed}px apart, no more than the ${step(EXPECTED.paragraphGap)}px inside one`));
    }
    if (gap.textToText <= 0) {
      problems.push(say(`${at}: the text of one is on top of the other, ${gap.textToText}px apart`));
    }
  }
  return problems;
}

/* -- The sweep -------------------------------------------------------------- */

const port = await new Promise((resolve, reject) => {
  const p = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), staticDir, path.join(staticDir, 'iframe.html')]);
  p.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc: p }));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.once('error', reject);
});
const base = `http://127.0.0.1:${port.port}`;
/* The candidates: every story whose own source names the modifier. Swept rather than
 * listed, so a story added later joins the set; narrowed by the source rather than by
 * rendering the whole index, because the index is several hundred stories and only a
 * handful could possibly stack. A story that names the modifier but does not render one
 * is caught by the discovery pass below, which still asks the page. */
const index = JSON.parse(readFileSync(path.join(staticDir, 'index.json'), 'utf8'));
const MODIFIER = 'ui-table--stack';
const ids = Object.values(index.entries)
  .filter((e) => e.type === 'story')
  .filter((e) => {
    const file = path.join(checkout, e.importPath.replace(/^\.\//, ''));
    return existsSync(file) && readFileSync(file, 'utf8').includes(MODIFIER);
  })
  .map((e) => e.id);
if (!ids.length) throw new Error(`no story source under ${checkout} names ${MODIFIER}`);

const browser = await chromium.launch({
  executablePath: process.env.UI_CHROME,
  /* shoot.mjs's pixel-test switches, less --deterministic-mode: under it Chromium produces
   * no frames of its own, requestAnimationFrame never fires, and settle() waits forever. */
  args: ['--font-render-hinting=none', '--disable-lcd-text', '--disable-partial-raster'],
});

/**
 * One story at one width and theme, with the modifier on or taken off.
 *
 * `compact` swaps the density the stories ship in for the tighter one, because that is a
 * composition the kit supports and nothing in Storybook draws: it is where #532's re-review
 * found a 33px cell holding 71.56px of paragraph. `mutation` is a stylesheet injected after
 * the kit's own, for the mutation pass below.
 */
async function open(ctx, id, theme, { stacked, compact = false, mutation = null }) {
  const page = await ctx.newPage();
  await page.goto(`${base}/iframe.html?id=${id}&globals=theme:${theme}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('storybook-root')?.childElementCount > 0);
  if (!stacked) {
    // The before side: main's rendering of the same markup. The class is removed rather
    // than overridden, because a modifier inside a media query cannot be undone by a rule.
    await page.evaluate(() => {
      for (const t of document.querySelectorAll('.ui-table--stack')) t.classList.remove('ui-table--stack');
    });
  }
  if (compact) {
    // Added and removed rather than swapped: a story that is not dense would silently stay
    // as it is, and the case would report itself measured.
    await page.evaluate(() => {
      for (const t of document.querySelectorAll('.ui-table--stack')) {
        t.classList.remove('ui-table--dense');
        t.classList.add('ui-table--compact');
      }
    });
  }
  if (mutation) await page.addStyleTag({ content: mutation });
  await settle(page);
  return page;
}

/** What a browser would have to be lying about for this gate to pass a broken layout. */
const MUTATIONS = [
  {
    what: 'a 12px margin under the identity cell, so a wrapped line of values sits a step too far',
    width: 320,
    compact: false,
    css: '@media (max-width: 320px) { .ui-table--stack .ui-table__identity { margin-bottom: 12px; } }',
  },
  {
    what: "the compact row height left on a stacked cell, so the paragraph is capped at 33px",
    width: 390,
    compact: true,
    css: '@media (max-width: 560px) { .ui-table.ui-table--stack > tbody > tr > td { height: 33px; } }',
  },
  {
    what: 'a negative margin under the paragraph, so two rows sit closer than their padding says',
    width: 390,
    compact: false,
    css: '@media (max-width: 560px) { .ui-table.ui-table--stack > tbody > tr > td.ui-table__long { margin-bottom: -10px; } }',
  },
];

const ledger = [];
const rejected = [];
const problems = [];
const frames = [];
const desktopPairs = [];
let subjects = [];

try {
  // Which stories carry a stacked table at all: one pass at one width, so the measuring
  // pass only visits the subjects.
  {
    const ctx = await browser.newContext({ viewport: { width: WIDTHS[0], height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    for (const id of ids) {
      const page = await open(ctx, id, 'light', { stacked: true });
      if (await page.evaluate(() => document.querySelectorAll('.ui-table--stack').length > 0)) subjects.push(id);
      await page.close();
    }
    await ctx.close();
  }
  if (!subjects.length) throw new Error('no story in the built Storybook renders a .ui-table--stack');

  for (const width of [...WIDTHS, DESKTOP]) {
    for (const theme of THEMES) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      for (const id of subjects) {
        const shots = {};
        for (const stacked of [false, true]) {
          const page = await open(ctx, id, theme, { stacked });
          if (stacked && width !== DESKTOP) {
            for (const table of await page.evaluate(readSpacing)) {
              const where = `${id} ${theme} @${width} [${table.classes}]`;
              ledger.push({ id, theme, width, density: 'as shipped', ...table });
              problems.push(...spacingProblems(where, table));
            }
          }
          const side = stacked ? 'after' : 'before';
          const name = `${side}-${id.replace(/^components-table--/, '')}-${theme}-${width}.png`;
          shots[side] = await page.screenshot({
            ...(outDir ? { path: path.join(outDir, name) } : {}), fullPage: true,
          });
          if (outDir) frames.push(name);
          await page.close();
        }
        // Above the step the modifier has no work to do, and the two frames say so.
        if (width === DESKTOP && !shots.before.equals(shots.after)) {
          problems.push(`${id} ${theme} @${DESKTOP}: the modifier moves pixels above the one-column step`);
          desktopPairs.push(`${id} ${theme}: differs`);
        } else if (width === DESKTOP) {
          desktopPairs.push(`${id} ${theme}: identical`);
        }
        // The same story in the tighter density, measured and shot. The stacked rules have
        // to outrank --compact's row height as well as its padding, and only a browser can
        // say whether the paragraph that height was written for still fits under it.
        if (width !== DESKTOP) {
          const page = await open(ctx, id, theme, { stacked: true, compact: true });
          for (const table of await page.evaluate(readSpacing)) {
            const where = `${id} ${theme} @${width} [${table.classes}]`;
            ledger.push({ id, theme, width, density: 'compact', ...table });
            problems.push(...spacingProblems(where, table));
          }
          const name = `compact-${id.replace(/^components-table--/, '')}-${theme}-${width}.png`;
          await page.screenshot({ ...(outDir ? { path: path.join(outDir, name) } : {}), fullPage: true });
          if (outDir) frames.push(name);
          await page.close();
        }
      }
      await ctx.close();
    }
  }

  /* -- The gate's own gate -------------------------------------------------- */

  /* Three ways this layout has been got wrong, injected into the page rather than into the
   * sheet, each required to be caught. The first is the one the #532 re-review injected and
   * watched this gate pass: the wrapped line of values was counted and never measured. The
   * third is why the step between two rows is now read off the boxes — the arithmetic above
   * it cannot see a margin, and reports 25px while the rows sit 15px apart. */
  for (const mutation of MUTATIONS) {
    const ctx = await browser.newContext({
      viewport: { width: mutation.width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce',
    });
    const found = [];
    for (const id of subjects) {
      const page = await open(ctx, id, 'light', {
        stacked: true, compact: mutation.compact, mutation: mutation.css,
      });
      for (const table of await page.evaluate(readSpacing)) {
        found.push(...spacingProblems(`${id} @${mutation.width} [mutated]`, table));
      }
      await page.close();
    }
    await ctx.close();
    rejected.push({ what: mutation.what, problems: found.length, first: found[0] ?? null });
    if (!found.length) problems.push(`the mutation "${mutation.what}" passed this gate unnoticed`);
  }
} finally {
  await browser.close();
  port.proc.kill();
}

/* -- The counts ------------------------------------------------------------- */

/* Floors, recorded from what this kit reaches rather than recomputed from the sweep that
 * filled them. A count derived from the same loop can only restate itself: a sweep that
 * stopped finding the pinned recipe would report "1 of 1" and pass. Raising these is the
 * deliberate act of someone who has seen the new subjects. */
const FLOOR_SUBJECTS = 2;                                  // the log and the pinned ledger
const DENSITIES = ['as shipped', 'compact'];               // both compositions, both measured
const FLOOR_PER_DENSITY = FLOOR_SUBJECTS * WIDTHS.length * THEMES.length;
const FLOOR_CASES = FLOOR_PER_DENSITY * DENSITIES.length;
const FLOOR_ROWS = 3;                                      // rows measured per table

if (subjects.length < FLOOR_SUBJECTS) {
  problems.push(`only ${subjects.length} stacked stories found, expected at least ${FLOOR_SUBJECTS}`);
}
if (ledger.length < FLOOR_CASES) {
  problems.push(`only ${ledger.length} cases measured, expected at least ${FLOOR_CASES}`);
}
for (const entry of ledger) {
  if (entry.rows.length < FLOOR_ROWS) {
    problems.push(`${entry.id} ${entry.theme} @${entry.width}: ${entry.rows.length} rows measured, expected ${FLOOR_ROWS}`);
  }
}
for (const density of DENSITIES) {
  const measured = ledger.filter((e) => e.density === density).length;
  if (measured < FLOOR_PER_DENSITY) {
    problems.push(`only ${measured} cases measured ${density}, expected at least ${FLOOR_PER_DENSITY}`);
  }
}
// A table whose first line never wraps leaves the wrapped-line reading untested, and 320
// is the width that wraps the pinned recipe's values. The gap has to be read, not counted:
// counting it is what let the #532 re-review's margin through.
if (!ledger.some((e) => e.width === 320 && e.rows.some((r) => r.valueLines > 1))) {
  problems.push('no case wrapped a row\'s values onto a second line, so that gap is unmeasured');
}
if (!ledger.some((e) => e.rows.some((r) => r.lineGaps.length))) {
  problems.push('no case measured a gap between two lines of values, only counted the lines');
}
// A one-line paragraph fits any row height, so it would not challenge the one --compact sets.
if (!ledger.some((e) => e.density === 'compact' && e.rows.some((r) => r.paragraphLines > 1))) {
  problems.push('no compact case drew a paragraph on more than one line, so no row height was challenged');
}
if (rejected.length !== MUTATIONS.length) {
  problems.push(`${rejected.length} of ${MUTATIONS.length} mutations were tried`);
}

if (desktopPairs.length < FLOOR_SUBJECTS * THEMES.length) {
  problems.push(`only ${desktopPairs.length} desktop pairs compared, expected ${FLOOR_SUBJECTS * THEMES.length}`);
}

if (outDir) {
  writeFileSync(
    path.join(outDir, 'spacing.json'),
    `${JSON.stringify({ expected: EXPECTED, tokens: [...TOKENS], desktopPairs, rejected, ledger, problems }, null, 2)}\n`,
  );
}

console.log(`subjects: ${subjects.join(', ')}`);
console.log(`cases: ${ledger.length} (${WIDTHS.join('/')} × ${THEMES.join('/')} × ${DENSITIES.join('/')})`);
for (const pair of desktopPairs) console.log(`  ${DESKTOP}px with and without the modifier — ${pair}`);
for (const name of frames) console.log(`  ${name}`);
// One line per measurement, with every distinct value it took across the sweep.
const seen = new Map();
const note = (what, value) => {
  if (value === null || value === '') return;
  if (!seen.has(what)) seen.set(what, new Set());
  seen.get(what).add(String(value));
};
for (const entry of ledger) {
  note('text off the card edge', `${entry.insetLeft}/${entry.insetRight}`);
  note('row to row, as the padding adds up', entry.betweenRows.map((g) => g.computed).join('/'));
  note('row to row, as the boxes sit', entry.betweenRows.map((g) => g.observed).join('/'));
  note('row ink to row ink', entry.betweenRows.map((g) => g.textToText).join('/'));
  for (const row of entry.rows) {
    note('row padding, block', row.padBlock.join('/'));
    note('row padding, inline', row.padInline.join('/'));
    note('value to value', row.valueGaps.join('/'));
    note('line of values to the next', row.lineGaps.join('/'));
    note('values to paragraph', row.paragraphGap);
    note('paragraph lines', row.paragraphLines);
    note('text out of its cell', Math.max(...row.spills.map((c) => c.spill)));
    note('separator', row.border);
  }
}
for (const [what, values] of seen) console.log(`${what}: ${[...values].sort().join(', ')}`);
console.log('mutations this gate has to reject:');
for (const { what, problems: found, first } of rejected) {
  console.log(`  ${found ? `caught (${found})` : 'PASSED UNNOTICED'} — ${what}`);
  if (first) console.log(`    ${first}`);
}

if (problems.length) {
  console.error(`\n${problems.length} spacing problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log('\nevery gap is the token it should be');
