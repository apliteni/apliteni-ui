import { useEffect, useId, useRef, useState } from 'react';
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
  pageSizes?: readonly number[] | null;
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
// Every number here arrives from a URL in real use — `?page=-2`, `?page=abc`,
// `?page=` — so each is coerced before it is clamped and nothing that is not a
// finite integer reaches the markup. The same rule as src/components/pagination.js,
// line for line, and the reasons are written there: `Number()` alone reads '',
// null and false as 0 and throws on a Symbol, and past MAX_SAFE_INTEGER a page's
// neighbours round onto it.
const CAP = Number.MAX_SAFE_INTEGER;
const int = <F,>(v: unknown, fallback: F): number | F => {
  const raw = typeof v === 'number' ? v
    : (typeof v === 'string' && v.trim() !== '') ? Number(v)
      : NaN;
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(Math.max(Math.trunc(raw), -CAP), CAP);
};
/**
 * A page size as the pager reads one: a positive integer, or `fallback`. Zero
 * and below are no size rather than a size of one. Exported because <DataTable>
 * slices with it — a table that read `2.5` as two and a half rows, or `NaN` as a
 * slice bound, would render a page the strip under it denies.
 */
export const sizeOf = (v: unknown, fallback: number): number => {
  const asked = int(v, fallback);
  return asked > 0 ? asked : fallback;
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
  const nav = useRef<HTMLElement>(null);
  // The step the reader last pressed, until the page it asked for has arrived.
  const pressed = useRef<HTMLButtonElement | null>(null);

  const uid = id ?? auto;
  const kind = VARIANTS.includes(variant) ? variant : 'steps';
  const size = sizeOf(pageSize, DEFAULT_PAGE_SIZE);
  // A total that is not a number is a total nobody knows: the open shape.
  const asRows = int(total, null);
  const counted = total != null && asRows !== null;
  const rows = counted ? Math.max(0, asRows as number) : null;
  const last = counted ? Math.max(1, Math.ceil((rows as number) / size)) : null;
  // One below the cap when nothing is counted: Next targets `at + 1`.
  const at = counted
    ? Math.min(Math.max(1, int(page, 1)), last as number)
    : Math.min(Math.max(1, int(page, 1)), CAP - 1);

  // The page can move while a draft is pending — a poll, a filter, a second
  // control on the same query — and a box still showing the page the reader was
  // typing for the page they have left is a number they are one blur away from
  // committing. So the draft belongs to one page and dies with it.
  const [draftFor, setDraftFor] = useState(at);
  if (draftFor !== at) {
    setDraftFor(at);
    setDraft('');
    setDrafting(false);
  }

  // The size in use is offered even when the caller's list forgot it: a select
  // whose value is not among its options reports a size the table is not using.
  // Twelve at most, as the factory cuts it: past any real size menu.
  const offered = (Array.isArray(pageSizes) ? pageSizes : []).slice(0, 12)
    .map((s) => int(s, 0)).filter((s) => s > 0);
  const sizes = offered.length ? [...new Set([...offered, size])].sort((a, b) => a - b) : [];

  // A browser drops focus to <body> from a control that turns disabled. Once
  // the page has arrived, a pressed step gets focus back, or the nearest live
  // step does. Only focus a press lost; never while loading, never into the rows.
  // why: docs/specification.md#pagination
  useEffect(() => {
    const was = pressed.current;
    if (!was || loading) return;
    pressed.current = null;
    const lost = document.activeElement === document.body || document.activeElement === was;
    if (!lost || !nav.current?.contains(was)) return;
    if (!was.disabled) { was.focus(); return; }
    const strip = [...nav.current.querySelectorAll<HTMLButtonElement>('.ui-pager__step')];
    const from = strip.indexOf(was);
    for (let d = 1; d < strip.length; d += 1) {
      const near = [strip[from - d], strip[from + d]].find((el) => el && !el.disabled);
      if (near) { near.focus(); return; }
    }
  }, [at, loading]);

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
      onClick={(e) => { pressed.current = e.currentTarget; go(target); }}>{label_}</button>
  );

  const atStart = at === 1;
  const atEnd = counted && at === (last as number);
  const ends = kind !== 'numbered'; // the numbered strip's first and last slots are those pages

  const commitJump = () => {
    setDrafting(false);
    const typed = draft.trim();
    // `Number('')` is 0 and passes Number.isFinite, so an empty box committed
    // page 1 — and a number input sanitises anything unparseable to exactly
    // that empty string. Nothing typed is nothing asked for: the box goes back
    // to the page it is on and no one is moved.
    if (typed === '') return;
    const n = Math.min(Math.max(1, int(typed, at)), last as number);
    if (n !== at) go(n);
  };
  // Blur fires before the click that caused it. A reader who typed a page and
  // then reached for Next chose Next: committing the draft on the way out would
  // navigate twice, the second time from a page the first turn had already left.
  const leaveJump = (to: Element | null) => {
    if (to && nav.current?.contains(to)) {
      setDrafting(false);
      setDraft('');
      return;
    }
    commitJump();
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
            onBlur={(e) => leaveJump(e.relatedTarget as Element | null)}
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
    <nav ref={nav}
      className={cx('ui-pager', `ui-pager--${kind}`, !counted && 'ui-pager--open', single && 'ui-pager--single')}
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
