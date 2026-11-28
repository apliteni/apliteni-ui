/* Rule: a title cell keeps a floor of 20 characters, or a pinned column's ceiling when that
 * is smaller, and a column's set width holds while its rows reload, a title column too.
 * why: #832, docs/components.md#data-table
 *
 * Limits: the source half reads the sheet, so it proves what is declared and not what is
 * drawn. The browser half draws tables in Chromium and measures them; it runs with
 * TITLE_WIDTH=1 and UI_PLAYWRIGHT, because Playwright is not a dependency. The fixtures are
 * the markup DataTable renders, so they do not see a consumer's own width on a cell. That
 * DataTable gives a sized column's cells width auto is held in react/src/DataTable.test.tsx.
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
  'src/styles/table.css',
];
const FLOOR = /\.ui-table :is\(td, th\)\.ui-table__title \{ min-width: min\(20ch, var\(--ui-table-identity-max, 20ch\)\); \}/;
// A row header title is a th, which `.ui-table :is(tbody, tfoot) th` holds to one line (#866).
const WRAP = /\.ui-table :is\(td, th\)\.ui-table__title \{([^}]*)white-space: normal;/;
const TD_ONLY = '.ui-table td.ui-table__title {$1white-space: normal;';

test('the title cell is declared with a 20 character floor under the pinned ceiling', () => {
  assert.match(TABLE_CSS, FLOOR, 'no rule holds the title cell to its floor');
});

test('a title cell wraps, a row header title too', () => {
  assert.match(TABLE_CSS, WRAP, 'no rule lets a th title wrap');
});

test('removing the floor is rejected by the sweep', () => {
  const broken = TABLE_CSS.replace(FLOOR, '');
  assert.notEqual(broken, TABLE_CSS, 'the mutation did not apply, so it proves nothing');
  assert.doesNotMatch(broken, FLOOR);
});

const NAMES = ['Northwind Studio', 'Harbor Freight Lines', 'Aster Systems'];
const OTHER = ['12 Oct', '−€2,305.75', 'Two pallets to the north warehouse, one late'];

/** A squeezed table in a 360px frame: the title cell is the only cell that may wrap. */
const squeezed = (cap) => `<div style="width:360px"><table class="ui-table" data-cap="${cap ?? ''}"`
  + `${cap ? ` style="--ui-table-identity-max:${cap}"` : ''}><thead><tr><th scope="col">Name</th>`
  + '<th scope="col">Date</th><th scope="col">Amount</th><th scope="col">Note</th></tr></thead><tbody>'
  + NAMES.map((n) => `<tr><td class="ui-table__title">${n}</td>${OTHER.map((o) => `<td>${o}</td>`).join('')}</tr>`).join('')
  + '</tbody></table></div>';

/** The markup DataTable draws for a set title width, with no rows (reloading) or with rows. */
const sized = (rows, cellWidth) => `<table class="ui-table" data-rows="${rows}"><colgroup><col style="width:24ch">`
  + '<col style="width:12ch"><col style="width:10ch"></colgroup><thead><tr><th scope="col">Campaign</th>'
  + '<th scope="col">Status</th><th scope="col" class="ui-table__num">Clicks</th></tr></thead><tbody>'
  + (rows
    ? NAMES.map((n) => `<tr><td class="ui-table__title"${cellWidth ? ' style="width:auto"' : ''}>${n}</td>`
      + '<td>Active</td><td class="ui-table__num">1,200</td></tr>').join('')
    : '<tr><td colspan="3">Loading campaigns</td></tr>')
  + '</tbody></table>';

/** A phone frame whose title is a row header, as DataTable draws a rowHeader column. */
const rowHeader = () => '<div style="width:358px;overflow:auto"><table class="ui-table" data-row-header><thead><tr>'
  + '<th scope="col">Task</th><th scope="col">State</th></tr></thead><tbody><tr>'
  + '<th scope="row" class="ui-table__title"><a href="#">Check the supplier contract renewal terms before the notice date</a></th>'
  + '<td>Open</td></tr></tbody></table></div>';

async function measure(css, { cellWidth = true } = {}) {
  const pw = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  const { chromium } = pw.chromium ? pw : pw.default;
  const browser = await chromium.launch({ executablePath: process.env.UI_CHROME || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const body = [squeezed(), squeezed('12ch'), sized(false, cellWidth), sized(true, cellWidth), rowHeader()].join('<hr>');
    await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>${body}</body></html>`, { waitUntil: 'load' });
    return await page.evaluate(() => {
      // A probe in the title cell's own font turns a ch length into pixels.
      const chPx = (cell, n) => {
        const probe = document.createElement('span');
        probe.style.cssText = `display:inline-block;width:${n}ch;padding:0;border:0`;
        cell.append(probe);
        const w = probe.getBoundingClientRect().width;
        probe.remove();
        return w;
      };
      const floors = [...document.querySelectorAll('table[data-cap]')].map((t) => {
        const cells = [...t.querySelectorAll('td.ui-table__title')];
        const lineHeight = parseFloat(getComputedStyle(cells[0]).lineHeight);
        return {
          cap: t.dataset.cap,
          // The kit sizes with border-box, so the floor includes the cell's padding.
          contentWidths: cells.map((c) => Math.round(c.getBoundingClientRect().width)),
          twenty: chPx(cells[0], 20),
          twelve: chPx(cells[0], 12),
          oneLine: cells.map((c) => c.getBoundingClientRect().height - parseFloat(getComputedStyle(c).paddingTop) - parseFloat(getComputedStyle(c).paddingBottom) < lineHeight * 1.5),
        };
      });
      const edges = [...document.querySelectorAll('table[data-rows]')].map((t) => ({
        rows: t.dataset.rows,
        heads: [...t.querySelectorAll('thead th')].map((th) => th.getBoundingClientRect().left),
      }));
      const head = document.querySelector('[data-row-header] tbody th');
      const frame = head.closest('div').getBoundingClientRect();
      const wrapped = { lines: Math.round(head.querySelector('a').getBoundingClientRect().height / parseFloat(getComputedStyle(head).lineHeight)),
        over: Math.round(head.closest('table').getBoundingClientRect().right - frame.right) };
      return { floors, edges, wrapped };
    });
  } finally {
    await browser.close();
  }
}

test('measured in Chromium: the floor, the pinned ceiling and the set widths', {
  skip: !process.env.TITLE_WIDTH && 'set TITLE_WIDTH=1 and UI_PLAYWRIGHT to run the Chrome layout gate',
}, async (t) => {
  const css = SHEETS.map(read).join('\n');
  const { floors, edges, wrapped } = await measure(css);
  assert.equal(floors.length, 2, 'a squeezed table was not measured, so its floor proves nothing');
  assert.equal(edges.length, 2, 'a sized table was not measured, so its edges prove nothing');

  const [free, capped] = floors;
  for (const w of free.contentWidths) assert.ok(w >= free.twenty - 1, `a title cell is ${w}px, under its 20ch floor of ${free.twenty}px`);
  assert.ok(free.oneLine.slice(0, 2).every(Boolean), 'a two-word name broke onto a second line above the floor');
  for (const w of capped.contentWidths) {
    assert.ok(w >= capped.twelve - 1, `a capped title cell is ${w}px, under its 12ch ceiling of ${capped.twelve}px`);
    assert.ok(w < capped.twenty - 1, `a capped title cell is ${w}px, so the 12ch ceiling did not win over the 20ch floor`);
  }
  t.diagnostic(`floor ${free.twenty.toFixed(1)}px, cells ${free.contentWidths.join(', ')}; capped cells ${capped.contentWidths.join(', ')}`);

  const [loading, loaded] = edges;
  loading.heads.forEach((left, i) => assert.ok(Math.abs(left - loaded.heads[i]) <= 1,
    `column ${i + 1} starts at ${left}px while reloading and at ${loaded.heads[i]}px with rows`));
  t.diagnostic(`column edges ${loaded.heads.map((x) => x.toFixed(1)).join(', ')}`);

  assert.ok(wrapped.lines > 1 && wrapped.over <= 0, `a row header title kept ${wrapped.lines} line and ran ${wrapped.over}px past its 358px frame`);

  await t.test('when only a td title wraps, a row header title runs past the phone frame', async () => {
    const broken = css.replace(WRAP, TD_ONLY);
    assert.notEqual(broken, css, 'the mutation did not apply, so it proves nothing');
    const { wrapped: bare } = await measure(broken);
    assert.ok(bare.lines === 1 && bare.over > 0, 'the th title wrapped without the rule, so the check above would pass over the defect');
  });

  await t.test('without the floor a squeezed title cell drops under 20 characters', async () => {
    const broken = css.replace(FLOOR, '');
    assert.notEqual(broken, css, 'the mutation did not apply, so it proves nothing');
    const [bare] = (await measure(broken)).floors;
    assert.ok(bare.contentWidths.some((w) => w < bare.twenty - 1), 'every title cell kept 20ch without the rule, so the check above would pass over the defect');
  });

  await t.test('without width auto on the cells the title column moves when the rows arrive', async () => {
    const [, moved] = (await measure(css, { cellWidth: false })).edges;
    assert.ok(moved.heads.some((left, i) => Math.abs(left - loading.heads[i]) > 1), 'the edges held without width auto, so the check above would pass over the defect');
  });
});
