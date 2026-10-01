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
    /* The page half of the comfort pair: the same frame with the work on the page.
       It is as tall as its content, because a page is not cut to a panel's height
       and the drawer beside it is: that difference is the rule. */
    .gd-page { height: auto; min-height: 460px; overflow: visible;
      padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-5); }
    .gd-page__title { margin: 0; color: var(--strong); font-family: var(--font-display);
      font-size: var(--text-xl); font-weight: var(--weight-bold); letter-spacing: var(--tracking-tight); }
    .gd-page__cols { display: grid; gap: var(--space-4); align-items: start;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); }
    /* The cards sit side by side here, so the stacking gap above would offset the second. */
    .gd-page__cols .ui-card + .ui-card { margin-top: 0; }
    .gd-stack { display: flex; flex-direction: column; gap: var(--space-3); }
    .gd-unit { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
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

// One member's access, the work the comfort rule is about: the same roles and the
// same switch per unit, once on a page and once in a drawer.
const ROLES = [['Viewer', true], ['Operator', true], ['Billing admin', false]];
const UNITS = [['Ledger', true], ['Payouts', true], ['Agents', false], ['Keys', false], ['Reports', false]];

const roles = () => `<div class="gd-stack">${ROLES.map(([label, checked]) => checkbox({ label, checked, name: 'gd-role' })).join('')}</div>`;
const unitBoard = () => `<div class="gd-stack">${UNITS.map(([label, on]) =>
  `<div class="gd-unit"><span>${label}</span>${switchToggle({ checked: on, label: `${label} access` })}</div>`).join('')}</div>`;
const unitRows = () => UNITS.map(([label, on]) => [label, { html: switchToggle({ checked: on, label: `${label} access` }) }]);

const comfortDo = () => `<div class="gd-frame gd-page">
  <h2 class="gd-page__title">Member access</h2>
  <div class="gd-page__cols">
    ${card({ title: 'Roles', level: 3, body: roles() })}
    ${card({ title: 'Access per unit', level: 3, body: unitBoard() })}
  </div>
  <div>${button({ label: 'Save access', variant: 'primary' })}</div>
</div>`;

const comfortDont = () => frame(
  drawerSection({ title: 'Roles', body: roles() }) + drawerSection({ title: 'Access per unit', rows: unitRows() }),
  'Member access',
  button({ label: 'Save access', variant: 'primary' }),
);

export const RULES = withSpecimens(content.rules, [
{ id: 'one-record' },
{ id: 'comfort', doHtml: comfortDo, dontHtml: comfortDont },
{ id: 'no-cards', doHtml: () => frame(GROUPS.map((g) => drawerSection(g)).join('')), dontHtml: () => frame(GROUPS.map((g) => card({ body: drawerSection(g) })).join('')) },
{ id: 'three-lines' },
{ id: 'rows', doHtml: () => frame(drawerSection({ rows: DETAIL })), dontHtml: () => frame(ruled(DETAIL)) }
]);
