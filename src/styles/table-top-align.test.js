/* Rule: every cell, header and sort mark sits on the first line of its row, so a short cell
 * stays level with the first line of a cell that wraps.
 * why: #806, the Align cells to the top rule on the Dense tables page
 *
 * Limits: the source half is in src/styles/table.test.js and react/src/DataTable.test.tsx,
 * and it reads the cascade, not layout. This browser half draws one table for each table
 * modifier in Chromium at 1280 and compares first-line boxes. It runs with TOP_ALIGN=1 and
 * UI_PLAYWRIGHT, because Playwright is not a dependency. It draws in the browser's fallback
 * font, not IBM Plex Sans, and its sort header is the markup DataTable renders, so it does
 * not see a consumer's own cell content or alignment.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

const SHEETS = [
  'src/tokens/brand.generated.css',
  'src/tokens/tokens.css',
  'src/tokens/accents.css',
  'src/styles/base.css',
  'src/styles/table.css',
  'react/src/DataTable.css',
];
// Every modifier in the sheet is a subject, so a new density cannot ship unmeasured.
const MODIFIERS = ['', ...new Set(read('src/styles/table.css').match(/\.ui-table--[\w-]+/g))].map((m) => m.slice(1));

// The mutations the gate must reject, one for each declaration it holds.
const MUTATIONS = [
  ['body cells back in the middle', 'src/styles/table.css',
    '  color: var(--text);\n  vertical-align: top;\n  white-space: nowrap;', '  color: var(--text);\n  white-space: nowrap;'],
  ['header cells back in the middle', 'src/styles/table.css',
    '  border-bottom: 1px solid var(--border);\n  vertical-align: top;\n}', '  border-bottom: 1px solid var(--border);\n  vertical-align: middle;\n}'],
  ['the sort mark centred on its label', 'react/src/DataTable.css', 'align-items: flex-start;', 'align-items: center;'],
];

const sheet = (mutation) => SHEETS.map((p) => {
  const css = read(p);
  if (!mutation || mutation[1] !== p) return css;
  const broken = css.replace(mutation[2], mutation[3]);
  assert.notEqual(broken, css, `${mutation[0]}: the mutation did not apply, so it proves nothing`);
  return broken;
}).join('\n');

const caret = '<svg class="rx-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="m8 9 4-4 4 4"/><path d="m8 15 4 4 4-4"/></svg>';
const sortable = (label, num = false) => `<th scope="col" class="rx-sortable${num ? ' ui-table__num' : ''}">`
  + `<button type="button" class="rx-sort"><span class="rx-sort__label">${label}</span>${caret}</button></th>`;
// The narrow wrapper makes the long header wrap. The sub line makes the payee cell wrap.
const table = (modifier) => `<div style="width: 300px"><table class="ui-table ${modifier}"><thead><tr>`
  + sortable('Payee and payment reference') + '<th scope="col">Status</th>' + sortable('Amount', true)
  + '</tr></thead><tbody>'
  + [['Northwind Studio', 'Paid monthly', '1,240.00'], ['Bluebell Supply', 'Paid weekly', '860.00']]
    .map(([name, terms, amount]) => `<tr><td>${name}<span class="ui-table__sub">${terms}</span></td>`
      + `<td>Paid</td><td class="ui-table__num">${amount}</td></tr>`).join('')
  + '</tbody></table></div>';

async function measure(css) {
  const pw = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  const { chromium } = pw.chromium ? pw : pw.default;
  const browser = await chromium.launch({ executablePath: process.env.UI_CHROME || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>`
      + `${MODIFIERS.map(table).join('<hr>')}</body></html>`, { waitUntil: 'load' });
    return await page.evaluate(() => {
      // The box of the first line of a cell's first text.
      const firstLine = (el) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        range.selectNodeContents(walker.nextNode());
        const { top, bottom } = range.getClientRects()[0];
        return { top, bottom };
      };
      return [...document.querySelectorAll('table')].map((t) => {
        const [wrapped, status, amount] = t.querySelectorAll('thead th');
        const label = wrapped.querySelector('.rx-sort__label');
        const mark = wrapped.querySelector('.rx-caret').getBoundingClientRect();
        const box = label.getBoundingClientRect();
        const lh = parseFloat(getComputedStyle(label).lineHeight);
        return {
          cls: t.className.trim(),
          headLines: Math.round(box.height / lh),
          // The glyphs of the label's first line, and the line box they stand in.
          head: { wrapped: firstLine(label), line: { top: box.top, bottom: box.top + lh }, status: firstLine(status), amount: firstLine(amount), mark: { top: mark.top, bottom: mark.bottom } },
          rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.cells].map(firstLine)),
          bodyLines: [...t.querySelectorAll('tbody tr')].map((tr) => tr.cells[0].querySelector('.ui-table__sub').getBoundingClientRect().top
            > firstLine(tr.cells[0]).bottom - 1),
        };
      });
    });
  } finally {
    await browser.close();
  }
}

const centre = (box) => (box.top + box.bottom) / 2;

/** What a measured table does wrong. One expression, so the gate and the mutations run the same code. */
function faults(tables) {
  const out = [];
  if (tables.length !== MODIFIERS.length) out.push(`${tables.length} of ${MODIFIERS.length} tables measured`);
  for (const t of tables) {
    if (t.headLines < 2) out.push(`${t.cls}: the long header did not wrap, so it proves nothing`);
    if (!t.bodyLines.every(Boolean)) out.push(`${t.cls}: the payee did not take a second line, so it proves nothing`);
    const { wrapped, line, status, amount, mark } = t.head;
    for (const [name, box] of [['Status', status], ['Amount', amount]]) {
      if (Math.abs(centre(box) - centre(wrapped)) > 1) {
        out.push(`${t.cls}: header ${name} sits ${(centre(box) - centre(wrapped)).toFixed(1)}px off the wrapped header's first line`);
      }
    }
    // The mark is shorter than the line, so it sits inside the first line box, not on its centre.
    if (mark.top < line.top - 1 || mark.bottom > line.bottom + 1) {
      out.push(`${t.cls}: the sort mark runs ${mark.top.toFixed(1)}–${mark.bottom.toFixed(1)}px, out of its label's first line ${line.top.toFixed(1)}–${line.bottom.toFixed(1)}px`);
    }
    t.rows.forEach(([payee, ...short], i) => short.forEach((box, j) => {
      if (Math.abs(centre(box) - centre(payee)) > 1) {
        out.push(`${t.cls}: row ${i + 1} cell ${j + 2} sits ${(centre(box) - centre(payee)).toFixed(1)}px off the payee's first line`);
      }
    }));
  }
  return out;
}

test('measured at 1280: short cells, headers and sort marks sit on the first line', {
  skip: !process.env.TOP_ALIGN && 'set TOP_ALIGN=1 and UI_PLAYWRIGHT to run the Chrome layout gate',
}, async (t) => {
  assert.ok(MODIFIERS.length >= 7, `only ${MODIFIERS.length} table modifiers discovered — the sweep lost its sheet`);
  const tables = await measure(sheet());
  t.diagnostic(`${tables.length} tables, ${tables.reduce((n, x) => n + x.rows.length * 3 + 3, 0)} cells measured`);
  assert.deepEqual(faults(tables), []);

  for (const mutation of MUTATIONS) {
    await t.test(`the gate rejects ${mutation[0]}`, async () => {
      const found = faults(await measure(sheet(mutation)));
      assert.ok(found.length > 0, `the gate passed a sheet with ${mutation[0]}`);
      t.diagnostic(`${mutation[0]}: ${found[0]}`);
    });
  }
});
