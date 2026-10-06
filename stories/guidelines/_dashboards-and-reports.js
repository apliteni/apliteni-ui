import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('dashboards-and-reports.md', new URL('../../guidelines/dashboards-and-reports.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/components.md
import { badge, button, card } from '../../src/components/index.js';
import { filterBar } from '../../src/components/filter-bar.js';
import { statBand } from '../../src/components/stat.js';
import { sparkline } from '../lib/sparkline.js';
import { CHART_CSS, bars } from '../_chart.js';
import { payoutHref } from '../apps/_finance-nav.js';

// One made-up portal supplies every specimen, and the Finance report showcase
// prints the same payouts with the same fees and nets —
// stories/dashboard-report-refs.test.js holds the two in step. The halves of a
// pair differ in one decision.
export const SPEC_CSS = `${CHART_CSS}
  <style>
    .gd-stage { display: flex; flex-direction: column; gap: var(--space-4); }
    /* The chart is a picture above a table, not the table's own head band: the
       scale's gap is what keeps the bar baselines off the header's cap height. */
    /* The dense table under it hangs out of the card by --space-3 so its columns
       start on the card's text edge; the chart takes the same bleed, so chart and
       table are one box rather than two of different widths. */
    .gd-chart { display: flex; flex-direction: column; gap: var(--space-2);
      width: calc(100% + 2 * var(--space-3)); margin-inline: calc(-1 * var(--space-3));
      margin-bottom: var(--space-4); }
    .gd-chart__months { display: flex; }
    .gd-chart__months span { flex: 1 1 0; min-width: 0; text-align: center; }
  </style>`;

const stage = (html) => `<div class="gd-stage">${html}</div>`;

const MONEY_IN = [412, 455, 430, 498, 520, 505, 560, 548, 590, 610, 587, 640];
const MONEY_OUT = [298, 304, 312, 309, 321, 317, 329, 334, 327, 339, 341, 318];

// Cashflow for the year, the figures the portal's dashboard opens with. A
// specimen cell is under 28rem, so every figure takes a row of its own; a pair
// stays readable when the Do draws two of them rather than the screen's three.
const FIGURES = [
  { label: 'Money in', value: '759,988 €', delta: { value: '+12.4%', tone: 'good' }, trend: sparkline(MONEY_IN, 'Money in, last 12 months') },
  { label: 'Money out', value: '3,048,559 €', delta: { value: '+31.8%', tone: 'bad' }, trend: sparkline(MONEY_OUT, 'Money out, last 12 months') },
];
const cashflow = (id) => statBand({ id,
  stats: FIGURES.map(figure => ({ ...figure, delta: { ...figure.delta, basis: 'vs prior year' } })),
});

// Reference, fees, net, status. A fifth column does not fit a specimen cell,
// so the gross stays here undrawn: it is what makes each net checkable, and
// the Finance report prints it in a column this cell has no room for.
// stories/dashboard-report-refs.test.js reads it from this export and holds it
// against the report's, so the agreement is measured rather than asserted.
export const LEDGER = [
  ['PO-1162', '14,942.27', '489.44', '14,452.83', 'success', 'Paid'],
  ['PO-1163', '14,490.70', '574.19', '13,916.51', 'success', 'Paid'],
  ['PO-1164', '14,566.66', '483.97', '14,082.69', 'pending', 'In transit'],
  ['PO-1165', '39,054.98', '1,369.76', '37,685.22', 'success', 'Paid'],
  ['PO-1166', '14,969.33', '472.71', '14,496.62', 'danger', 'Failed'],
];

const ledgerTable = () => `
  <table class="ui-table ui-table--dense ui-table--zebra">
    <thead><tr>
      <th>Reference</th>
      <th class="ui-table__num">Fees</th><th class="ui-table__num">Net (EUR)</th>
      <th>Status</th>
    </tr></thead>
    <tbody>
      ${LEDGER.map(([ref, , fees, net, variant, label]) => `
        <tr>
          <td>${ref}</td>
          <td class="ui-table__num">${fees}</td>
          <td class="ui-table__num ui-table__num--strong">${net}</td>
          <td>${badge(label, variant)}</td>
        </tr>`).join('')}
    </tbody>
  </table>`;

// The rows that need a decision, which is all a dashboard carries of a ledger.
const EXCEPTIONS = [
  ['PO-1166', '14,496.62', 'danger', 'Failed'],
  ['PO-1164', '14,082.69', 'pending', 'In transit'],
  ['PO-1159', '2,180.00', 'danger', 'Unmatched'],
];

// Every reference opens the Finance report at its own row, and the pair below can
// show it: a reference inside .ui-table__pair takes the kit's link ink, so a
// reader sees which cells are a way through without a pointer.
//
// `onward: false` draws the same rows with no link on any of them — neither the
// reference nor the block's head. Both halves used to print the same three
// accent references and only the head link told them apart, which made the
// Don't's own caption, "offers no way in", false of the picture under it: three
// accent links are three ways in. The half that teaches the rule by missing it
// has to miss the whole of it. why: the design review of 617b937, #505
//
// The status rides in the reference's cell, as it does on the portal's own
// dashboard: a specimen cell is 195px wide at 320, which a third column of
// status does not fit, and the state of the row is what the row is here for.
// why: #505
const exceptionsTable = ({ onward = true } = {}) => `
  <table class="ui-table ui-table--dense">
    <thead><tr><th>Reference</th><th class="ui-table__num">Net (EUR)</th></tr></thead>
    <tbody>
      ${EXCEPTIONS.map(([ref, net, variant, label]) => `
        <tr>
          <td><span class="ui-table__pair">${onward ? `<a href="${payoutHref(ref)}">${ref}</a>` : ref}${badge(label, variant)}</span></td>
          <td class="ui-table__num ui-table__num--strong">${net}</td>
        </tr>`).join('')}
    </tbody>
  </table>`;

const attention = ({ onward = true } = {}) => card({
  title: 'Needs a decision',
  body: exceptionsTable({ onward }),
});

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const NET_BY_MONTH = [412, 455, 430, 498, 520, 505];
// The bars, their month names, and the gap that keeps them off the table head.
// bars() lays one slot per value across the full width, so a flex row of equal
// cells puts each name under its own bar.
const monthChart = () => `<div class="gd-chart">${bars({
  values: NET_BY_MONTH, width: 320, height: 96, fluid: true,
  label: 'Net settled by month, first half of the year',
}).svg}<div class="gd-chart__months ui-stat__label" aria-hidden="true">${MONTHS.map((month) => `<span>${month}</span>`).join('')}</div></div>`;

const monthTable = () => `
  <table class="ui-table ui-table--dense">
    <thead><tr><th>Month</th><th class="ui-table__num">Net settled (k €)</th></tr></thead>
    <tbody>${MONTHS.map((month, i) => `
      <tr><td>${month}</td><td class="ui-table__num ui-table__num--strong">${NET_BY_MONTH[i]}</td></tr>`).join('')}
    </tbody>
  </table>`;

// Offered, not applied: the rows below are every payout, so no chip may read as
// a value a reader would then look for in the table.
const FILTERS = [
  { id: 'status', label: 'Status', items: [{ label: 'Any status', value: '' }, { label: 'Paid', value: 'Paid' }, { label: 'In transit', value: 'In transit' }, { label: 'Failed', value: 'Failed' }] },
  { id: 'currency', label: 'Currency', items: [{ label: 'Any currency', value: '' }, { label: 'EUR', value: 'EUR' }, { label: 'USD', value: 'USD' }] },
];

export const RULES = withSpecimens(content.rules, [
  { id: 'fast-glance' },
  {
    id: 'figures-and-exceptions',
    doHtml: () => stage(`${cashflow('gd-glance-do')}${attention()}`),
    dontHtml: () => stage(card({
      title: 'Payouts',
      body: `${ledgerTable()}<p class="ui-card__sub">Fees rose with volume this quarter, and the one
        unmatched transfer from June is still with the bank.</p>`,
    })),
  },
  {
    id: 'link-to-the-report',
    doHtml: () => stage(attention()),
    dontHtml: () => stage(attention({ onward: false })),
  },
  {
    id: 'report-depth',
    doHtml: () => stage(card({ title: 'Payouts', body: ledgerTable() })),
    dontHtml: () => stage(statBand({
      id: 'gd-depth-dont',
      stats: [
        { label: 'Payouts', value: '214' },
        { label: 'Fees', value: '68,412 €' },
        { label: 'Net', value: '3,118,904 €' },
      ],
    })),
  },
  {
    id: 'report-offers',
    // The export is at the far end of the row, where the report puts it: it acts
    // on the ledger, and the filters narrow it. why: Artur's review of the
    // Finance report, #505
    doHtml: () => stage(`<div class="ui-toolbar ui-toolbar--split">
      ${filterBar({ filters: FILTERS, label: 'Payout filters', clearLabel: 'Clear all' })}
      ${button({ label: 'Export rows', icon: 'download', iconOnly: true })}
    </div>${card({ title: 'Payouts', body: ledgerTable() })}`),
    // The Don't carries the period in its title, which is what "fixed by whoever
    // built the page" looks like on a screen — and what keeps this half from
    // being the same picture as report-depth's Do, which is a card of the same
    // ledger teaching the opposite thing.
    dontHtml: () => stage(card({ title: 'Payouts, 2026', body: ledgerTable() })),
  },
  {
    id: 'table-behind-the-chart',
    doHtml: () => stage(card({ title: 'Net settled by month', body: `${monthChart()}${monthTable()}` })),
    dontHtml: () => stage(card({ title: 'Net settled by month', body: monthChart() })),
  },
]);
