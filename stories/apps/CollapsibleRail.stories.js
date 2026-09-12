// The rail the reader folds (#277). Both states are drawn with `collapsed`
// passed, so each story shows the same thing whatever the cookie says; the
// toggle still works in Storybook and remembers the choice for every story that
// leaves `collapsed` out. Press it here rather than switching stories: the fold
// is the thing worth watching, and a story that is already folded shows the
// result and not the travel.
import { appShell, ACCOUNT_NAV } from '../../src/components/shell.js';
import { card } from '../../src/components/index.js';

export default {
  title: 'Apps/Collapsible rail',
  parameters: { layout: 'fullscreen' },
};

// A group with the current page inside it, a counter and the sign-out row: the
// three things a fold has to keep reachable and named.
const NAV = [
  { id: 'overview', icon: 'chart', label: 'Overview' },
  {
    icon: 'card',
    label: 'Payouts',
    items: [
      { id: 'pending', icon: 'clock', label: 'Pending', badge: 3 },
      { id: 'history', icon: 'doc', label: 'History' },
    ],
  },
  ...ACCOUNT_NAV,
];

const settingRow = (lab, hint, value) =>
  `<div class="ui-card__row"><div><div class="lab">${lab}</div><div class="hint">${hint}</div></div>${value}</div>`;

const screen = (collapsed) => appShell({
  nav: NAV,
  active: 'pending',
  account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' },
  signOutHref: '#logout',
  crumbs: [{ label: 'Payouts', href: '#' }, { label: 'Pending' }],
  title: 'Pending payouts',
  sub: 'Three payouts are waiting for a second approval.',
  collapsed,
  body: card({
    title: 'Waiting for approval',
    body: settingRow('Northwind Traders', 'Requested by Ada Lovelace', '<span>€4,200.00</span>')
      + settingRow('Globex', 'Requested by Ada Lovelace', '<span>€860.00</span>')
      + settingRow('Initech', 'Requested by Ada Lovelace', '<span>€1,975.50</span>'),
  }),
});

export const Expanded = { render: () => screen(false) };

export const Collapsed = { render: () => screen(true) };
