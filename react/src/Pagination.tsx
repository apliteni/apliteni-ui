import {
  cloneElement, isValidElement, useEffect, useRef,
  type ReactElement, type ReactNode, type RefObject,
} from 'react';
import { pagerRange } from '@apliteni/apliteni-ui';
import { Icon } from './primitives/Icon';
// The SAME stylesheet the vanilla pager() draws against — not a copy. Imported
// the way react/src/index.ts imports reduced-motion.css, and for the same
// reason: a React consumer who takes only `apliteni-ui/react/css` still gets the
// skin, and there is exactly one place to change it.
import '../../src/styles/pagination.css';

export type PaginationTier = 'compact' | 'advanced' | 'numbered';

export type PaginationProps = {
  page: number;
  perPage: number;
  total?: number;
  hasMore?: boolean;
  rowsOnPage?: number;
  tier?: PaginationTier;
  perPageOptions?: number[];
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  /**
   * Link mode. The consumer returns the element — a router's `<Link>`, an `<a>`,
   * whatever they navigate with — and this component puts the classes, the ARIA
   * and the page number on it. The kit cannot pick a router; it can supply
   * everything around one.
   */
  renderLink?: (page: number, children: ReactNode) => ReactNode;
  /**
   * The rows this pager is about. After an in-place page change focus is moved
   * here, because the reader is otherwise left on a control below a table they
   * have not seen, and Tab from there walks out of the page rather than into it.
   * Link mode leaves it alone: the document reloaded and the browser has already
   * placed focus. why: stories/guidelines/_tables-at-scale.js `announce`
   */
  focusRef?: RefObject<HTMLElement | null>;
  busy?: boolean;
  label?: string;
};

const TIERS: PaginationTier[] = ['compact', 'advanced', 'numbered'];
// The kit's own figure grouping, and the reason the numbered tier's `1,024` and
// the range sentence's `4,812` read alike. why: src/components/pagination.js
const group = (n: number) => Number(n).toLocaleString('en-US');

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

/**
 * Primer's truncation, and the same window pager() draws: the first and last
 * page always reachable, ±2 around the page you are on, and `'gap'` for what is
 * left out — unless the gap is a single page, where the number costs the same
 * width as the ellipsis and hides nothing.
 * why: src/components/pagination.js `pageWindow`
 */
function pageWindow(page: number, pages: number, radius = 2): (number | 'gap')[] {
  const keep = new Set([1, pages]);
  for (let p = page - radius; p <= page + radius; p += 1) if (p >= 1 && p <= pages) keep.add(p);
  const out: (number | 'gap')[] = [];
  let prev = 0;
  for (const p of [...keep].sort((a, b) => a - b)) {
    if (prev && p - prev === 2) out.push(prev + 1);
    else if (prev && p - prev > 2) out.push('gap');
    out.push(p);
    prev = p;
  }
  return out;
}

export function Pagination({
  page, perPage, total, hasMore, rowsOnPage,
  tier = 'compact', perPageOptions = [10, 25, 50, 100],
  onPageChange, onPerPageChange, renderLink, focusRef, busy = false, label = 'Pagination',
}: PaginationProps) {
  // Before every refusal and every early return below, so the hook order never
  // depends on which of them fires.
  const seen = useRef(page);
  useEffect(() => {
    if (seen.current === page) return;      // the first render is not a page change
    seen.current = page;
    if (renderLink) return;                 // the browser reloaded and moved focus itself
    const rows = focusRef?.current;
    if (!rows) return;
    // A <table> is not focusable on its own, and a ref the consumer aimed at one
    // is the ref they will actually write. -1 makes it a target for focus()
    // without putting it in the tab order.
    if (!rows.hasAttribute('tabindex')) rows.setAttribute('tabindex', '-1');
    rows.focus();
  }, [page]);

  if (!TIERS.includes(tier)) throw new Error(`Pagination: unknown tier "${tier}" — expected ${TIERS.join(', ')}.`);
  const known = total != null;
  if (!known && (hasMore == null || rowsOnPage == null)) {
    throw new Error('Pagination: an unknown total needs hasMore and rowsOnPage — without them the range has to invent one.');
  }
  if (!known && tier === 'numbered') {
    throw new Error('Pagination: the numbered tier requires a total — an unknown total has no last page to draw.');
  }
  // Navigation has to belong to someone. In link mode it is the router's; with
  // neither prop a control would render and do nothing when clicked, which is
  // the silent kind of broken.
  if (!renderLink && !onPageChange) {
    throw new Error('Pagination: pass onPageChange, or renderLink to navigate with your router.');
  }
  // A rows-per-page control that reports nothing is the same silent break: it
  // moves, it looks like it worked, and the table underneath does not change.
  if (tier === 'advanced' && !onPerPageChange) {
    throw new Error('Pagination: the advanced tier needs onPerPageChange — a rows-per-page control that reports nothing is a control that lies.');
  }
  // The jump is the one control a router cannot own. Every other control in link
  // mode has an anchor waiting for it; a page the reader has not typed yet has no
  // URL to point at, so the tier needs a callback even when the rest navigates.
  if (tier === 'advanced' && !onPageChange) {
    throw new Error('Pagination: the advanced tier\'s jump needs onPageChange — there is no anchor for a page the reader has not typed yet.');
  }

  const pages = known ? Math.max(1, Math.ceil(total / perPage)) : null;
  const rows = known ? total : (page - 1) * perPage + (rowsOnPage as number);
  // The empty state belongs to the table, and one page needs no way off it —
  // except in `advanced`, where the rows-per-page control is the reason to stay.
  const single = known ? pages === 1 : page === 1 && !hasMore;
  if (rows === 0 || (single && tier !== 'advanced')) return null;

  const atFirst = page <= 1;
  const atLast = known ? page >= (pages as number) : !hasMore;

  /**
   * One control. A control with nowhere to go is a disabled <button> in BOTH
   * modes: there is no URL for a page that does not exist, and `aria-disabled`
   * on an anchor is a promise the browser does not keep — it stays clickable.
   */
  function control(
    { to, ariaLabel, body, disabled, current, extra }:
    { to: number; ariaLabel: string; body: ReactNode; disabled?: boolean; current?: boolean; extra?: string },
  ) {
    const cls = cx('ui-pager__btn', extra, current && 'is-current');
    const shared = {
      className: cls,
      'aria-label': ariaLabel,
      'aria-current': current ? ('page' as const) : undefined,
      'data-page': to,
    };
    if (disabled || busy) {
      return <button key={ariaLabel} type="button" {...shared} disabled aria-disabled="true">{body}</button>;
    }
    if (renderLink) {
      const node = renderLink(to, body);
      // The consumer owns the element and its href; this owns everything else.
      // A className of their own survives — it is merged, not replaced.
      return isValidElement(node)
        ? cloneElement(node as ReactElement<Record<string, unknown>>, {
          key: ariaLabel,
          ...shared,
          className: cx(cls, (node.props as { className?: string }).className),
        })
        : node;
    }
    return (
      <button key={ariaLabel} type="button" {...shared} onClick={() => onPageChange?.(to)}>{body}</button>
    );
  }

  const first = control({ to: 1, ariaLabel: 'Go to first page', body: <span>First</span>, disabled: atFirst });
  const prev = control({
    to: Math.max(1, page - 1),
    ariaLabel: 'Go to previous page',
    body: <><Icon name="chevronLeft" /><span>Previous</span></>,
    disabled: atFirst,
  });
  const next = control({
    to: page + 1,
    ariaLabel: 'Go to next page',
    body: <><span>Next</span><Icon name="chevronRight" /></>,
    disabled: atLast,
  });
  // No last page without a total, so the control is absent rather than dead.
  const last = known
    ? control({ to: pages as number, ariaLabel: 'Go to last page', body: <span>Last</span>, disabled: atLast })
    : null;

  const numbers = tier === 'numbered'
    ? pageWindow(page, pages as number).map((p, i) => (p === 'gap'
      ? <span key={`gap-${i}`} className="ui-pager__gap" aria-hidden="true">…</span>
      : control({
        to: p,
        ariaLabel: p === page ? `Page ${group(p)}` : `Go to page ${group(p)}`,
        body: <span>{group(p)}</span>,
        current: p === page,
        extra: 'ui-pager__page',
      })))
    : null;

  let size: ReactNode = null;
  let jump: ReactNode = null;
  if (tier === 'advanced') {
    // A page size the caller is actually on but never offered is still the truth
    // about the table, so it joins the list rather than reading as unselected.
    const options = [...new Set([...perPageOptions, perPage])].sort((a, b) => a - b);
    size = (
      <label className="ui-pager__size">
        <span className="ui-pager__label">Rows per page</span>
        <select className="ui-select ui-pager__select" data-pager-per-page disabled={busy}
          value={perPage} onChange={(e) => onPerPageChange?.(Number(e.target.value))}>
          {options.map((o) => <option key={o} value={o}>{group(o)}</option>)}
        </select>
      </label>
    );
    // A <select> over 49 pages is a select nobody wants; a number field with a max
    // is the same jump in one keystroke, and it commits on Enter for free.
    //
    // Uncontrolled, keyed on the page: the reader types over it freely, and a page
    // turned by any other control remounts it back onto the truth. A controlled
    // value would fight the keystrokes, and a draft in state would need a hook the
    // early returns below cannot promise to reach.
    const commit = (el: HTMLInputElement) => {
      const typed = Number(el.value);
      const to = el.value === '' || !Number.isFinite(typed)
        ? page
        : Math.max(1, known ? Math.min(typed, pages as number) : typed);
      el.value = String(to);
      if (to !== page) onPageChange?.(to);
    };
    jump = (
      <label className="ui-pager__jump">
        <span className="ui-pager__label">Go to page</span>
        <input key={page} className="ui-input ui-pager__input" type="number" inputMode="numeric"
          min={1} {...(known ? { max: pages as number } : {})} defaultValue={page}
          data-pager-jump disabled={busy}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            commit(e.currentTarget);
          }}
          onBlur={(e) => commit(e.currentTarget)} />
      </label>
    );
  }

  const controls = tier === 'advanced' ? <>{first}{prev}{next}{last}</>
    : tier === 'numbered' ? <>{prev}{numbers}{next}</>
      : <>{prev}{next}</>;

  return (
    <nav className={`ui-pager ui-pager--${tier}`} aria-label={label} aria-busy={busy || undefined}>
      {size}
      {/* Announcing the new range belongs to button mode alone. In link mode the
          document reloads and the announcement arrives on top of the browser's own.
          why: src/components/pagination.js:140 */}
      <span className="ui-pager__range"
        {...(renderLink ? {} : { 'aria-live': 'polite' as const, 'aria-atomic': 'true' })}>
        {pagerRange({ page, perPage, total, hasMore, rowsOnPage })}
      </span>
      {jump}
      <div className="ui-pager__controls">{controls}</div>
    </nav>
  );
}
