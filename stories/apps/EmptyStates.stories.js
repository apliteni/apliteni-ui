import { appShell } from '../../src/components/shell.js';
import { card, emptyState, button, input, segmented } from '../../src/components/index.js';

export default {
  title: 'Apps/Empty states',
  parameters: { layout: 'fullscreen' },
};

// The finance portal's own nav, written where the screen that uses it lives —
// it is not the kit's account default and never was.
const NAV = [
  { id: 'dashboard', icon: 'chart', label: 'Dashboard', href: '#', target: '_top' },
  { id: 'payouts', icon: 'card', label: 'Payouts', href: '#', target: '_top' },
  { id: 'invoices', icon: 'doc', label: 'Invoices', href: '#', target: '_top' },
  { id: 'prefs', icon: 'gear', label: 'Preferences', href: '#', target: '_top' },
];
const READER = { name: 'Ada Lovelace', email: 'ada@apliteni.com' };

// The same screen the finance portal draws, and drawn the same way: appShell()
// ships with no topbar, so none of the example screens asks for one. The rail
// already answers who is signed in and how to leave; a topbar beside it drew a
// second product word and a second account menu saying the same two things.
// accountShell() is the one preset that keeps a topbar, because `versions`,
// `showSwitch` and wireTopbar() are published behaviour on that page.
const financeShell = ({ active, crumb, title, sub, body }) => appShell({
  word: 'Finance',
  nav: NAV,
  active,
  navLabel: 'Finance',
  crumbs: [{ label: 'Finance', href: '#' }, { label: crumb || title }],
  title,
  sub,
  body,
  account: READER,
  signOutHref: '#logout',
});

// A filtered list that returned nothing — illustration + nudge, no action.
export const FilteredList = {
  render: () => financeShell({
    active: 'invoices',
    crumb: 'Invoices',
    title: 'Invoices',
    sub: 'Everything you have uploaded or received by email.',
    body: `
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">
        ${input({ placeholder: 'Vendor' })}
        ${segmented({ ariaLabel: 'Status filter', options: ['Any', 'Verified', 'Pending'], active: 2 })}
        ${button({ label: 'Filter', variant: 'secondary' })}
      </div>
      ${card({ body: emptyState({
        art: 'invoices',
        title: 'No invoices match the current filters.',
        sub: 'Try widening the date range or clearing a filter.',
      }) })}
    `,
  }),
};

// A first-run page with no rows yet — illustration + guidance + a clear action.
export const FirstRun = {
  render: () => financeShell({
    active: 'prefs',
    crumb: 'People',
    title: 'People',
    sub: 'Contractors and staff, for cost attribution.',
    body: card({ body: emptyState({
      art: 'people',
      title: 'No people yet',
      sub: 'Contractors and staff you add show up here for attribution.',
      actions: button({ label: '+ Add person', variant: 'primary' }),
    }) }),
  }),
};
