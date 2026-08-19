// The finance portal's own shell — a demo portal's, not the kit's, which is why it lives
// here beside the screens that draw it. Two screens draw it, and each used to carry its
// own copy of the nav, which is the drift #127 is about.
import { appShell } from '../../src/components/shell.js';

export const FINANCE_NAV = [
  { id: 'dashboard', icon: 'chart', label: 'Dashboard', href: '#', target: '_top' },
  { id: 'payouts', icon: 'card', label: 'Payouts', href: '#', target: '_top' },
  { id: 'invoices', icon: 'doc', label: 'Invoices', href: '#', target: '_top' },
  { id: 'prefs', icon: 'gear', label: 'Preferences', href: '#', target: '_top' },
];

// Who is signed in on both screens. One reader, said once.
export const FINANCE_READER = { name: 'Ada Lovelace', email: 'ada@apliteni.com' };

// The portal's column: the ledger is seven columns wide and asked for 960px while the
// empty-state screens took the shell's unchosen 860px default. One portal answers once.
const FINANCE_MAX = '960px';

// appShell() ships with no topbar, so no example screen asks for one: the rail already
// answers who is signed in and how to leave. accountShell() is the one preset that keeps
// one — `versions`, `showSwitch` and wireTopbar() are published behaviour there. The
// trail is built here too, so neither screen rebuilds the same crumb by hand.
export const financeShell = ({ active, crumb, title, sub, body }) => appShell({
  word: 'Finance',
  nav: FINANCE_NAV,
  active,
  navLabel: 'Finance',
  crumbs: [{ label: 'Finance', href: '#' }, { label: crumb || title }],
  title,
  sub,
  body,
  account: FINANCE_READER,
  signOutHref: '#logout',
  maxWidth: FINANCE_MAX,
});
