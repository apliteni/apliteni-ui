// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { card, button, badge } from '../../src/components/index.js';

export const TITLE = 'The page';

export const BLURB = 'What one screen may hold: the head it keeps, the single action it leads with, '
  + 'and how much may stack before it is two pages.';

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


// The rules a designer decides, in the order a page is read: the head, its
// title, the outline under it, the action it leads with, how much stacks, what
// is over it at load, how tight the rows run, and the line under the title.
//
// Each is one sentence, one picture where a picture says it better, and one
// line of why. What the kit does about each of them — the line that holds it
// and the gate that walks it — is docs/specification.md#the-page, so the page
// stays readable by whoever is drawing the screen rather than building it.
export const RULES = [
  {
    id: 'head',
    imperative: 'Start the page with the way back, then the title, then the line under it. Nothing else goes above the title.',
    why: 'A toolbar above the title makes the title the second thing on the screen; filters, a '
      + 'period switch and a band of figures go under it instead.',
    kit: [{ ref: 'src/components/shell.js:182', pattern: 'crumbs.length ? breadcrumbs' }],
  },
  {
    id: 'one-h1',
    imperative: 'Give the page one title, and only one.',
    why: 'Two titles read as two pages to anyone moving by heading, and none at all leaves them '
      + 'nowhere to land — which is what the screen after granting an agent access did.',
    kit: [{ ref: 'stories/guidelines/_labels-and-titles.js:65', pattern: 'one level under the page title' }],
  },
  {
    id: 'outline',
    imperative: `Step the headings down one level at a time, and stop ${said(LIMITS.outline)} levels deep: the page, a section, a group inside it.`,
    why: 'A skipped level reads as content the reader has missed, and a fourth is a page that has '
      + 'become two.',
    doCaption: 'Page, section, group — down one at a time. Written out: these are labels, not headings.',
    dontCaption: 'Two pages in one, then a jump from the first level to the third, then a level nothing on the page reads at.',
    doHtml: outlineDo,
    dontHtml: outlineDont,
    kit: [{ ref: 'src/styles/layout.css:136', pattern: 'rank: page-title' }],
  },
  {
    id: 'one-primary',
    imperative: `Lead with ${said(LIMITS.primary)} filled button. Everything else on the page is quieter than it.`,
    why: 'Three filled buttons rank nothing: the eye reads all three to find the one the page is '
      + 'for.',
    doCaption: 'One filled button, and the other two ranked under it.',
    dontCaption: 'Three filled buttons. Nothing here says which one the page is for.',
    doHtml: primaryDo,
    dontHtml: primaryDont,
    kit: [{ ref: 'src/styles/button.css:43', pattern: '.ui-btn--primary' }],
  },
  {
    id: 'stacking',
    imperative: `Stack ${said(LIMITS.cards)} cards at most, and never put a card inside a card.`,
    why: 'A page of twelve cards has grouped nothing — the reader scrolls past eleven to reach the '
      + `one they came for. Past ${said(LIMITS.cards)} the page wants sections, tabs, or a second page.`,
    doCaption: `One block a card: ${said(LIMITS.cards)} of them, at the limit and still one page.`,
    dontCaption: 'Twelve, drawn at the same scale as the six beside it.',
    doHtml: stackDo,
    dontHtml: stackDont,
    kit: [{ ref: 'src/styles/card.css:7', pattern: '.ui-card {' }],
  },
  {
    id: 'at-rest',
    imperative: 'Let the page arrive at rest. Nothing covers it until the reader asks.',
    why: 'Anything drawn over the page at load talks over the reader before they have read the '
      + 'title, and takes the keyboard with it.',
    kit: [{ ref: 'src/components/drawer.js:62', pattern: "(open || specimen) && 'is-open'" }],
  },
  {
    id: 'density',
    imperative: 'Pick one row height for the page: every table on it runs tight, or none of them does.',
    why: 'Two tables at two row heights on one screen read as two products, and the wider one is '
      + 'the one that decides.',
    doCaption: 'Both ledgers tight. One rhythm down the page.',
    dontCaption: 'Tight above, roomy below. The same four columns, at two row heights.',
    doHtml: densityDo,
    dontHtml: densityDont,
    kit: [{ ref: 'src/styles/table.css:58', pattern: 'padding: var(--space-2) var(--space-3)' }],
  },
  {
    id: 'lede',
    imperative: `Say what the page is for in ${said(LIMITS.lede)} sentences at most, and never spend one of them on the title.`,
    why: '"Payouts — this is the payouts page" tells a reader what they have just read; the line '
      + 'is for what the title cannot say.',
    kit: [{ ref: 'src/components/shell.js:184', pattern: 'ui-app__sub' }],
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
