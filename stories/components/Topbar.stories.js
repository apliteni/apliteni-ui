import { topbar, themeToggle, deckTextSwitch, accountMenu, versionSwitcher } from '../../src/components/topbar.js';
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
