/* Rule: a reference the Finance dashboard shows resolves to a row in the
 * Finance report it links to, and the Dashboards and reports guideline prints
 * those same rows with the same figures and the same status.
 *
 * The kit's own pair did not: a reference the dashboard sent a reader after had
 * no row on the report, and a comment asserted the opposite. A comment is not a
 * gate, so the three screens are compared here instead. Why, and what was
 * rejected: #505.
 *
 * Every column both sides of a comparison draw is compared, so the set widens
 * by itself when a table gains one. Today: net and status everywhere, fees
 * between the guideline's ledger and the report, arrival between the dashboard
 * and the report.
 *
 * WHAT THIS GATE DOES NOT REACH:
 *   - That a link goes anywhere. Every href on these demo screens is "#"; what
 *     is checked is that the reference a reader would look for exists.
 *   - Row order, and the report's Payout ID column, which nothing else draws.
 *   - Any screen outside these three. A consumer's dashboard is its own.
 *   - A column the guideline carries in source and never renders. The gross is
 *     the one of those, so it is read from the specimen's export instead and
 *     held against the report's rendered column; nothing else is.
 *
 * Discover subjects from source and check the coverage count.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { Default as Dashboard } from './apps/FinanceDashboard.stories.js';
import { Default as Report } from './apps/FinanceReport.stories.js';
import { DashboardsAndReports } from './guidelines/DashboardsAndReports.stories.js';
import { LEDGER } from './guidelines/_dashboards-and-reports.js';

const docOf = (html) => new JSDOM(`<!doctype html><html lang="en"><body>${html}</body></html>`).window.document;

/** The columns a table is read for, by the heading each one sits under. */
const COLUMNS = { net: 'net (eur)', fees: 'fees', status: 'status', arrival: 'arrival', gross: 'gross' };

const headOf = (table) => [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim().toLowerCase());

/**
 * One table's rows keyed by their Reference cell. A row carries only the
 * columns that table actually draws, so a comparison can take the intersection
 * rather than assume a shape.
 */
const rowsByReference = (table, where) => {
  const head = headOf(table);
  const reference = head.indexOf('reference');
  assert.notEqual(reference, -1, `${where}: no Reference column — its header is ${head.join(', ')}`);
  const drawn = Object.entries(COLUMNS)
    .map(([name, heading]) => [name, head.indexOf(heading)])
    .filter(([, index]) => index !== -1);

  return new Map([...table.querySelectorAll('tbody tr')].map((tr) => {
    const cells = [...tr.children].map((td) => td.textContent.trim());
    return [cells[reference], Object.fromEntries(drawn.map(([name, index]) => [name, cells[index]]))];
  }));
};

/** What two readings of the same payouts disagree about, as lines to print. */
export const disagreements = (shown, report, where) => {
  const problems = [];
  for (const [reference, row] of shown) {
    const theirs = report.get(reference);
    if (!theirs) {
      problems.push(`${where}: ${reference} is drawn and the Finance report has no such row`);
      continue;
    }
    for (const column of Object.keys(row)) {
      if (!(column in theirs)) continue;
      if (theirs[column] !== row[column]) {
        problems.push(`${where}: ${reference} ${column} is ${row[column]} here and ${theirs[column]} on the report`);
      }
    }
  }
  return problems;
};

const oneTable = (html, where) => {
  const tables = [...docOf(html).querySelectorAll('.ui-table')];
  assert.equal(tables.length, 1, `${where} draws ${tables.length} tables, not one`);
  return rowsByReference(tables[0], where);
};

const reportLedger = () => oneTable(Report.render(), 'the Finance report');

/** Every table on the guideline page that keys its rows by a reference. */
const guidelineTables = () => {
  const found = [...docOf(DashboardsAndReports.render()).querySelectorAll('.ui-table')]
    .filter((table) => headOf(table).includes('reference'));
  assert.ok(found.length > 0, 'no table on the guideline page has a Reference column — this gate is checking nothing');
  return found.map((table, i) => rowsByReference(table, `the guideline's reference table ${i + 1}`));
};

test('every reference the dashboard shows is a row of the report, and says the same about it', () => {
  const shown = oneTable(Dashboard.render(), 'the Finance dashboard');
  assert.ok(shown.size > 0, 'the dashboard lists no exceptions, so this gate is checking nothing');

  const compared = [...shown.values()][0];
  assert.deepEqual(Object.keys(compared).sort(), ['arrival', 'net', 'status'],
    'the dashboard draws a different set of comparable columns; check what the gate now reads');

  assert.deepEqual(disagreements(shown, reportLedger(), 'the dashboard'), [],
    'the dashboard sends a reader to the payout report for a row that is missing or says something else there');
});

test('the guideline prints the report\'s own rows, with its own figures and statuses', () => {
  const report = reportLedger();
  const problems = [];
  let checked = 0;

  for (const [i, rows] of guidelineTables().entries()) {
    checked += rows.size;
    problems.push(...disagreements(rows, report, `the guideline's reference table ${i + 1}`));
  }

  // Seven reference tables on the page: the four-column ledger in four cells at
  // five rows each, and the three-row exceptions card in three. The count is
  // the anti-vacuity guard — a walk that stops finding tables passes every
  // assertion above it.
  assert.equal(checked, 29, 'the guideline draws a different number of referenced rows; count the new specimen by hand');
  assert.deepEqual(problems, [], `the guideline page and the Finance report disagree:\n  ${problems.join('\n  ')}`);
});

// The gross is the one column the guideline keeps and never draws, so a
// rendered comparison cannot reach it. It is the figure that makes each net
// checkable, so it is read from the specimen's own export instead.
test('the gross the guideline keeps undrawn is the report\'s gross, and its nets follow from it', () => {
  const report = reportLedger();
  const money = (text) => Number(text.replaceAll(',', ''));
  const problems = [];

  for (const [reference, gross, fees, net] of LEDGER) {
    const theirs = report.get(reference);
    if (!theirs) { problems.push(`${reference} is in the specimen ledger and not in the report`); continue; }
    if (theirs.gross !== gross) problems.push(`${reference} gross is ${gross} in the specimen and ${theirs.gross} on the report`);
    const expected = Math.round((money(gross) - money(fees)) * 100) / 100;
    if (expected !== money(net)) problems.push(`${reference} nets ${net} on ${gross} less ${fees}, which is ${expected}`);
  }

  assert.equal(LEDGER.length, 5, 'the specimen ledger changed length; count its rows by hand');
  assert.deepEqual(problems, [], `the specimen ledger and the report disagree:\n  ${problems.join('\n  ')}`);
});

/* The rejection proofs. Each mutates one reading and asserts the comparison
 * names it — the comparison itself, not a paraphrase of it. A source mutation
 * would be stronger still, and is what a reviewer runs; what these hold is that
 * the function every test above leans on cannot pass a changed value. */
const dashboardRows = () => oneTable(Dashboard.render(), 'the Finance dashboard');
const withRow = (rows, reference, change) => new Map(rows).set(reference, { ...rows.get(reference), ...change });

test('a renamed row leaves the dashboard pointing at nothing, and the gate says so', () => {
  const report = reportLedger();
  const shown = dashboardRows();
  const [target] = [...shown.keys()];
  assert.ok(report.has(target), 'premise: the dashboard\'s first reference is a row of the report');

  const renamed = new Map(report);
  renamed.delete(target);
  renamed.set(`${target}-renamed`, report.get(target));
  assert.deepEqual(disagreements(shown, renamed, 'x'),
    [`x: ${target} is drawn and the Finance report has no such row`]);
});

test('a status that drifts between the two screens turns the gate red', () => {
  const shown = dashboardRows();
  const [target] = [...shown.keys()];
  const was = reportLedger().get(target).status;
  assert.notEqual(was, 'Paid', `premise: ${target} is an exception, so the report does not call it Paid`);

  const drifted = withRow(reportLedger(), target, { status: 'Paid' });
  assert.deepEqual(disagreements(shown, drifted, 'x'),
    [`x: ${target} status is ${was} here and Paid on the report`]);
});

test('a net that drifts between the two screens turns the gate red', () => {
  const shown = dashboardRows();
  const [target] = [...shown.keys()];
  const was = reportLedger().get(target).net;
  const drifted = withRow(reportLedger(), target, { net: '0.01' });
  assert.deepEqual(disagreements(shown, drifted, 'x'),
    [`x: ${target} net is ${was} here and 0.01 on the report`]);
});

test('a column only one side draws is not a disagreement', () => {
  const shown = new Map([['PO-1', { net: '1.00', status: 'Paid' }]]);
  const report = new Map([['PO-1', { net: '1.00', status: 'Paid', gross: '2.00', arrival: '2026-06-01' }]]);
  assert.deepEqual(disagreements(shown, report, 'x'), []);
});
