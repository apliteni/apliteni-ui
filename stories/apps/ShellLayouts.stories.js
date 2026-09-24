// The two shell layouts, each at both content widths (#308). Four screens, one
// composition: the same nav, the same reader and the same page, so what differs
// between any two of them is the layout or the width and nothing else.
//
// The topbar layout's search field is a way into the palette below it, so each of
// those screens renders one — closed, as every screen does.
import { appShell } from '../../src/components/shell.js';
import { commandPalette } from '../../src/components/command-palette.js';
import { card, badge } from '../../src/components/index.js';

export default {
  title: 'Showcases/Shell layouts',
  id: 'apps-shell-layouts',
  parameters: { layout: 'fullscreen' },
};

const NAV = [
  { id: 'overview', icon: 'chart', label: 'Overview' },
  { id: 'campaigns', icon: 'card', label: 'Campaigns' },
  { id: 'reports', icon: 'table', label: 'Reports', badge: 4 },
  { id: 'agents', icon: 'user', label: 'Access & agents' },
  { id: 'prefs', icon: 'gear', label: 'Preferences' },
];

const PALETTE = [
  {
    label: 'Go to',
    items: [
      { id: 'overview', label: 'Overview', description: 'Traffic and revenue', icon: 'chart', href: '#overview' },
      { id: 'reports', label: 'Reports', description: 'Four waiting for approval', icon: 'table', href: '#reports' },
      { id: 'prefs', label: 'Preferences', description: 'Locale, currency, notifications', icon: 'gear', href: '#prefs' },
    ],
  },
];

const ROWS = [
  ['Northwind Traders', '2026-09-11', '4,200.00', 'Paid'],
  ['Globex', '2026-09-10', '860.00', 'Pending'],
  ['Initech', '2026-09-09', '1,975.50', 'Pending'],
  ['Umbrella', '2026-09-08', '312.40', 'Paid'],
];

// The table stays a direct child of the card, as the finance screens' does.
const ledger = () => `
  <table class="ui-table ui-table--dense ui-table--zebra">
    <thead><tr><th>Client</th><th>Arrival</th>
      <th class="ui-table__num">Net (EUR)</th><th>Status</th></tr></thead>
    <tbody>${ROWS.map(([client, day, net, status]) => `<tr><td>${client}</td><td>${day}</td>`
      + `<td class="ui-table__num">${net}</td>`
      + `<td>${badge(status, status === 'Paid' ? 'success' : 'warning')}</td></tr>`).join('')}</tbody>
  </table>`;

// The page itself: a table wide enough to show what a width decides, and a note
// narrow enough to show what the other one buys.
const page = (width) => card({ title: 'Payouts this week', body: ledger() })
  + card({
    title: 'What the width does',
    body: `<p>This screen is the <b>${width}</b> column. The wide column fills the well; `
      + 'the centred one is capped and sits in the middle of it.</p>',
  });

const screen = ({ layout, width }) => appShell({
  word: 'Finance',
  layout,
  width,
  search: layout === 'topbar' ? `cmdk-${layout}-${width}` : undefined,
  nav: NAV,
  active: 'reports',
  navLabel: 'Finance',
  account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' },
  signOutHref: '#logout',
  crumbs: [{ label: 'Finance', href: '#' }, { label: 'Payouts' }],
  title: 'Payouts',
  sub: 'Two of the four that arrived this week are waiting for a second approval.',
  body: page(width)
    + (layout === 'topbar'
      ? commandPalette({ groups: PALETTE, id: `cmdk-${layout}-${width}` })
      : ''),
});

export const TopbarWide = { render: () => screen({ layout: 'topbar', width: 'wide' }) };

export const TopbarCentered = { render: () => screen({ layout: 'topbar', width: 'centered' }) };

export const RailWide = { render: () => screen({ layout: 'rail', width: 'wide' }) };

export const RailCentered = { render: () => screen({ layout: 'rail', width: 'centered' }) };
