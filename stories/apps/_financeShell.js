// Demo wrapper for the finance page prototype — a thin call to the kit's
// accountShell() with a finance-flavoured word + nav. Exactly what the finance
// portal writes to reuse the shared shell.
import { accountShell as kitAccountShell } from '../../src/components/shell.js';

const NAV = [
  ['dashboard', 'chart', 'Dashboard', '#', '_top'],
  ['payouts', 'card', 'Payouts', '#', '_top'],
  ['invoices', 'doc', 'Invoices', '#', '_top'],
  ['prefs', 'gear', 'Preferences', '#', '_top'],
];

export const financeShell = ({ active, crumb, title, sub, body }) =>
  kitAccountShell({
    word: 'Finance',
    account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' },
    nav: NAV,
    active, crumb, title, sub, body,
  });
