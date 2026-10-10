// The finance portal's own shell — a demo portal's, not the kit's, which is why it lives
// here beside the screens that draw it. Two screens draw it, and each used to carry its
// own copy of the nav, which is the drift #127 is about.
import { appShell } from '../../src/components/shell.js';
import { previewHref } from '../lib/story-link.js';

// The two screens this portal has. The report keeps its own place in the rail as
// well as the dashboard's link into it: guidelines/dashboards-and-reports.md asks for both.
export const DASHBOARD_STORY = 'apps-finance-dashboard--default';
export const REPORT_STORY = 'apps-finance-report--default';

// A payout's row on the report; stories/dashboard-report-refs.test.js holds both sides.
export const payoutRowId = (reference) => `payout-${String(reference).toLowerCase()}`;
export const payoutHref = (reference) => previewHref(REPORT_STORY, payoutRowId(reference));
export const reportHref = () => previewHref(REPORT_STORY);

export const FINANCE_NAV = [
  { id: 'dashboard', icon: 'chart', label: 'Dashboard', href: previewHref(DASHBOARD_STORY) },
  { id: 'payouts', icon: 'card', label: 'Payouts', href: previewHref(REPORT_STORY) },
  // Invoices and Preferences have no screen in the kit, so they stay inert.
  { id: 'invoices', icon: 'doc', label: 'Invoices', href: '#', target: '_top' },
  { id: 'prefs', icon: 'gear', label: 'Preferences', href: '#', target: '_top' },
];

// Who is signed in on both screens. One reader, said once.
export const FINANCE_READER = { name: 'Ada Lovelace', email: 'ada@apliteni.com' };

// The portal's column: the ledger is seven columns wide and asked for 960px while the
// empty-state screens took the shell's unchosen 860px default. One portal answers once.
const FINANCE_MAX = '960px';

// appShell() ships with no topbar, so no example screen asks for one: the rail already
// answers who is signed in and how to leave. Components/Topbar draws the band over a
// shell — `versions`, `showSwitch` and wireTopbar() are published behaviour. The
// trail is built here too, so neither screen rebuilds the same crumb by hand.
// The dashboard's trail is one unlinked crumb, not a parent crumb addressing itself.
export const financeShell = ({ active, crumb, title, sub, body, back }) => appShell({
  word: 'Finance',
  nav: FINANCE_NAV,
  active,
  navLabel: 'Finance',
  crumbs: active === 'dashboard'
    ? [{ label: 'Finance' }]
    : [{ label: 'Finance', href: previewHref(DASHBOARD_STORY) }, { label: crumb || title }],
  back,
  title,
  sub,
  body,
  account: FINANCE_READER,
  signOutHref: '#logout',
  maxWidth: FINANCE_MAX,
});
