// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { card } from '../../src/components/index.js';
import { drawer, drawerSection } from '../../src/components/drawer.js';

export const TITLE = 'Drawers';

export const BLURB = 'When to open a panel over the list, and how little it needs to separate its parts.';

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

export const RULES = [
  {
    id: 'one-record',
    imperative: 'Open a drawer to look at or change one record without leaving its list.',
    why: 'The list stays behind the scrim, so closing the drawer puts the reader back on the row '
      + 'they opened it from. A question with two answers is a confirm. Work that needs its own '
      + 'address, runs past one screen or takes several steps is a page. Polaris has deprecated its '
      + 'sheet, and Atlassian\'s drawer page now reads "Please use Modal instead", so a kit that '
      + 'keeps one should say what it is for: one record, seen or changed in place.',
    except: 'A short form is fine in a drawer, as Component choice says: filters, a new key, a '
      + 'reclassification. A form that takes steps or runs past one screen is a page.',
    kit: [{ ref: 'src/components/drawer.js:10', pattern: 'content over a scrim, focus-trapped, Esc-dismissable' }],
  },
  {
    id: 'no-cards',
    imperative: 'Group a drawer\'s content under headings. Never put a card inside one.',
    doHtml: () => frame(GROUPS.map((g) => drawerSection(g)).join('')),
    dontHtml: () => frame(GROUPS.map((g) => card({ body: drawerSection(g) })).join('')),
    doCaption: 'Three groups, each a heading over its rows. The panel is the container, and a '
      + 'heading is all the structure a group needs inside it.',
    dontCaption: 'The same groups, each in a card: a box inside the panel\'s box, and every card '
      + 'edge is one more line to read past.',
    why: 'The panel already has an edge, a surface and a shadow, which is everything a card would '
      + 'add. None of the design systems read for #272 nests cards in a drawer. The Finance '
      + 'portal\'s transaction drawer, reported there, shows what happens when a page does: three '
      + 'bordered cards stacked in a bordered panel.',
    kit: [
      { ref: 'src/components/drawer.js:86', pattern: 'export function drawerSection(' },
      { ref: 'src/styles/drawer.css:180', pattern: '.ui-drawer__section + .ui-drawer__section' },
    ],
  },
  {
    id: 'no-lines',
    imperative: 'Draw no line inside the panel. Its edge is the only one.',
    why: 'Not under the header, not over the footer, not between groups. The report in #272 was '
      + 'about the lines, and every one of them was a line inside the panel. Fluent and shadcn draw '
      + 'no header or footer rule; Primer draws its footer rule only when the body scrolls. The kit '
      + 'takes the quiet side: the header holds its place by spacing and weight, and a long body '
      + 'scrolls under it.',
    kit: [{ ref: 'src/styles/drawer.css:113', pattern: '.ui-drawer__header {' }],
  },
  {
    id: 'rows',
    imperative: 'Set each value beside its label, and hold rows apart with space.',
    doHtml: () => frame(drawerSection({ rows: DETAIL })),
    dontHtml: () => frame(ruled(DETAIL)),
    doCaption: 'Each value sits beside its label. The eye moves a short way along one line, so '
      + 'nothing has to guide it.',
    dontCaption: 'Values pushed to the far edge, and a rule under every row to lead the eye back '
      + 'across. The rules are there to pay for the alignment.',
    // Written out as words: mono() reads ".UK" as a class selector.
    why: 'The UK government design system keeps a rule under every row of its summary list and '
      + 'warns against removing them, '
      + 'because people who zoom in lose the label on one side from the value on the other. That is '
      + 'a list set across a page. A drawer is at most 560px wide, and a value beside its label '
      + 'keeps the pair together at any zoom, so the rule is left with nothing to do.',
    except: 'Figures a reader compares down the panel, such as a list of amounts, are a table. Use '
      + 'table() and right-align them there.',
    kit: [
      { ref: 'src/components/drawer.js:89', pattern: '<dl class="ui-drawer__rows">' },
      { ref: 'src/styles/drawer.css:203', pattern: '.ui-drawer__row dt { color: var(--muted); }' },
    ],
  },
];
