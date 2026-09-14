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
  title: 'Apps/Shell layouts',
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

// #318 · the band's search field, in the look being chosen. BRANCH STATE: the
// look is a stylesheet's, keyed off `data-search-variant` on the box around the
// screen (src/styles/layout.css), and the markup inside is the same bytes
// whichever is set — the same button, the same name, the same `[data-cmdk-open]`.
// Flip `variant` in the controls panel to compare; `Topbar wide` above is the
// same screen with no attribute at all, which is what #317 ships.
//
// One screen and not five, for two reasons the gates gave: a story holding five
// shells is five <main>s and five h1s on one page, which the-page.test.js is
// right to refuse, and each extra screen is paid for again in every theme x
// accent cell of the contrast walk. It is also what lands the variants' ring
// selector for accessibility-floor.test.js — press Tab into the field.
const SEARCH_VARIANTS = ['bordered', 'lifted', 'quiet', 'wide'];

export const SearchVariant = {
  args: { variant: 'lifted' },
  argTypes: { variant: { control: 'select', options: SEARCH_VARIANTS } },
  // The words are an argument rather than a rule, so the one variant that
  // shortens them shortens them here. A default on the whole bag and not on the
  // property: two of the gates call render() with nothing at all.
  render: ({ variant } = {}) => `<div data-search-variant="${variant || 'lifted'}">${appShell({
    word: 'Finance',
    layout: 'topbar',
    width: 'wide',
    search: { palette: 'cmdk-variant', placeholder: variant === 'quiet' ? 'Search…' : undefined },
    nav: NAV,
    active: 'reports',
    navLabel: 'Finance',
    account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' },
    signOutHref: '#logout',
    crumbs: [{ label: 'Finance', href: '#' }, { label: 'Payouts' }],
    title: 'Payouts',
    sub: 'Two of the four that arrived this week are waiting for a second approval.',
    body: page('wide') + commandPalette({ groups: PALETTE, id: 'cmdk-variant' }),
  })}</div>`,
};
