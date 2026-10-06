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
 * The second half drives the links themselves: a click inside the manager, a click
 * in a bare preview, and the arrival each one asks for.
 *
 * WHAT THIS GATE DOES NOT REACH:
 *   - A real browser. The arrival is driven in JSDOM, which ships no
 *     scrollIntoView and no layout, so what is held is that the row is marked,
 *     given the keyboard and asked for — at the centre and never sideways — and
 *     not where it ends up on a screen. The PR's captures carry that. JSDOM also
 *     ships no `document.fonts`, so the re-land the display face triggers in a
 *     browser does not happen here, and the counts below are the other asks.
 *   - That the Storybook manager keeps its globals across SELECT_STORY. What is
 *     held here is that the click asks the manager to select the story instead of
 *     replacing the frame with a bare preview URL, which is what dropped the
 *     theme; that the manager then keeps the theme is Storybook's, and measured
 *     in a browser.
 *   - The rail's Invoices and Preferences, which have no screen in the kit.
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
import { installDomGlobals } from './lib/contrast.js';

import { Default as Dashboard } from './apps/FinanceDashboard.stories.js';
import { Default as Report } from './apps/FinanceReport.stories.js';
import { REPORT_STORY, payoutRowId } from './apps/_finance-nav.js';
import { LANDED, landOnRow, linkTarget, previewHref, wireStoryLinks } from './lib/story-link.js';
import { SELECT_STORY, STORY_RENDERED } from 'storybook/internal/core-events';
import { DashboardsAndReports } from './guidelines/DashboardsAndReports.stories.js';
import { LEDGER } from './guidelines/_dashboards-and-reports.js';

const docOf = (html) => new JSDOM(`<!doctype html><html lang="en"><body>${html}</body></html>`).window.document;

/** The columns a table is read for, by the heading each one sits under. */
const COLUMNS = { net: 'net (eur)', fees: 'fees', status: 'status', arrival: 'arrival', gross: 'gross' };

const headOf = (table) => [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim().toLowerCase());

/** A cell's text without the chips the row moved into it. */
const plainText = (cell) => {
  const copy = cell.cloneNode(true);
  for (const chip of copy.querySelectorAll('.ui-badge')) chip.remove();
  return copy.textContent.trim();
};

/**
 * One table's rows keyed by their Reference cell. A row carries only the
 * columns that table actually draws, so a comparison can take the intersection
 * rather than assume a shape.
 *
 * A status is read from the row's badge wherever the row draws one, and from a
 * Status column when it draws none: the glance screen carries the status in the
 * reference's own cell, because a third column of it does not fit the card a
 * phone leaves, and the report carries it in a column of its own. It is the same
 * fact either way, so the comparison reads it either way.
 */
const rowsByReference = (table, where) => {
  const head = headOf(table);
  const reference = head.indexOf('reference');
  assert.notEqual(reference, -1, `${where}: no Reference column — its header is ${head.join(', ')}`);
  const drawn = Object.entries(COLUMNS)
    .map(([name, heading]) => [name, head.indexOf(heading)])
    .filter(([, index]) => index !== -1);

  return new Map([...table.querySelectorAll('tbody tr')].map((tr) => {
    const cells = [...tr.children];
    const row = Object.fromEntries(drawn.map(([name, index]) => [name, cells[index].textContent.trim()]));
    const chip = tr.querySelector('.ui-badge');
    if (chip) row.status = chip.textContent.trim();
    return [plainText(cells[reference]), row];
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

/* -- Where a reference sends a reader ------------------------------------------
 *
 * The other half of the pair: the figures agreeing is worth nothing if the link
 * beside them goes nowhere. Every link in an exceptions block — each reference and
 * the one in the card's head that opens the whole report — is read out of the
 * rendered screen and held against the story it names and the row that story draws.
 */

/** Every link an exceptions block draws: its text, its href, and where it was. */
const blockLinks = (html, where) => {
  const doc = docOf(html);
  const found = [];
  for (const table of doc.querySelectorAll('.ui-table')) {
    if (!headOf(table).includes('reference')) continue;
    for (const a of table.querySelectorAll('tbody a[href]')) {
      found.push({ where, kind: 'reference', text: plainText(a), href: a.getAttribute('href') });
    }
  }
  // The block's own link is in the card's head, beside the title, rather than in a
  // control row under the table — which is also why it is read out of
  // `.ui-card__sub` and not out of a button. why: Artur, round r33
  for (const a of doc.querySelectorAll('.ui-card__sub a[href]')) {
    found.push({ where, kind: 'onward', text: a.textContent.trim(), href: a.getAttribute('href') });
  }
  return found;
};

/** The report's rows by the id each one carries. */
const reportRowIds = () => new Map([...docOf(Report.render()).querySelectorAll('tbody tr[id]')]
  .map((tr) => [tr.id, plainText(tr.children[0])]));

/** What a set of links gets wrong about the report they claim to open. */
export const linkProblems = (links, rows) => {
  const problems = [];
  for (const { where, kind, text, href } of links) {
    const [path, row] = href.split('#');
    if (!path.includes(`id=${REPORT_STORY}`)) {
      problems.push(`${where}: the ${kind} "${text}" links to ${href}, which is not the Finance report`);
      continue;
    }
    if (kind === 'onward') {
      if (row) problems.push(`${where}: the ${kind} "${text}" opens the report at row ${row}, and it opens the whole of it`);
      continue;
    }
    if (!row) {
      problems.push(`${where}: the reference "${text}" opens the report and names no row of it`);
    } else if (!rows.has(row)) {
      problems.push(`${where}: the reference "${text}" opens the report at #${row}, which no row of it carries`);
    } else if (rows.get(row) !== text) {
      problems.push(`${where}: the reference "${text}" opens the report at #${row}, which is ${rows.get(row)}`);
    }
  }
  return problems;
};

test('every link in an exceptions block opens the report, and every reference opens its own row', () => {
  const rows = reportRowIds();
  assert.equal(rows.size, 7, 'the report draws a different number of identified rows; count them by hand');

  const links = [
    ...blockLinks(Dashboard.render(), 'the Finance dashboard'),
    ...blockLinks(DashboardsAndReports.render(), 'the guideline page'),
  ];
  // Three dashboard references and three in each of the two Do specimens.
  assert.equal(links.length, 9,
    `found ${links.length} links, not the 9 these screens draw:\n${links.map((l) => `${l.where}: ${l.kind} ${l.text} -> ${l.href}`).join('\n')}`);
  assert.equal(links.filter((l) => l.kind === 'onward').length, 0, 'a block gained or lost its link into the report');
  assert.deepEqual(linkProblems(links, rows), [],
    `a link in an exceptions block does not reach the report row it stands for:\n  ${linkProblems(links, rows).join('\n  ')}`);
});

test('a reference that still points at nothing is a finding', () => {
  const rows = reportRowIds();
  assert.deepEqual(linkProblems([{ where: 'x', kind: 'reference', text: 'PO-1166', href: '#' }], rows),
    ['x: the reference "PO-1166" links to #, which is not the Finance report']);
  assert.deepEqual(linkProblems([{ where: 'x', kind: 'onward', text: 'All payouts', href: '#' }], rows),
    ['x: the onward "All payouts" links to #, which is not the Finance report']);
});

test('a reference opening the wrong row, or no row, is a finding', () => {
  const rows = reportRowIds();
  const href = (row) => `./iframe.html?id=${REPORT_STORY}#${row}`;
  assert.deepEqual(linkProblems([{ where: 'x', kind: 'reference', text: 'PO-1166', href: href(payoutRowId('PO-1164')) }], rows),
    ['x: the reference "PO-1166" opens the report at #payout-po-1164, which is PO-1164']);
  assert.deepEqual(linkProblems([{ where: 'x', kind: 'reference', text: 'PO-1166', href: href('payout-po-9999') }], rows),
    ['x: the reference "PO-1166" opens the report at #payout-po-9999, which no row of it carries']);
  assert.deepEqual(linkProblems([{ where: 'x', kind: 'reference', text: 'PO-1166', href: `./iframe.html?id=${REPORT_STORY}` }], rows),
    ['x: the reference "PO-1166" opens the report and names no row of it']);
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

/* -- Arriving on the row -------------------------------------------------------
 *
 * The third half. A reference whose link opens the report and leaves the reader at
 * the top of it has not answered the reference they followed: at 390 the rows the
 * dashboard calls out are a screen and a half down. So the click is driven here, in
 * both frames a story can be looked at from, and what it arrives at is read back.
 */

/** A frame with a story rendered in it, and everything a click does made readable.
 *  JSDOM ships no scrollIntoView, so one that records what was asked for is installed
 *  in its place — the ask is the measurable part, and the screen is the capture's. */
const frameOf = (html, { framed = true, hash = '', parentHash = '', theme = 'light', accent = '', loading = false } = {}) => {
  const dom = new JSDOM(`<!doctype html><html lang="en"><body>${html}</body></html>`);
  const doc = dom.window.document;
  const scrolled = [];
  dom.window.HTMLElement.prototype.scrollIntoView = function record(options) { scrolled.push({ id: this.id, options }); };
  if (theme) doc.documentElement.setAttribute('data-theme-choice', theme);
  if (accent) doc.documentElement.setAttribute('data-accent', accent);

  const emitted = [];
  const renderers = [];
  const channel = {
    emit: (type, payload) => emitted.push({ type, payload }),
    on: (type, fn) => { if (type === STORY_RENDERED) renderers.push(fn); },
  };
  // JSDOM leaves a document it built in hand at `loading`, so both halves are stated.
  Object.defineProperty(doc, 'readyState', { value: loading ? 'loading' : 'complete', configurable: true });
  const loaders = [];
  const win = {
    document: doc,
    location: { hash, assign(url) { win.assigned = url; } },
    addEventListener: (type, fn) => { if (type === 'load') loaders.push(fn); },
    scrollTo: (x, y) => { win.scrolledTo = [x, y]; },
  };
  win.parent = framed ? { location: { hash: parentHash } } : win;
  const frame = {
    win, doc, scrolled, emitted, channel,
    render: () => renderers.forEach((fn) => fn()),
    finishLoading: () => { loaders.splice(0).forEach((fn) => fn()); },
  };
  wireStoryLinks({ win, channel });
  return frame;
};

/** Click the link a reader would click, by the words on it. */
const clickLink = (doc, text) => {
  const link = [...doc.querySelectorAll('a[href]')].find((a) => a.textContent.trim() === text);
  assert.ok(link, `no link on this screen reads "${text}"`);
  const event = new doc.defaultView.MouseEvent('click', { bubbles: true, cancelable: true });
  link.dispatchEvent(event);
  return event;
};

/**
 * What an arrival got wrong. Every part of landing on a row is read from the frame it
 * happened in, so a landing that only marks, or only scrolls, is still a finding.
 */
export const arrivalProblems = ({ text, row, landed, doc, scrolled }) => {
  if (!landed) return [`${text}: no row of the report answers #${row}`];
  const problems = [];
  const named = landed.children[0].textContent.trim();
  if (named !== text) problems.push(`${text}: landed on ${named}`);
  if (!landed.classList.contains(LANDED)) problems.push(`${text}: the row it landed on carries no mark`);
  if (doc.activeElement !== landed) problems.push(`${text}: the keyboard did not follow onto the row`);
  const asked = scrolled.filter((s) => s.id === row);
  if (asked.length !== 1) problems.push(`${text}: the row was brought into view ${asked.length} times, not once`);
  if (asked.some((s) => s.options?.block !== 'center')) problems.push(`${text}: the row was not brought to the middle of the view`);
  if (asked.some((s) => s.options?.inline !== 'nearest')) problems.push(`${text}: the row was brought into view sideways`);
  return problems;
};

test('every reference the dashboard draws lands a reader on its own row of the report', () => {
  const references = blockLinks(Dashboard.render(), 'the Finance dashboard').filter((l) => l.kind === 'reference');
  // Three exceptions on the dashboard, and the count is the anti-vacuity guard: a walk
  // that stops finding links passes every assertion under it.
  assert.equal(references.length, 3, `found ${references.length} references on the dashboard, not the three it draws`);

  const problems = [];
  for (const { text, href } of references) {
    const { row } = linkTarget(href);
    const frame = frameOf(Report.render(), { framed: true, parentHash: `#${row}` });
    frame.render();
    problems.push(...arrivalProblems({ text, row, landed: frame.doc.getElementById(row), doc: frame.doc, scrolled: frame.scrolled }));
  }
  assert.deepEqual(problems, [], `a reference opens the report and does not land the reader on its row:\n  ${problems.join('\n  ')}`);
});

test('a reference naming a row the report no longer draws marks nothing', () => {
  const frame = frameOf(Report.render(), { framed: true });
  const live = payoutRowId('PO-1159');
  assert.ok(landOnRow(frame.doc, live), 'premise: a live reference lands on its row');
  assert.equal(frame.doc.querySelectorAll(`.${LANDED}`).length, 1, 'premise: landing marks exactly one row');

  assert.equal(landOnRow(frame.doc, 'payout-po-9999'), null, 'a row the report does not draw was landed on');
  assert.equal(frame.doc.querySelectorAll(`.${LANDED}`).length, 0,
    'a reference to a row that is gone left the previous row marked, so the mark now names the wrong payout');
});

test('a reference followed inside the manager asks Storybook to select the story', () => {
  const frame = frameOf(Dashboard.render(), { framed: true, theme: 'light' });
  const event = clickLink(frame.doc, 'PO-1159');

  assert.ok(event.defaultPrevented,
    'the click was left to the href, which replaces the manager\'s preview with a bare iframe and takes the theme with it');
  assert.equal(frame.win.assigned, undefined, 'the frame navigated itself instead of asking the manager to navigate');
  assert.deepEqual(frame.emitted,
    [{ type: SELECT_STORY, payload: { storyId: REPORT_STORY, scrollTo: payoutRowId('PO-1159') } }]);
});

test('the block\'s own link opens the whole report, at its top and marked nowhere', () => {
  const frame = frameOf(Dashboard.render(), { framed: true });
  clickLink(frame.doc, 'Payouts');
  assert.deepEqual(frame.emitted, [{ type: SELECT_STORY, payload: { storyId: REPORT_STORY, scrollTo: undefined } }]);

  // The manager keeps one preview frame, so without this the reader arrives at whatever
  // offset the screen they left was scrolled to.
  frame.render();
  assert.deepEqual(frame.win.scrolledTo, [0, 0], 'the whole-report link left the reader part-way down the ledger');
  assert.deepEqual(frame.scrolled, [], 'the whole-report link brought a row into view');
});

test('a report still loading is put back at its top once it has finished', () => {
  const frame = frameOf(Dashboard.render(), { framed: true, loading: true });
  clickLink(frame.doc, 'Payouts');
  frame.render();
  frame.win.scrolledTo = null;
  frame.finishLoading();
  assert.deepEqual(frame.win.scrolledTo, [0, 0],
    'the browser settled the scroll position after the report opened, and nothing put the reader back');
});

test('a row already marked is cleared when a link that names no row is followed', () => {
  const row = payoutRowId('PO-1159');
  const frame = frameOf(Report.render(), { framed: true, parentHash: `#${row}` });
  frame.render();
  assert.equal(frame.doc.querySelectorAll(`.${LANDED}`).length, 1, 'premise: the arrival marked its row');

  clickLink(frame.doc, 'Dashboard');
  frame.render();
  assert.equal(frame.doc.querySelectorAll(`.${LANDED}`).length, 0,
    'the mark stayed on a row the reader has navigated away from');
});

test('a reference followed in a bare preview carries the theme and the accent it was read in', () => {
  const frame = frameOf(Dashboard.render(), { framed: false, theme: 'light', accent: 'ocean' });
  const event = clickLink(frame.doc, 'PO-1166');

  assert.ok(event.defaultPrevented, 'the bare href was followed, and it names no globals');
  assert.equal(frame.win.assigned, previewHref(REPORT_STORY, payoutRowId('PO-1166'), 'theme:light;accent:ocean'),
    'a preview opened on its own carries its globals in its URL, so a link out of it that names none arrives on the default theme');
  assert.deepEqual(frame.emitted, [], 'a frame with no manager over it asked a manager to navigate');
});

test('a bare preview opened on a fragment lands on that row itself', () => {
  const row = payoutRowId('PO-1164');
  const frame = frameOf(Report.render(), { framed: false, hash: `#${row}` });
  frame.render();
  assert.deepEqual(arrivalProblems({ text: 'PO-1164', row, landed: frame.doc.getElementById(row), doc: frame.doc, scrolled: frame.scrolled }), []);
});

test('the row survives the query the manager appends after its own fragment', () => {
  const row = payoutRowId('PO-1159');
  // Measured in Chromium on the static build: the manager navigates to
  // `?path=/story/…#payout-po-1159&globals=theme:light&globals=theme:light`, its query
  // landing after the fragment and its globals written twice.
  const frame = frameOf(Report.render(), { framed: true, parentHash: `#${row}&globals=theme:light&globals=theme:light` });
  frame.render();
  assert.deepEqual(arrivalProblems({ text: 'PO-1159', row, landed: frame.doc.getElementById(row), doc: frame.doc, scrolled: frame.scrolled }), []);
});

test('a preview that is still loading draws the arrival again once it has finished', () => {
  const row = payoutRowId('PO-1159');
  const frame = frameOf(Report.render(), { framed: false, hash: `#${row}`, loading: true });
  frame.render();
  assert.deepEqual(frame.scrolled.map((s) => s.id), [row], 'premise: the row is brought into view as the story renders');
  frame.finishLoading();
  // Twice, on purpose: the browser settles the scroll position at the end of loading, and
  // the second ask is what puts the reader back on the row it moved out from under them.
  assert.deepEqual(frame.scrolled.map((s) => s.id), [row, row],
    'a preview that finished loading left the reader wherever the browser put them');
  assert.ok(frame.doc.getElementById(row).classList.contains(LANDED));
});

test('a preview that has finished loading is not asked twice', () => {
  const row = payoutRowId('PO-1164');
  const frame = frameOf(Report.render(), { framed: false, hash: `#${row}` });
  frame.render();
  frame.finishLoading();
  assert.deepEqual(frame.scrolled.map((s) => s.id), [row]);
});

test('re-rendering the story a reader has arrived in does not scroll them back', () => {
  const row = payoutRowId('PO-1166');
  const frame = frameOf(Report.render(), { framed: true, parentHash: `#${row}` });
  frame.render();
  frame.render(); // what a theme toggle does: the same story, rendered again
  assert.deepEqual(frame.scrolled.map((s) => s.id), [row],
    'a story re-rendered under the reader scrolled them back to the row they had left');
});

test('wiring a frame twice leaves one set of listeners', () => {
  const frame = frameOf(Dashboard.render(), { framed: true });
  wireStoryLinks({ win: frame.win, channel: frame.channel });
  clickLink(frame.doc, 'PO-1159');
  assert.equal(frame.emitted.length, 1, 'the decorator runs per story, so a second wiring would double every click');
});

test('a link that is not a preview link is left alone', () => {
  const frame = frameOf('<a href="#logout">Sign out</a>', { framed: true });
  const event = clickLink(frame.doc, 'Sign out');
  assert.equal(event.defaultPrevented, false);
  assert.deepEqual(frame.emitted, []);
  assert.equal(frame.win.assigned, undefined);
});

/* The rejection proofs for the arrival. Each hands arrivalProblems one landing with a
 * single part missing and asserts it names that part — the reading every test above
 * leans on cannot pass a row that was marked and never scrolled, or scrolled and never
 * marked. */
const landing = (over = {}) => {
  const row = payoutRowId('PO-1159');
  const frame = frameOf(Report.render(), { framed: true, parentHash: `#${row}` });
  frame.render();
  return { text: 'PO-1159', row, landed: frame.doc.getElementById(row), doc: frame.doc, scrolled: frame.scrolled, ...over };
};

test('a row that was scrolled to and never marked is a finding', () => {
  const base = landing();
  base.landed.classList.remove(LANDED);
  assert.deepEqual(arrivalProblems(base), ['PO-1159: the row it landed on carries no mark']);
});

test('a row that was marked and never brought into view is a finding', () => {
  assert.deepEqual(arrivalProblems(landing({ scrolled: [] })), ['PO-1159: the row was brought into view 0 times, not once']);
});

test('a row brought into view sideways, or not to the middle, is a finding', () => {
  const row = payoutRowId('PO-1159');
  assert.deepEqual(arrivalProblems(landing({ scrolled: [{ id: row, options: { block: 'start', inline: 'center' } }] })),
    ['PO-1159: the row was not brought to the middle of the view', 'PO-1159: the row was brought into view sideways']);
});

test('landing on the wrong row is a finding, and landing on none says so', () => {
  const other = payoutRowId('PO-1164');
  const frame = frameOf(Report.render(), { framed: true, parentHash: `#${other}` });
  frame.render();
  assert.deepEqual(arrivalProblems({ ...landing(), landed: frame.doc.getElementById(other) }).slice(0, 1), ['PO-1159: landed on PO-1164']);
  assert.deepEqual(arrivalProblems({ text: 'PO-1159', row: 'payout-po-9999', landed: null }),
    ['PO-1159: no row of the report answers #payout-po-9999']);
});

// These checks exercise the sample controls in JSDOM. Browser evidence checks paint and focus.
test('the Finance report filters Paid rows and clears both filters', async () => {
  const doc = docOf(Report.render());
  installDomGlobals(doc.defaultView);
  Report.play({ canvasElement: doc.body });
  const host = doc.querySelector('[data-finance-filters]');
  const change = (id, value) => host.dispatchEvent(new doc.defaultView.CustomEvent('ui-filter-change', { detail: { id, value } }));
  change('status', 'Paid');
  assert.equal(doc.querySelectorAll('tbody tr').length, 4);
  assert.ok([...doc.querySelectorAll('tbody .ui-badge')].every(badge => badge.textContent === 'Paid'));
  change('currency', 'USD');
  assert.match(doc.querySelector('tbody').textContent, /No payouts match/);
  host.dispatchEvent(new doc.defaultView.CustomEvent('ui-filter-clear'));
  assert.equal(doc.querySelectorAll('tbody tr').length, 7);
});

test('both Finance periods change totals and the dashboard trends', () => {
  const dashboard = docOf(Dashboard.render());
  const report = docOf(Report.render());
  installDomGlobals(report.defaultView);
  Dashboard.play({ canvasElement: dashboard.body });
  Report.play({ canvasElement: report.body });
  const figures = doc => [...doc.querySelectorAll('.ui-stat__value')].map(node => node.textContent);
  const yearly = figures(report);
  const yearlyTrend = dashboard.querySelector('.ui-stat__trend').innerHTML;
  for (const doc of [dashboard, report]) doc.querySelector('[data-seg] button').click();
  assert.notDeepEqual(figures(report), yearly);
  assert.deepEqual(figures(report), figures(dashboard));
  assert.notEqual(dashboard.querySelector('.ui-stat__trend').innerHTML, yearlyTrend);
  assert.match(dashboard.querySelector('[data-period-basis]').textContent, /3 months/);
  for (const doc of [dashboard, report]) [...doc.querySelectorAll('[data-seg] button')].at(-1).click();
  assert.deepEqual(figures(report), figures(dashboard));
  assert.equal(dashboard.querySelectorAll('.ui-stat__delta').length, 0, 'All has no preceding period to compare');
});
