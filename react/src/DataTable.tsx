import { useMemo, useState, type ReactNode } from 'react';
import { Button } from './primitives/Button';
import './DataTable.css';

export type Column<T> = {
  key: keyof T & string; label: string; num?: boolean; sortable?: boolean; render?: (row: T) => ReactNode;
};
export type DataTableProps<T> = {
  columns: Column<T>[]; rows: T[]; pageSize?: number;
  selected: Set<string>; onToggle: (name: string) => void; onTogglePage: (names: string[]) => void;
};

export function DataTable<T extends { name: string }>({
  columns, rows, pageSize = 4, selected, onToggle, onTogglePage,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string | undefined; dir: 1 | -1 }>(
    { key: columns.find((c) => c.sortable)?.key, dir: -1 });
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const k = sort.key as keyof T;
    return [...rows].sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * sort.dir);
  }, [rows, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const onSort = (k: string) => {
    setSort((s) => (s.key === k ? { key: k, dir: (s.dir === 1 ? -1 : 1) } : { key: k, dir: -1 }));
    setPage(0);
  };
  const caret = (k: string) => (sort.key === k ? (sort.dir === 1 ? ' ▲' : ' ▼') : ' ↕');
  const pageAllOn = slice.length > 0 && slice.every((r) => selected.has(r.name));

  return (
    <>
      <table className="ui-table ui-table--hover ui-table--zebra">
        <thead>
          <tr>
            <th><input type="checkbox" checked={pageAllOn}
              onChange={() => onTogglePage(slice.map((r) => r.name))} /></th>
            {columns.map((c) => (
              <th key={c.key}
                className={[c.num && 'ui-table__num', c.sortable && 'rx-sortable'].filter(Boolean).join(' ')}
                aria-sort={c.sortable
                  ? (sort.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none')
                  : undefined}
                role={c.sortable ? 'button' : undefined}
                tabIndex={c.sortable ? 0 : undefined}
                onClick={c.sortable ? () => onSort(c.key) : undefined}
                onKeyDown={c.sortable ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if (e.key === ' ') e.preventDefault();
                    onSort(c.key);
                  }
                } : undefined}>
                {c.label}{c.sortable && <span className="rx-caret">{caret(c.key)}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slice.map((r) => (
            <tr key={r.name}>
              <td><input type="checkbox" checked={selected.has(r.name)}
                onChange={() => onToggle(r.name)} /></td>
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
          onClick={() => setPage((p) => p - 1)}>Prev</Button>
        <Button variant="ghost" size="sm" iconRight="chevronRight" disabled={safePage >= pages - 1}
          onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </>
  );
}
