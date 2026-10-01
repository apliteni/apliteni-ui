import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('account-and-settings.md', new URL('../../guidelines/account-and-settings.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { button, card } from '../../src/components/index.js';
import { confirm } from '../../src/components/confirm.js';
import { sidebarNav } from '../../src/components/nav.js';
import { accountMenu } from '../../src/components/topbar.js';

// Two rules are about where a whole screen is drawn, and a screen does not fit a
// 420px cell at life size. They are drawn to scale instead, out of the block
// vocabulary stories/guidelines/_the-page.js established for the same reason: the
// rail, the bar and the content column as blocks, the page's content as the bars a
// reader skims. The ratio is true and the pixels are not, and the captions say so.
//
// The account menu is a dropdown panel, hidden at rest. It joins the flow in a
// specimen the way a confirm does on the shared sheet, so the stage sizes to it
// and nothing is measured through a fade.
export const SPEC_CSS = `
  <style>
    .gas-shell { position: relative; height: 180px; display: flex; gap: 5px;
      border-radius: var(--radius-sm); overflow: hidden; }
    .gas-shell__rail { width: 40px; flex: none; border-radius: 3px; padding: 6px 5px;
      display: flex; flex-direction: column; gap: 6px;
      background: var(--surface); box-shadow: inset 0 0 0 1px var(--border); }
    .gas-shell__well { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
    .gas-shell__bar { height: 18px; flex: none; border-radius: 3px;
      background: var(--surface); box-shadow: inset 0 0 0 1px var(--border); }
    .gas-shell__col { flex: 1; min-width: 0; border-radius: 3px; padding: 8px;
      display: flex; flex-direction: column; gap: 6px;
      background: var(--surface); box-shadow: inset 0 0 0 1px var(--border); }
    .gas-row { height: 6px; border-radius: 2px; flex: none;
      background: color-mix(in srgb, var(--muted) 45%, transparent); }
    .gas-row--cur { background: var(--accent); }
    .gas-ln { height: 5px; border-radius: 2px; flex: none;
      background: color-mix(in srgb, var(--muted) 45%, transparent); }
    .gas-ln--short { width: 44%; }
    .gas-ln--half { width: 62%; }

    /* What an overlay does to the page under it, at the same scale. */
    .gas-scrim { position: absolute; inset: 0; background: var(--scrim); }
    .gas-over { position: absolute; background: var(--bg-elevated);
      border: 1px solid var(--border-strong);
      box-shadow: inset 0 0 0 1px var(--elev-edge, var(--border)), var(--elev-drop);
      display: flex; gap: 6px; padding: 8px; }
    .gas-over--sheet { left: 0; right: 0; bottom: 0; height: 64%;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0; border-bottom: 0; }
    .gas-over--dialog { inset: 14% 7%; border-radius: var(--radius-lg); }
    .gas-over__pane { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
    .gas-over__nav { width: 34px; flex: none; display: flex; flex-direction: column; gap: 6px; }

    /* The account menu, in the flow and at its shipped width. */
    .gas-menu { display: flex; justify-content: center; }
    .gas-menu .acct { display: block; }
    .gas-menu .amenu { position: static; opacity: 1; visibility: visible;
      pointer-events: auto; transform: none; transition: none; }

    /* One page's worth of groups, all four of them — the height beside a rail of
       four names is the comparison the rule is making, so nothing is cut. */
    .gas-stack { display: flex; flex-direction: column; gap: var(--space-3); }
    .gas-acts { display: flex; justify-content: flex-end; gap: var(--space-3);
      margin-top: var(--space-4); }
  </style>`;

const stage = (html, mod = '') => `<div class="gl-stage${mod ? ` ${mod}` : ''}">${html}</div>`;

// ---- where the account area is drawn ------------------------------------

const rows = (n, cur) => Array.from({ length: n }, (_, i) =>
  `<div class="gas-row${i === cur ? ' gas-row--cur' : ''}"></div>`).join('');
const lines = (widths) => widths.map((w) => `<div class="gas-ln gas-ln--${w}"></div>`).join('');

const shell = (over = '') => `<div class="gas-shell">
  <div class="gas-shell__rail">${rows(5, 2)}</div>
  <div class="gas-shell__well">
    <div class="gas-shell__bar"></div>
    <div class="gas-shell__col">${lines(['short', 'half', 'half'])}</div>
  </div>
  ${over}
</div>`;

const panes = (count) => Array.from({ length: count }, () =>
  `<div class="gas-over__pane">${lines(['short', 'half', 'half'])}</div>`).join('');

export const pagesDo = () => stage(shell());
export const pagesDont = () => stage(shell(
  `<div class="gas-scrim"></div><div class="gas-over gas-over--sheet">${panes(3)}</div>`));

// ---- when a dialog is the right shape -----------------------------------

export const oneSettingDo = () => stage(confirm({
  title: 'Require a code at sign-in?',
  body: 'You will enter a code from your authenticator app each time.',
  cancelLabel: 'Not now',
  confirmLabel: 'Require a code',
  variant: 'primary',
  specimen: true,
}), 'gl-stage--confirm');

export const oneSettingDont = () => stage(shell(`<div class="gas-scrim"></div>
  <div class="gas-over gas-over--dialog">
    <div class="gas-over__nav">${rows(4, 0)}</div>${panes(2)}
  </div>`));

// ---- what the account menu holds ----------------------------------------

const READER = { name: 'Ada Lovelace', email: 'ada@apliteni.com', active: 'security' };

// The four pages the split rule names, so one vocabulary runs down the page.
const PAGES = [
  { id: 'profile', icon: 'user', label: 'Profile' },
  { id: 'security', icon: 'shield', label: 'Security & sessions' },
  { id: 'agents', icon: 'key', label: 'Agents & API tokens' },
  { id: 'appearance', icon: 'sun', label: 'Appearance' },
];

// A setting answered in the menu, drawn the only way the menu can draw one: the
// row states its current value. The menu holds no control, which is the point.
const ANSWERED = [
  { id: 'theme', icon: 'sun', label: 'Theme — Dark' },
  { id: 'digest', icon: 'bell', label: 'Weekly digest — On' },
  { id: 'density', icon: 'layout', label: 'Rows — Compact' },
  { id: 'locale', icon: 'globe', label: 'Language — English' },
];

const menu = (nav) => stage(`<div class="gas-menu">${accountMenu({ ...READER, nav })}</div>`);
export const menuDo = () => menu(PAGES);
export const menuDont = () => menu(ANSWERED);

// ---- how the pages split -------------------------------------------------

export const splitDo = () => stage(sidebarNav({
  items: PAGES, active: 'security', ariaLabel: 'Account',
}));

const GROUPS = [
  ['Profile', 'Name, address and the photograph beside them.'],
  ['Security & sessions', 'The sign-in code, and every device signed in now.'],
  ['Agents & API tokens', 'The agents connected, and the tokens they hold.'],
  ['Appearance', 'Theme, accent and row density.'],
];

export const splitDont = () => stage(`<div class="gas-stack">${GROUPS
  .map(([title, sub]) => card({ title, sub, level: 3 })).join('')}</div>`);

// ---- the one action a page carries --------------------------------------

const TOKENS = [
  ['Deploy bot', 'Created 14 Aug · used today'],
  ['Reporting agent', 'Created 2 Sept · used 2 days ago'],
];

// level 3, because a specimen card's title sits under the rule's own heading.
const tokens = (label) => stage(card({
  title: 'API tokens', level: 3,
  body: TOKENS.map(([lab, hint]) =>
    `<div class="ui-card__row"><div><div class="lab">${lab}</div><div class="hint">${hint}</div></div></div>`).join('')
    + `<div class="gas-acts">${button({ label, variant: 'primary' })}</div>`,
}));

export const oneActionDo = () => tokens('Create token');
export const oneActionDont = () => tokens('Save');

export const RULES = withSpecimens(content.rules, [
{ id: 'pages', doHtml: pagesDo, dontHtml: pagesDont },
{ id: 'one-setting', doHtml: oneSettingDo, dontHtml: oneSettingDont },
{ id: 'menu', doHtml: menuDo, dontHtml: menuDont },
{ id: 'split', doHtml: splitDo, dontHtml: splitDont },
{ id: 'one-action', doHtml: oneActionDo, dontHtml: oneActionDont }
]);
