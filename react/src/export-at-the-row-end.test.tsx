/* Rule: a report's export sits at the end of its control row, not beside the filters.
 * The filters narrow the ledger; the export acts on it, and next to "Clear all filters"
 * it read as the filter row's third control. Artur marked the capture that way on #505.
 *
 * Every control row that holds an export carries `ui-toolbar--split`, and the export is
 * that row's last element child, because the rule in layout.css reaches `:last-child`
 * (held in src/styles/toolbar-split.test.js). The React half of
 * stories/export-at-the-row-end.test.js (#429), over the TSX screens.
 *
 * Limit: JSDOM lays out no flex, so "at the end" is read from the class and the source
 * rule rather than from a box; the captures on #505 hold the position. */
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { expect, it } from 'vitest';
import * as Report from '../../stories/apps/FinanceReport.stories.tsx';
import * as Dashboard from '../../stories/apps/FinanceDashboard.stories.tsx';
import * as Guideline from '../../stories/guidelines/DashboardsAndReports.stories.tsx';

/** The screens the kit draws an export on, and the dashboard, which draws none. */
const SCREENS: Record<string, unknown> = {
  'Finance report': Report.Default,
  'Finance report, loading': Report.Loading,
  'Finance dashboard': Dashboard.Default,
  'Dashboards and reports guideline': Guideline.DashboardsAndReports,
};

/** Control rows holding an export, across all four screens. Raise with SCREENS. */
const EXPECTED_ROWS = 3;

const mount = (story: unknown) => {
  const Story = () => (story as { render: () => ReactElement }).render();
  const box = document.body.appendChild(document.createElement('div'));
  act(() => createRoot(box).render(<Story />));
  return box;
};

/** A row's export, by the name the wordless button carries in `aria-label`. */
const exportIn = (row: Element) => [...row.querySelectorAll('button, a')]
  .find((control) => (control.getAttribute('aria-label') || '').startsWith('Export'));

it('every control row holding an export sends it to the row end', () => {
  const rows: { where: string; row: Element; control: Element }[] = [];
  for (const [where, story] of Object.entries(SCREENS)) {
    const toolbars = [...mount(story).querySelectorAll('.ui-toolbar')];
    expect(toolbars.length, `${where}: no .ui-toolbar rendered — this gate measured nothing`).toBeGreaterThan(0);
    for (const row of toolbars) {
      const control = exportIn(row);
      if (control) rows.push({ where, row, control });
    }
  }
  expect(rows.length, `rows with an export (${rows.map((r) => r.where).join(', ') || 'none'})`).toBe(EXPECTED_ROWS);
  for (const { where, row, control } of rows) {
    expect(row.classList.contains('ui-toolbar--split'), `${where}: a row offering an export needs ui-toolbar--split, its classes are "${row.className}"`).toBe(true);
    expect(row.lastElementChild, `${where}: the export must be the row's last child for the auto margin to reach it`).toBe(control);
  }
});
