// Pagination — the strip under a table or a list, as an HTML string.
//
// It renders a page the CALLER computed. Rows never come in here: `page`,
// `pageSize` and `total` are numbers, so a page counted by a server and a page
// sliced out of an array in memory produce the same markup.
//
// `total: null` is the honest shape for an API that cannot count what it has not
// fetched. The component then knows no last page, so it draws Prev and Next and
// nothing else — see `ui-pager--open` below.
import { esc } from './index.js';

// The sizes a table offers, and the one it starts on. Named here so no call site
// writes either number: both moved once already and would have moved in thirteen
// files. MUI's DataGrid ships exactly this pair (default 100, options 25/50/100),
// AG Grid defaults to 100, and the finance portal's two data-heavy surfaces
// already page at 100. A 250 step was in the first draft of this component and
// no surveyed kit offers one, so it went rather than being invented.
export const PAGE_SIZES = [25, 50, 100];
export const DEFAULT_PAGE_SIZE = 100;

// The classes button({ variant: 'ghost', size: 'sm' }) emits, written out because
// button() takes no extra class and every control here needs one of its own for
// the React component to key on. src/components/pagination.test.js asserts the
// two agree, so a change to button()'s class list fails there instead of drifting.
const GHOST_SM = 'ui-btn ui-btn--ghost ui-btn--sm';

const VARIANTS = ['steps', 'numbered', 'jump'];
const cx = (...a) => a.filter(Boolean).join(' ');

// Every number here arrives from a URL in real use — `?page=-2`, `?page=abc`,
// `?page=` — so each is coerced before it is clamped, and nothing that is not a
// finite integer reaches the markup.
const int = (v, fallback) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : fallback;
};
const fmt = (n) => n.toLocaleString('en-US');

// A control at an end is DISABLED, never removed. Polaris states the rule as
// "Hint when merchants are at the first or the last page by disabling the
// corresponding button": removing it slides the next control sideways under a
// pointer already travelling toward it, and takes away the only evidence a
// screen-reader user has that they are at the start.
//
// An <a> has no disabled state, so an end that is off renders as
// <button disabled> even when `href` was given — a link that goes nowhere reads
// as available right up until it is followed.
function control({ cls, page, label, href, disabled = false, current = false }) {
  const attrs = `class="${cls}" data-page="${page}"${current ? ' aria-current="page"' : ''}`;
  return href && !disabled
    ? `<a href="${esc(href(page))}" ${attrs}>${esc(label)}</a>`
    : `<button type="button" ${attrs}${disabled ? ' disabled aria-disabled="true"' : ''}>${esc(label)}</button>`;
}

/**
 * The page numbers a `numbered` pager shows, with `null` where a run was cut.
 *
 * Seven slots at most: page 1, the last page, the current page with one
 * neighbour each side, and a gap for each run removed between them. Two rules
 * keep the strip honest — no two gaps side by side, and no gap standing in for a
 * single page, because an ellipsis hiding one number is wider than the number
 * and costs a click to find out what it was.
 */
function slotsFor(page, pageCount) {
  const wanted = [1, pageCount, page - 1, page, page + 1]
    .filter((n) => n >= 1 && n <= pageCount);
  const shown = [...new Set(wanted)].sort((a, b) => a - b);
  const out = [];
  for (const n of shown) {
    const prev = out.length ? out[out.length - 1] : null;
    if (prev != null) {
      if (n - prev === 2) out.push(prev + 1); // one page hidden — draw it, not a gap
      else if (n - prev > 2) out.push(null);
    }
    out.push(n);
  }
  return out;
}

/**
 * pagination({ … }) → the <nav> a caller drops under a table.
 *
 * A pager for a single page draws no steps: GOV.UK's guidance is "Do not show
 * pagination if there's only one page of content", and the kit was rendering
 * two permanently dead buttons under every short table. With no size control to
 * offer, such a pager has no job at all and returns the empty string; with one,
 * the <nav> stays for the size control alone — somebody looking at 25 of 25 rows
 * may still want 100 per page — and carries `ui-pager--single`.
 */
export function pagination({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  total = null,
  hasMore = false,
  pageSizes = null,
  variant = 'steps',
  label = 'Pagination',
  loading = false,
  href = null,
  id = 'pager',
} = {}) {
  const uid = esc(String(id ?? 'pager'));
  const kind = VARIANTS.includes(variant) ? variant : 'steps';
  const size = Math.max(1, int(pageSize, DEFAULT_PAGE_SIZE));
  // A total that is not a number is a total nobody knows — the open shape is the
  // truthful answer to it, and it is the same answer `total: null` asks for.
  const counted = total != null && Number.isFinite(Number(total));
  const rows = counted ? Math.max(0, int(total, 0)) : null;
  const last = counted ? Math.max(1, Math.ceil(rows / size)) : null;
  const at = counted
    ? Math.min(Math.max(1, int(page, 1)), last)
    : Math.max(1, int(page, 1));

  // The current size is offered even when the caller's list forgot it: a select
  // whose value is not among its options renders as the first one, which reports
  // a page size the table is not using.
  const offered = (Array.isArray(pageSizes) ? pageSizes : [])
    .map((s) => int(s, 0))
    .filter((s) => s > 0);
  const sizes = offered.length
    ? [...new Set([...offered, size])].sort((a, b) => a - b)
    : [];

  const single = counted && last === 1;
  if (single && !sizes.length) return '';

  const from = (at - 1) * size + 1;
  const to = counted ? Math.min(at * size, rows) : null;
  // Not "1–0 of 0" for an empty result, and not "7–7 of 7" for a single row:
  // both are arithmetic a reader has to undo.
  const status = !counted ? `Page ${fmt(at)}`
    : rows === 0 ? '0 of 0'
      : from === to ? `${fmt(from)} of ${fmt(rows)}`
        : `${fmt(from)}–${fmt(to)} of ${fmt(rows)}`;

  const sizeBlock = sizes.length
    ? `<div class="ui-pager__size">`
      + `<label class="ui-pager__size-label" for="${uid}-size">Rows</label>`
      + `<select class="ui-select ui-pager__size-select" id="${uid}-size"${loading ? ' disabled' : ''}>`
      + sizes.map((s) => `<option value="${s}"${s === size ? ' selected' : ''}>${fmt(s)}</option>`).join('')
      + `</select></div>`
    : '';

  const step = (spec) => control({ cls: `${GHOST_SM} ui-pager__step`, href, ...spec, disabled: loading || spec.disabled });
  const atStart = at === 1;
  const atEnd = counted && at === last;

  let steps = '';
  if (single) {
    steps = ''; // GOV.UK: no pagination for one page of content.
  } else if (!counted) {
    // The open shape: no last page exists, so no control may claim to reach one.
    // Next is off when the caller says there is nothing after this page.
    steps = `<div class="ui-pager__steps">`
      + step({ page: Math.max(1, at - 1), label: 'Prev', disabled: atStart })
      + step({ page: at + 1, label: 'Next', disabled: !hasMore })
      + `</div>`;
  } else {
    let middle = '';
    if (kind === 'numbered') {
      middle = slotsFor(at, last).map((n) => (n == null
        ? '<span class="ui-pager__gap" aria-hidden="true">…</span>'
        : control({
          cls: cx(`${GHOST_SM} ui-pager__page`, n === at && 'is-current'),
          href,
          page: n,
          label: fmt(n),
          current: n === at,
          disabled: loading,
        }))).join('');
    } else if (kind === 'jump') {
      middle = `<span class="ui-pager__jump"><label for="${uid}-jump">Page</label>`
        + `<input class="ui-input ui-pager__jump-input" id="${uid}-jump" type="number"`
        + ` min="1" max="${last}" value="${at}"${loading ? ' disabled' : ''}>`
        + `<span class="ui-pager__jump-of">of ${fmt(last)}</span></span>`;
    }
    // First and Last are the numbered variant's own job — its first and last
    // slots are always those two pages, so a second pair of controls for them
    // would be the same jump written twice.
    const ends = kind !== 'numbered';
    steps = `<div class="ui-pager__steps">`
      + (ends ? step({ page: 1, label: 'First', disabled: atStart }) : '')
      + step({ page: Math.max(1, at - 1), label: 'Prev', disabled: atStart })
      + middle
      + step({ page: Math.min(last, at + 1), label: 'Next', disabled: atEnd })
      + (ends ? step({ page: last, label: 'Last', disabled: atEnd }) : '')
      + `</div>`;
  }

  // The status line is the only live region in the component: a strip where the
  // numbers, the size control and four buttons all announced would read the same
  // change out four times.
  return `<nav class="${cx('ui-pager', `ui-pager--${kind}`, !counted && 'ui-pager--open', single && 'ui-pager--single')}"`
    + ` aria-label="${esc(label)}"${loading ? ' aria-busy="true"' : ''}>`
    + `<p class="ui-pager__status" aria-live="polite" aria-atomic="true">${esc(status)}</p>`
    + sizeBlock
    + steps
    + `</nav>`;
}
