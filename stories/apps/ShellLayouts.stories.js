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

// #318 · the four looks the band's field is being chosen between, and what #317
// shipped, stacked so they read against each other. BRANCH STATE: the look is a
// stylesheet's, keyed off `data-search-variant` on the box around each screen
// (src/styles/layout.css), and the markup inside is the same bytes every time —
// the same button, the same name, the same `[data-cmdk-open]`. One of these
// blocks becomes `.ui-app__search` and the rest are deleted.
//
// This story is also what lands the variants' ring selector for
// stories/guidelines/accessibility-floor.test.js, which asks that every selector
// the sheet paints a ring on is rendered by a story somewhere. Press Tab into a
// field to see it: today's is the browser's outline, and every variant's is the
// kit's.
const VARIANTS = [
  ['today', 'What #317 ships — a sunken pill, a filled key cap, the palette’s own sentence'],
  ['bordered', 'a · The fill goes; --border-strong carries the edge, and the cap is outlined'],
  ['lifted', 'b · The same pill one step UP, so it is lighter than the band and not darker'],
  ['quiet', 'c · 240px, “Search…”, and the key set beside the words rather than boxed'],
  ['wide', 'd · The field takes the band to the reader’s mark'],
];

// Each screen needs a palette id of its own: five shells on one page is five
// palettes, and a trigger names the one it opens.
const variantScreen = ([variant, note]) => `
  <section${variant === 'today' ? '' : ` data-search-variant="${variant}"`}>
    <p style="margin:0;padding:var(--space-4) clamp(24px, 4vw, 56px) var(--space-2);
              color:var(--muted);font-size:var(--text-sm)">${note}</p>
    ${appShell({
      word: 'Finance',
      layout: 'topbar',
      width: 'wide',
      search: { palette: `cmdk-${variant}`, placeholder: variant === 'quiet' ? 'Search…' : undefined },
      nav: NAV,
      active: 'reports',
      navLabel: 'Finance',
      account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' },
      signOutHref: '#logout',
      crumbs: [{ label: 'Finance', href: '#' }, { label: 'Payouts' }],
      title: 'Payouts',
      sub: 'Two of the four that arrived this week are waiting for a second approval.',
      body: card({ title: 'Payouts this week', body: ledger() })
        + commandPalette({ groups: PALETTE, id: `cmdk-${variant}` }),
    })}
  </section>`;

export const SearchVariants = { render: () => VARIANTS.map(variantScreen).join('') };
