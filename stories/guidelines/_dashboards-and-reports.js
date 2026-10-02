import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('dashboards-and-reports.md', new URL('../../guidelines/dashboards-and-reports.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { badge, button, card } from '../../src/components/index.js';
import { filterBar } from '../../src/components/filter-bar.js';
import { statBand } from '../../src/components/stat.js';
import { sparkline } from '../lib/sparkline.js';
import { CHART_CSS, bars } from '../_chart.js';

// One made-up portal supplies every specimen, and the Finance report showcase
// prints the same payouts with the same fees and nets. The halves of a pair
// differ in one decision.
export const SPEC_CSS = `${CHART_CSS}
  <style>
    .gd-stage { background: var(--bg); --ring-gap: var(--bg); border-radius: var(--radius-lg);
      padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-4); }
    .gd-note { margin: var(--space-3) 0 0; font: var(--weight-normal) var(--text-sm)/1.65 var(--font-sans);
      color: var(--text); max-width: var(--prose-dense); }
    /* The chart is a picture above a table, not the table's own head band: the
       scale's gap is what keeps the bar baselines off the header's cap height. */
    .gd-chart { display: flex; flex-direction: column; gap: var(--space-2);
      margin-bottom: var(--space-4); }
    .gd-chart__months { display: flex; font: var(--weight-normal) var(--text-xs)/1 var(--font-sans);
      color: var(--text); }
    .gd-chart__months span { flex: 1 1 0; min-width: 0; text-align: center; }
  </style>`;

const stage = (html) => `<div class="gd-stage">${html}</div>`;

const BASIS = 'Change against the previous 12 months';
const MONEY_IN = [412, 455, 430, 498, 520, 505, 560, 548, 590, 610, 587, 640];
const MONEY_OUT = [298, 304, 312, 309, 321, 317, 329, 334, 327, 339, 341, 318];

// Cashflow for the year, the figures the portal's dashboard opens with. A
// specimen cell is under 28rem, so every figure takes a row of its own; a pair
// stays readable when the Do draws two of them rather than the screen's three.
const FIGURES = [
  { label: 'Money in', value: '759,988 €', delta: { value: '+12.4%', tone: 'good' }, trend: sparkline(MONEY_IN, 'Money in, last 12 months') },
  { label: 'Money out', value: '3,048,559 €', delta: { value: '+31.8%', tone: 'bad' }, trend: sparkline(MONEY_OUT, 'Money out, last 12 months') },
];
const cashflow = (id) => statBand({ id, basis: BASIS, stats: FIGURES });

// Reference, fees, net, status — four columns, because a five-column ledger is
// 453px and a specimen card holds 426. The gross each row came from is kept
// here because the Finance report prints it in a column this cell has no room
// for, and its net has to agree with this one.
const LEDGER = [
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
          <td><a href="#">${ref}</a></td>
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

// Every reference opens its own row in the report. That is not what the pair
// below shows: a cell link is the row's own ink until a pointer is over it, so
// both halves draw the same references and differ only by the block's link.
const exceptionsTable = () => `
  <table class="ui-table ui-table--dense">
    <thead><tr><th>Reference</th><th class="ui-table__num">Net (EUR)</th><th>Status</th></tr></thead>
    <tbody>
      ${EXCEPTIONS.map(([ref, net, variant, label]) => `
        <tr>
          <td><a href="#">${ref}</a></td>
          <td class="ui-table__num ui-table__num--strong">${net}</td>
          <td>${badge(label, variant)}</td>
        </tr>`).join('')}
    </tbody>
  </table>`;

// The card, then the one link that opens the whole report — the shape the
// Finance dashboard draws under its figures.
const attention = ({ onward = true } = {}) => card({
  title: 'Needs a decision',
  sub: '3 of the 214 payouts this year.',
  body: exceptionsTable(),
}) + (onward ? `<div class="ui-toolbar">${button({ label: 'Open the payout report', href: '#', size: 'sm' })}</div>` : '');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const NET_BY_MONTH = [412, 455, 430, 498, 520, 505];
// The bars, their month names, and the gap that keeps them off the table head.
// bars() lays one slot per value across the full width, so a flex row of equal
// cells puts each name under its own bar.
const monthChart = () => `<div class="gd-chart">${bars({
  values: NET_BY_MONTH, width: 320, height: 96, fluid: true,
  label: 'Net settled by month, first half of the year',
}).svg}<div class="gd-chart__months" aria-hidden="true">${MONTHS.map((month) => `<span>${month}</span>`).join('')}</div></div>`;

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
    doHtml: () => stage(`${cashflow('gd-glance-do')}${attention({ onward: false })}`),
    dontHtml: () => stage(card({
      title: 'Payouts',
      body: `${ledgerTable()}<p class="gd-note">Fees rose with volume this quarter, and the two
        unmatched transfers from May are still with the bank.</p>`,
    })),
  },
  {
    id: 'link-to-the-report',
    doHtml: () => stage(attention()),
    dontHtml: () => stage(attention({ onward: false })),
  },
  {
    id: 'report-depth',
    doHtml: () => stage(card({ title: 'Payouts', sub: 'Every payout settled this year.', body: ledgerTable() })),
    dontHtml: () => stage(statBand({
      id: 'gd-depth-dont',
      basis: 'The year so far',
      stats: [
        { label: 'Payouts paid', value: '214' },
        { label: 'Fees', value: '68,412 €' },
        { label: 'Net settled', value: '3,118,904 €' },
      ],
    })),
  },
  {
    id: 'report-offers',
    doHtml: () => stage(`<div class="ui-toolbar">
      ${filterBar({ filters: FILTERS, label: 'Payout filters' })}
      ${button({ label: 'Export rows', size: 'sm' })}
    </div>${card({ title: 'Payouts', body: ledgerTable() })}`),
    dontHtml: () => stage(card({ title: 'Payouts', body: ledgerTable() })),
  },
  {
    id: 'table-behind-the-chart',
    doHtml: () => stage(card({ title: 'Net settled by month', body: `${monthChart()}${monthTable()}` })),
    dontHtml: () => stage(card({ title: 'Net settled by month', body: monthChart() })),
  },
]);
