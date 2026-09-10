// Pagination — the position sentence and the control, as HTML strings.
//
// The indicator is a ROW RANGE, not a page number: `1–100 of 4,812`. A page
// number answers which slice you are on; a range answers how much there is,
// which is what a reader of a ledger asks.
//
// A total is a capability, not a given. An overshoot pager (`LIMIT n+1`) knows
// only whether another row exists, so it says `1–100 of more than 100` — except
// on the last page, where the total IS knowable and we state it exactly.
//
// The factory owns no state and no behaviour. Pass `href` and every control is a
// real link that works with no JavaScript at all; omit it and every control is a
// real button the consumer wires. Never one faked with the other: a button fires
// on Enter and Space, a link on Enter alone.
import { esc } from './index.js';
import { icon } from '../assets/icons.js';

const cx = (...a) => a.filter(Boolean).join(' ');
const group = (n) => Number(n).toLocaleString('en-US');

// The sentence on its own, without the control around it. Exported because the
// guidelines page and the React wrapper both need it; two implementations of one
// sentence is how they drift apart.
export function pagerRange({ page, perPage, total, hasMore, rowsOnPage } = {}) {
  const from = (page - 1) * perPage + 1;
  if (total != null) {
    if (total === 0) return '0 of 0';
    return `${group(from)}–${group(Math.min(page * perPage, total))} of ${group(total)}`;
  }
  const to = from + rowsOnPage - 1;
  if (to < from) return '0 of 0';
  // `hasMore` is the only thing the query paid for. Without it there is no last
  // page to recognise, so the range would silently claim a total it never had.
  return hasMore ? `${group(from)}–${group(to)} of more than ${group(to)}` : `${group(from)}–${group(to)} of ${group(to)}`;
}

const TIERS = ['compact', 'advanced', 'numbered'];

/**
 * Primer's truncation: the first and last page are always reachable, ±2 around
 * the page you are on, and `'gap'` for what is left out — unless the gap is a
 * single page, where the number costs the same width as the ellipsis and hides
 * nothing.
 */
function pageWindow(page, pages, radius = 2) {
  const keep = new Set([1, pages]);
  for (let p = page - radius; p <= page + radius; p += 1) if (p >= 1 && p <= pages) keep.add(p);
  const out = [];
  let prev = 0;
  for (const p of [...keep].sort((a, b) => a - b)) {
    if (prev && p - prev === 2) out.push(prev + 1);
    else if (prev && p - prev > 2) out.push('gap');
    out.push(p);
    prev = p;
  }
  return out;
}

/**
 * One control. A control with nowhere to go is a disabled <button> in BOTH
 * modes: there is no URL for a page that does not exist, and `aria-disabled` on
 * an anchor is a promise the browser does not keep — it stays clickable.
 */
function control({ to, ariaLabel, body, href, disabled, current, extra }) {
  const cls = cx('ui-pager__btn', extra, current && 'is-current');
  const attrs = ` aria-label="${esc(ariaLabel)}"${current ? ' aria-current="page"' : ''} data-page="${to}"`;
  if (disabled) return `<button type="button" class="${cls}" disabled aria-disabled="true"${attrs}>${body}</button>`;
  return href
    ? `<a href="${esc(href(to))}" class="${cls}"${attrs}>${body}</a>`
    : `<button type="button" class="${cls}"${attrs}>${body}</button>`;
}

export function pager({
  page,
  perPage,
  total,
  hasMore,
  rowsOnPage,
  tier = 'compact',
  perPageOptions = [10, 25, 50, 100],
  href,
  label = 'Pagination',
  busy = false,
} = {}) {
  if (!TIERS.includes(tier)) throw new Error(`pager: unknown tier "${tier}" — expected ${TIERS.join(', ')}.`);
  const known = total != null;
  if (!known && (hasMore == null || rowsOnPage == null)) {
    throw new Error('pager: an unknown total needs hasMore and rowsOnPage — without them the range has to invent one.');
  }
  // Degrading to a different tier is how a component starts lying: there is no
  // last page to draw, so say so rather than draw a plausible one.
  if (!known && tier === 'numbered') {
    throw new Error('pager: the numbered tier requires a total — an unknown total has no last page to draw.');
  }

  const pages = known ? Math.max(1, Math.ceil(total / perPage)) : null;
  const rows = known ? total : (page - 1) * perPage + rowsOnPage;
  // The empty state belongs to the table, and one page needs no way off it —
  // except in `advanced`, where the rows-per-page control is the reason to stay.
  if (rows === 0) return '';
  const single = known ? pages === 1 : page === 1 && !hasMore;
  if (single && tier !== 'advanced') return '';

  const atFirst = page <= 1;
  const atLast = known ? page >= pages : !hasMore;
  const ctl = (o) => control({ ...o, href, disabled: busy || o.disabled });

  const first = ctl({ to: 1, ariaLabel: 'Go to first page', body: '<span>First</span>', disabled: atFirst });
  const prev = ctl({
    to: Math.max(1, page - 1),
    ariaLabel: 'Go to previous page',
    body: `${icon('chevronLeft')}<span>Previous</span>`,
    disabled: atFirst,
  });
  const next = ctl({
    to: page + 1,
    ariaLabel: 'Go to next page',
    body: `<span>Next</span>${icon('chevronRight')}`,
    disabled: atLast,
  });
  // No last page without a total, so the control is absent rather than dead.
  const last = known
    ? ctl({ to: pages, ariaLabel: 'Go to last page', body: '<span>Last</span>', disabled: atLast })
    : '';

  const numbers = tier === 'numbered'
    ? pageWindow(page, pages).map((p) => (p === 'gap'
      ? '<span class="ui-pager__gap" aria-hidden="true">…</span>'
      : ctl({
        to: p,
        ariaLabel: p === page ? `Page ${group(p)}` : `Go to page ${group(p)}`,
        body: `<span>${group(p)}</span>`,
        current: p === page,
        extra: 'ui-pager__page',
      }))).join('')
    : '';

  // Announcing the new range belongs to button mode alone. In link mode the
  // document reloads, and a live region announced on top of that reads twice.
  const live = href ? '' : ' aria-live="polite" aria-atomic="true"';
  const range = `<span class="ui-pager__range"${live}>${esc(pagerRange({ page, perPage, total, hasMore, rowsOnPage }))}</span>`;

  let size = '';
  let jump = '';
  if (tier === 'advanced') {
    // A page size the caller is actually on but never offered is still the truth
    // about the table, so it joins the list rather than reading as unselected.
    const options = [...new Set([...perPageOptions, perPage])].sort((a, b) => a - b);
    size = '<label class="ui-pager__size"><span class="ui-pager__label">Rows per page</span>'
      + `<select class="ui-select ui-pager__select" data-pager-per-page${busy ? ' disabled' : ''}>`
      + options.map((o) => `<option value="${o}"${o === perPage ? ' selected' : ''}>${group(o)}</option>`).join('')
      + '</select></label>';
    // A <select> over 49 pages is a select nobody wants; a number field with a
    // max is the same jump in one keystroke, and it commits on Enter for free.
    jump = '<label class="ui-pager__jump"><span class="ui-pager__label">Go to page</span>'
      + '<input class="ui-input ui-pager__input" type="number" inputmode="numeric" min="1"'
      + `${known ? ` max="${pages}"` : ''} value="${page}" data-pager-jump${busy ? ' disabled' : ''}></label>`;
  }

  const controls = tier === 'advanced' ? `${first}${prev}${next}${last}`
    : tier === 'numbered' ? `${prev}${numbers}${next}`
      : `${prev}${next}`;

  return `<nav class="ui-pager ui-pager--${tier}" aria-label="${esc(label)}"${busy ? ' aria-busy="true"' : ''}>`
    + `${size}${range}${jump}<div class="ui-pager__controls">${controls}</div></nav>`;
}
