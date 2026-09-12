// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { card, button, badge } from '../../src/components/index.js';

export const TITLE = 'The page';

export const BLURB = 'What one screen may hold: the head it keeps, the single action it leads with, '
  + 'and how much may stack before it is two pages.';

// The limits three rules are stated in. They are here rather than in the prose
// because stories/guidelines/the-page.test.js measures the kit's own screens
// against these names — a number edited in the sentence and not in the gate is
// the drift this whole collection exists to stop.
export const LIMITS = { cards: 6, outline: 3, primary: 1, lede: 2 };

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
  ['1163', '2026-06-29', '14,490.70', 'Paid'],
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

export const RULES = [
  {
    id: 'shell',
    imperative: 'Compose an application page with appShell(). A screen that builds its own chrome is where a portal starts disagreeing with itself.',
    why: 'The shell owns the rail, the trail, the column and the head, so every screen that takes it '
      + 'agrees about them without anybody checking. The portal that rebuilt the chrome per screen '
      + 'is the one that ended up with a trail saying Home on a page whose sidebar said Company, and '
      + 'four local rules correcting a column the kit already sets.',
    except: 'Two page kinds are not the shell\'s: an auth card, which has no rail to sit beside, and '
      + 'a marketing page, which is not a screen of an application. The head, the lede and the card '
      + 'count are about what the shell draws and stop there; the h1, the outline, the landmarks, '
      + 'the density and the rest hold on all three — and the primary count holds on every page but '
      + 'a marketing one.',
    kit: [
      { ref: 'src/components/shell.js:140', pattern: 'export function appShell' },
      { ref: 'stories/apps/_finance-nav.js:24', pattern: 'export const financeShell' },
    ],
  },
  {
    id: 'head',
    imperative: 'Keep the page head in one order — the way back, the title, the lede, the body — and put nothing above the title but the way back.',
    why: 'A filter row or a toolbar above the title makes the title the second thing on the screen, '
      + 'and a reader who arrives from a link then has to look for what page they are on. The shell '
      + 'writes this order and the caller fills the slots; a body that opens with its own heading bar '
      + 'is drawing a second head under the first.',
    except: 'A stat band, a period switch, a filter or a search box belongs at the top of the body, '
      + 'under the lede — first thing inside, not above the title. What may go in the band is on '
      + 'Stat bands.',
    kit: [
      { ref: 'src/components/shell.js:182', pattern: 'crumbs.length ? breadcrumbs' },
      { ref: 'stories/guidelines/_going-back.js:86', pattern: 'Draw a trail or a back link, never both' },
      { ref: 'stories/guidelines/_stat-bands.js:24', pattern: 'Put key figures in a stat band' },
    ],
  },
  {
    id: 'one-h1',
    imperative: 'One page, one h1, and it is the page title.',
    why: 'A second h1 splits one screen into two documents for anyone moving by heading, and none at '
      + 'all leaves the screen with no name to move to. The kit had the second fault: the consent '
      + 'screen said "Access granted" in a div, so the page a reader landed on after granting an '
      + 'agent access had no heading in it anywhere.',
    kit: [
      { ref: 'src/components/index.js:63', pattern: 'const h = [2, 3, 4, 5, 6]' },
      { ref: 'stories/guidelines/_labels-and-titles.js:65', pattern: 'one level under the page title' },
    ],
  },
  {
    id: 'outline',
    imperative: `Take the outline down one level at a time, and stop at h${LIMITS.outline}.`,
    why: 'h1 is the page, h2 a card or a section of it, h3 a group inside one. A fourth rank is a '
      + 'page that has become two, and a skipped rank is a level a reader hears missing. The scale '
      + 'has two title ranks, not three: an h3 inside a card takes the card title\'s look through '
      + 'card({ level: 3 }), so a rank past h3 adds a level to the outline with no size of its own '
      + 'to show it.',
    doCaption: 'Page, section, group — down one at a time. Written out: these are labels, not headings.',
    dontCaption: 'Two pages in one, then a jump from h1 to h3, then a rank nothing on the page reads at.',
    doHtml: outlineDo,
    dontHtml: outlineDont,
    kit: [
      { ref: 'src/styles/layout.css:136', pattern: 'rank: page-title' },
      { ref: 'src/styles/card.css:64', pattern: 'rank: card-title' },
    ],
  },
  {
    id: 'one-primary',
    imperative: 'Lead with one primary action at most. Everything else on the page is secondary, tertiary, or a link.',
    why: 'Three filled buttons rank nothing: the eye has to read all three to find the one the page '
      + 'is for. Of the twelve design systems read for this page, Carbon is the only one that writes '
      + 'the number down — "each page should have only one primary button" — and it exempts the same '
      + 'places this rule does, because a control that is not on the page cannot compete with one '
      + 'that is.',
    except: 'An overlay carries its own primary — a confirm, a drawer footer, a dialog — and it does '
      + 'not count against the page. Neither does a marketing page, which repeats its call to action '
      + 'down the page on purpose; Apps / Landing Page is the one screen here in that position.',
    doCaption: 'One filled button, and the other two ranked under it.',
    dontCaption: 'Three filled buttons. Nothing here says which one the page is for.',
    doHtml: primaryDo,
    dontHtml: primaryDont,
    kit: [
      { ref: 'src/styles/button.css:43', pattern: '.ui-btn--primary' },
      { ref: 'stories/guidelines/_destructive-actions.js:89', pattern: 'Name what each button does' },
    ],
  },
  {
    id: 'stacking',
    imperative: `Stack at most ${LIMITS.cards} cards, and never put a card inside a card.`,
    why: 'A card groups what belongs together, so a page of twelve has grouped nothing — it is a list '
      + 'of lists, and the reader scrolls past eleven to reach the one they came for. Past six the '
      + 'page wants sections, tabs, or a second page. A card inside a card draws two borders around '
      + 'one thing and says the inner one is a smaller kind of group, which the kit has no rank for.',
    except: 'A card is the frame the empty and denied states are drawn in, and those screens hold '
      + 'one. A stat band is one thing on the page whatever its layout draws — the tiles layout paints a '
      + 'card per figure, and four figures are still one band.',
    doCaption: `One block a card: ${LIMITS.cards} of them, at the limit and still one page.`,
    dontCaption: 'Twelve, drawn at the same scale as the six beside it.',
    doHtml: stackDo,
    dontHtml: stackDont,
    kit: [
      { ref: 'src/styles/card.css:7', pattern: '.ui-card {' },
      { ref: 'stories/guidelines/_drawer.js:54', pattern: 'Never put a card inside one' },
    ],
  },
  {
    id: 'navs',
    imperative: 'Name every navigation landmark on the page, and never draw a second copy of one the shell already gives you.',
    why: 'A reader moving by landmark hears "navigation" once per region, so two unnamed ones are two '
      + 'identical doors. The shell draws the rail and the trail and names both, so a page that adds '
      + 'its own section menu beside the rail has put a third door next to them.',
    kit: [
      { ref: 'src/components/nav.js:167', pattern: 'ui-nav--crumbs' },
      { ref: 'stories/guidelines/_command-palette.js:213', pattern: 'hand focus back' },
    ],
  },
  {
    id: 'at-rest',
    imperative: 'Open a page at rest. Nothing overlays it until the reader asks.',
    why: 'A drawer, a confirm, a toast or a hover readout drawn at load is the page talking over the '
      + 'reader before they have read the title — and each of them takes the keyboard with it. What '
      + 'each may do once it is asked for is on Drawers, Hover readouts and The command palette; this '
      + 'rule is only about what is open when the page arrives. Mounting one closed is how they are '
      + 'meant to ship — the markup is on the page and nothing is over it.',
    except: 'A page that exists to ask — an OAuth consent, a confirmation a link lands on — asks in '
      + 'the page itself. It is the question rather than an overlay over one, so it keeps this rule '
      + 'rather than being excused from it.',
    kit: [
      { ref: 'stories/guidelines/_drawer.js:42', pattern: 'without leaving its list' },
      { ref: 'stories/guidelines/_hover-readouts.js:81', pattern: 'over the page, never in it' },
    ],
  },
  {
    id: 'density',
    imperative: 'One density per page: the spacing scale sets the rhythm, and a dense table is all of a page\'s tables or none of them.',
    why: 'Two tables at two densities on one screen read as two products. Density is a property of '
      + 'the data — a many-column ledger earns .ui-table--dense — so the page takes what its widest '
      + 'table needs and gives it to the rest. Layout and density is where the rhythm itself comes '
      + 'from; this rule is only that the page does not change its mind halfway down.',
    except: 'A table inside a drawer is beside the page, not on it, and takes the drawer\'s rhythm.',
    doCaption: 'Both ledgers dense. One rhythm down the page.',
    dontCaption: 'Dense above, roomy below. The same four columns, at two row heights.',
    doHtml: densityDo,
    dontHtml: densityDont,
    kit: [
      { ref: 'src/styles/table.css:58', pattern: 'padding: var(--space-2) var(--space-3)' },
      { ref: 'stories/guidelines/_layout-and-density.js:126', pattern: 'There is no kit-wide density mode' },
    ],
  },
  {
    id: 'lede',
    imperative: `Say what the page is for in ${LIMITS.lede} sentences at most, and never spend one of them on the title.`,
    why: '"Payouts — this is the payouts page" tells a reader what they already read. The lede is for '
      + 'what the title cannot say: what is counted, how far back, where the numbers come from. Three '
      + 'sentences is a paragraph, and a paragraph sits between the reader and what they came for.',
    kit: [
      { ref: 'src/components/shell.js:184', pattern: 'ui-app__sub' },
      { ref: 'stories/guidelines/_microcopy.js:67', pattern: 'a filter gets a nudge' },
    ],
  },
];
