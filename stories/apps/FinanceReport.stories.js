import { badge, card, segmented, icon } from '../../src/components/index.js';
import { busyRegion, skeleton, skeletonTable } from '../../src/components/loading.js';
import { statBand } from '../../src/components/stat.js';
import { financeShell } from './_finance-nav.js';

export default {
  title: 'Showcases/Finance report',
  id: 'apps-finance-report',
  parameters: { layout: 'fullscreen' },
};

// The cashflow figures are the kit's stat band. It folds from its own width, so
// the rail beside the column needs no rule of this screen's.
// why: docs/specification.md#stat-bands
const kpiStrip = () => statBand({
  id: 'fr-cashflow',
  basis: 'Jul 1 – Jun 30',
  stats: [
    { label: 'Money in', value: '759,988 €' },
    { label: 'Money out', value: '3,048,559 €' },
    { label: 'Net result', value: '−2,288,571 €' },
  ],
});

const PAYOUTS = [
  ['1162', 'po_1TnpIsGmSZjqJIroiJNJ2tRz', '2026-06-30', '14,942.27', '489.44', '11,871.49', 'success', 'Paid'],
  ['1163', 'po_1TnSuaGmSZjqJIroOzd7Mc6L', '2026-06-29', '14,490.70', '574.19', '27,834.31', 'success', 'Paid'],
  ['1164', 'po_1TmNmjGmSZjqJIro7lHBO3ix', '2026-06-26', '14,566.66', '483.97', '15,201.57', 'pending', 'In transit'],
  ['41',   'po_1Tm1FeGmSZjqJIroa1D9MjbO', '2026-06-25', '39,054.98', '1,369.76', '32,156.22', 'success', 'Paid'],
  ['42',   'po_1TleVSGmSZjqJIrobtld2b8X', '2026-06-24', '14,969.33', '472.71', '18,774.34', 'danger', 'Failed'],
  ['43',   'po_1TlISNGmSZjqJIrodu8TdOXP', '2026-06-23', '18,554.27', '626.34', '13,705.55', 'success', 'Paid'],
];

// The table stays a direct child of the card: `.ui-card:has(> .ui-table)` in
// card.css is what scrolls seven columns of ledger on a phone, and a wrapper
// around the table turns that selector off.
const payoutsCard = () => card({ title: `<span class="ui-card__icon">${icon('card')}</span> Payouts`, sub: 'Stripe payouts reconciled to bank transactions.', body: `
  <table class="ui-table ui-table--dense ui-table--zebra ui-table--hover">
    <thead><tr>
      <th>ID</th><th>Payout ID</th><th>Arrival</th>
      <th class="ui-table__num">Gross</th><th class="ui-table__num">Fees</th>
      <th class="ui-table__num">Net (EUR)</th><th>Status</th>
    </tr></thead>
    <tbody>
      ${PAYOUTS.map(([id, pid, arr, gross, fees, net, variant, label]) => `
        <tr>
          <td><a href="#">${id}</a></td>
          <td class="ui-table__code">${pid}</td>
          <td>${arr}</td>
          <td class="ui-table__num">${gross}</td>
          <td class="ui-table__num">${fees}</td>
          <td class="ui-table__num ui-table__num--strong">${net}</td>
          <td>${badge(label, variant)}</td>
        </tr>`).join('')}
    </tbody>
  </table>` });

// The cashflow KPIs + reconciled payout ledger, in the portal's one shell —
// financeShell() in _finance-nav.js, the same call the empty-state screens make.
// The column, the rail and the trail are its answer; this story owns the screen.
export const Default = {
  render: () => financeShell({
    active: 'payouts',
    crumb: 'Payouts',
    title: 'Payouts',
    sub: 'Company cashflow at a glance, then the reconciled payout ledger.',
    body: `
      ${segmented({ ariaLabel: 'Period', options: ['3M', '6M', '1Y', 'All'], active: 2 })}
      ${kpiStrip()}
      ${payoutsCard()}
    `,
  }),
};

// The same screen while the ledger is still in flight. Two regions, not one:
// the numbers and the rows arrive from different queries and finish at
// different times, so a single region would have to lie about one of them.
//
// The KPI skeleton sits in the band's own classes — the tiles layout, which is
// the band's default — so it folds exactly as the figures will and the three
// columns do not collapse into one shape while loading and snap into another
// when the numbers land. It holds the caption's place above the row for the
// same reason. That is the whole job of a skeleton over a spinner: it reserves
// the shape that is coming.
//
// The period control stays live. It is the one thing a reader can usefully do
// while waiting, and disabling every control on a loading screen is how a slow
// query becomes a locked page.
export const Loading = {
  render: () => financeShell({
    active: 'payouts',
    crumb: 'Payouts',
    title: 'Payouts',
    sub: 'Company cashflow at a glance, then the reconciled payout ledger.',
    body: `
      ${segmented({ ariaLabel: 'Period', options: ['3M', '6M', '1Y', 'All'], active: 2 })}
      <div class="ui-stats ui-stats--tiles">${busyRegion({
        label: 'Loading cashflow for the last year…',
        body: `${skeleton({ lines: ['18%'], className: 'ui-stats__basis' })}<div class="ui-stats__list">${['', '', ''].map(() => `<div class="ui-stat ui-card ui-card--pad-sm">
          ${skeleton({ lines: ['40%'] })}${skeleton({ lines: ['72%'], height: '36px' })}
        </div>`).join('')}</div>`,
      })}</div>
      ${card({ title: `<span class="ui-card__icon">${icon('card')}</span> Payouts`, sub: 'Stripe payouts reconciled to bank transactions.',
        body: busyRegion({ label: 'Loading payouts…', body: skeletonTable({ rows: 6, cols: 7 }) }) })}
    `,
  }),
};
