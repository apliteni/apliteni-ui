import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('drawer.md', new URL('../../guidelines/drawer.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { card } from '../../src/components/index.js';
import { drawer, drawerSection } from '../../src/components/drawer.js';

// A drawer is position: fixed, so each specimen is held inside a frame of its
// own. The panel is narrowed so a strip of scrim shows beside it: a drawer with
// no page behind it reads as a card.
export const SPEC_CSS = `
  <style>
    .gd-frame { position: relative; height: 460px; overflow: hidden; border-radius: var(--radius-md);
      background: var(--bg); box-shadow: inset 0 0 0 1px var(--border); }
    .gd-frame .ui-drawer { position: absolute; }
    .gd-frame .ui-drawer__panel { width: calc(100% - var(--space-12)); }
    .gd-frame .ui-card { padding: var(--space-4); }
    .gd-frame .ui-card + .ui-card { margin-top: var(--space-4); }
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

const frame = (body) => `<div class="gd-frame">${drawer({ title: 'Northwind Payments', specimen: true, body })}</div>`;
const ruled = (rows) => rows.map(([k, v]) => `<div class="gd-ruled__row"><span>${k}</span><span>${v}</span></div>`).join('');

export const RULES = withSpecimens(content.rules, [
{ id: 'one-record' },
{ id: 'no-cards', doHtml: () => frame(GROUPS.map((g) => drawerSection(g)).join('')), dontHtml: () => frame(GROUPS.map((g) => card({ body: drawerSection(g) })).join('')) },
{ id: 'three-lines' },
{ id: 'rows', doHtml: () => frame(drawerSection({ rows: DETAIL })), dontHtml: () => frame(ruled(DETAIL)) }
]);
