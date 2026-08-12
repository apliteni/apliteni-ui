// The finance portal's own shell — a demo portal's, not the kit's, which is why
// it lives here beside the screens that draw it and not in src/. Two screens
// draw it (Empty states and Finance report), and each used to carry a copy of
// the nav with a comment asking the reader to keep it in step with the other.
// That is the drift #127 is about, so the demo layer does not get to reproduce
// it — in the nav, in the reader, or in the composition around them.
import { appShell } from '../../src/components/shell.js';

export const FINANCE_NAV = [
  { id: 'dashboard', icon: 'chart', label: 'Dashboard', href: '#', target: '_top' },
  { id: 'payouts', icon: 'card', label: 'Payouts', href: '#', target: '_top' },
  { id: 'invoices', icon: 'doc', label: 'Invoices', href: '#', target: '_top' },
  { id: 'prefs', icon: 'gear', label: 'Preferences', href: '#', target: '_top' },
];

// Who is signed in on both screens. One reader, said once.
export const FINANCE_READER = { name: 'Ada Lovelace', email: 'ada@apliteni.com' };

// The portal's column. The payout ledger is seven columns wide and asked for
// 960px; the empty-state screens took the shell's 860px default and nobody
// chose that — it is what a screen gets when it says nothing. Two widths for
// two screens of one portal is the same drift as two navs, so the portal
// answers once and the ledger's number is the answer.
const FINANCE_MAX = '960px';

// appShell() ships with no topbar, so none of the example screens asks for one.
// The rail already answers who is signed in and how to leave; a topbar beside it
// drew a second product word and a second account menu saying the same two
// things. accountShell() is the one preset that keeps a topbar, because
// `versions`, `showSwitch` and wireTopbar() are published behaviour on that page.
//
// The trail is built here too. Both screens sit one level under Finance, and a
// crumb trail rebuilt by hand on each is a third copy of the same fact.
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
