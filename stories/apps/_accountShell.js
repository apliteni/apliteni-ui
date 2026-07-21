// Demo wrapper for the account stories. It's a thin call to the kit's exported
// accountShell() — i.e. exactly what a consuming product writes to reuse the
// /account layout from the npm package. Nothing here is Storybook-only.
import { accountShell as kitAccountShell } from '../../src/components/shell.js';

const VERSIONS = [{ label: 'phoenix.2026.002', meta: 'Product units', badge: 'live' }];

// In the workbench the sidebar links jump to the matching Storybook stories.
// `target: _top` breaks out of the preview iframe so the manager navigates.
const NAV = [
  ['prefs', 'gear', 'Preferences', './?path=/story/apps-preferences--default', '_top'],
  ['access', 'key', 'Access &amp; agents', './?path=/story/apps-access-agents--default', '_top'],
];

export const accountShell = ({ active, crumb, title, sub, body }) =>
  kitAccountShell({
    word: 'Strategy',
    versions: VERSIONS,
    account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' },
    nav: NAV,
    active, crumb, title, sub, body,
  });
