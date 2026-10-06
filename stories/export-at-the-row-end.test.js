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
import { readFileSync } from 'node:fs';
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

/* The sheet's two declarations of the selector, told apart by the phone query
 * rather than by which one comes first: reading `match()` alone would take
 * whichever is written earlier, so moving one above the other would quietly
 * swap which rule this gate is checking. */
const splitRules = () => {
  const css = readFileSync(new URL('../src/styles/layout.css', import.meta.url), 'utf8');
  const phone = css.match(/@media \(max-width: 560px\)\s*\{([\s\S]*?)\n\}/);
  const inPhone = phone ? phone[1] : '';
  const outside = css.replace(inPhone, '');
  const pick = (text) => text.match(/\.ui-toolbar--split\s*>\s*:last-child\s*\{([^}]*)\}/);
  const group = inPhone.match(/\.ui-toolbar--split\s*>\s*:nth-last-child\(2\)\s*\{([^}]*)\}/);
  return { base: pick(outside), phone: pick(inPhone), group };
};

test('export at the row end: layout.css moves the split row\'s last control', () => {
  const { base } = splitRules();
  assert.ok(base, 'layout.css declares no `.ui-toolbar--split > :last-child` rule outside the phone query');
  assert.match(base[1], /margin-inline-start:\s*auto/,
    'the split row\'s last control needs `margin-inline-start: auto` to reach the end');
});

/* The other half of the same rule, two rounds of it. Above the phone step "the end
 * of the line" is a place; below it the margin was leaving the export alone against
 * the right edge of an otherwise empty row — measured at x=338 on a 390 screen and
 * x=268 on a 320 one, in a row 284px and 214px wide — so r31 dropped it. Dropped,
 * the export started a line of its own under the clear button, which r34 read as the
 * filter row's third control again, drawn vertically. So the group BEFORE the end
 * control is given a basis: a flex line breaks on hypothetical sizes, and a group
 * asking for more than the line takes it alone whatever it shrinks to afterwards.
 * Both declarations are read, because either alone leaves the export off the row.
 *
 * WHAT THIS DOES NOT REACH: paint, for the reason the first half records —
 * JSDOM lays out no flex, so the position is read from the source rule. The
 * rendered x positions above are in the pull request's captures. */
test('export at the row end: below the phone step the end control stays in the row', () => {
  const { phone, group } = splitRules();
  assert.ok(phone, 'the 560px query declares no `.ui-toolbar--split > :last-child` rule, so the '
    + 'export keeps the auto margin on a phone and lands alone against the right edge');
  assert.match(phone[1], /margin-inline-start:\s*0/,
    'below the phone step the split row\'s last control must drop the auto margin, not keep it');
  assert.match(phone[1], /align-self:\s*start/,
    'the end control must keep its own height beside a group that wraps to two lines');
  assert.ok(group, 'the 560px query gives the group before the end control no basis, so the group '
    + 'takes the whole line and the end control drops under it');
  assert.match(group[1], /flex:\s*1\s+1\s+\d+%/,
    'the group needs a fractional basis — on `auto` its content is its hypothetical size and the '
    + 'line breaks before the end control');
  assert.match(group[1], /min-width:\s*0/, 'without this the group cannot shrink to the basis it was given');
});
