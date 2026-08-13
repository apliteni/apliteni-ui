// ---------------------------------------------------------------------------
// Guidelines — Overview.
//
// The front door of the collection: one row per page, and a column that says
// plainly how much of each page the kit currently lives up to. It is the shape
// IBM's Carbon uses for its accessibility status and USWDS for its test
// results — the one with published precedent for being honest about a gap, and
// the one that survives more pages and more rules without a redesign.
//
// ONE ROW PER PAGE, not per rule. The reader is choosing where to go, so the
// unit is the page; the count in "Kit meets them" is what tells them a page has
// something outstanding. A row per rule would answer "which rules exist"
// instead, which is the pages' own job.
//
// The titles, the blurbs, the counts, the gaps, the links and the sentence
// above the table all come from _overview.js, which reads them off the five
// pages. Nothing on this page is typed twice.
// ---------------------------------------------------------------------------
import { pad } from '../_gallery.js';
import { badge } from '../../src/components/index.js';
import { INTRO, PAGES } from './_overview.js';

// The marker a rule the kit does not meet wears here: the kit's own warn badge,
// which is the one warning pair that clears AA in both themes (--amber as ink
// does not — see the Except label in _layout.js), carrying the issue number so
// the marker is also the address of the fix.
const gapBadge = (rule) => badge(`Gap #${rule.unmet.issue}`, 'warn');

// The measure is the one every guideline page uses (`--gl-page` in _layout.js):
// two specimen cells and the gap between them. That property is declared on
// `.gl`, which this page is not inside, so the calc is written out here — it
// keeps the index in the same column as the pages it lists.
//
// The kit's `.ui-table__title` is not used for the first cell, and that is
// deliberate. It carries `width: 99%` (src/styles/table.css) — the cell that
// absorbs all the slack, which is right for the kit's ledgers, where the title
// is the only prose in the row. This table has two prose columns, and 99% on
// the first one starves the second: the blurbs wrapped to four and five lines
// and the table measured 949px, nearly all of it text the design never asked
// for. Worse, the column widths then depended on the content, so removing the
// two markers to weigh them made the table TALLER.
//
// So the widths are declared instead, with `table-layout: fixed`, and the title
// cell takes its --strong ink from a class of its own. The kit's row rules,
// hairlines and uppercase head are unchanged.
const CSS = `
  <style>
    .gi { max-width: calc((420px + var(--space-5) * 2) * 2 + var(--space-4)); }
    .gi h1 { font: 700 27px/1.2 Poppins; letter-spacing: -.02em; color: var(--strong); margin: 0; }
    .gi-intro { font: 400 15px/1.7 Poppins; color: var(--text); max-width: 62ch;
      margin: var(--space-4) 0 0; }
    .gi-table { margin-top: var(--space-6); table-layout: fixed; }
    .gi-table td { white-space: normal; }
    /* The kit right-aligns a table's last column — its last column is an actions
       cell. Here it is a status, which reads down the left edge with its rows. */
    .gi-table th:last-child { text-align: left; }
    .gi-name a { color: var(--accent); text-decoration: none; font-weight: var(--weight-medium); }
    .gi-name a:hover { text-decoration: underline; text-underline-offset: 4px; }
    .gi-covers { color: var(--dim); }
    .gi-count, .gi-ratio { white-space: nowrap; }
    .gi-met { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
  </style>`;

const met = (page) => {
  const kept = page.rules.length - page.gaps.length;
  return `<div class="gi-met"><span class="gi-ratio">${kept} of ${page.rules.length}</span>`
    + `${page.gaps.map(gapBadge).join('')}</div>`;
};

const row = (page) => `
  <tr>
    <td class="gi-name"><a href="${page.href}" target="_top">${page.title}</a></td>
    <td><span class="gi-covers">${page.blurb}</span></td>
    <td><span class="gi-count">${page.rules.length}</span></td>
    <td>${met(page)}</td>
  </tr>`;

export default {
  title: 'Guidelines/Overview',
  parameters: { layout: 'fullscreen' },
};

export const Overview = {
  name: 'Overview',
  render: () => `${CSS}${pad(`<div class="gi">
      <h1>Guidelines</h1>
      <p class="gi-intro">${INTRO}</p>
      <table class="ui-table gi-table">
        <colgroup>
          <col style="width:24%"><col style="width:44%"><col style="width:9%"><col style="width:23%">
        </colgroup>
        <thead><tr>
          <th>Guideline</th><th>What it covers</th><th>Rules</th><th>Kit meets them</th>
        </tr></thead>
        <tbody>${PAGES.map(row).join('')}</tbody>
      </table>
    </div>`)}`,
};
