import { useId, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '@apliteni/apliteni-ui';

// The React face of the kit's pagination() factory. The vanilla output is the
// source of truth for every class name here, and Pagination.test.tsx compares
// the two shape by shape — a rule this file expresses differently from
// src/components/pagination.js is a failure there rather than a drift.
// why: docs/specification.md#pagination

export type PaginationProps = {
  page?: number;
  pageSize?: number;
  /** Rows in the whole result. `null` — the honest answer for a caller who cannot count. */
  total?: number | null;
  /** Read only when `total` is null: whether a page exists after this one. */
  hasMore?: boolean;
  pageSizes?: number[] | null;
  variant?: 'steps' | 'numbered' | 'jump';
  label?: string;
  loading?: boolean;
  id?: string;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
};

// The classes button({ variant: 'ghost', size: 'sm' }) emits. Written out for the
// same reason the vanilla component writes them out — every control here needs a
// pager class of its own, and <Button> has no room for one. Pagination.test.tsx
// reads the trio off button() so a change there fails there.
const GHOST_SM = 'ui-btn ui-btn--ghost ui-btn--sm';

const VARIANTS = ['steps', 'numbered', 'jump'];
const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');
const int = (v: unknown, fallback: number) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : fallback;
};
const fmt = (n: number) => n.toLocaleString('en-US');

/** Page 1, the last page, the current page with a neighbour each side; `null` for a cut run. */
function slotsFor(page: number, pageCount: number): (number | null)[] {
  const wanted = [1, pageCount, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pageCount);
  const shown = [...new Set(wanted)].sort((a, b) => a - b);
  const out: (number | null)[] = [];
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

export function Pagination({
  page = 1, pageSize, total = null, hasMore = false, pageSizes = null,
  variant = 'steps', label = 'Pagination', loading = false, id,
  onPageChange, onPageSizeChange,
}: PaginationProps) {
  const auto = useId();
  // The jump input holds what the reader is typing until they commit it, so a
  // half-typed "1" on the way to "15" cannot turn the page under them.
  const [draft, setDraft] = useState('');
  const [drafting, setDrafting] = useState(false);

  const uid = id ?? auto;
  const kind = VARIANTS.includes(variant) ? variant : 'steps';
  const size = Math.max(1, int(pageSize, DEFAULT_PAGE_SIZE));
  const counted = total != null && Number.isFinite(Number(total));
  const rows = counted ? Math.max(0, int(total, 0)) : null;
  const last = counted ? Math.max(1, Math.ceil((rows as number) / size)) : null;
  const at = counted
    ? Math.min(Math.max(1, int(page, 1)), last as number)
    : Math.max(1, int(page, 1));

  // The size in use is offered even when the caller's list forgot it: a select
  // whose value is not among its options reports a size the table is not using.
  const offered = (Array.isArray(pageSizes) ? pageSizes : []).map((s) => int(s, 0)).filter((s) => s > 0);
  const sizes = offered.length ? [...new Set([...offered, size])].sort((a, b) => a - b) : [];

  const single = counted && last === 1;
  // GOV.UK: "Do not show pagination if there's only one page of content." Where
  // the factory returns the empty string, this renders nothing.
  if (single && !sizes.length) return null;

  const from = (at - 1) * size + 1;
  const to = counted ? Math.min(at * size, rows as number) : null;
  const status = !counted ? `Page ${fmt(at)}`
    : rows === 0 ? '0 of 0'
      : from === to ? `${fmt(from)} of ${fmt(rows as number)}`
        : `${fmt(from)}–${fmt(to as number)} of ${fmt(rows as number)}`;

  const go = (n: number) => onPageChange?.(n);
  const step = (label_: string, target: number, disabled: boolean) => (
    // A control at an end is disabled and stays where it is: removing it slides
    // the next control under a pointer already travelling toward it.
    <button key={label_} type="button" className={`${GHOST_SM} ui-pager__step`} data-page={target}
      disabled={loading || disabled} aria-disabled={loading || disabled ? true : undefined}
      onClick={() => go(target)}>{label_}</button>
  );

  const atStart = at === 1;
  const atEnd = counted && at === (last as number);
  const ends = kind !== 'numbered'; // the numbered strip's first and last slots are those pages

  const commitJump = () => {
    setDrafting(false);
    const n = Math.min(Math.max(1, int(draft, at)), last as number);
    if (n !== at) go(n);
  };

  let steps = null;
  if (single) {
    steps = null;
  } else if (!counted) {
    // No last page exists, so no control may claim to reach one.
    steps = (
      <div className="ui-pager__steps">
        {step('Prev', Math.max(1, at - 1), atStart)}
        {step('Next', at + 1, !hasMore)}
      </div>
    );
  } else {
    let middle = null;
    if (kind === 'numbered') {
      middle = slotsFor(at, last as number).map((n, i) => (n == null
        ? <span key={`gap${i}`} className="ui-pager__gap" aria-hidden="true">…</span>
        : (
          <button key={n} type="button" data-page={n}
            className={cx(`${GHOST_SM} ui-pager__page`, n === at && 'is-current')}
            aria-current={n === at ? 'page' : undefined}
            disabled={loading} aria-disabled={loading ? true : undefined}
            onClick={() => go(n)}>{fmt(n)}</button>
        )));
    } else if (kind === 'jump') {
      middle = (
        <span className="ui-pager__jump">
          <label htmlFor={`${uid}-jump`}>Page</label>
          <input className="ui-input ui-pager__jump-input" id={`${uid}-jump`} type="number"
            min={1} max={last as number} disabled={loading}
            value={drafting ? draft : String(at)}
            onChange={(e) => { setDrafting(true); setDraft(e.target.value); }}
            onBlur={commitJump}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitJump(); } }} />
          <span className="ui-pager__jump-of">of {fmt(last as number)}</span>
        </span>
      );
    }
    steps = (
      <div className="ui-pager__steps">
        {ends ? step('First', 1, atStart) : null}
        {step('Prev', Math.max(1, at - 1), atStart)}
        {middle}
        {step('Next', Math.min(last as number, at + 1), atEnd)}
        {ends ? step('Last', last as number, atEnd) : null}
      </div>
    );
  }

  return (
    <nav className={cx('ui-pager', `ui-pager--${kind}`, !counted && 'ui-pager--open', single && 'ui-pager--single')}
      aria-label={label} aria-busy={loading ? true : undefined}>
      {/* The only live region in the strip: numbers, size control and four
          buttons all announcing would read one page turn out four times. */}
      <p className="ui-pager__status" aria-live="polite" aria-atomic="true">{status}</p>
      {sizes.length ? (
        <div className="ui-pager__size">
          <label className="ui-pager__size-label" htmlFor={`${uid}-size`}>Rows</label>
          <select className="ui-select ui-pager__size-select" id={`${uid}-size`} disabled={loading}
            value={size} onChange={(e) => onPageSizeChange?.(Number(e.target.value))}>
            {sizes.map((s) => <option key={s} value={s}>{fmt(s)}</option>)}
          </select>
        </div>
      ) : null}
      {steps}
    </nav>
  );
}
