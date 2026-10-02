import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('drawer.md', new URL('../../guidelines/drawer.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { button, card, checkbox, switchToggle } from '../../src/components/index.js';
import { drawer, drawerSection } from '../../src/components/drawer.js';

// A drawer is position: fixed, so each specimen is held inside a frame of its
// own. The panel is narrowed so a strip of scrim shows beside it: a drawer with
// no page behind it reads as a card.
export const SPEC_CSS = `
  <style>
    .gd-frame { position: relative; height: 460px; overflow: hidden; border-radius: var(--radius-md);
      background: var(--bg); --ring-gap: var(--bg); box-shadow: inset 0 0 0 1px var(--border); }
    .gd-frame .ui-drawer { position: absolute; }
    .gd-frame .ui-drawer__panel { width: calc(100% - var(--space-12)); }
    .gd-frame .ui-card { padding: var(--space-4); }
    .gd-frame .ui-card + .ui-card { margin-top: var(--space-4); }
    /* The page half of the drawer-or-page pair: no panel, no scrim and no card — the work
       sits on the page itself, grouped by heading the way the drawer groups it, so
       the halves differ by where the work is and not by what it is drawn with. The
       frame is a floor rather than a height: both halves start at one screen, and
       the page half grows past it where the drawer can only cut, which is what the
       narrower viewport shows. */
    .gd-page { height: auto; min-height: 460px; overflow: visible;
      padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-5); }
    /* A page title scaled to the specimen: the kit's own is a rank louder, which
       beside this document's heading would read as the page's own title. */
    .gd-page__title { margin: 0; color: var(--strong);
      font-size: var(--text-xl); font-weight: var(--weight-bold); letter-spacing: var(--tracking-tight); }
    .gd-page__cols { display: grid; gap: var(--space-6); align-items: start;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); }
    /* The group heading the drawer draws, in the same ink and rank. */
    .gd-group__title { margin: 0 0 var(--space-2); color: var(--strong); font-family: var(--font-sans);
      font-size: var(--text-sm); font-weight: var(--weight-semibold); }
    /* The drawer's own row grid, so a value sits beside its label rather than at the
       far edge, and one row height for both columns, so the two lists step together.
       A row is the switch in the row padding the drawer's rows carry. */
    .gd-stack { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
      column-gap: var(--space-4); align-items: center;
      grid-auto-rows: minmax(calc(26px + var(--space-2)), auto); }
    .gd-stack > .ui-check { grid-column: 1 / -1; }
    .gd-unit { display: contents; }
    /* The ruled rows a page writes by hand, which is the fault the don't shows. */
    .gd-ruled__row { display: flex; justify-content: space-between; gap: var(--space-4);
      padding-block: var(--space-3); border-bottom: 1px solid var(--border); }
    .gd-ruled__row:last-child { border-bottom: 0; }
    .gd-ruled__row > :first-child { color: var(--strong); }
  </style>`;

// One fabricated record, so a pair differs only in what its rule is about.
const PAYMENT = [['Amount', '€ 12,480.50'], ['Date', '31 Aug 2026'], ['Counterparty', 'Northwind Payments']];
const DETAIL = [...PAYMENT, ['Description', 'Card payout · batch 2291'], ['Source', 'Bank feed']];
const GROUPS = [
  { rows: PAYMENT },
  { title: 'How it is classified', rows: [['Category', '—'], ['Unit', 'Ledger']] },
  { title: 'Where it came from', rows: [['Statement', '#4102'], ['Reference', 'po_example_1047']] },
];

const frame = (body, title = 'Northwind Payments', footer = '') => `<div class="gd-frame">${drawer({ title, specimen: true, body, footer })}</div>`;
const ruled = (rows) => rows.map(([k, v]) => `<div class="gd-ruled__row"><span>${k}</span><span>${v}</span></div>`).join('');

// One member's access, the work the drawer-or-page rule is about: the same roles and the
// same switch per unit, once on a page and once in a drawer.
const ROLES = [['Viewer', true], ['Operator', true], ['Billing admin', false]];
const UNITS = [['Ledger', true], ['Payouts', true], ['Agents', false], ['Keys', false], ['Reports', false]];

const roles = () => `<div class="gd-stack">${ROLES.map(([label, checked]) => checkbox({ label, checked, name: 'gd-role' })).join('')}</div>`;
const unitBoard = () => `<div class="gd-stack">${UNITS.map(([label, on]) =>
  `<div class="gd-unit"><span>${label}</span>${switchToggle({ checked: on, label: `${label} access` })}</div>`).join('')}</div>`;
const unitRows = () => UNITS.map(([label, on]) => [label, { html: switchToggle({ checked: on, label: `${label} access` }) }]);

const group = (title, body) => `<section><h3 class="gd-group__title">${title}</h3>${body}</section>`;

const pageDo = () => `<div class="gd-frame gd-page">
  <h2 class="gd-page__title">Member access</h2>
  <div class="gd-page__cols">
    ${group('Roles', roles())}
    ${group('Access per unit', unitBoard())}
  </div>
  <div>${button({ label: 'Save access', variant: 'primary' })}</div>
</div>`;

const pageDont = () => frame(
  drawerSection({ title: 'Roles', body: roles() }) + drawerSection({ title: 'Access per unit', rows: unitRows() }),
  'Member access',
  button({ label: 'Save access', variant: 'primary' }),
);

export const RULES = withSpecimens(content.rules, [
{ id: 'one-record' },
{ id: 'drawer-or-page', doHtml: pageDo, dontHtml: pageDont },
{ id: 'no-cards', doHtml: () => frame(GROUPS.map((g) => drawerSection(g)).join('')), dontHtml: () => frame(GROUPS.map((g) => card({ body: drawerSection(g) })).join('')) },
{ id: 'three-lines' },
{ id: 'rows', doHtml: () => frame(drawerSection({ rows: DETAIL })), dontHtml: () => frame(ruled(DETAIL)) }
]);
