import type { ReactNode } from 'react';
import { CELL_CLASS, pinnedColumn, type Column, type PinnedIdentity } from './columns';

export function TableBody<T extends { name: string }>({ columns, rows, sized, pinnedIdentity, rowState, empty, loading, selection }: {
  columns: Column<T>[]; rows: T[]; sized: boolean; pinnedIdentity: PinnedIdentity<T>;
  rowState?: (row: T) => 'target' | 'dead' | undefined; empty: ReactNode; loading: boolean;
  /** The selection cell of a row, or nothing for a table without selection. */
  selection?: (row: T) => ReactNode;
}) {
  return (
    <tbody>
      {!rows.length && <tr><td colSpan={columns.length + (selection ? 1 : 0)}>{loading ? 'Loading rows…' : empty}</td></tr>}
      {rows.map((r) => (
        <tr key={r.name}
          className={rowState?.(r) ? `is-${rowState(r)}` : undefined}>
          {selection ? selection(r) : null}
          {columns.map((c, columnIndex) => {
            const Cell = c.rowHeader ? 'th' : 'td';
            return (
              // A set width lives on the col alone. In a table with a set width, a title
              // cell gives up its claim on the rest of the row, so the edges hold when the
              // rows arrive: the free room goes to the unsized columns in both states. #832
              <Cell key={c.key} scope={c.rowHeader ? 'row' : undefined} style={c.width || (sized && c.cell === 'title') ? { width: 'auto' } : undefined}
                className={[c.num && 'ui-table__num', c.cell && CELL_CLASS[c.cell], pinnedColumn(pinnedIdentity, c.key, columnIndex) && 'ui-table__identity', c.linked && 'ui-table__linked'].filter(Boolean).join(' ') || undefined}>
                {c.render ? c.render(r) : String(r[c.key])}
              </Cell>
            );
          })}
        </tr>
      ))}
    </tbody>
  );
}
