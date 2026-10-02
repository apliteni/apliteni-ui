import { badge, button, card, segmented } from '../../src/components/index.js';
import { statBand } from '../../src/components/stat.js';
import { sparkline } from '../lib/sparkline.js';
import { financeShell } from './_finance-nav.js';

export default {
  title: 'Showcases/Finance dashboard',
  id: 'apps-finance-dashboard',
  parameters: { layout: 'fullscreen' },
};

// The glance half of the finance portal: the figures, their trends and the
// payouts that need a decision. The ledger behind all of it is the Finance
// report, and every item here opens it.
// why: guidelines/dashboards-and-reports.md

const MONEY_IN = [412, 455, 430, 498, 520, 505, 560, 548, 590, 610, 587, 640];
const MONEY_OUT = [298, 304, 312, 309, 321, 317, 329, 334, 327, 339, 341, 318];

// The same three figures the report rolls up to, so the two screens agree.
const cashflow = () => statBand({
  id: 'fd-cashflow',
  basis: 'Change against the previous 12 months',
  stats: [
    { label: 'Money in', value: '759,988 €', delta: { value: '+12.4%', tone: 'good' }, trend: sparkline(MONEY_IN, 'Money in, last 12 months') },
    { label: 'Money out', value: '3,048,559 €', delta: { value: '+31.8%', tone: 'bad' }, trend: sparkline(MONEY_OUT, 'Money out, last 12 months') },
    { label: 'Net result', value: '−2,288,571 €', delta: { value: '−168.0%' } },
  ],
});

const EXCEPTIONS = [
  ['PO-1166', '2026-06-24', '14,496.62', 'danger', 'Failed'],
  ['PO-1164', '2026-06-26', '14,082.69', 'pending', 'In transit'],
  ['PO-1159', '2026-06-18', '2,180.00', 'danger', 'Unmatched'],
];

// Three rows, not a ledger. Each reference opens its own row in the report, and
// the block ends in the one link that opens the whole of it. The figures above
// summarise the same report, so a second link there would be a duplicate.
// why: guidelines/dashboards-and-reports.md
const attention = () => card({
  title: 'Needs a decision',
  sub: '3 of the 214 payouts this year.',
  body: `
  <table class="ui-table ui-table--dense ui-table--hover">
    <thead><tr>
      <th>Reference</th><th>Arrival</th>
      <th class="ui-table__num">Net (EUR)</th><th>Status</th>
    </tr></thead>
    <tbody>
      ${EXCEPTIONS.map(([ref, arrival, net, variant, label]) => `
        <tr>
          <td><a href="#">${ref}</a></td>
          <td>${arrival}</td>
          <td class="ui-table__num ui-table__num--strong">${net}</td>
          <td>${badge(label, variant)}</td>
        </tr>`).join('')}
    </tbody>
  </table>`,
});

export const Default = {
  render: () => financeShell({
    active: 'dashboard',
    crumb: 'Dashboard',
    title: 'Dashboard',
    sub: 'Whether anything needs a decision today, and how the year is tracking.',
    body: `
      ${segmented({ ariaLabel: 'Period', options: ['3M', '6M', '1Y', 'All'], active: 2 })}
      ${cashflow()}
      ${attention()}
      <div class="ui-toolbar">${button({ label: 'Open the payout report', href: '#', size: 'sm' })}</div>
    `,
  }),
};
