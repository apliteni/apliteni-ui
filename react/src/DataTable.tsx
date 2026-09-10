import { useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_PAGE_SIZE } from '@apliteni/apliteni-ui';
import { Pagination } from './Pagination';
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
// handed and never slices them: the range comes from `page`, `pageSize` and
// `total`, which is what a server-paged surface has to be able to say.
// why: docs/specification.md#react-tables
type PagerProps =
  | { page?: never; onPageChange?: (page: number) => void; total?: never; hasMore?: never }
  | { page: number; onPageChange: (page: number) => void; total?: number | null; hasMore?: boolean };
export type DataTableProps<T> = {
  columns: Column<T>[]; rows: T[];
  pageSize?: number; pageSizes?: number[] | null; onPageSizeChange?: (size: number) => void;
  /** `false` renders no pager at all — for a surface that supplies its own. */
  pager?: boolean;
  loading?: boolean;
} & SelectionProps & PagerProps & (
  | { sort?: never; onSortChange?: (sort: TableSort<T>) => void }
  | { sort: TableSort<T>; onSortChange: (sort: TableSort<T>) => void }
);

// why: docs/specification.md#react-tables
// Every path returns a copy. Values must be comparable with JavaScript < and >.
export function sortTableRows<T>(rows: T[], sort: TableSort<T>): T[] {
  if (sort.key === undefined) return [...rows];
  const key = sort.key;
  return [...rows].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * sort.dir);
}

export function DataTable<T extends { name: string }>({
  columns, rows, pageSize, pageSizes = null, onPageSizeChange, pager = true, loading = false,
  selectable = true, selected = new Set<string>(),
  onToggle = () => {}, onTogglePage = () => {}, sort: controlledSort, onSortChange,
  page: controlledPage, onPageChange, total, hasMore = false,
}: DataTableProps<T>) {
  const [localSort, setLocalSort] = useState<TableSort<T>>(
    { key: columns.find((c) => c.sortable)?.key, dir: -1 });
  const sort = controlledSort ?? localSort;
  const owned = controlledPage === undefined;
  const [localPage, setLocalPage] = useState(1);
  const [localSize, setLocalSize] = useState(DEFAULT_PAGE_SIZE);
  const size = Math.max(1, pageSize ?? localSize);
  // Compare values so fresh inline sort objects do not reset pagination.
  const [pagedSort, setPagedSort] = useState(sort);
  if (pagedSort.key !== sort.key || pagedSort.dir !== sort.dir) {
    setPagedSort(sort);
    setLocalPage(1);
  }

  const sorted = useMemo(() => sortTableRows(rows, sort), [rows, sort.key, sort.dir]);

  // Controlled: these rows ARE the page. Nothing is sliced and the count is the
  // caller's, because the rows in front of us are not the whole result.
  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const page = owned ? Math.min(Math.max(1, localPage), pages) : controlledPage;
  const slice = owned ? sorted.slice((page - 1) * size, page * size) : sorted;
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
      <table className="ui-table ui-table--hover ui-table--zebra">
        <thead>
          <tr>
            {selectable ? <th scope="col">
              {/* No visible text: aria-label is this checkbox's whole name. */}
              <input type="checkbox" checked={pageAllOn} aria-label="Select all rows on this page"
                onChange={() => onTogglePage(slice.map((r) => r.name))} />
            </th> : null}
            {columns.map((c) => (
              // The sort control is a real <button> inside the header cell. It used to be
              // role="button" ON the <th>, which threw away the columnheader role and put
              // aria-sort on a role that forbids it.
              <th key={c.key} scope="col"
                className={[c.num && 'ui-table__num', c.sortable && 'rx-sortable'].filter(Boolean).join(' ')}
                // External sorting can select a column without an interactive header.
                aria-sort={sort.key === c.key
                  ? (sort.dir === 1 ? 'ascending' : 'descending')
                  : (c.sortable ? 'none' : undefined)}>
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
          {slice.map((r) => (
            <tr key={r.name}>
              {selectable ? <td><input type="checkbox" checked={selected.has(r.name)} aria-label={`Select ${r.name}`}
                onChange={() => onToggle(r.name)} /></td> : null}
              {columns.map((c) => (
                <td key={c.key} className={c.num ? 'ui-table__num' : undefined}>
                  {c.render ? c.render(r) : String(r[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* One page and no size to choose renders nothing at all — the pager's own
          rule, not a second copy of it here. */}
      {pager ? (
        <Pagination page={page} pageSize={size} total={owned ? sorted.length : total ?? null}
          hasMore={hasMore} pageSizes={pageSizes} loading={loading}
          onPageChange={goTo}
          onPageSizeChange={(s) => {
            if (pageSize === undefined) setLocalSize(s);
            onPageSizeChange?.(s);
            toFirstPage();
          }} />
      ) : null}
    </>
  );
}
