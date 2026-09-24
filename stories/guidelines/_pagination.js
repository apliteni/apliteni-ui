import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('pagination.md', new URL('../../guidelines/pagination.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { button } from '../../src/components/index.js';
import { skeleton } from '../../src/components/loading.js';
import { pagination, PAGE_SIZES, DEFAULT_PAGE_SIZE } from '../../src/components/pagination.js';

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
    .gp-hand__status { margin: 0 auto 0 0; color: var(--text);
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

export const RULES = withSpecimens(content.rules, [
{ id: 'counted-total', doHtml: () => pager('counted-do'), dontHtml: () => pager('counted-dont', { total: null, hasMore: true }) },
{ id: 'the-jump', doHtml: () => pager('jump-do'), dontHtml: () => pager('jump-dont', { variant: 'numbered' }) },
{ id: 'ends-disable', doHtml: () => pager('ends-do', { page: 1 }), dontHtml: () => hand(
      '1–100 of 4,812',
      ghost('First')
      + ghost('Next', { iconRight: 'chevronRight' })
      + ghost('Last'),
    ) },
{ id: 'one-page', doHtml: () => stage(pagination({
      id: 'single-do', label: 'Rows per page', page: 1, pageSize: DEFAULT_PAGE_SIZE,
      total: 12, pageSizes: PAGE_SIZES,
    })), dontHtml: () => hand(
      'Page 1 of 1 · 12 rows',
      ghost('Prev', { icon: 'chevronLeft', disabled: true })
      + ghost('Next', { iconRight: 'chevronRight', disabled: true }),
    ) },
{ id: 'page-turn', doHtml: () => pager('loading-do', { pageSizes: PAGE_SIZES, loading: true }), dontHtml: () => stage(skeleton({ lines: 1, width: '38%' })) },
{ id: 'announce-range' },
{ id: 'page-size', doHtml: () => pager('size-do', { pageSizes: PAGE_SIZES }), dontHtml: () => pager('size-dont') }
]);
