import { badge, card, segmented } from '../../src/components/index.js';
import { statBand } from '../../src/components/stat.js';
import { cashflowStats, PERIODS, periodBasis } from './_finance-data.js';
import { initSegmented } from '../../src/components/segmented.js';
import { financeShell, payoutHref } from './_finance-nav.js';

export default {
  title: 'Showcases/Finance dashboard',
  id: 'apps-finance-dashboard',
  parameters: { layout: 'fullscreen' },
};

const PERIOD_BASIS = 'fd-period-basis';
const period = () => '<div class="ui-toolbar">'
  + segmented({ ariaLabel: 'Period', options: PERIODS, active: 2 })
  + `<p class="ui-sr" id="${PERIOD_BASIS}" data-period-basis>${periodBasis('1Y')}</p>`
  + '</div>';
const cashflow = (selected = '1Y') => statBand({
  id: 'fd-cashflow', basisId: PERIOD_BASIS, stats: cashflowStats(selected, true),
});

// Which row, what is wrong with it, how much, and only then when it arrives —
// the order of the decision, not of the ledger. The status rides in the
// reference's cell on .ui-table__pair rather than in a column of its own: at 320
// the rail leaves this card 214px, and a third column of status started 70px
// past its right edge. Stacked under the reference it costs no width, and the
// arrival nobody decides on is what scrolls off instead.
// why: guidelines/dashboards-and-reports.md, #505
// PO-1159's arrival matches the Finance report's own row: moved from
// 2024-09-20 to 2025-07-15 so the reference resolves inside the report's
// default period on first paint. why: PR #552 design re-review, finding A
const EXCEPTIONS = [
  ['PO-1166', '14,496.62', 'danger', 'Failed', '2025-08-05'],
  ['PO-1164', '14,082.69', 'pending', 'In transit', '2026-02-20'],
  ['PO-1159', '2,180.00', 'danger', 'Unmatched', '2025-07-15'],
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
    title: 'Dashboard',
    body: `
      ${period()}
      ${cashflow()}
      ${attention()}
    `,
  }),
  play: ({ canvasElement }) => {
    initSegmented(canvasElement);
    canvasElement.addEventListener('ui-segment-change', event => {
      canvasElement.querySelector('.ui-stats').outerHTML = cashflow(event.detail.value);
      canvasElement.querySelector('[data-period-basis]').textContent = periodBasis(event.detail.value);
    });
  },
};
