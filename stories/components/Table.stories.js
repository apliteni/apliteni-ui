import { badge, button, icon } from '../../src/components/index.js';
import { pad } from '../_gallery.js';

export default {
  title: 'Components/Table',
  parameters: { layout: 'fullscreen' },
};

// Financial ledger — dense + zebra + hover, mono ids (no chip), tabular
// numerics, semantic status badges. The shared data-table recipe.
const PAYOUTS = [
  ['1162', 'po_1TnpIsGmSZjqJIroiJNJ2tRz', '2026-06-30', '14,942.27', '489.44', '11,871.49', 'success', 'Paid'],
  ['1163', 'po_1TnSuaGmSZjqJIroOzd7Mc6L', '2026-06-29', '14,490.70', '574.19', '27,834.31', 'success', 'Paid'],
  ['1164', 'po_1TmNmjGmSZjqJIro7lHBO3ix', '2026-06-26', '14,566.66', '483.97', '15,201.57', 'pending', 'In transit'],
  ['41',   'po_1Tm1FeGmSZjqJIroa1D9MjbO', '2026-06-25', '39,054.98', '1,369.76', '32,156.22', 'success', 'Paid'],
  ['42',   'po_1TleVSGmSZjqJIrobtld2b8X', '2026-06-24', '14,969.33', '472.71', '18,774.34', 'danger', 'Failed'],
  ['43',   'po_1TlISNGmSZjqJIrodu8TdOXP', '2026-06-23', '18,554.27', '626.34', '13,705.55', 'success', 'Paid'],
];

export const FinanceData = {
  render: () => pad(`<div class="ui-card" style="max-width:1040px">
    <h2 class="ui-card__title"><span class="ui-card__icon">${icon('key')}</span> Payouts</h2>
    <div class="ui-card__sub">Stripe payouts reconciled to bank transactions.</div>
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
    </table>
  </div>`),
};

const AGENTS = [
  ['Research bot', 'Read only', '2 hours ago', 'live'],
  ['Deck summariser', 'Read only', 'Yesterday', 'live'],
  ['Old integration', 'Read only', '3 weeks ago', 'dead'],
];

export const AgentTokens = {
  render: () => pad(`<div class="ui-card" style="max-width:720px">
    <h2 class="ui-card__title"><span class="ui-card__icon">${icon('key')}</span> Access &amp; agents</h2>
    <div class="ui-card__sub">Personal tokens agents use to read the strategy over MCP.</div>
    <table class="ui-table ui-table--hover">
      <thead><tr><th>Agent</th><th>Scope</th><th>Last used</th><th></th></tr></thead>
      <tbody>
        ${AGENTS.map(([name, scope, used, state]) => `
          <tr class="${state === 'dead' ? 'is-dead' : ''}">
            <td class="ui-table__title">${name}</td>
            <td>${scope}</td>
            <td>${used}</td>
            <td class="ui-table__act">${state === 'dead'
              ? '<span style="color:var(--muted);font-size:13px">Revoked</span>'
              : button({ label: 'Revoke', variant: 'danger', size: 'sm' })}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>`),
};

export const Empty = {
  render: () => pad(`<div class="ui-card" style="max-width:720px">
    <h2 class="ui-card__title"><span class="ui-card__icon">${icon('key')}</span> Access &amp; agents</h2>
    <div class="ui-empty">
      <div class="ui-empty__icon">${icon('plug')}</div>
      <div class="ui-empty__title">No agents connected yet</div>
      <div class="ui-empty__sub">Create a token and paste the MCP connect command into your agent to get started.</div>
      <div style="margin-top:18px">${button({ label: 'Create token', variant: 'primary', icon: 'key' })}</div>
    </div>
  </div>`),
};

// A log whose last column is a paragraph (#499). Below the one-column step
// `ui-table--stack` lays each row out as a block: the handle, the area and the time on
// one line, the change on a line of its own. The header is clipped rather than removed,
// so a cell still reads with its column's name. The roles are written here because a
// stylesheet cannot write one; what each engine actually drops is in the specification.
const AUDIT = [
  ['t.quill', 'Billing', '09:12', 'Raised the monthly spend cap on the Harbor Software workspace from 2,000 to 5,000 EUR, after the June reconciliation closed short.'],
  ['m.arbor', 'Access', '08:40', 'Revoked the Old integration token. Read-only scope, unused for three weeks.'],
  ['Review bot', 'Content', '08:02', 'Flagged four pages for a second read: the pricing table and the trial terms disagree on how long the trial runs.'],
];

export const StackedLog = {
  render: () => pad(`<div class="ui-card" style="max-width:720px">
    <h2 class="ui-card__title"><span class="ui-card__icon">${icon('clock')}</span> Audit log</h2>
    <div class="ui-card__sub">Fabricated entries. Each row stacks on a phone.</div>
    <table class="ui-table ui-table--dense ui-table--hover ui-table--stack" role="table">
      <thead role="rowgroup"><tr role="row">
        <th scope="col" role="columnheader">Who</th>
        <th scope="col" role="columnheader">Area</th>
        <th scope="col" role="columnheader">Time</th>
        <th scope="col" role="columnheader">Change</th>
      </tr></thead>
      <tbody role="rowgroup">
        ${AUDIT.map(([who, area, time, change]) => `
          <tr role="row">
            <td role="cell" class="ui-table__code">${who}</td>
            <td role="cell">${area}</td>
            <td role="cell">${time}</td>
            <td role="cell" class="ui-table__long">${change}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>`),
};
