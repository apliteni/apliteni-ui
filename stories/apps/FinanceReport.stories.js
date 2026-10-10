import { badge, button, card, segmented, emptyState } from '../../src/components/index.js';
import { filterBar, initFilterBar } from '../../src/components/filter-bar.js';
import { busyRegion, skeleton, skeletonTable } from '../../src/components/loading.js';
import { PERIODS, periodStart } from './_finance-data.js';
import { initSegmented } from '../../src/components/segmented.js';
import { statBand } from '../../src/components/stat.js';
import { financeShell, payoutRowId } from './_finance-nav.js';

export default {
  title: 'Showcases/Finance report',
  id: 'apps-finance-report',
  parameters: { layout: 'fullscreen' },
};

// A report, not a dashboard: it answers why and exactly how much, so it carries
// the ledger in full, a filter row and one export. The glance screen beside it
// is the Finance dashboard.
// why: guidelines/dashboards-and-reports.md

// What a reader narrows the ledger by. The period stays a segmented control
// rather than a third chip, so no filter is offered twice. Both chips are
// unset: the ledger below is every payout, and a chip reading a value the rows
// do not honour teaches a filter that does nothing.
const FILTERS = [
  { id: 'status', label: 'Status', items: [{ label: 'Any status', value: '' }, { label: 'Paid', value: 'Paid' }, { label: 'In transit', value: 'In transit' }, { label: 'Failed', value: 'Failed' }] },
  { id: 'currency', label: 'Currency', items: [{ label: 'Any currency', value: '' }, { label: 'EUR', value: 'EUR' }, { label: 'USD', value: 'USD' }] },
];

// The export is wordless: `download` is on the closed list in src/assets/icons.js,
// and `label` is still what names it to a reader who cannot see the glyph. It
// sits at the far end of the row — `ui-toolbar--split` — because it acts on the
// ledger rather than narrowing it, and beside "Clear all" it read as the
// filter row's third control. why: Artur's review of this screen, #505
const INITIAL_PERIOD = '1Y';
const controls = () => `<div class="ui-toolbar ui-toolbar--split">
      ${segmented({ ariaLabel: 'Period', options: PERIODS, active: PERIODS.indexOf(INITIAL_PERIOD) })}
      <div data-finance-filters>${filterBar({ filters: FILTERS, label: 'Payout filters', clearLabel: 'Clear all' })}</div>
      ${button({ label: 'Export rows', icon: 'download', iconOnly: true })}
    </div>`;

// The three figures, over whichever rows the period and the filters currently
// leave on the ledger below them — not the portal's monthly cashflow, which
// does not move with a filter chip. Money in and out are each row's own gross
// and fees; net is each row's own net, so the three stay the rows' own sum.
// why: PR #552 design re-review, finding A
//
// Fixed at two decimals: this is the only band that sums a column of cents,
// and the Net (EUR) column it stands beside always carries two, so this is
// where that decision belongs — not in money(), which every other band also
// calls on whole euros. why: PR #552 code review, finding F4
const parseAmount = value => Number.parseFloat(value.replace(/,/g, ''));
const twoDecimals = value => `${value < 0 ? '−' : ''}${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const payoutStats = rows => [
  ['Money in', 3],
  ['Money out', 4],
  ['Net result', 5],
].map(([label, column]) => ({ label, value: twoDecimals(rows.reduce((sum, row) => sum + parseAmount(row[column]), 0)) }));

// The cashflow figures are the kit's stat band. It folds from its own width, so
// the rail beside the column needs no rule of this screen's.
// why: docs/components.md#stat-bands
//
// No caption over the figures: these three are totals rather than changes, so
// there is no comparison to name, and the date range that used to sit here said
// again what the period control above it already sets. why: Artur, round r32
const kpiStrip = (rows = PAYOUTS) => statBand({ id: 'fr-cashflow', stats: payoutStats(rows) });

// Net is gross less fees in every row. The references are the ones the Finance
// dashboard and the Dashboards and reports guideline print, spelled the same
// way and carrying the same figures, because the dashboard links each of its
// rows to its row here — which is also why every row carries payoutRowId()'s id,
// the name the link on the other screen uses for it. stories/dashboard-report-refs.test.js holds the three
// screens to that, so the agreement survives an edit to any one of them.
//
// Arrivals are spread across periodStart()'s four windows, not bunched into
// one, so the period control actually narrows the ledger instead of passing
// every row at every width. why: PR #552 code review, finding F1
//
// Every row a dashboard reference can send a reader to sits inside the report's
// own default window: PO-1159 moved from 2024-09-20 (inside All only) to
// 2025-07-15 (inside 1Y, the earliest row there), so the exceptions card's three
// references all resolve on first paint instead of only after the reader
// touches the period control. Its distance from the other payouts is what the
// Unmatched status leans on, not the particular year, and it keeps that distance
// as the oldest row the default window shows; PO-1167 alone still falls outside
// 1Y, so the control still narrows going from All to 1Y. why: PR #552 design
// re-review, finding A
const PAYOUTS = [
  ['PO-1162', 'po_1TnpIsGmSZjqJIroiJNJ2tRz', '2026-06-30', '14,942.27', '489.44', '14,452.83', 'success', 'Paid'],
  ['PO-1163', 'po_1TnSuaGmSZjqJIroOzd7Mc6L', '2026-05-15', '14,490.70', '574.19', '13,916.51', 'success', 'Paid'],
  ['PO-1164', 'po_1TmNmjGmSZjqJIro7lHBO3ix', '2026-02-20', '14,566.66', '483.97', '14,082.69', 'pending', 'In transit'],
  ['PO-1165', 'po_1Tm1FeGmSZjqJIroa1D9MjbO', '2025-11-10', '39,054.98', '1,369.76', '37,685.22', 'success', 'Paid'],
  ['PO-1166', 'po_1TleVSGmSZjqJIrobtld2b8X', '2025-08-05', '14,969.33', '472.71', '14,496.62', 'danger', 'Failed'],
  ['PO-1167', 'po_1TlISNGmSZjqJIrodu8TdOXP', '2025-03-12', '18,554.27', '626.34', '17,927.93', 'success', 'Paid'],
  ['PO-1159', 'po_1TjyHpGmSZjqJIro5cQb9nKW', '2025-07-15', '2,251.40', '71.40', '2,180.00', 'danger', 'Unmatched'],
];

// What the period control and the filter bar together leave on the ledger.
// Shared by the first paint and every repaint, so the two can never disagree
// about what a given period and filter state show. why: PR #552 design
// re-review, finding B
const filterPayouts = (period, values = {}) => PAYOUTS.filter(row => row[2] >= periodStart(period)
  && (!values.status || row[7] === values.status)
  && (!values.currency || values.currency === 'EUR'));

// The table stays a direct child of the card: `.ui-card:has(> .ui-table)` in
// card.css is what scrolls seven columns of ledger on a phone, and a wrapper
// around the table turns that selector off.
// No glyph and no sub-line. The tile behind the glyph spent the accent on
// decoration, the glyph repeated the word beside it, and the sentence under it
// said what the columns already say. why: Artur's review of this screen, #505
const payoutsCard = (rows = PAYOUTS) => card({ title: 'Payouts', body: rows.length ? `
  <table class="ui-table ui-table--dense ui-table--zebra ui-table--hover">
    <thead><tr>
      <th>Reference</th><th>Payout ID</th><th>Arrival</th>
      <th class="ui-table__num">Gross</th><th class="ui-table__num">Fees</th>
      <th class="ui-table__num">Net (EUR)</th><th>Status</th>
    </tr></thead>
    <tbody>
      ${rows.map(([ref, pid, arr, gross, fees, net, variant, label]) => `
        <tr id="${payoutRowId(ref)}">
          <td>${ref}</td>
          <td class="ui-table__code">${pid}</td>
          <td>${arr}</td>
          <td class="ui-table__num">${gross}</td>
          <td class="ui-table__num">${fees}</td>
          <td class="ui-table__num ui-table__num--strong">${net}</td>
          <td>${badge(label, variant)}</td>
        </tr>`).join('')}
    </tbody>
  </table>` : emptyState({ title: 'No payouts match',
    actions: `<span data-finance-reset>${button({ label: 'Clear all', size: 'sm' })}</span>`,
  }) });

// The cashflow KPIs + reconciled payout ledger, in the portal's one shell —
// financeShell() in _finance-nav.js, the same call the empty-state screens make.
// The column, the rail and the trail are its answer; this story owns the screen.
export const Default = {
  render: () => financeShell({
    active: 'payouts',
    crumb: 'Payouts',
    title: 'Payouts',
    body: `
      ${controls()}
      ${kpiStrip(filterPayouts(INITIAL_PERIOD))}
      ${payoutsCard(filterPayouts(INITIAL_PERIOD))}
    `,
  }),
  play: ({ canvasElement }) => {
    initSegmented(canvasElement);
    let selected = INITIAL_PERIOD;
    let filters = FILTERS.map(filter => ({ ...filter }));
    const host = canvasElement.querySelector('[data-finance-filters]');
    const bar = initFilterBar(host, { filters, label: 'Payout filters', clearLabel: 'Clear all' });
    const repaint = () => {
      const values = Object.fromEntries(filters.map(filter => [filter.id, filter.value]));
      const rows = filterPayouts(selected, values);
      canvasElement.querySelector('.ui-stats').outerHTML = kpiStrip(rows);
      canvasElement.querySelector('.ui-app__body > .ui-card').outerHTML = payoutsCard(rows);
    };
    const update = () => {
      bar.update({ filters, label: 'Payout filters', clearLabel: 'Clear all' });
      repaint();
    };
    host.addEventListener('ui-filter-change', event => {
      filters = filters.map(filter => filter.id === event.detail.id ? { ...filter, value: event.detail.value } : filter);
      update();
    });
    host.addEventListener('ui-filter-remove', event => {
      filters = filters.map(filter => filter.id === event.detail.id ? { ...filter, value: '' } : filter);
      update();
    });
    const clear = () => {
      filters = FILTERS.map(filter => ({ ...filter }));
      update();
    };
    host.addEventListener('ui-filter-clear', clear);
    canvasElement.addEventListener('click', event => {
      if (event.target.closest('[data-finance-reset] button')) {
        clear();
        host.querySelector('[data-dropdown-trigger]').focus();
      }
    });
    canvasElement.addEventListener('ui-segment-change', event => {
      selected = event.detail.value;
      repaint();
    });
  },
};

// The same screen while the ledger is still in flight. Two regions, not one:
// the numbers and the rows arrive from different queries and finish at
// different times, so a single region would have to lie about one of them.
//
// The KPI skeleton sits in the band's own classes — the tiles layout, which is
// the band's default — so it folds exactly as the figures will and the three
// columns do not collapse into one shape while loading and snap into another
// when the numbers land. It reserves no caption line, because the figures that
// land carry none. That is the whole job of a skeleton over a spinner: it
// reserves the shape that is coming.
//
// The period control stays live. It is the one thing a reader can usefully do
// while waiting, and disabling every control on a loading screen is how a slow
// query becomes a locked page.
export const Loading = {
  render: () => financeShell({
    active: 'payouts',
    crumb: 'Payouts',
    title: 'Payouts',
    body: `
      ${controls()}
      <div class="ui-stats ui-stats--tiles">${busyRegion({
        label: 'Loading cashflow for the last year…',
        body: `<div class="ui-stats__list">${['', '', ''].map(() => `<div class="ui-stat ui-card ui-card--pad-sm">
          ${skeleton({ lines: ['40%'] })}${skeleton({ lines: ['72%'], height: '36px' })}
        </div>`).join('')}</div>`,
      })}</div>
      ${card({ title: 'Payouts',
        body: busyRegion({ label: 'Loading payouts…', body: skeletonTable({ rows: PAYOUTS.length, cols: 7 }) }) })}
    `,
  }),
};
