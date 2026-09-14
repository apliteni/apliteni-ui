// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { card, button, badge } from '../../src/components/index.js';

export const TITLE = 'The page';

export const BLURB = 'What fits on one page: where readers start, which action leads, and when to split the content.';

export const REFERENCE_POLICY = 'specification-only';

// The four limits the rules are stated in. They are here rather than in the
// prose because stories/guidelines/the-page.test.js measures the kit's own
// screens against these names — a number edited in the sentence and not in the
// gate is the drift this whole collection exists to stop.
export const LIMITS = { cards: 6, outline: 3, primary: 1, lede: 2 };

// A limit is a number to the gate and a word to the reader. Spelling it here
// rather than typing the word into the sentence is what keeps the two the same.
const said = (n) => ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][n] ?? String(n);

// The outline uses labels for heading levels; the stack uses one block per card.
export const SPEC_CSS = `
  <style>
    .tp-out { display: flex; flex-direction: column; gap: var(--space-2); }
    .tp-out__row { display: flex; align-items: baseline; gap: var(--space-3);
      font: 400 13px/1.5 var(--font-sans); color: var(--text); }
    /* Rank chip. Longhands and no line-height, because the chip rank inherits
       one; the ink is the body's, like everything else on this page. */
    .tp-out__rank { font-family: var(--font-mono); font-size: var(--text-xs);
      font-weight: var(--weight-semibold); color: var(--text);
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

    /* One ink, and size carries the rank. Every text below is var(--text), and
       every size is a row of the table in docs/specification.md#labels-and-titles
       rather than a number of this page's own: 30, 18, 14.5, 13. The selectors
       belong to stories/guidelines/_layout.js, which draws sixteen other
       guideline pages, so they are restated here — after it — and only this page
       moves. The caption claims its rank in a note, which #310 taught the gate to
       read on a story; noting the three above it is that sweep's next step.
       why: #298, decided by Artur on 2026-09-13 */
    .gc > h1 { font-size: var(--text-2xl); font-weight: var(--weight-bold);
      line-height: 1.1; color: var(--text); }
    .gc-imperative { font-size: var(--text-lg); font-weight: var(--weight-semibold);
      line-height: var(--leading-snug); color: var(--text); }
    /* --prose-body, because the why is body size now; the shared sheet's
       --prose-dense is the step for prose set below 13px. The top margin is what
       one ink costs: the shared sheet leaves 0px under a caption, which ink used
       to separate and no longer does. --space-3 is the step the imperative gives
       on the other side of the figure and is larger than the --space-2 a cell
       gives its caption, so the caption's bond upward stays the tighter of the
       two; it collapses on a rule with no specimen pair.
       why: #298 — the caption's own rank arrived in #310 */
    .gc-why { font-size: var(--text-base); font-weight: var(--weight-normal);
      line-height: var(--leading-normal); color: var(--text);
      margin-block-start: var(--space-3);
      max-width: var(--prose-body); }
    /* The caption's own row, #310: 13px at the body's weight, so the smaller
       line under a specimen stops reading as the bolder of the two. Not the
       label's --muted ink either — one ink on this page. The leading is written
       out because the rank inherits one and the shared sheet's shorthand pinned
       1.55: dropping the property here would leave that number standing. */
    .gc-cell__cap {
      /* rank: caption */
      font-size: var(--text-sm); font-weight: var(--weight-normal);
      line-height: inherit; color: var(--text); }
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
    why: 'Filters above the title ask readers to make choices before they know which page they are on.',
  },
  {
    id: 'one-h1',
    imperative: 'Give each page exactly one page title.',
    why: 'A missing page title leaves people navigating by headings nowhere to land, as the access confirmation screen once did.',
  },
  {
    id: 'outline',
    imperative: `Use headings in order, without skipping a level, and stop at h${LIMITS.outline}: page, section, then group.`,
    why: 'Skipping a level makes content seem missing; needing a fourth level is a reason to split the page.',
    doCaption: 'These are labels for heading levels, not headings on this page; each level belongs to the one above it.',
    dontCaption: 'A broken heading order leaves readers to guess which content belongs together.',
    doHtml: outlineDo,
    dontHtml: outlineDont,
  },
  {
    id: 'one-primary',
    imperative: `Use ${said(LIMITS.primary)} filled button for the main action and give other actions less emphasis.`,
    why: 'When several buttons stand out equally, readers have to work out which action matters most.',
    doCaption: 'Readers can start with Create token without first weighing it against Import agents and Export.',
    dontCaption: 'All three actions have equal emphasis, so the main action is unclear.',
    doHtml: primaryDo,
    dontHtml: primaryDont,
  },
  {
    id: 'stacking',
    imperative: `Stack no more than ${said(LIMITS.cards)} cards and keep cards out of other cards.`,
    why: 'A page of twelve cards makes readers scroll past eleven to reach the one they came for.',
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
    imperative: `Keep the introduction to ${said(LIMITS.lede)} sentence${LIMITS.lede === 1 ? '' : 's'} at most and add something the title does not say.`,
    why: 'An introduction such as “This is the payouts page” under “Payouts” spends the reader’s time telling them nothing new.',
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
