import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('account-and-settings.md', new URL('../../guidelines/account-and-settings.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { button, card, switchToggle } from '../../src/components/index.js';
import { sidebarNav } from '../../src/components/nav.js';
import { accountMenu } from '../../src/components/topbar.js';

// The account modal is a shape the kit cannot draw, which rule 1 records as #553, so
// the panel here is composed: the two-step edge and raised ground every kit overlay
// wears, around a real nav and real rows. The product behind it is drawn to scale in
// the block vocabulary stories/guidelines/_the-page.js established.
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
    .gas-over__pane { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }

    /* Where the overlay opens is a question about a whole screen, and a screen does
       not fit a 420px cell at life size. Both halves of that pair are drawn to
       scale in one frame: the product behind, the scrim over it, and the overlay's
       own shape — a centred panel with a nav column, or a sheet across the foot. */
    .gas-frame { position: relative; height: 300px; display: flex; gap: 5px;
      border-radius: var(--radius-sm); overflow: hidden; }
    .gas-frame .gas-shell { height: 100%; flex: 1; }
    .gas-over--modal { inset: 14% 10%; border-radius: var(--radius-sm); }
    .gas-over__nav { width: 30%; flex: none; display: flex; flex-direction: column; gap: 6px;
      padding-right: 6px; border-right: 1px solid var(--border); }

    /* The account modal at life size, where the navigation itself is the subject:
       the panel's own ground and edge, a head over it, the nav beside the pane.
       Under it is the drawn product rule 1 uses, and the scrim over that. The scrim
       alone was a dark translucent with nothing behind it, which in light theme
       composites into an opaque grey mat around the panel — a different wrong
       reading from the card it was there to prevent. */
    .gas-modal { position: relative; padding: var(--space-5) var(--space-4);
      border-radius: var(--radius-md); overflow: hidden; }
    .gas-modal__bg { position: absolute; inset: 0; }
    .gas-modal__bg .gas-shell { height: 100%; border-radius: 0; }
    /* The drawn rail marks its current row in the accent, which is right in rule 1
       where that rail is the subject. Under a scrim it is a clipped purple dash
       beside the panel, marking nothing these four rules name, so it goes neutral. */
    .gas-modal__bg .gas-row--cur {
      /* ring-gap: inherit — a drawn nav row is a mark, not a control. */
      background: color-mix(in srgb, var(--muted) 45%, transparent); }
    .gas-modal__panel { position: relative; border-radius: var(--radius-md); overflow: hidden;
      background: var(--bg-elevated); --ring-gap: var(--bg-elevated);
      border: 1px solid var(--border-strong);
      box-shadow: inset 0 0 0 1px var(--elev-edge, var(--border)), var(--elev-drop); }
    .gas-modal__head { display: flex; align-items: center; justify-content: space-between;
      gap: var(--space-3); padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
      border-bottom: 1px solid var(--border); }
    .gas-modal__title { margin: 0; font-family: var(--font-sans);
      font-weight: var(--weight-normal); font-size: var(--text-base); color: var(--text); }
    .gas-modal__body { display: flex; min-height: var(--gas-body, 300px); }
    /* The one-field don't shows a pane with a single row in it, so its body needs
       no room for five. The floor is the variable, not a second panel. */
    .gas-modal--short { --gas-body: 100px; }
    /* The navigation pair stands both panels on one body height rather than a
       floor, so the half with no navigation is cut where its scroll begins —
       which is the fault that rule is about, drawn rather than described. */
    .gas-modal--nav .gas-modal__body { height: 330px; min-height: 0; }
    /* The caption takes the card title's rank without being a heading: a specimen is
       a picture, and the document's outline is the rule headings. */
    .gas-modal__cap { font-family: var(--font-sans); font-size: var(--text-lg);
      font-weight: var(--weight-semibold); line-height: var(--leading-snug);
      color: var(--strong); margin-bottom: var(--space-1); }
    .gas-modal__nav { flex: 0 1 auto; min-width: 0; padding: var(--space-3) var(--space-2);
      border-right: 1px solid var(--border); }
    .gas-modal__pane { flex: 1 1 0; min-width: 0; padding: var(--space-4);
      display: flex; flex-direction: column; gap: var(--space-3); overflow: hidden; }

    /* Below the kit's fold the pane has no room beside a column of names, and a
       pane cut off at its own edge is not what this page is recommending. The
       navigation goes above the pane there, which is what the shape has to do on a
       phone, and the paired body heights come off with it. */
    @media (max-width: 720px) {
      .gas-modal__body, .gas-modal--nav .gas-modal__body { display: block; height: auto; }
      .gas-modal__nav { width: auto; padding: var(--space-2);
        border-right: 0; border-bottom: 1px solid var(--border); }
    }

    .gas-acts { display: flex; justify-content: flex-end; gap: var(--space-3);
      margin-top: var(--space-4); }

    /* The account menu, in the flow and at its shipped width. */
    /* Both menus stand on the taller one's own height. One row against five is the
       whole of this rule, and a pair drawn at two heights stops being a comparison. */
    .gas-menu { display: flex; justify-content: center; min-height: 392px; }
    .gas-menu .acct { display: block; }
    .gas-menu .amenu { position: static; opacity: 1; visibility: visible;
      pointer-events: auto; transform: none; transition: none; }
  </style>`;

const stage = (html, mod = '') => `<div class="gl-stage${mod ? ` ${mod}` : ''}">${html}</div>`;

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

// The product, the scrim and one overlay shape over both, at one scale.
const over = (shape) => `<div class="gas-frame">${shell(
  `<div class="gas-scrim"></div>${shape}`)}</div>`;

const panes = (count) => Array.from({ length: count }, () =>
  `<div class="gas-over__pane">${lines(['short', 'half', 'half'])}</div>`).join('');

// ---- the account modal, and the sheet it is not -------------------------

// The pages the navigation rule names, so one vocabulary runs down the page.
const PANES = [
  { id: 'profile', icon: 'user', label: 'Profile' },
  { id: 'security', icon: 'shield', label: 'Security & sessions' },
  { id: 'agents', icon: 'key', label: 'Agents & API tokens' },
  { id: 'appearance', icon: 'sun', label: 'Appearance' },
  { id: 'notifications', icon: 'bell', label: 'Notifications' },
];

const DEVICES = [
  ['This browser', 'Lisbon · active now'],
  ['Studio laptop', 'Lisbon · 2 days ago'],
  ['Phone', 'Lisbon · yesterday'],
];

const settingRow = (lab, hint, control = '') =>
  `<div class="ui-card__row"><div><div class="lab">${lab}</div>${
    hint ? `<div class="hint">${hint}</div>` : ''}</div>${control}</div>`;

const closeBtn = () => button({ label: 'Close', icon: 'x', iconOnly: true, variant: 'ghost', size: 'sm' });

// The pane holds no card: a card inside the panel is the box the drawer guideline
// refuses next door, and the panel is already the raised surface and the edge.
const modal = (body, mod = '') => `<div class="gas-modal${mod ? ` ${mod}` : ''}">
  <div class="gas-modal__bg">${shell()}<div class="gas-scrim"></div></div>
  <div class="gas-modal__panel">
    <div class="gas-modal__head">
      <h3 class="gas-modal__title">Account</h3>${closeBtn()}
    </div>
    <div class="gas-modal__body">${body}</div>
  </div>
</div>`;

const pane = (cap, body) => `<div class="gas-modal__pane">
  ${cap ? `<div class="gas-modal__cap">${cap}</div>` : ''}${body}
</div>`;
const sessionsPane = (cap) => pane(cap, DEVICES.map(([l, h]) => settingRow(l, h)).join(''));

const withNav = (active) => `<div class="gas-modal__nav">${sidebarNav({
  items: PANES, active, ariaLabel: 'Account',
})}</div>`;

export const modalDo = () => stage(over(`<div class="gas-over gas-over--modal">
  <div class="gas-over__nav">${rows(5, 1)}</div>${panes(1)}
</div>`));
export const modalDont = () => stage(over(
  `<div class="gas-over gas-over--sheet">${panes(3)}</div>`));

// ---- the modal's own navigation -----------------------------------------

const GROUPS = [
  ['Profile', 'Name, address and the photograph beside them.'],
  ['Security & sessions', 'The sign-in code, and every device signed in now.'],
  ['Agents & API tokens', 'The agents connected, and the tokens they hold.'],
  ['Appearance', 'Theme, accent and row density.'],
  ['Notifications', 'What the product emails, and how often.'],
];

export const navDo = () => stage(modal(
  withNav('security') + sessionsPane('Signed in now'), 'gas-modal--nav'));
export const navDont = () => stage(modal(pane('',
  GROUPS.map(([title, sub]) => settingRow(title, sub)).join('')), 'gas-modal--nav'));

// ---- what the account menu holds ----------------------------------------

// No `active`: the row that opens the modal is the way in, not the page the reader
// is already on, and marking it would also put the pair's only accent on the Do.
const READER = { name: 'Ada Lovelace', email: 'ada@apliteni.com' };

// One row, because the menu's job under this rule is the way in and nothing else.
const WAY_IN = [{ id: 'settings', icon: 'gear', label: 'Account settings' }];

// A setting answered in the menu, drawn the only way the menu can draw one: the
// row states its current value. The menu holds no control, which is the point.
const ANSWERED = [
  { id: 'theme', icon: 'sun', label: 'Theme — Dark' },
  { id: 'digest', icon: 'bell', label: 'Weekly digest — On' },
  { id: 'news', icon: 'mail', label: 'Product news — Off' },
  { id: 'density', icon: 'layout', label: 'Rows — Compact' },
  { id: 'locale', icon: 'globe', label: 'Language — English' },
];

const menu = (nav) => stage(`<div class="gas-menu">${accountMenu({ ...READER, nav })}</div>`);
export const menuDo = () => menu(WAY_IN);
export const menuDont = () => menu(ANSWERED);

// ---- one field, changed where it sits ------------------------------------

const DIGEST = ['Weekly digest', 'A summary when things change.'];

export const inRowDo = () => stage(card({
  title: 'Notifications', level: 3,
  body: settingRow(...DIGEST, switchToggle({ checked: true, label: 'Weekly digest' }))
    + settingRow('Agent activity', 'Email me when an agent first connects.',
      switchToggle({ checked: false, label: 'Agent activity' }))
    + settingRow('Product news', 'Occasional updates about new components.',
      switchToggle({ checked: false, label: 'Product news' })),
}));

export const inRowDont = () => stage(modal(withNav('notifications')
  + pane('Notifications',
    settingRow(DIGEST[0], '', switchToggle({ checked: true, label: 'Weekly digest, in the modal' }))),
  'gas-modal--short'));

// ---- the action a pane carries -------------------------------------------

// Each agent beside the token it holds, masked the way a kit page shows one: the
// caption, the action and the rule's reason all say tokens, so the pane draws them.
const TOKENS = [
  ['Deploy bot', 'apl_••••7Q2 · used today'],
  ['Reporting agent', 'apl_••••K4D · used 2 days ago'],
];

// In the modal, like the four rules above it: this pair was the only one that left
// the shape the page spends its first four rules establishing. The rows are the
// agents the rule's reason names, each holding the token beside it.
const tokens = (label) => stage(modal(withNav('agents') + pane('Agents & API tokens',
  TOKENS.map(([lab, hint]) => settingRow(lab, hint)).join('')
  + `<div class="gas-acts">${button({ label, variant: 'primary' })}</div>`)));

export const oneActionDo = () => tokens('Create token');
export const oneActionDont = () => tokens('Save');

export const RULES = withSpecimens(content.rules, [
{ id: 'modal', doHtml: modalDo, dontHtml: modalDont },
{ id: 'nav', doHtml: navDo, dontHtml: navDont },
{ id: 'menu', doHtml: menuDo, dontHtml: menuDont },
{ id: 'in-row', doHtml: inRowDo, dontHtml: inRowDont },
{ id: 'one-action', doHtml: oneActionDo, dontHtml: oneActionDont }
]);
