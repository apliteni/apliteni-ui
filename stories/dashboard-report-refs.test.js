/* Rule: a reference the Finance dashboard shows resolves to a row in the
 * Finance report it links to, and the Dashboards and reports guideline prints
 * those same rows with the same figures.
 *
 * The link-to-the-report rule asks a dashboard to "open each row on its own row
 * there". The kit's own pair did not: the dashboard's first exception was
 * PO-1166 and the report had no such row — it was there as `42`, and PO-1159
 * was not there at all. A comment asserted the opposite. A comment is not a
 * gate, so the three screens are compared here instead.
 *
 * WHAT THIS GATE DOES NOT REACH:
 *   - That a link goes anywhere. Every href on these demo screens is "#"; what
 *     is checked is that the reference a reader would look for exists.
 *   - Any screen outside these three. A consumer's dashboard is its own.
 *   - Gross. The guideline's four-column specimen does not draw it, so the two
 *     screens are held to the columns they share: fees and net.
 *   - Row order, arrival dates, and the Payout ID column, which only the report
 *     draws.
 *
 * Discover subjects from source and check the coverage count.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { Default as Dashboard } from './apps/FinanceDashboard.stories.js';
import { Default as Report } from './apps/FinanceReport.stories.js';
import { DashboardsAndReports } from './guidelines/DashboardsAndReports.stories.js';

const docOf = (html) => new JSDOM(`<!doctype html><html lang="en"><body>${html}</body></html>`).window.document;

/** Every data row of a table, as the text of its cells. */
const rowsOf = (table) => [...table.querySelectorAll('tbody tr')]
  .map((tr) => [...tr.children].map((td) => td.textContent.trim()));

/** The heading text of a table, lower-cased, so a column can be found by name. */
const headOf = (table) => [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim().toLowerCase());

/** One table's rows keyed by their Reference cell, carrying fees and net. */
const byReference = (table) => {
  const head = headOf(table);
  const at = (name) => {
    const i = head.indexOf(name);
    assert.notEqual(i, -1, `this table has no "${name}" column — its header is ${head.join(', ')}`);
    return i;
  };
  const ref = at('reference');
  const net = at('net (eur)');
  const fees = head.includes('fees') ? at('fees') : -1;
  return new Map(rowsOf(table).map((cells) => [cells[ref], { net: cells[net], fees: fees === -1 ? null : cells[fees] }]));
};

const reportLedger = () => {
  const tables = [...docOf(Report.render()).querySelectorAll('.ui-table')];
  assert.equal(tables.length, 1, 'the Finance report draws a different number of tables than one');
  return byReference(tables[0]);
};

/** The guideline page's two reference tables: the ledger and the exceptions. */
const guidelineTables = () => {
  const found = [...docOf(DashboardsAndReports.render()).querySelectorAll('.ui-table')]
    .filter((t) => headOf(t).includes('reference'));
  assert.ok(found.length > 0, 'no table on the guideline page has a Reference column — this gate is checking nothing');
  return found;
};

test('every reference the dashboard shows has a row in the report it links to', () => {
  const report = reportLedger();
  const tables = [...docOf(Dashboard.render()).querySelectorAll('.ui-table')];
  assert.equal(tables.length, 1, 'the Finance dashboard draws a different number of tables than one');
  const shown = byReference(tables[0]);

  assert.ok(shown.size > 0, 'the dashboard lists no exceptions, so this gate is checking nothing');
  const missing = [...shown.keys()].filter((ref) => !report.has(ref));
  assert.deepEqual(missing, [],
    'the dashboard sends a reader to the payout report for a row the report does not have. '
    + `The report holds: ${[...report.keys()].join(', ')}`);

  const disagree = [...shown].filter(([ref, cells]) => report.get(ref).net !== cells.net)
    .map(([ref, cells]) => `${ref}: dashboard ${cells.net}, report ${report.get(ref).net}`);
  assert.deepEqual(disagree, [], 'a payout settles a different net on the two screens');
});

test('the guideline prints the report\'s own rows, with its own figures', () => {
  const report = reportLedger();
  let checked = 0;
  const problems = [];

  for (const table of guidelineTables()) {
    for (const [ref, cells] of byReference(table)) {
      checked += 1;
      const row = report.get(ref);
      if (!row) {
        problems.push(`${ref} is drawn on the guideline page and is not a row of the Finance report`);
        continue;
      }
      if (row.net !== cells.net) problems.push(`${ref}: guideline net ${cells.net}, report net ${row.net}`);
      if (cells.fees !== null && row.fees !== cells.fees) problems.push(`${ref}: guideline fees ${cells.fees}, report fees ${row.fees}`);
    }
  }

  // Seven reference tables on the page: the four-column ledger in four cells
  // at five rows each, and the three-row exceptions card in three. The count is
  // the anti-vacuity guard — a walk that stops finding tables passes every
  // assertion above it.
  assert.equal(checked, 29, 'the guideline draws a different number of referenced rows; count the new specimen by hand');
  assert.deepEqual(problems, [], `the guideline page and the Finance report disagree:\n  ${problems.join('\n  ')}`);
});

// Prove the gate rejects rather than agreeing with the tree: rename the row the
// dashboard puts first and its reference stops resolving. Renaming a row the
// dashboard does not show is invisible here on purpose — the rule is about the
// references a dashboard sends a reader after, not about every row of a report.
test('renaming a row the dashboard shows turns the reference check red', () => {
  const report = reportLedger();
  const shown = byReference([...docOf(Dashboard.render()).querySelectorAll('.ui-table')][0]);
  const [target] = [...shown.keys()];
  assert.ok(report.has(target), 'premise: the dashboard\'s first reference is a row of the report');

  const mutated = new Map(report);
  mutated.delete(target);
  mutated.set(`${target}-renamed`, report.get(target));

  const missingNow = [...shown.keys()].filter((ref) => !mutated.has(ref));
  assert.deepEqual(missingNow, [target],
    `renaming ${target} left every dashboard reference resolving, so this gate cannot see a rename`);
});

test('a net that drifts on one screen turns the figure check red', () => {
  const report = reportLedger();
  const [ref, row] = [...report][0];
  const drifted = new Map(report).set(ref, { ...row, net: '0.01' });
  assert.notEqual(drifted.get(ref).net, row.net);
  assert.ok([...drifted].some(([r, c]) => report.get(r).net !== c.net),
    'the comparison cannot see a changed net');
});
