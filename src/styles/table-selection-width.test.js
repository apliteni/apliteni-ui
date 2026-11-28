/* Rule: a selectable table gives its selection column the width of its box, not a share of
 * the free width, so the first data column starts straight after the box.
 * why: #636, docs/components.md#data-table
 *
 * Limits: the source half reads the sheet, so it proves what is declared and not what is
 * drawn. The browser half draws a table in Chromium at 1280 and measures the column; it
 * runs with SELECTION_WIDTH=1 and UI_PLAYWRIGHT, because Playwright is not a dependency.
 * The fixture is the markup DataTable renders, so it does not see a consumer's own
 * `width` on a cell.
 *
 * A pinned row table starts its box on the table's text edge, as an unpinned one does, and
 * the column after a pinned box keeps a start padding from the box's divider. #911
 * The browser half draws both tables on the page, in a dark card and in a light card, and
 * compares the box's inset from the table's start. Its limits: row tables only, because no
 * other pinned table has a selection in a story, and one engine.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

const TABLE_CSS = read('src/styles/table.css');
const SHEETS = [
  'src/tokens/brand.generated.css',
  'src/tokens/tokens.css',
  'src/tokens/accents.css',
  'src/styles/base.css',
  'src/styles/input.css',
  'src/styles/table.css',
  'src/styles/card.css',
];
const RULE = /\.ui-table \.ui-table__selection \{ width: 1%; \}/;
const DENSITIES = ['', ' ui-table--dense', ' ui-table--compact', ' ui-table--zebra'];

test('the selection column is declared at its content width in every table', () => {
  assert.match(TABLE_CSS, RULE, 'no rule holds the selection column to its box');
  const pinned = [...TABLE_CSS.matchAll(/\.ui-table--pinned \.ui-table__selection \{[^}]*\}/g)].map((m) => m[0]).find((r) => /width:/.test(r)) ?? '';
  assert.match(pinned, /width: var\(--ui-table-selection-width\)/, 'the pinned variant lost its own width');
  assert.ok(TABLE_CSS.search(RULE) < TABLE_CSS.indexOf(pinned), 'the pinned width must come after the general one so it wins');
});

// The pinned row table's track: its box starts on the table's text edge, the identity moves
// by the track, and the column after the box opens with half the cell gap. #911
const TRACK = /\.ui-table\.ui-table--hover:not\(\.ui-table--zebra\):not\(\.ui-table--dense\)\.ui-table--pinned \{ --ui-table-selection-start: var\(--cell-edge\); --ui-table-selection-width: calc\(var\(--ui-table-selection-start\) \+ 19px \+ var\(--space-4\) \+ 1px\); \}/;
const START = /\.ui-table\.ui-table--hover:not\(\.ui-table--zebra\):not\(\.ui-table--dense\):is\(\.ui-table--pinned\) :is\(th, td\)\.ui-table__selection \{ padding-inline: var\(--ui-table-selection-start\) var\(--space-4\); text-align: left; \}/;
const AFTER = /\.ui-table\.ui-table--hover:not\(\.ui-table--zebra\):not\(\.ui-table--dense\):is\(\.ui-table--pinned\) \.ui-table__selection \+ :is\(th, td\) \{ padding-left: calc\(var\(--cell-gap\) \/ 2\); \}/;

test('a pinned row table starts its box on the text edge and pads the column after it', () => {
  assert.match(TABLE_CSS, TRACK, 'the pinned track does not start at the table\'s text edge');
  assert.match(TABLE_CSS, START, 'the pinned box does not stand on the track\'s start');
  assert.match(TABLE_CSS, AFTER, 'the column after a pinned box has no start padding from its divider');
});

test('removing the rule is rejected by the sweep', () => {
  const broken = TABLE_CSS.replace(RULE, '');
  assert.notEqual(broken, TABLE_CSS, 'the mutation did not apply, so it proves nothing');
  assert.doesNotMatch(broken, RULE);
});

const table = (cls, pinned) => `<table class="ui-table ui-table--hover${cls}${pinned ? ' ui-table--pinned' : ''}"><thead><tr>`
  + '<th scope="col" class="ui-table__selection"><input type="checkbox" aria-label="Select all"></th>'
  + `<th scope="col"${pinned ? ' class="ui-table__identity"' : ''}>Campaign</th><th scope="col">Spend</th><th scope="col">Clicks</th></tr></thead><tbody>`
  + ['Aster Systems', 'Birch Energy', 'Cedar Foods'].map((n) => '<tr>'
    + `<td class="ui-table__selection"><input type="checkbox" aria-label="Select ${n}"></td>`
    + `<td${pinned ? ' class="ui-table__identity"' : ''}>${n}</td><td>1,200</td><td>340</td></tr>`).join('')
  + '</tbody></table>';

// A pinned and an unpinned row table on the page, in a dark card and in a light card. The
// card holds the frame that DataTable draws for a pinned table.
const PLACES = [
  ['page', 'dark', (t) => t],
  ['dark card', 'dark', (t) => `<div class="ui-card"><div class="ui-table-scroll">${t}</div></div>`],
  ['light card', 'light', (t) => `<div class="ui-card"><div class="ui-table-scroll">${t}</div></div>`],
];

async function edges(css) {
  const pw = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  const { chromium } = pw.chromium ? pw : pw.default;
  const browser = await chromium.launch({ executablePath: process.env.UI_CHROME || undefined });
  const rows = [];
  try {
    for (const [place, theme, wrap] of PLACES) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const body = [table('', false), table('', true)].map(wrap).join('<hr>');
      await page.setContent(`<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head><body style="padding: 48px">${body}</body></html>`, { waitUntil: 'load' });
      const [open, pinned] = await page.evaluate(() => [...document.querySelectorAll('table')].map((t) => {
        const cell = t.querySelector('tbody td.ui-table__selection');
        const next = cell.nextElementSibling;
        const words = document.createRange();
        words.selectNodeContents(next);
        return {
          box: cell.querySelector('input').getBoundingClientRect().left - t.getBoundingClientRect().left,
          gap: words.getBoundingClientRect().left - cell.getBoundingClientRect().right,
          moved: next.getBoundingClientRect().left - cell.getBoundingClientRect().right,
        };
      }));
      rows.push({ place, open, pinned });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return rows;
}

async function measure(css) {
  const pw = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  const { chromium } = pw.chromium ? pw : pw.default;
  const browser = await chromium.launch({ executablePath: process.env.UI_CHROME || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const body = [...DENSITIES.map((d) => table(d, false)), table('', true)].join('<hr>');
    await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>${body}</body></html>`, { waitUntil: 'load' });
    return await page.evaluate(() => [...document.querySelectorAll('table')].map((t) => {
      const th = t.querySelector('th.ui-table__selection');
      const box = th.querySelector('input').getBoundingClientRect();
      const next = th.nextElementSibling.getBoundingClientRect();
      return {
        cls: t.className,
        column: th.getBoundingClientRect().width,
        boxRight: box.right,
        nextLeft: next.left,
        tableWidth: t.getBoundingClientRect().width,
      };
    }));
  } finally {
    await browser.close();
  }
}

test('measured at 1280: the first data column starts straight after the box', {
  skip: !process.env.SELECTION_WIDTH && 'set SELECTION_WIDTH=1 and UI_PLAYWRIGHT to run the Chrome layout gate',
}, async (t) => {
  const css = SHEETS.map(read).join('\n');
  const rows = await measure(css);
  assert.equal(rows.length, DENSITIES.length + 1, 'a table was not measured, so its column proves nothing');
  for (const r of rows) {
    assert.ok(r.tableWidth > 1000, `${r.cls}: the table is ${r.tableWidth}px, so it has no free width to share`);
    t.diagnostic(`${r.cls}: column ${r.column.toFixed(1)}px, ${(r.nextLeft - r.boxRight).toFixed(1)}px from box to next column`);
    if (r.cls.includes('--pinned')) {
      assert.equal(Math.round(r.column), 48, `${r.cls}: the pinned column changed from 48px`);
    } else {
      assert.ok(r.nextLeft - r.boxRight <= 24, `${r.cls}: ${(r.nextLeft - r.boxRight).toFixed(1)}px between the box and the next column`);
      assert.ok(r.column <= 48, `${r.cls}: the selection column is ${r.column.toFixed(1)}px, wider than the pinned one`);
    }
  }

  await t.test('without the rule the column takes a share of the free width', async () => {
    const broken = css.replace(RULE, '');
    assert.notEqual(broken, css, 'the mutation did not apply, so it proves nothing');
    const wide = (await measure(broken)).filter((r) => !r.cls.includes('--pinned') && r.column > 48);
    assert.equal(wide.length, DENSITIES.length, `${wide.length} of ${DENSITIES.length} tables widened without the rule, so the check above would pass over the defect`);
  });
});

test('measured at 1280: a pinned box starts where an unpinned one does, and the next words clear its divider', {
  skip: !process.env.SELECTION_WIDTH && 'set SELECTION_WIDTH=1 and UI_PLAYWRIGHT to run the Chrome layout gate',
}, async (t) => {
  const css = SHEETS.map(read).join('\n');
  const misses = (rows) => rows.flatMap(({ place, open, pinned }) => [
    Math.abs(pinned.box - open.box) > 0.5 && `${place}: the pinned box stands ${pinned.box.toFixed(1)}px in, the unpinned one ${open.box.toFixed(1)}px`,
    pinned.gap < 6 && `${place}: the words after the pinned box start ${pinned.gap.toFixed(1)}px after its divider`,
    Math.abs(pinned.moved) > 0.5 && `${place}: the identity stands ${pinned.moved.toFixed(1)}px off the track's end`,
  ]).filter(Boolean);
  const rows = await edges(css);
  assert.equal(rows.length, PLACES.length, 'a place was not measured, so its box proves nothing');
  for (const r of rows) t.diagnostic(`${r.place}: box ${r.open.box.toFixed(1)}px unpinned, ${r.pinned.box.toFixed(1)}px pinned, words ${r.pinned.gap.toFixed(1)}px after the divider`);
  assert.deepEqual(misses(rows), []);

  await t.test('the centred track of 2650959e and the bare column after it are rejected', async () => {
    const broken = css.replace(START, '').replaceAll('.ui-table__selection + :is(th, td) { padding-left', '.ui-table__selection + :is(th, td) { --unused');
    assert.notEqual(broken, css, 'the mutation did not apply, so it proves nothing');
    const found = misses(await edges(broken));
    assert.ok(found.some((f) => f.includes('pinned box stands')), `the centred box passed: ${found.join('; ')}`);
    assert.ok(found.some((f) => f.includes('after its divider')), `the bare column passed: ${found.join('; ')}`);
  });
});
