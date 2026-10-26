// The finance portal's own shell — a demo portal's, not the kit's, which is why it lives
// here beside the screens that draw it. The React shell is _finance-shell.tsx; these
// constants are what both the screens and the gates read, so neither screen rebuilds
// its own copy of the nav, which is the drift #127 is about.
import { previewHref } from '../lib/story-link.js';

// The two screens this portal has. The report keeps its own place in the rail as
// well as the dashboard's link into it: guidelines/dashboards-and-reports.md asks for both.
export const DASHBOARD_STORY = 'apps-finance-dashboard--default';
export const REPORT_STORY = 'apps-finance-report--default';

// A payout's row on the report; react/src/dashboard-report-refs.test.tsx holds both sides.
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
