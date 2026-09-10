import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
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
  onPageChange, onPerPageChange, renderLink, busy = false, label = 'Pagination',
}: PaginationProps) {
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
  if (tier === 'advanced') {
    // A page size the caller is actually on but never offered is still the truth
    // about the table, so it joins the list rather than reading as unselected.
    const options = [...new Set([...perPageOptions, perPage])].sort((a, b) => a - b);
    size = (
      <label className="ui-pager__size">
        <span className="ui-pager__label">Rows per page</span>
        <select className="ui-select ui-pager__select" data-pager-per-page disabled={busy}
          value={perPage} onChange={() => {}}>
          {options.map((o) => <option key={o} value={o}>{group(o)}</option>)}
        </select>
      </label>
    );
  }

  const controls = tier === 'advanced' ? <>{first}{prev}{next}{last}</>
    : tier === 'numbered' ? <>{prev}{numbers}{next}</>
      : <>{prev}{next}</>;

  return (
    <nav className={`ui-pager ui-pager--${tier}`} aria-label={label} aria-busy={busy || undefined}>
      {size}
      <span className="ui-pager__range">
        {pagerRange({ page, perPage, total, hasMore, rowsOnPage })}
      </span>
      <div className="ui-pager__controls">{controls}</div>
    </nav>
  );
}
