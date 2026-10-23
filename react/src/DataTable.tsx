import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from 'react';
import { DEFAULT_PAGE_SIZE } from '@apliteni/apliteni-ui';
import { Pagination, sizeOf } from './Pagination';
import './DataTable.css';

export type Column<T> = {
  key: keyof T & string; label: ReactNode; num?: boolean; sortable?: boolean; render?: (row: T) => ReactNode;
  /**
   * `true` marks this column's body cells as holding one link and nothing else, so the
   * link fills its cell and its focus ring outlines the cell rather than the words. It is
   * the consumer's to declare because CSS counts elements and not words: a cell reading
   * "Invoice 1162" with the number linked looks the same to a selector, and filling that
   * one would put the number on a line of its own. The header cell is never marked — it
   * holds a label, or a sort button that keeps its own ring.
   * why: docs/components.md#dense-financial-tables
   */
  linked?: boolean;
  /** Renders this column's body cells as row headers (`th scope="row"`), as the kit's compact table does. */
  rowHeader?: boolean;
  /** `title` gives the column the remaining width, `code` sets a handle or id in the table's small text, `long` is running text that gets its own line in a stacked row, `strong` bolds a figure, `act` right-aligns a row action. */
  cell?: 'title' | 'code' | 'long' | 'strong' | 'act';
};
export type TableSort<T> = { key: (keyof T & string) | undefined; dir: 1 | -1 };
type SelectionProps =
  | { selectable: false; selected?: Set<string>; onToggle?: (name: string) => void; onTogglePage?: (names: string[]) => void }
  | { selectable?: true; selected: Set<string>; onToggle: (name: string) => void; onTogglePage: (names: string[]) => void };
// Two modes, one table, chosen once and kept — the rule the sort pair above
// states, applied to the page. Given a `page`, the table renders the rows it is
// handed and never slices them or re-orders them: the range comes from `page`,
// `pageSize` and `total`, which is what a server-paged surface has to be able to
// say. And it has to say it. A controlled table that names no `total` can draw
// nothing but a dead Prev beside a dead Next, so the count is required in that
// arm, and `total: null` — the honest answer from a caller who cannot count —
// requires `hasMore` in its place, because whether a page follows this one is
// then the only thing left that a control can be computed from.
// why: docs/components.md#react-tables
type PagerProps =
  | { page?: never; onPageChange?: (page: number) => void; total?: never; hasMore?: never }
  | { page: number; onPageChange: (page: number) => void; total: number; hasMore?: boolean }
  | { page: number; onPageChange: (page: number) => void; total: null; hasMore: boolean };
export type DataTableProps<T> = {
  columns: Column<T>[]; rows: T[];
  /** The kit's `--zebra`, `--hover` (on unless `false`) and `--stack` hooks. A stacked table lays each row out as a block below the phone step, so no column scrolls out of reach. */
  zebra?: boolean; hover?: boolean; stack?: boolean;
  /** Marks a row the reader landed on (`target`) or a revoked one (`dead`). A dead row is muted, so put the word that names its state in one of its cells. */
  rowState?: (row: T) => 'target' | 'dead' | undefined;
  /** Table footer rows, such as totals: `<tr>` elements with a `th scope="row"` label. */
  footer?: ReactNode;
  /** A caption read by assistive technology only. */
  caption?: string;
  dense?: boolean; density?: 'default' | 'dense' | 'compact'; stickyHeader?: boolean; pinnedIdentity?: boolean; scrollLabel?: string; empty?: ReactNode;
  pageSize?: number; pageSizes?: readonly number[] | null; onPageSizeChange?: (size: number) => void;
  /** `false` renders no pager at all — for a surface that supplies its own. */
  pager?: boolean;
  /**
   * The pager's accessible name. Two tables on one page otherwise publish two
   * landmarks called "Pagination", and a reader listing the landmarks cannot tell
   * which one moves which table. Axe will not catch it: `landmark-unique` is a
   * best-practice rule and the kit's gate runs only the WCAG A/AA tags.
   */
  pagerLabel?: string;
  loading?: boolean;
} & SelectionProps & PagerProps & (
  | { sort?: never; onSortChange?: (sort: TableSort<T>) => void }
  | { sort: TableSort<T>; onSortChange: (sort: TableSort<T>) => void }
);

const CELL_CLASS = { title: 'ui-table__title', code: 'ui-table__code', long: 'ui-table__long', strong: 'ui-table__num--strong', act: 'ui-table__act' } as const;

// The absence of a sort, as a value: the order is whatever the rows arrived in.
const NO_SORT = { key: undefined, dir: -1 } as const;

// why: docs/components.md#react-tables
// Every path returns a copy. Values must be comparable with JavaScript < and >.
export function sortTableRows<T>(rows: T[], sort: TableSort<T>): T[] {
  if (sort.key === undefined) return [...rows];
  const key = sort.key;
  return [...rows].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * sort.dir);
}

export function DataTable<T extends { name: string }>({
  columns, rows, zebra = false, hover = true, stack = false, rowState, footer, caption, dense = false, density, stickyHeader = false, pinnedIdentity = false, scrollLabel = 'Table', empty = 'No rows', pageSize, pageSizes = null, onPageSizeChange, pager = true,
  pagerLabel, loading = false,
  selectable = true, selected = new Set<string>(),
  onToggle = () => {}, onTogglePage = () => {}, sort: controlledSort, onSortChange,
  page: controlledPage, onPageChange, total, hasMore = false,
}: DataTableProps<T>) {
  // A wide table is reached by scrolling it, and by nothing else. The region is a
  // named keyboard stop and draws the kit's inward ring, so a trackpad, a finger
  // and the arrow keys all get to the far columns; the pair of buttons that used to
  // stand above it is retired. why: docs/components.md#react-tables
  const scrollable = stickyHeader || pinnedIdentity;
  const table = useRef<HTMLTableElement>(null);
  // The box the strip sits in, held as state and not as a ref: the strip is conditional,
  // and an effect reading a ref cannot see one arrive. A surface that supplies its own pager
  // and later asks for this one left the arriving strip uncapped, because the dependencies
  // below — the columns and the rows — are exactly what such a caller keeps still (#504).
  const [pagerHost, setPagerHost] = useState<HTMLElement | null>(null);
  const holdPagerBox = useCallback(
    (box: HTMLDivElement | null) => setPagerHost(box?.parentElement ?? null), []);
  const [strip, setStrip] = useState<{ width: number; inset: number }>();
  // The strip starts where the table starts and ends where it ends, read against the box
  // the strip itself sits in rather than against the table's own parent: a scroll region
  // insets the table 4px inside itself, and a dense table in a card is bled 16px out of it,
  // so neither edge can be copied from the table's width alone. A table bled past its
  // container keeps the strip inside — only the table hangs into a card's padding.
  // A width of zero is no measurement: jsdom and a page that has not laid out yet both
  // report one, and a cap of zero would collapse the strip rather than leave it alone.
  useEffect(() => {
    const el = table.current;
    const host = pagerHost;
    // No strip, no cap to keep: a width measured for the last one would reach the next.
    if (!el || !host || typeof ResizeObserver === 'undefined') {
      setStrip(undefined);
      return;
    }
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const box = host.getBoundingClientRect();
      const left = box.left + host.clientLeft
        + (Number.parseFloat(getComputedStyle(host).paddingLeft) || 0);
      const inset = Math.max(0, rect.left - left);
      const width = rect.right - left - inset;
      setStrip(width > 0 ? { width, inset } : undefined);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [pagerHost, columns, rows]);
  const [localSort, setLocalSort] = useState<TableSort<T>>(
    { key: columns.find((c) => c.sortable)?.key, dir: -1 });
  const owned = controlledPage === undefined;
  // A controlled page arrives in an order this table did not choose and cannot
  // see. Left to its own sort it would seed to the first sortable column and
  // reorder the page the server had just ordered, so in that mode it has none —
  // and, having none, it lets no header claim one either.
  const sort: TableSort<T> = controlledSort ?? (owned ? localSort : NO_SORT);
  const sortIsKnown = owned || controlledSort !== undefined;
  const [localPage, setLocalPage] = useState(1);
  const [localSize, setLocalSize] = useState(DEFAULT_PAGE_SIZE);
  // Read by the pager's own rule, because the pager below the table reads it and
  // the two may not disagree: `?size=` reaches here as NaN, whose slice bounds
  // are NaN and whose page is empty under a strip announcing a full one, and
  // `2.5` is two rows to the pager and three to a slice that rounds late.
  // Controlled and given no size, the size of the page IS the page in hand — the
  // kit's default would describe a hundred rows nobody was handed. (An empty
  // page in hand says nothing about a size, so that one falls back to the scale.)
  const size = sizeOf(pageSize, owned ? localSize : (rows.length || DEFAULT_PAGE_SIZE));
  // Compare values so fresh inline sort objects do not reset pagination.
  const [pagedSort, setPagedSort] = useState(sort);
  if (pagedSort.key !== sort.key || pagedSort.dir !== sort.dir) {
    setPagedSort(sort);
    setLocalPage(1);
  }

  // Controlled: these rows ARE the page. They are neither reordered nor divided
  // again, and the count is the caller's, because the rows in front of us are
  // not the whole result.
  const ordered = useMemo(
    () => (owned ? sortTableRows(rows, sort) : rows), [owned, rows, sort.key, sort.dir]);
  const pages = Math.max(1, Math.ceil(ordered.length / size));
  const page = owned ? Math.min(Math.max(1, localPage), pages) : controlledPage;
  const slice = owned ? ordered.slice((page - 1) * size, page * size) : ordered;
  const goTo = (n: number) => (owned ? setLocalPage(n) : onPageChange?.(n));
  // A page the reader is no longer on has to be left, and in the controlled mode
  // only its owner can do that — so it is asked, exactly as a sort change is.
  const toFirstPage = () => { if (owned) setLocalPage(1); else if (page !== 1) onPageChange?.(1); };
  const onSort = (key: keyof T & string) => {
    const next: TableSort<T> = sort.key === key
      ? { key, dir: sort.dir === 1 ? -1 : 1 }
      : { key, dir: -1 };
    if (controlledSort === undefined) setLocalSort(next);
    onSortChange?.(next);
    toFirstPage();
  };
  const caret = (k: string) => (
    <svg className="rx-caret" data-up={sort.key === k && sort.dir === 1 || undefined}
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {sort.key === k ? <path d="m8 10 4 4 4-4" /> : <>
        <path d="m8 9 4-4 4 4" />
        <path d="m8 15 4 4 4-4" />
      </>}
    </svg>
  );
  // A table that does not scroll is the card's own child, so the card's bleed reaches it.
  const Wrap: ElementType = scrollable ? 'div' : Fragment;
  const pageAllOn = selectable && slice.length > 0 && slice.every((r) => selected.has(r.name));
  const pageSomeOn = selectable && !pageAllOn && slice.some((r) => selected.has(r.name));

  return (
    <>
      {/* The rows stay on screen while the next page is fetched, and the table
          says so. A reader who cannot see it otherwise meets a table that is
          silently either current or stale, with no way to tell which. */}
      <Wrap {...(scrollable ? { className: 'ui-table-scroll', role: 'region', 'aria-label': scrollLabel, tabIndex: 0 } : {})}>
      <table ref={table} className={['ui-table', hover && 'ui-table--hover', zebra && 'ui-table--zebra', stack && 'ui-table--stack', (density === 'dense' || (!density && dense)) && 'ui-table--dense', density === 'compact' && 'ui-table--compact', stickyHeader && 'ui-table--sticky', pinnedIdentity && 'ui-table--pinned'].filter(Boolean).join(' ')}
        aria-busy={loading || undefined} role={stack ? 'table' : undefined}>
        {caption ? <caption className="ui-sr">{caption}</caption> : null}
        <thead role={stack ? 'rowgroup' : undefined}>
          <tr role={stack ? 'row' : undefined}>
            {selectable ? <th scope="col" role={stack ? 'columnheader' : undefined} className="ui-table__selection">
              {/* No visible text: aria-label is this checkbox's whole name. */}
              <input type="checkbox" checked={pageAllOn} aria-label="Select all rows on this page"
                ref={(input) => { if (input) input.indeterminate = pageSomeOn; }}
                onChange={() => onTogglePage(slice.map((r) => r.name))} />
            </th> : null}
            {columns.map((c, columnIndex) => (
              // The sort control is a real <button> inside the header cell. It used to be
              // role="button" ON the <th>, which threw away the columnheader role and put
              // aria-sort on a role that forbids it.
              <th key={c.key} scope="col" role={stack ? 'columnheader' : undefined}
                className={[pinnedIdentity && columnIndex === 0 && 'ui-table__identity', c.num && 'ui-table__num', c.sortable && 'rx-sortable'].filter(Boolean).join(' ')}
                // External sorting can select a column without an interactive header.
                // A table whose page is controlled and whose sort is not knows
                // no order to report: "none" would be a claim of its own, and
                // the column it is wrong about is the one the server sorted by.
                aria-sort={sort.key === c.key
                  ? (sort.dir === 1 ? 'ascending' : 'descending')
                  : (c.sortable && sortIsKnown ? 'none' : undefined)}>
                {c.sortable
                  ? (
                    // The label is its own box so it can truncate: in a pinned
                    // identity column on a phone the header is capped, and a bare
                    // text node would push the caret out of the cell instead.
                    <button type="button" className="rx-sort" onClick={() => onSort(c.key)}>
                      <span className="rx-sort__label">{c.label}</span>{caret(c.key)}
                    </button>
                  )
                  : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role={stack ? 'rowgroup' : undefined}>
          {!slice.length && <tr role={stack ? 'row' : undefined}><td role={stack ? 'cell' : undefined} colSpan={columns.length + (selectable ? 1 : 0)}>{loading ? 'Loading rows…' : empty}</td></tr>}
          {slice.map((r) => (
            <tr key={r.name} role={stack ? 'row' : undefined}
              className={rowState?.(r) ? `is-${rowState(r)}` : undefined}>
              {selectable ? <td role={stack ? 'cell' : undefined} className="ui-table__selection"><input type="checkbox" checked={selected.has(r.name)} aria-label={`Select ${r.name}`}
                onChange={() => onToggle(r.name)} /></td> : null}
              {columns.map((c, columnIndex) => {
                const Cell = c.rowHeader ? 'th' : 'td';
                return (
                  <Cell key={c.key} scope={c.rowHeader ? 'row' : undefined} role={stack ? (c.rowHeader ? 'rowheader' : 'cell') : undefined}
                    data-label={stack && c.num && typeof c.label === 'string' ? c.label : undefined}
                    className={[c.num && 'ui-table__num', c.cell && CELL_CLASS[c.cell], pinnedIdentity && columnIndex === 0 && 'ui-table__identity', c.linked && 'ui-table__linked'].filter(Boolean).join(' ') || undefined}>
                    {c.render ? c.render(r) : String(r[c.key])}
                  </Cell>
                );
              })}
            </tr>
          ))}
        </tbody>
        {footer ? <tfoot role={stack ? 'rowgroup' : undefined}>{footer}</tfoot> : null}
      </table>
      </Wrap>
      {/* One page and no size to choose renders nothing at all — the pager's own
          rule, not a second copy of it here. */}
      {pager ? (
      // The strip that pages a table may not be wider than the rows it pages (#504).
      // The two are siblings, and no selector sizes one to the other, so the width is
      // measured: a cap rather than a width, so a pager wider than the table wraps
      // inside it and a table wider than the room still leaves the strip in the room.
      <div className="rx-table-pager" ref={holdPagerBox}
        style={strip ? { maxWidth: strip.width, marginInlineStart: strip.inset || undefined } : undefined}>
        <Pagination page={page} pageSize={size} total={owned ? ordered.length : total ?? null}
          hasMore={hasMore} pageSizes={pageSizes} loading={loading}
          {...(pagerLabel === undefined ? {} : { label: pagerLabel })}
          onPageChange={goTo}
          onPageSizeChange={(s) => {
            if (pageSize === undefined) setLocalSize(s);
            onPageSizeChange?.(s);
            // A size change already means page 1, so a controlled table reports
            // the size and stops: the onPageChange(1) that used to follow it
            // carried the old size, and an owner refetching on either call
            // landed back on the size the reader had just replaced.
            if (owned) setLocalPage(1);
          }} />
      </div>
      ) : null}
    </>
  );
}
