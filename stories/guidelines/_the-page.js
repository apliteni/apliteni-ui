// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { card, button, badge } from '../../src/components/index.js';

export const TITLE = 'The page';

export const BLURB = 'Arrange the page, make its main action clear, and keep its content manageable.';

export const REFERENCE_POLICY = 'specification-only';

// The four limits the rules are stated in. They are here rather than in the
// prose because stories/guidelines/the-page.test.js measures the kit's own
// screens against these names — a number edited in the sentence and not in the
// gate is the drift this whole collection exists to stop.
export const LIMITS = { cards: 6, outline: 3, primary: 1, lede: 2 };

// A limit is a number to the gate and a word to the reader. Spelling it here
// rather than typing the word into the sentence is what keeps the two the same.
const said = (n) => ['zero', 'one', 'two', 'three', 'four', 'five', 'six'][n] ?? String(n);

// The specimens. Two of them are drawn rather than photographed, and both say
// so in their caption: an outline is a shape a reader hears rather than sees,
// and twelve cards do not fit a 420px cell at life size.
export const SPEC_CSS = `
  <style>
    .tp-out { display: flex; flex-direction: column; gap: var(--space-2); }
    .tp-out__row { display: flex; align-items: baseline; gap: var(--space-3);
      font: 400 13px/1.5 var(--font-sans); color: var(--text); }
    .tp-out__rank { font: 500 11px/1.6 var(--font-mono); color: var(--muted);
      background: var(--surface-3); border-radius: var(--radius-xs); padding: 1px 6px; flex: none; }
    .tp-out__row--2 { padding-left: var(--space-4); }
    .tp-out__row--3 { padding-left: var(--space-8); }
    .tp-out__row--4 { padding-left: var(--space-10); }
    .tp-out__row--bad .tp-out__rank { color: var(--pink);
      background: color-mix(in srgb, var(--pink) 16%, transparent); }

    /* The stack specimens. Twelve cards do not fit a 420px cell at life size and
       a clipped column cannot be counted, so the count is what is drawn: one
       block per card, both columns at one scale. The caption says so. */
    .tp-stack { height: 224px; display: flex; flex-direction: column; gap: 6px; }
    .tp-card { height: 12px; border-radius: 4px; flex: none;
      background: var(--surface); box-shadow: inset 0 0 0 1px var(--border);
      display: flex; align-items: center; padding: 0 5px; }
    .tp-card::before { content: ""; height: 3px; width: 34%; border-radius: 2px;
      background: color-mix(in srgb, var(--muted) 55%, transparent); }
    .tp-stack--over .tp-card { background: var(--surface-2); }

    .tp-acts { display: flex; gap: var(--space-2); flex-wrap: wrap; }
    .tp-rows { display: flex; flex-direction: column; gap: var(--space-4); }
  </style>`;

const stage = (html) => `<div class="gl-stage">${html}</div>`;

// ---- the outline, written out -------------------------------------------

const outRow = (rank, text, bad) =>
  `<div class="tp-out__row tp-out__row--${rank}${bad ? ' tp-out__row--bad' : ''}">`
  + `<span class="tp-out__rank">h${rank}</span><span>${text}</span></div>`;

export const outlineDo = () => stage(`<div class="tp-out">
  ${outRow(1, 'Payouts')}
  ${outRow(2, 'Last 7 days')}
  ${outRow(2, 'Payouts')}
  ${outRow(3, 'Failed this week')}
</div>`);

export const outlineDont = () => stage(`<div class="tp-out">
  ${outRow(1, 'Payouts')}
  ${outRow(1, 'Last 7 days', true)}
  ${outRow(3, 'Payouts', true)}
  ${outRow(4, 'Failed this week', true)}
</div>`);

// ---- the one primary action ---------------------------------------------

const actions = (right) => `<div class="tp-acts">${right}</div>`;

export const primaryDo = () => stage(card({
  title: 'Your agents',
  sub: 'Three connected, one revoked.',
  body: actions(button({ label: 'Create token', variant: 'primary', icon: 'key' })
    + button({ label: 'Import agents', variant: 'secondary' })
    + button({ label: 'Export', variant: 'ghost' })),
}));

export const primaryDont = () => stage(card({
  title: 'Your agents',
  sub: 'Three connected, one revoked.',
  body: actions(button({ label: 'Create token', variant: 'primary', icon: 'key' })
    + button({ label: 'Import agents', variant: 'primary' })
    + button({ label: 'Export', variant: 'primary' })),
}));

// ---- how much may stack --------------------------------------------------

const stack = (n, over) => `<div class="tp-stack${over ? ' tp-stack--over' : ''}">${
  Array.from({ length: n }, () => '<div class="tp-card"></div>').join('')
}</div>`;

export const stackDo = () => stage(stack(LIMITS.cards));
export const stackDont = () => stage(stack(12, true));

// ---- one density per page ------------------------------------------------

const ROWS = [
  ['1162', '2026-06-30', '14,942.27', 'Paid'],
];

const miniTable = (dense) => `
  <table class="ui-table ui-table--zebra${dense ? ' ui-table--dense' : ''}">
    <thead><tr><th>ID</th><th>Arrival</th><th class="ui-table__num">Net</th><th>Status</th></tr></thead>
    <tbody>${ROWS.map(([id, arr, net, st]) => `<tr><td>${id}</td><td>${arr}</td>`
      + `<td class="ui-table__num">${net}</td><td>${badge(st, 'success')}</td></tr>`).join('')}</tbody>
  </table>`;

export const densityDo = () => stage(`<div class="tp-rows">
  ${card({ title: 'Payouts', body: miniTable(true) })}
  ${card({ title: 'Invoices', body: miniTable(true) })}
</div>`);

export const densityDont = () => stage(`<div class="tp-rows">
  ${card({ title: 'Payouts', body: miniTable(true) })}
  ${card({ title: 'Invoices', body: miniTable(false) })}
</div>`);

// The rules a designer decides, in the order a page is read. Each is one
// sentence, a picture where a picture says it better, and one line of why.
// Which line of the kit holds each of them is docs/specification.md#the-page.
export const RULES = [
  {
    id: 'head',
    imperative: 'Put the way back first, then the page title and a short introduction, with all other content below.',
    why: 'The title should come before filters, date controls and key figures so readers know where they are.',
  },
  {
    id: 'one-h1',
    imperative: 'Give each page exactly one page title.',
    why: 'People who navigate by headings need one clear starting point.',
  },
  {
    id: 'outline',
    imperative: `Use headings in order, without skipping a level, and stop at h${LIMITS.outline}: page, section, then group.`,
    why: 'Skipping a level makes content seem missing; needing a fourth level is a reason to split the page.',
    doCaption: 'The diagram shows the heading order: one page title, sections, then a group within a section.',
    dontCaption: 'The diagram shows two page titles, a skipped level and a fourth level that is too deep.',
    doHtml: outlineDo,
    dontHtml: outlineDont,
  },
  {
    id: 'one-primary',
    imperative: `Use ${said(LIMITS.primary)} filled button for the main action and give other actions less emphasis.`,
    why: 'When several buttons stand out equally, readers have to work out which action matters most.',
    doCaption: 'Create token stands out as the main action; Import agents and Export have less emphasis.',
    dontCaption: 'All three actions have equal emphasis, so the main action is unclear.',
    doHtml: primaryDo,
    dontHtml: primaryDont,
  },
  {
    id: 'stacking',
    imperative: `Stack no more than ${said(LIMITS.cards)} cards and keep cards out of other cards.`,
    why: `Beyond ${said(LIMITS.cards)} cards, use sections, tabs or another page to make content easier to find.`,
    doCaption: `Each block represents a card: ${said(LIMITS.cards)} cards reach the limit.`,
    dontCaption: 'Twelve cards exceed the limit; the blocks use the same scale in both examples.',
    doHtml: stackDo,
    dontHtml: stackDont,
  },
  {
    id: 'at-rest',
    imperative: 'Show the page with nothing covering it until the reader chooses to open something.',
    why: 'Opening something over the page on arrival interrupts reading and can move keyboard focus.',
  },
  {
    id: 'density',
    imperative: 'Use compact rows in every table on the page, or in none of them.',
    why: 'Consistent row heights make the tables feel part of the same page; choose the spacing the busiest table needs.',
    doCaption: 'Both tables use compact rows, keeping the spacing consistent.',
    dontCaption: 'The tables have the same four columns, but compact rows above and roomy rows below.',
    doHtml: densityDo,
    dontHtml: densityDont,
  },
  {
    id: 'lede',
    imperative: `Keep the introduction to ${said(LIMITS.lede)} sentences at most and add something the title does not say.`,
    why: 'An introduction should help readers understand the page, without making them read its title twice.',
  },
];

// Two limits the same gate walks that this page does not draw. They are not
// decisions anybody takes per screen — the kit has already taken them, and a
// designer looking at a mock cannot break either one — so they are stated in
// the contract, docs/specification.md#the-page, and the ids stay here because
// stories/guidelines/the-page.test.js keys one check to each.
export const GATED_ELSEWHERE = [
  { id: 'shell', states: 'An application page is the shell’s, and it draws one main region.' },
  { id: 'navs', states: 'Every navigation landmark is named, and no two on a page share a name.' },
];
