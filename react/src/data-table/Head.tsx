import type { ReactNode } from 'react';
import { pinnedColumn, type Column, type PinnedIdentity, type TableSort } from './columns';

// A set width lives on the col alone. #832
export function ColumnWidths<T>({ columns, selectable }: { columns: Column<T>[]; selectable: boolean }) {
  return (
    <colgroup>
      {selectable ? <col /> : null}
      {columns.map((c) => <col key={c.key} style={c.width ? { width: c.width } : undefined} />)}
    </colgroup>
  );
}

function SortCaret({ on, up }: { on: boolean; up: boolean }) {
  return (
    <svg className="rx-caret" data-up={on && up || undefined}
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {on ? <path d="m8 10 4 4 4-4" /> : <>
        <path d="m8 9 4-4 4 4" />
        <path d="m8 15 4 4 4-4" />
      </>}
    </svg>
  );
}

// External sorting can select a column without an interactive header.
// A table whose page is controlled and whose sort is not knows
// no order to report: "none" would be a claim of its own, and
// the column it is wrong about is the one the server sorted by.
function ariaSort<T>(c: Column<T>, sort: TableSort<T>, sortIsKnown: boolean) {
  if (sort.key === c.key) return sort.dir === 1 ? 'ascending' : 'descending';
  return c.sortable && sortIsKnown ? 'none' : undefined;
}

export function TableHead<T>({ columns, sort, sortIsKnown, onSort, pinnedIdentity, selection }: {
  columns: Column<T>[]; sort: TableSort<T>; sortIsKnown: boolean; onSort: (key: keyof T & string) => void;
  pinnedIdentity: PinnedIdentity<T>; selection: ReactNode;
}) {
  return (
    <thead>
      <tr>
        {selection}
        {columns.map((c, columnIndex) => (
          // The sort control is a real <button> inside the header cell. It used to be
          // role="button" ON the <th>, which threw away the columnheader role and put
          // aria-sort on a role that forbids it.
          <th key={c.key} scope="col"
            className={[pinnedColumn(pinnedIdentity, c.key, columnIndex) && 'ui-table__identity', c.num && 'ui-table__num', c.sortable && 'rx-sortable'].filter(Boolean).join(' ')}
            aria-sort={ariaSort(c, sort, sortIsKnown)}>
            {c.sortable
              ? (
                // The label is its own box so it can truncate: in a pinned
                // identity column on a phone the header is capped, and a bare
                // text node would push the caret out of the cell instead.
                <button type="button" className="rx-sort" onClick={() => onSort(c.key)}>
                  <span className="rx-sort__label">{c.label}</span>
                  <SortCaret on={sort.key === c.key} up={sort.dir === 1} />
                </button>
              )
              : c.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}
