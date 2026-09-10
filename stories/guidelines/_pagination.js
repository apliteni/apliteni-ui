// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { button } from '../../src/components/index.js';
import { skeleton } from '../../src/components/loading.js';
import { pagination, PAGE_SIZES, DEFAULT_PAGE_SIZE } from '../../src/components/pagination.js';

export const TITLE = 'Pagination';

export const BLURB = 'What a pager owes a reader on a table too long to show at once.';

// The specimens are pagers, and a pager is a strip rather than a box — so the
// stage here is only a surface to sit them on. Two things it does have to do:
// hold the two halves of a pair at the same width, so a difference in control
// count reads as a difference rather than as a different size of picture, and
// leave the wrapping alone. --panel-md is 420px and every specimen below wraps
// at it, which is the width a pager meets inside a card on a laptop.
export const SPEC_CSS = `
  <style>
    .gp-stage { background: var(--surface); border-radius: var(--radius-lg);
      box-shadow: inset 0 0 0 1px var(--border); padding: var(--space-4) var(--space-5); }
    /* The hand-built don'ts below are rows of kit buttons, so they need the one
       thing .ui-pager would have given them: a row. Nothing else is styled — what
       is wrong with them is what they leave out, and a don't dressed differently
       from its do would read as a styling argument. */
    .gp-hand { display: flex; flex-wrap: wrap; align-items: center;
      gap: var(--space-3) var(--space-4); font-size: var(--text-sm); }
    .gp-hand__status { margin: 0 auto 0 0; color: var(--muted);
      font-variant-numeric: tabular-nums; }
    .gp-hand__steps { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1); }
  </style>`;

// One result set, seen from one position, so every specimen on the page is the
// same 4,812 rows at the kit's default page size. A reader comparing two
// pictures should be comparing the pagers.
const TOTAL = 4812;
const AT = 25;

const stage = (html) => `<div class="gp-stage">${html}</div>`;

// Every specimen is its own <nav> on one page, so each needs an id of its own
// and a name of its own: two <label for> pointing at one id is a real defect,
// and the a11y gate walks this page in both themes.
const pager = (id, opts) => stage(pagination({
  id,
  label: `${id} example`,
  page: AT,
  pageSize: DEFAULT_PAGE_SIZE,
  total: TOTAL,
  ...opts,
}));

// The don'ts are rows of real kit buttons, assembled by hand — which is the
// fault they are specimens of. Nothing here is broken markup; what is wrong is
// that a page built its own pager out of parts instead of asking for one.
const hand = (status, steps) => stage(
  `<div class="gp-hand">`
  + (status ? `<p class="gp-hand__status">${status}</p>` : '')
  + `<div class="gp-hand__steps">${steps}</div></div>`,
);
const ghost = (label, opts = {}) => button({ label, variant: 'ghost', size: 'sm', ...opts });

export const RULES = [
  {
    id: 'counted-total',
    imperative: 'Give the pager the number the server counted.',
    doHtml: () => pager('counted-do'),
    dontHtml: () => pager('counted-dont', { total: null, hasMore: true }),
    doCaption: 'The range in rows, and the size of the whole result. Rows are what the reader '
      + 'came for; pages are an artefact of how they were fetched.',
    dontCaption: 'The same table, told nothing. This shape is right for an API that cannot count '
      + 'what it has not fetched — and wrong here, where a COUNT(*) had already run and its '
      + 'answer was thrown away on the way to the component.',
    why: 'A pager knows only what it is handed. The finance portal\'s transactions drill pays for '
      + 'a real count over the same conditions as the page query, which is what lets it say '
      + '"1–100 of 4,812" and offer the end; its invoices list fetches one row past the page and '
      + 'infers has-more, so it never knows. Both are correct, and they are not defaults for one '
      + 'another — a single helper that unified them would silently add a count to the second or '
      + 'take the total off the first.',
    kit: [{ ref: 'src/components/pagination.js:137', pattern: 'const counted = total' }],
  },
  {
    id: 'the-jump',
    imperative: 'Choose the jump your readers make.',
    doHtml: () => pager('jump-do'),
    dontHtml: () => pager('jump-dont', { variant: 'numbered' }),
    doCaption: 'Four controls, in the same place on every page. The two positions a ledger reader '
      + 'asks for are the start and the end, and both are one press away.',
    dontCaption: 'Page 25 of 49, and the only pages reachable in one press are 1, 24, 26 and 49. '
      + 'A row of numbers looks like it jumps anywhere and reaches four; it also changes '
      + 'width as the reader moves, so Next is somewhere different each time.',
    why: 'Steps is the default because these tables are read by filtering and sorting rather than '
      + 'by hopping — the consumer had already written the reason down: "Forty-nine numbered links '
      + 'is a control nobody uses on a table that is read by filtering, and it is forty-nine more '
      + 'tab stops between the rows and the footer." Numbered and jump both ship; a surface whose '
      + 'readers do go deep takes the jump variant, the only one of the three that reaches '
      + 'page 30 in one move.',
    except: 'A short list somebody browses rather than searches — a changelog, a gallery — is the '
      + 'case numbered pages were invented for, and there the width is stable because the count is '
      + 'small.',
    kit: [{ ref: 'src/components/pagination.js:90', pattern: 'function slotsFor' }],
  },
  {
    id: 'ends-disable',
    imperative: 'Disable a control at an end. Never remove it.',
    doHtml: () => pager('ends-do', { page: 1 }),
    // Only Prev is missing, and that is the whole specimen: four controls against
    // three, so the reader is comparing one absence rather than a shorter strip.
    // Dropping First and Last as well would make the pair differ on control COUNT,
    // which is the confound the stage note above exists to prevent.
    dontHtml: () => hand(
      '1–100 of 4,812',
      ghost('First')
      + ghost('Next', { iconRight: 'chevronRight' })
      + ghost('Last'),
    ),
    doCaption: 'The first page. First and Prev are still there, still in the same place, and a '
      + 'screen reader still meets them and reports them as unavailable. Tab passes over them: '
      + 'native disabled takes a control out of the sequence, which is the trade for the state '
      + 'being real rather than announced.',
    dontCaption: 'The same first page with Prev alone taken out of the DOM. Next and Last have '
      + 'each slid one place left, under a pointer already travelling toward one of them.',
    why: 'Polaris states the rule as "Hint when merchants are at the first or the last page by '
      + 'disabling the corresponding button". Removal costs twice: the controls beside it move, '
      + 'and a reader who cannot see the strip loses the only evidence that they are at the start. '
      + 'Four of the six pagers in the finance portal remove; a fifth swaps the control for a '
      + 'muted span, which reads as available and does nothing.',
    kit: [{ ref: 'src/components/pagination.js:78', pattern: 'disabled aria-disabled' }],
  },
  {
    id: 'one-page',
    imperative: 'Draw no steps for a table that has one page.',
    doHtml: () => stage(pagination({
      id: 'single-do', label: 'Rows per page', page: 1, pageSize: DEFAULT_PAGE_SIZE,
      total: 12, pageSizes: PAGE_SIZES,
    })),
    dontHtml: () => hand(
      'Page 1 of 1 · 12 rows',
      ghost('Prev', { icon: 'chevronLeft', disabled: true })
      + ghost('Next', { iconRight: 'chevronRight', disabled: true }),
    ),
    doCaption: 'Twelve rows, and the only control left with a job is the page size. Offered no '
      + 'sizes either, the component renders nothing at all.',
    dontCaption: 'A sentence that is true and tells the reader nothing, over two buttons that can '
      + 'never do anything. This was the kit\'s own output on every table shorter than a page.',
    // "GOV.UK" is written out as words on purpose: mono() reads a dot followed by a word as
    // a class selector, so the literal spelling renders as GOV<code>.UK</code>.
    why: 'The UK government design system puts it in one line: "Do not show pagination if '
      + 'there\'s only one page of content." The kit used to render its pager unconditionally '
      + '— no branch on the page count '
      + 'and no way to turn it off. So every admin and My Space table in one portal carried two '
      + 'dead buttons, '
      + 'and the two surfaces where the sentence was also false hid the whole strip in CSS rather '
      + 'than argue with it.',
    kit: [{ ref: 'src/components/pagination.js:162', pattern: 'if (single && !sizes.length)' }],
  },
  {
    id: 'page-turn',
    imperative: 'Keep the numbers legible while the next page loads.',
    doHtml: () => pager('loading-do', { pageSizes: PAGE_SIZES, loading: true }),
    dontHtml: () => stage(skeleton({ lines: 1, width: '38%' })),
    doCaption: 'Every control off, the strip marked busy, and the range still readable — it is '
      + 'the number the reader is waiting on.',
    dontCaption: 'The pager replaced by a placeholder. The strip loses its height, everything '
      + 'under it jumps, and the button the reader was about to press again has moved.',
    why: 'Not one of the thirteen design systems surveyed for this page says anything about where '
      + 'the controls are during a page turn — the nearest anyone gets is a spinner drawn over the '
      + 'rows. A page turn is the one moment a reader is certain to be reaching for the same '
      + 'control twice, so it is the one moment the control must not travel. The rows above hold '
      + 'their height for the same reason.',
    kit: [{ ref: 'src/components/pagination.js:231', pattern: "loading ? ' aria-busy" }],
  },
  {
    id: 'announce-range',
    imperative: 'Announce the range. Announce nothing else.',
    why: 'A page turn replaces every row without moving focus, so a reader who cannot see the '
      + 'table has no way to know it happened. WCAG 2.2 draws the line exactly here: the new rows '
      + 'are not a status message, and "1–100 of 4,812" is. So the range is a polite live region '
      + 'and it announces as a whole — the pager, the size control and four buttons all '
      + 'announcing would read one change out four times. Two of the thirteen systems surveyed '
      + 'carry any live region at all, and one of those only fires if the caller supplies the '
      + 'text. There is nothing to photograph here, which is why this rule has no pair.',
    except: 'Moving focus into the new rows instead is the other defensible answer, and the only '
      + 'one Primer documents. The kit leaves focus on the control that was pressed so a reader '
      + 'can press it again — except at an end, where that control becomes disabled and the '
      + 'browser drops focus to the body. The pager then puts focus on the step that still has '
      + 'somewhere to go, which is the nearest thing to standing still.',
    kit: [{ ref: 'src/components/pagination.js:232', pattern: 'aria-live="polite"' }],
  },
  {
    id: 'page-size',
    imperative: 'Offer the page size. Leave remembering it to the consumer.',
    doHtml: () => pager('size-do', { pageSizes: PAGE_SIZES }),
    dontHtml: () => pager('size-dont'),
    doCaption: 'Rows per page, from the kit\'s scale, sitting between the count and the steps so '
      + 'the steps stay where the reader last left them.',
    dontCaption: 'A ledger of 4,812 rows with the page size fixed at whatever the developer typed. '
      + 'The reader who wants to see more scrolls, or pages, and has no third option.',
    why: 'The sizes are named once in the kit — 25, 50 and 100, starting at 100 — so no call site '
      + 'writes the numbers and the scale moves in one place. Which of them a table offers is the '
      + 'consumer\'s call, and so is remembering the one a reader picked: it belongs with the URL '
      + 'or the profile that already survives a reload, not in a component that is rebuilt on '
      + 'every render. Nielsen Norman called persistence the most important detail of a pager in '
      + '2013 and no design system surveyed has shipped it since.',
    kit: [
      { ref: 'src/components/pagination.js:18', pattern: 'export const PAGE_SIZES' },
      { ref: 'src/components/pagination.js:19', pattern: 'export const DEFAULT_PAGE_SIZE' },
    ],
  },
];
