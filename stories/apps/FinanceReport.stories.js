import { badge, card, segmented, icon } from '../../src/components/index.js';

export default {
  title: 'Apps/Finance report',
  parameters: { layout: 'fullscreen' },
};

// KPI stat — label / value / sub, income green & net pink when negative.
const kpi = (label, value, sub, tone) =>
  `<div style="flex:1;min-width:0">
     <div style="font:600 var(--text-xs)/1 Poppins;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${label}</div>
     <div style="font:600 26px/1.1 Poppins;margin-top:8px;font-variant-numeric:tabular-nums;color:${
       tone === 'pos' ? 'var(--green)' : tone === 'neg' ? 'var(--pink)' : 'var(--strong)'}">${value}</div>
     <div style="font:400 12px/1.4 Poppins;color:var(--muted);margin-top:5px">${sub}</div>
   </div>`;

const kpiStrip = () => card({ body: `
  <div style="display:flex;gap:34px;align-items:stretch">
    ${kpi('Money in', '759,988 €', 'Jul 1 – Jun 30', 'pos')}
    <div style="border-left:1px solid var(--border)"></div>
    ${kpi('Money out', '3,048,559 €', 'Jul 1 – Jun 30')}
    <div style="border-left:1px solid var(--border)"></div>
    ${kpi('Net result', '−2,288,571 €', 'Jul 1 – Jun 30', 'neg')}
  </div>` });

const PAYOUTS = [
  ['1162', 'po_1TnpIsGmSZjqJIroiJNJ2tRz', '2026-06-30', '14,942.27', '489.44', '11,871.49', 'success', 'Paid'],
  ['1163', 'po_1TnSuaGmSZjqJIroOzd7Mc6L', '2026-06-29', '14,490.70', '574.19', '27,834.31', 'success', 'Paid'],
  ['1164', 'po_1TmNmjGmSZjqJIro7lHBO3ix', '2026-06-26', '14,566.66', '483.97', '15,201.57', 'pending', 'In transit'],
  ['41',   'po_1Tm1FeGmSZjqJIroa1D9MjbO', '2026-06-25', '39,054.98', '1,369.76', '32,156.22', 'success', 'Paid'],
  ['42',   'po_1TleVSGmSZjqJIrobtld2b8X', '2026-06-24', '14,969.33', '472.71', '18,774.34', 'danger', 'Failed'],
  ['43',   'po_1TlISNGmSZjqJIrodu8TdOXP', '2026-06-23', '18,554.27', '626.34', '13,705.55', 'success', 'Paid'],
];

const payoutsCard = () => card({ title: `${icon('card')} Payouts`, sub: 'Stripe payouts reconciled to bank transactions.', body: `
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

// Just the report itself — the cashflow KPIs + reconciled payout ledger, no app
// chrome. Reuses the shell's page classes (`ui-shell__page` scopes the title /
// sub type) inside a plain centered column so it can be embedded anywhere.
export const Default = {
  render: () => `
    <div style="position:relative;overflow:hidden;min-height:100vh">
      <span class="ui-glow ui-glow--purple" style="top:-120px;right:6%;opacity:.35"></span>
      <div class="ui-shell__page" style="position:relative;z-index:1;max-width:960px;margin:0 auto;padding:40px 26px 96px">
        <div class="ui-shell__crumbs">Finance / <b>Payouts</b></div>
        <h1>Payouts</h1>
        <div class="sub">Company cashflow at a glance, then the reconciled payout ledger.</div>
        <div class="ui-card-stack">
          <div style="display:grid;gap:22px">
            ${segmented({ options: ['3M', '6M', '1Y', 'All'], active: 2 })}
            ${kpiStrip()}
            ${payoutsCard()}
          </div>
        </div>
      </div>
    </div>`,
};
