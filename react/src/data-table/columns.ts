import type { ReactNode } from 'react';

export type Column<T> = {
  key: keyof T & string; label: ReactNode; num?: boolean; sortable?: boolean; render?: (row: T) => ReactNode;
  /**
   * `true` marks this column's body cells as holding one link and nothing else, so the
   * link fills its cell and its focus ring outlines the cell rather than the words. It is
   * the consumer's to declare because CSS counts elements and not words: a cell reading
   * "Invoice 1162" with the number linked looks the same to a selector, and filling that
   * one would put the number on a line of its own. The header cell is never marked — it
   * holds a label, or a sort button that keeps its own ring.
   * why: docs/components.md#data-table
   */
  linked?: boolean;
  /** Renders this column's body cells as row headers (`th scope="row"`), as the kit's compact table does. */
  rowHeader?: boolean;
  /** `title` gives the column the remaining width, `code` sets a handle or id in the table's small text, `long` is running text that wraps in a column wide enough to read, `strong` bolds a figure, `act` right-aligns a row action. */
  cell?: 'title' | 'code' | 'long' | 'strong' | 'act';
  /**
   * The column's set width, such as `'12ch'` or `'160px'`. The column keeps it while the rows
   * change, so a reload does not move the columns. Longer content still widens it. #832
   */
  width?: string;
};
export type TableSort<T> = { key: (keyof T & string) | undefined; dir: 1 | -1 };
export type PinnedIdentity<T> = boolean | (keyof T & string);

export const CELL_CLASS = { title: 'ui-table__title', code: 'ui-table__code', long: 'ui-table__long', strong: 'ui-table__num--strong', act: 'ui-table__act' } as const;

// `true` pins column 0, as it always has. A key pins the column that carries it,
// so a date can stand before the pinned identity. why: docs/components.md#data-table
export const pinnedColumn = <T,>(pinnedIdentity: PinnedIdentity<T> | undefined, key: keyof T & string, index: number) =>
  pinnedIdentity === true ? index === 0 : pinnedIdentity === key;
