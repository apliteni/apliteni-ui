// The index: one row per page. Every title, blurb, count, gap and link comes
// from _overview.js — nothing on this page is typed twice.
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { pad } from '../_gallery.js';
import { badge } from '../../src/components/index.js';
import { INTRO, PAGES } from './_overview.js';

// The kit's warn badge, which is the one warning pair that clears AA in both
// themes — --amber as ink does not.
const gapBadge = (rule) => badge(`Gap #${rule.unmet.issue}`, 'warn');

// `--gl-page` is declared on `.gl` (_layout.js) and this page is not inside
// one, so the same measure is written out below.
//
// The widths are declared, with table-layout: fixed, rather than left to the
// kit's `.ui-table__title`: that carries width: 99% (src/styles/table.css),
// which is right for a ledger with one prose column and starves the second of
// the two here.
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

// target="_top" on the link, or Storybook loads inside its own preview pane.
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
