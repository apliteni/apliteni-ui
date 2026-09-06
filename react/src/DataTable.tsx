import { useMemo, useState, type ReactNode } from 'react';
import { Button } from './primitives/Button';
import './DataTable.css';

export type Column<T> = {
  key: keyof T & string; label: string; num?: boolean; sortable?: boolean; render?: (row: T) => ReactNode;
};
export type TableSort<T> = { key: (keyof T & string) | undefined; dir: 1 | -1 };
type SelectionProps =
  | { selectable: false; selected?: Set<string>; onToggle?: (name: string) => void; onTogglePage?: (names: string[]) => void }
  | { selectable?: true; selected: Set<string>; onToggle: (name: string) => void; onTogglePage: (names: string[]) => void };
export type DataTableProps<T> = {
  columns: Column<T>[]; rows: T[]; pageSize?: number;
} & SelectionProps & (
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
  columns, rows, pageSize = 4, selectable = true, selected = new Set<string>(),
  onToggle = () => {}, onTogglePage = () => {}, sort: controlledSort, onSortChange,
}: DataTableProps<T>) {
  const [localSort, setLocalSort] = useState<TableSort<T>>(
    { key: columns.find((c) => c.sortable)?.key, dir: -1 });
  const sort = controlledSort ?? localSort;
  const [page, setPage] = useState(0);
  // Compare values so fresh inline sort objects do not reset pagination.
  const [pagedSort, setPagedSort] = useState(sort);
  if (pagedSort.key !== sort.key || pagedSort.dir !== sort.dir) {
    setPagedSort(sort);
    setPage(0);
  }

  const sorted = useMemo(() => sortTableRows(rows, sort), [rows, sort.key, sort.dir]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const onSort = (key: keyof T & string) => {
    const next: TableSort<T> = sort.key === key
      ? { key, dir: sort.dir === 1 ? -1 : 1 }
      : { key, dir: -1 };
    if (controlledSort === undefined) setLocalSort(next);
    onSortChange?.(next);
    setPage(0);
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
      <div className="rx-pager">
        <span className="rx-pager__info">Page {safePage + 1} of {pages} · {sorted.length} rows</span>
        <Button variant="ghost" size="sm" icon="chevronLeft" disabled={safePage === 0}
          onClick={() => setPage(safePage - 1)}>Prev</Button>
        <Button variant="ghost" size="sm" iconRight="chevronRight" disabled={safePage >= pages - 1}
          onClick={() => setPage(safePage + 1)}>Next</Button>
      </div>
    </>
  );
}
