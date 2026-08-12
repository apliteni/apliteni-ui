import { appShell } from '../../src/components/shell.js';
import { badge, card, segmented, icon } from '../../src/components/index.js';

export default {
  title: 'Apps/Finance report',
  parameters: { layout: 'fullscreen' },
};

// The finance portal's own nav, beside the screen that uses it — see the same
// list in EmptyStates.stories.js. It is a demo portal's nav, not the kit's.
const NAV = [
  { id: 'dashboard', icon: 'chart', label: 'Dashboard', href: '#', target: '_top' },
  { id: 'payouts', icon: 'card', label: 'Payouts', href: '#', target: '_top' },
  { id: 'invoices', icon: 'doc', label: 'Invoices', href: '#', target: '_top' },
  { id: 'prefs', icon: 'gear', label: 'Preferences', href: '#', target: '_top' },
];

// KPI stat — label / value / sub, income green & net pink when negative.
const kpi = (label, value, sub, tone) =>
  `<div style="flex:1;min-width:0">
     <div style="font:600 var(--text-xs)/1 Poppins;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${label}</div>
     <div style="font:600 26px/1.1 Poppins;margin-top:8px;font-variant-numeric:tabular-nums;color:${
       tone === 'pos' ? 'var(--green)' : tone === 'neg' ? 'var(--pink)' : 'var(--strong)'}">${value}</div>
     <div style="font:400 12px/1.4 Poppins;color:var(--muted);margin-top:5px">${sub}</div>
   </div>`;

// Three numbers side by side need about 620px between them, measured at the
// 26px Poppins the values are set in. That is a fact about this strip and not
// about the window, and the two stopped agreeing once the shell grew a rail:
// the rail folds at 720px but is still 249px wide above it, so from 721 to 1023
// the column is narrower than the strip needs and every number orphaned its €
// onto a second line. The strip asks its own container instead. The shell's
// fold is left alone — it came from a measured touch target and belongs to
// every screen, not to this one.
const KPI_CSS = `<style>
  .fr-kpis__box { container-type: inline-size; }
  .fr-kpis { display: flex; gap: 34px; align-items: stretch; }
  .fr-kpis__sep { border-left: 1px solid var(--border); }
  @container (max-width: 620px) {
    .fr-kpis { flex-direction: column; gap: 18px; }
    .fr-kpis__sep { border-left: 0; border-top: 1px solid var(--border); }
  }
</style>`;

const kpiStrip = () => card({ body: `
  <div class="fr-kpis__box"><div class="fr-kpis">
    ${kpi('Money in', '759,988 €', 'Jul 1 – Jun 30', 'pos')}
    <div class="fr-kpis__sep"></div>
    ${kpi('Money out', '3,048,559 €', 'Jul 1 – Jun 30')}
    <div class="fr-kpis__sep"></div>
    ${kpi('Net result', '−2,288,571 €', 'Jul 1 – Jun 30', 'neg')}
  </div></div>` });

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

// The cashflow KPIs + reconciled payout ledger, in the kit's one shell. The
// trail is passed in rather than written by hand — the shell has no opinion
// about what a page is called.
export const Default = {
  render: () => KPI_CSS + appShell({
    word: 'Finance',
    nav: NAV,
    active: 'payouts',
    navLabel: 'Finance',
    account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' },
    signOutHref: '#logout',
    crumbs: [{ label: 'Finance', href: '#' }, { label: 'Payouts' }],
    title: 'Payouts',
    sub: 'Company cashflow at a glance, then the reconciled payout ledger.',
    maxWidth: '960px',
    body: `
      ${segmented({ ariaLabel: 'Period', options: ['3M', '6M', '1Y', 'All'], active: 2 })}
      ${kpiStrip()}
      ${payoutsCard()}
    `,
  }),
};
