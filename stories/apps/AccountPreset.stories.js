// The /account preset, drawn. Every other screen in Apps/ is built on
// appShell() with no topbar; this one exists because accountShell() is a
// published export whose composition nothing else in the workbench renders —
// the sticky topbar, the rail offset beneath it by --ui-app-top, and the
// account menu that has to agree with the rail about the same nav.
//
// So it is deliberately plain: no demo dashboard, nothing to distract from the
// two chrome surfaces that only appear here.
import { accountShell } from '../../src/components/shell.js';
import { card, switchToggle } from '../../src/components/index.js';

export default {
  title: 'Apps/Account preset',
  parameters: { layout: 'fullscreen' },
};

const READER = { name: 'Ada Lovelace', email: 'ada@apliteni.com' };

const settingRow = (lab, hint, control) =>
  `<div class="ui-card__row"><div><div class="lab">${lab}</div><div class="hint">${hint}</div></div>${control}</div>`;

const body = card({
  title: 'Notifications',
  body: settingRow('Weekly digest', 'A summary when things change.', switchToggle({ checked: true, label: 'Weekly digest' }))
    + settingRow('Agent activity', 'Email me when an agent first connects.', switchToggle({ checked: false, label: 'Agent activity' })),
});

// Nothing passes `nav`, on purpose: this is what a consumer gets from the
// defaults, and it is the one screen where the rail and the topbar's account
// menu are both on screen saying the same two entries.
export const Default = {
  render: () => accountShell({
    word: 'Account',
    account: READER,
    active: 'prefs',
    crumb: 'Preferences',
    title: 'Preferences',
    sub: 'The kit\'s /account preset: appShell() with the topbar switched on.',
    body,
  }),
};

// The topbar's other two pieces. `versions` draws the switcher and `showSwitch`
// the Deck/Text pair — both belong to the preset and to nothing else in Apps/.
export const WithVersionSwitcher = {
  render: () => accountShell({
    word: 'Strategy',
    account: READER,
    active: 'access',
    cap: 'Account',
    // `crumb` is text and the shell escapes it; `title` is a raw-HTML slot.
    crumb: 'Access & agents',
    title: 'Access &amp; agents',
    sub: 'The same preset carrying a version switcher and the Deck/Text pair.',
    showSwitch: true,
    versions: [
      { label: 'v3', meta: 'August 2026', badge: 'live' },
      { label: 'v2', meta: 'March 2026', badge: 'archive' },
    ],
    body,
  }),
};
