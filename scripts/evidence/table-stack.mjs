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
};
/* Half a pixel of slack: a flex gap is laid out in layout units and a wrapped line's
 * baseline box can land on a subpixel. Nothing here is allowed to be a step out. */
const SLACK = 0.5;

/* -- The reading, taken in the page ----------------------------------------- */

/** Every gap one stacked table draws, as numbers a caller can check. */
function readSpacing() {
  const px = (v) => Math.round(Number.parseFloat(v) * 100) / 100;
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
      const cells = [...tr.cells].map((td) => ({
        long: td.classList.contains('ui-table__long'),
        box: td.getBoundingClientRect(),
      }));
      const long = cells.find((c) => c.long) ?? null;
      const values = cells.filter((c) => !c.long);
      /* Only the pairs that share a line: at 320 the pinned recipe's values wrap, and the
       * step down to the next line of values is the row gap, not the column gap. */
      const valueGaps = [];
      for (let i = 1; i < values.length; i++) {
        const [a, b] = [values[i - 1], values[i]];
        if (Math.abs(a.box.top - b.box.top) < 1) valueGaps.push(px(b.box.left - a.box.right));
      }
      const lines = [...new Set(values.map((c) => Math.round(c.box.top)))].sort((a, b) => a - b);
      return {
        padBlock: [px(cs.paddingTop), px(cs.paddingBottom)],
        padInline: [px(cs.paddingLeft), px(cs.paddingRight)],
        border: px(cs.borderBottomWidth),
        valueGaps,
        valueLines: lines.length,
        // The gap from the last line of values down to the paragraph.
        paragraphGap: long ? px(long.box.top - Math.max(...values.map((c) => c.box.bottom))) : null,
        firstCellLeft: px(cells[0].box.left),
        lastCellRight: px(Math.max(...cells.map((c) => c.box.right))),
        top: px(tr.getBoundingClientRect().top),
        bottom: px(tr.getBoundingClientRect().bottom),
      };
    });
    const betweenRows = rows.slice(1).map((row, i) => {
      const above = rows[i];
      // Text to text: the row above's bottom padding, its separator, this row's top padding.
      return px(above.padBlock[1] + above.border + row.padBlock[0]);
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
   * between rows is two paddings and a rule and so is not itself a token. */
  for (const got of table.betweenRows) {
    if (got <= step(EXPECTED.paragraphGap)) {
      problems.push(say(`two rows are ${got}px apart, no more than the ${step(EXPECTED.paragraphGap)}px inside one`));
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

/** One story at one width and theme, with the modifier on or taken off. */
async function open(ctx, id, theme, { stacked }) {
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
  await settle(page);
  return page;
}

const ledger = [];
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
            const tables = await page.evaluate(readSpacing);
            for (const table of tables) {
              const where = `${id} ${theme} @${width} [${table.classes}]`;
              ledger.push({ id, theme, width, ...table });
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
      }
      await ctx.close();
    }
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
const FLOOR_CASES = FLOOR_SUBJECTS * WIDTHS.length * THEMES.length;
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
// A table whose first line never wraps leaves the wrapped-line reading untested, and 320
// is the width that wraps the pinned recipe's values.
if (!ledger.some((e) => e.width === 320 && e.rows.some((r) => r.valueLines > 1))) {
  problems.push('no case wrapped a row\'s values onto a second line, so that gap is unmeasured');
}

if (desktopPairs.length < FLOOR_SUBJECTS * THEMES.length) {
  problems.push(`only ${desktopPairs.length} desktop pairs compared, expected ${FLOOR_SUBJECTS * THEMES.length}`);
}

if (outDir) {
  writeFileSync(
    path.join(outDir, 'spacing.json'),
    `${JSON.stringify({ expected: EXPECTED, tokens: [...TOKENS], desktopPairs, ledger, problems }, null, 2)}\n`,
  );
}

console.log(`subjects: ${subjects.join(', ')}`);
console.log(`cases: ${ledger.length} (${WIDTHS.join('/')} × ${THEMES.join('/')})`);
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
  note('row to row', entry.betweenRows.join('/'));
  for (const row of entry.rows) {
    note('row padding, block', row.padBlock.join('/'));
    note('row padding, inline', row.padInline.join('/'));
    note('value to value', row.valueGaps.join('/'));
    note('values to paragraph', row.paragraphGap);
    note('separator', row.border);
  }
}
for (const [what, values] of seen) console.log(`${what}: ${[...values].sort().join(', ')}`);

if (problems.length) {
  console.error(`\n${problems.length} spacing problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log('\nevery gap is the token it should be');
