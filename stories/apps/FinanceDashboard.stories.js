import { badge, card, segmented } from '../../src/components/index.js';
import { statBand } from '../../src/components/stat.js';
import { sparkline } from '../lib/sparkline.js';
import { financeShell, payoutHref } from './_finance-nav.js';

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

// The period control states which window the figures cover, and the window it
// selects is what every change under them is measured against — so the band
// draws no caption. A caption there read "Change against the previous 12 months"
// over a control reading 1Y, which is the control's own state in a second
// sentence. why: Artur, round r33
//
// The comparison is still said once, for a reader who cannot see which option is
// pressed: the line beside the control carries it, and each change points at it
// through `basisId`. guidelines/stat-bands.md asks for reachable text, not for a
// caption.
//
// `data-period-basis` is the line saying it is THE basis for the strip beside it.
// Without it the row's other text would do — the check's allowance once read every
// id in the row, so a heading beside any pressed strip passed. #505
// held by: stories/stat-basis.test.js
const PERIOD_BASIS = 'fd-period-basis';

const period = () => '<div class="ui-toolbar">'
  + segmented({ ariaLabel: 'Period', options: ['3M', '6M', '1Y', 'All'], active: 2 })
  + `<p class="ui-sr" id="${PERIOD_BASIS}" data-period-basis>Each change is measured against the 12 months before the selected period.</p>`
  + '</div>';

// The same three figures the report rolls up to, so the two screens agree.
const cashflow = () => statBand({
  id: 'fd-cashflow',
  basisId: PERIOD_BASIS,
  stats: [
    { label: 'Money in', value: '759,988 €', delta: { value: '+12.4%', tone: 'good' }, trend: sparkline(MONEY_IN, 'Money in, last 12 months') },
    { label: 'Money out', value: '3,048,559 €', delta: { value: '+31.8%', tone: 'bad' }, trend: sparkline(MONEY_OUT, 'Money out, last 12 months') },
    { label: 'Net result', value: '−2,288,571 €', delta: { value: '−168.0%' } },
  ],
});

// Which row, what is wrong with it, how much, and only then when it arrives —
// the order of the decision, not of the ledger. The status rides in the
// reference's cell on .ui-table__pair rather than in a column of its own: at 320
// the rail leaves this card 214px, and a third column of status started 70px
// past its right edge. Stacked under the reference it costs no width, and the
// arrival nobody decides on is what scrolls off instead.
// why: guidelines/dashboards-and-reports.md, #505
const EXCEPTIONS = [
  ['PO-1166', '14,496.62', 'danger', 'Failed', '2026-06-24'],
  ['PO-1164', '14,082.69', 'pending', 'In transit', '2026-06-26'],
  ['PO-1159', '2,180.00', 'danger', 'Unmatched', '2026-06-18'],
];

// Each reference opens its payout row in the report.
const attention = () => card({
  title: 'Needs a decision',
  body: `
  <table class="ui-table ui-table--dense ui-table--hover">
    <thead><tr>
      <th>Reference</th><th class="ui-table__num">Net (EUR)</th><th>Arrival</th>
    </tr></thead>
    <tbody>
      ${EXCEPTIONS.map(([ref, net, variant, label, arrival]) => `
        <tr>
          <td><span class="ui-table__pair"><a href="${payoutHref(ref)}">${ref}</a>${badge(label, variant)}</span></td>
          <td class="ui-table__num ui-table__num--strong">${net}</td>
          <td>${arrival}</td>
        </tr>`).join('')}
    </tbody>
  </table>`,
});

export const Default = {
  render: () => financeShell({
    active: 'dashboard',
    back: { href: '#', label: 'Finance' },
    title: 'Dashboard',
    body: `
      ${period()}
      ${cashflow()}
      ${attention()}
    `,
  }),
};
