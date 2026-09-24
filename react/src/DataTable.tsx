import { useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_PAGE_SIZE } from '@apliteni/apliteni-ui';
import { Pagination, sizeOf } from './Pagination';
import './DataTable.css';

export type Column<T> = {
  key: keyof T & string; label: string; num?: boolean; sortable?: boolean; render?: (row: T) => ReactNode;
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
// why: docs/specification.md#react-tables
type PagerProps =
  | { page?: never; onPageChange?: (page: number) => void; total?: never; hasMore?: never }
  | { page: number; onPageChange: (page: number) => void; total: number; hasMore?: boolean }
  | { page: number; onPageChange: (page: number) => void; total: null; hasMore: boolean };
export type DataTableProps<T> = {
  columns: Column<T>[]; rows: T[];
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

// The absence of a sort, as a value: the order is whatever the rows arrived in.
const NO_SORT = { key: undefined, dir: -1 } as const;

// why: docs/specification.md#react-tables
// Every path returns a copy. Values must be comparable with JavaScript < and >.
export function sortTableRows<T>(rows: T[], sort: TableSort<T>): T[] {
  if (sort.key === undefined) return [...rows];
  const key = sort.key;
  return [...rows].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * sort.dir);
}

export function DataTable<T extends { name: string }>({
  columns, rows, dense = false, density, stickyHeader = false, pinnedIdentity = false, scrollLabel = 'Table', empty = 'No rows', pageSize, pageSizes = null, onPageSizeChange, pager = true,
  pagerLabel, loading = false,
  selectable = true, selected = new Set<string>(),
  onToggle = () => {}, onTogglePage = () => {}, sort: controlledSort, onSortChange,
  page: controlledPage, onPageChange, total, hasMore = false,
}: DataTableProps<T>) {
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
  const caret = (k: string) => (sort.key === k ? (sort.dir === 1 ? ' ▲' : ' ▼') : ' ↕');
  const pageAllOn = selectable && slice.length > 0 && slice.every((r) => selected.has(r.name));

  return (
    <>
      {/* The rows stay on screen while the next page is fetched, and the table
          says so. A reader who cannot see it otherwise meets a table that is
          silently either current or stale, with no way to tell which. */}
      <div className={stickyHeader || pinnedIdentity ? 'ui-table-scroll' : undefined} role={stickyHeader || pinnedIdentity ? 'region' : undefined}
        aria-label={stickyHeader || pinnedIdentity ? scrollLabel : undefined} tabIndex={stickyHeader || pinnedIdentity ? 0 : undefined}>
      <table className={['ui-table ui-table--hover', (density === 'dense' || (!density && dense)) && 'ui-table--dense', density === 'compact' && 'ui-table--compact', stickyHeader && 'ui-table--sticky', pinnedIdentity && 'ui-table--pinned'].filter(Boolean).join(' ')}
        aria-busy={loading || undefined}>
        <thead>
          <tr>
            {selectable ? <th scope="col">
              {/* No visible text: aria-label is this checkbox's whole name. */}
              <input type="checkbox" checked={pageAllOn} aria-label="Select all rows on this page"
                onChange={() => onTogglePage(slice.map((r) => r.name))} />
            </th> : null}
            {columns.map((c, columnIndex) => (
              // The sort control is a real <button> inside the header cell. It used to be
              // role="button" ON the <th>, which threw away the columnheader role and put
              // aria-sort on a role that forbids it.
              <th key={c.key} scope="col"
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
                    <button type="button" className="rx-sort" onClick={() => onSort(c.key)}>
                      {c.label}<span className="rx-caret" aria-hidden="true">{caret(c.key)}</span>
                    </button>
                  )
                  : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!slice.length && <tr><td colSpan={columns.length + (selectable ? 1 : 0)}>{loading ? 'Loading rows…' : empty}</td></tr>}
          {slice.map((r) => (
            <tr key={r.name}>
              {selectable ? <td><input type="checkbox" checked={selected.has(r.name)} aria-label={`Select ${r.name}`}
                onChange={() => onToggle(r.name)} /></td> : null}
              {columns.map((c, columnIndex) => (
                <td key={c.key} className={[c.num && 'ui-table__num', pinnedIdentity && columnIndex === 0 && 'ui-table__identity'].filter(Boolean).join(' ')}>
                  {c.render ? c.render(r) : String(r[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {/* One page and no size to choose renders nothing at all — the pager's own
          rule, not a second copy of it here. */}
      {pager ? (
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
      ) : null}
    </>
  );
}
