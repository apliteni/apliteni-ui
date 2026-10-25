/* Rule: a report's export sits at the end of its control row, not beside the
 * filters. The filters narrow the ledger; the export acts on it, and next to
 * "Clear all filters" it read as the filter row's third control. Artur marked
 * the capture that way on #505.
 *
 * Two halves, because either one alone passes while the screen is wrong:
 *   - Every control row that holds an export carries `ui-toolbar--split`, and
 *     the export is that row's last element child. The CSS rule below reaches
 *     `:last-child`, so an export that is not last is not moved.
 *   - `layout.css` gives `.ui-toolbar--split > :last-child` the auto margin, so
 *     a row that carries the class is actually sent to the end.
 *
 * WHAT THIS GATE DOES NOT REACH:
 *   - Paint. Nothing here measures a rendered position; the captures on #505 do.
 *     JSDOM does not lay flex out, so "at the end" is read from the class and
 *     the source rule rather than from a box.
 *   - Any screen outside SCREENS. A consumer's report is its own. Add a screen
 *     here and raise EXPECTED_ROWS when the kit gains one.
 *   - A toolbar with no export. `.ui-toolbar--split` is general, and a row that
 *     ends in something else is nothing this rule has an opinion about.
 *   - The busy case. `button({ busy: true })` emits a live-region span after the
 *     control, which would take `:last-child`. No export on these screens is
 *     busy, and the last-child check below is what would catch it if one were.
 *
 * Discover subjects from the rendered screens and check the coverage count.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { Default as Report, Loading as ReportLoading } from './apps/FinanceReport.stories.js';
import { Default as Dashboard } from './apps/FinanceDashboard.stories.js';
import { DashboardsAndReports as Guideline } from './guidelines/DashboardsAndReports.stories.js';

/** The screens the kit draws an export on, and the dashboard, which draws none:
 * a glance screen links to the report rather than carrying the report's export. */
const SCREENS = {
  'Finance report': Report,
  'Finance report, loading': ReportLoading,
  'Finance dashboard': Dashboard,
  'Dashboards and reports guideline': Guideline,
};

/** Control rows holding an export, across all four screens. Raise with SCREENS. */
const EXPECTED_ROWS = 3;

const docOf = (html) => new JSDOM(`<!doctype html><html lang="en"><body>${html}</body></html>`).window.document;

/** A row's export, by the name the wordless button carries in `aria-label`. */
const exportIn = (row) => [...row.querySelectorAll('button, a')]
  .find((control) => (control.getAttribute('aria-label') || '').startsWith('Export'));

test('export at the row end: every control row holding an export sends it there', () => {
  const rows = [];
  for (const [where, story] of Object.entries(SCREENS)) {
    const doc = docOf(story.render());
    const toolbars = [...doc.querySelectorAll('.ui-toolbar')];
    assert.ok(toolbars.length, `${where}: no .ui-toolbar rendered — this gate measured nothing`);
    for (const row of toolbars) {
      const control = exportIn(row);
      if (control) rows.push({ where, row, control });
    }
  }

  assert.equal(rows.length, EXPECTED_ROWS,
    `expected ${EXPECTED_ROWS} control rows with an export, found ${rows.length}`
    + ` (${rows.map((r) => r.where).join(', ') || 'none'}) — raise EXPECTED_ROWS with SCREENS`);

  for (const { where, row, control } of rows) {
    assert.ok(row.classList.contains('ui-toolbar--split'),
      `${where}: a row offering an export needs ui-toolbar--split, its classes are "${row.className}"`);
    assert.equal(row.lastElementChild, control,
      `${where}: the export must be the row's last child for the auto margin to reach it;`
      + ` last is <${row.lastElementChild?.tagName.toLowerCase()} class="${row.lastElementChild?.className}">`);
  }
});
