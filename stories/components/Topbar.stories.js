import { topbar, themeToggle, deckTextSwitch, accountMenu, versionSwitcher } from '../../src/components/topbar.js';
import { appShell } from '../../src/components/shell.js';
import { card } from '../../src/components/index.js';
import { specimen } from '../_gallery.js';

const VERSIONS = [
  { label: 'phoenix.2026.002', meta: 'Product units, animated deck', badge: 'live' },
  { label: 'phoenix.2026.001', meta: 'Phoenix, 2026-05-17', badge: 'archive' },
];

export default {
  title: 'Components/Topbar',
  parameters: { layout: 'fullscreen' },
};

export const Full = {
  render: () => topbar({
    word: 'Strategy',
    view: 'deck',
    versions: VERSIONS,
    versionIdx: 0,
    account: { name: 'Ada Lovelace', email: 'ada@apliteni.com', active: 'prefs' },
  }),
};

export const SignedOut = {
  name: 'Signed out (deck default)',
  render: () => topbar({ word: 'Strategy', view: 'text', versions: VERSIONS }),
};

export const Pieces = {
  // The toggle is the one piece here that carries a state, so the specimen is
  // rendered for the theme actually on: it shows a moon in dark and a sun in
  // light from the first paint, instead of waiting for wireTopbar to correct it.
  render: (args, ctx) => `<div style="padding:40px;display:flex;flex-direction:column;gap:30px">
    ${specimen('Theme toggle', `<div>${themeToggle(ctx?.globals?.theme || 'dark')}</div>`)}
    ${specimen('Deck / Text switch', `<div>${deckTextSwitch('deck')}</div>`)}
    ${specimen('Version switcher (click to open)', `<div style="height:90px">${versionSwitcher(VERSIONS, 0)}</div>`)}
    ${specimen('Account menu (click the avatar)', `<div style="height:230px;display:flex;justify-content:flex-end;max-width:320px">${accountMenu({ name: 'Ada Lovelace', email: 'ada@apliteni.com' })}</div>`)}
  </div>`,
};

// The topbar over a shell, which is the only place its composition is visible:
// a sticky .topbar, the rail offset beneath it by --ui-app-top, and the account
// menu agreeing with the rail about one nav. The pieces above are drawn on their
// own; what this adds is how they stack. appShell() draws no topbar unless it is
// handed one, so this is the story that draws it.
//
// A plain product page on purpose — the account area itself belongs in a modal
// now (Guidelines / Account and settings), so this draws an ordinary screen. The
// rule the account menu in this band follows is cited on it, so a reader of the
// band finds it; stories/guidelines/overview.test.js holds the id in step. `./`
// resolves against /iframe.html, so this is the manager URL in a static build
// too. `ui-focusable` is the kit's ring opt-in: the base sheet paints it on
// control classes, and a bare anchor is not one, so without it this link answers
// Tab in browser black.
// The band's own versions, short where the specimens above carry the long
// release names: a product word, a Deck/Text pair, a switcher, a toggle and an
// avatar have to share one row down to 320px, and the switcher is the piece that
// gives. The retired /account preset's screen carried `v3` / `v2` for the same
// reason.
const SHELL_VERSIONS = [
  { label: 'v3', meta: 'August 2026', badge: 'live' },
  { label: 'v2', meta: 'March 2026', badge: 'archive' },
];

const GUIDELINE = './?path=/story/guidelines-account-and-settings--account-and-settings';
const cite = `<a class="ui-focusable" href="${GUIDELINE}" target="_top">Guidelines / Account and settings</a>`;

export const InShell = {
  name: 'In the shell',
  render: () => appShell({
    word: 'Strategy',
    nav: [
      { id: 'overview', icon: 'chart', label: 'Overview' },
      { id: 'reports', icon: 'table', label: 'Reports', badge: 4 },
      { id: 'agents', icon: 'user', label: 'Access & agents' },
      { id: 'prefs', icon: 'gear', label: 'Preferences' },
    ],
    active: 'overview',
    navLabel: 'Strategy',
    crumbs: [{ label: 'Strategy' }, { label: 'Overview' }],
    title: 'Overview',
    sub: `The kit’s product topbar over appShell(): the band sticks, and the rail starts below it. What the menu behind the avatar may hold is settled in ${cite}.`,
    body: card({
      title: 'This week',
      body: '<p>Traffic and revenue for the current period. The screen is deliberately '
        + 'plain: what it exists to show is the chrome above and beside it.</p>',
    }),
    account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' },
    signOutHref: '#logout',
    topbar: {
      word: 'Strategy',
      view: 'text',
      showSwitch: true,
      versions: SHELL_VERSIONS,
      account: { name: 'Ada Lovelace', email: 'ada@apliteni.com', active: 'prefs' },
    },
  }),
};
