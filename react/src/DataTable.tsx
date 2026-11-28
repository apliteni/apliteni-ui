import { Fragment, useRef, type ElementType, type ReactNode } from 'react';
import type { Column, PinnedIdentity, TableSort } from './data-table/columns';
import { useCardRegion, useFocusReveal, useFrameOverflow, usePagerStrip } from './data-table/frame';
import { ColumnWidths, TableHead } from './data-table/Head';
import { TableBody } from './data-table/Body';
import { SelectPageCell, SelectRowCell } from './data-table/Selection';
import { useTablePaging } from './data-table/paging';
import { TablePager } from './data-table/Pager';
import './DataTable.css';

export type { Column, TableSort } from './data-table/columns';
export { sortTableRows } from './data-table/paging';
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
// why: docs/components.md#data-table
type PagerProps =
  | { page?: never; onPageChange?: (page: number) => void; total?: never; hasMore?: never }
  | { page: number; onPageChange: (page: number) => void; total: number; hasMore?: boolean }
  | { page: number; onPageChange: (page: number) => void; total: null; hasMore: boolean };
export type DataTableProps<T> = {
  columns: Column<T>[]; rows: T[];
  /** The kit's `--zebra` and `--hover` (on unless `false`) hooks. */
  zebra?: boolean; hover?: boolean;
  /** @deprecated Ignored. A table no longer stacks its rows on a phone. It scrolls sideways in its frame. The prop stays only so existing calls compile. */
  stack?: boolean;
  /** Marks a row the reader landed on (`target`) or a revoked one (`dead`). A dead row is muted, so put the word that names its state in one of its cells. */
  rowState?: (row: T) => 'target' | 'dead' | undefined;
  /** Table footer rows, such as totals: `<tr>` elements with a `th scope="row"` label. */
  footer?: ReactNode;
  /** A caption read by assistive technology only. */
  caption?: string;
  dense?: boolean; density?: 'default' | 'dense' | 'compact' | 'comfortable'; stickyHeader?: boolean;
  /** `true` pins column 0. A column key pins that column, so a date can stand before the pinned identity. At 560px and below no column is pinned, and the whole table scrolls. */
  pinnedIdentity?: PinnedIdentity<T>; scrollLabel?: string; empty?: ReactNode;
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

type Density = DataTableProps<unknown>['density'];

const tableClass = ({ hover, zebra, dense, density, stickyHeader, pinnedIdentity }: {
  hover: boolean; zebra: boolean; dense: boolean; density: Density; stickyHeader: boolean; pinnedIdentity: unknown;
}) => ['ui-table', hover && 'ui-table--hover', zebra && 'ui-table--zebra', (density === 'dense' || (!density && dense)) && 'ui-table--dense', density === 'compact' && 'ui-table--compact', density === 'comfortable' && 'ui-table--comfortable', stickyHeader && 'ui-table--sticky', pinnedIdentity && 'ui-table--pinned'].filter(Boolean).join(' ');

export function DataTable<T extends { name: string }>({
  columns, rows, zebra = false, hover = true, rowState, footer, caption, dense = false, density, stickyHeader = false, pinnedIdentity = false, scrollLabel = 'Table', empty = 'No rows', pageSize, pageSizes = null, onPageSizeChange, pager = true,
  pagerLabel, loading = false,
  selectable = true, selected = new Set<string>(),
  onToggle = () => {}, onTogglePage = () => {}, sort: controlledSort, onSortChange,
  page: controlledPage, onPageChange, total, hasMore = false,
}: DataTableProps<T>) {
  // A wide table is reached by scrolling it, and by nothing else. The region is a
  // named keyboard stop and draws the kit's inward ring, so a trackpad, a finger
  // and the arrow keys all get to the far columns; the pair of buttons that used to
  // stand above it is retired. why: docs/components.md#data-table
  const scrollable = stickyHeader || pinnedIdentity;
  const sized = columns.some((c) => c.width);
  const table = useRef<HTMLTableElement>(null);
  const strip = usePagerStrip(table, columns, rows);
  const { frame, overflows } = useFrameOverflow(table, scrollable);
  const focusReveal = useFocusReveal();
  const { reveal, press } = focusReveal;
  useCardRegion(table, scrollable, scrollLabel, focusReveal);
  const paging = useTablePaging({ columns, rows, controlledSort, onSortChange, controlledPage, onPageChange, pageSize, onPageSizeChange });
  const { slice } = paging;
  // A table that does not scroll is the card's own child, so the card's bleed reaches it.
  const Wrap: ElementType = scrollable ? 'div' : Fragment;

  return (
    <>
      {/* The rows stay on screen while the next page is fetched, and the table
          says so. A reader who cannot see it otherwise meets a table that is
          silently either current or stale, with no way to tell which. */}
      <Wrap {...(scrollable ? { ref: frame, className: 'ui-table-scroll', role: 'region', 'aria-label': scrollLabel, tabIndex: overflows ? 0 : undefined, onFocus: reveal, onPointerDown: press(true), onPointerUp: press(false), onPointerCancel: press(false) } : {})}>
      <table ref={table} className={tableClass({ hover, zebra, dense, density, stickyHeader, pinnedIdentity })}
        aria-busy={loading || undefined}>
        {caption ? <caption className="ui-sr">{caption}</caption> : null}
        {sized ? <ColumnWidths columns={columns} selectable={selectable} /> : null}
        <TableHead columns={columns} sort={paging.sort} sortIsKnown={paging.sortIsKnown} onSort={paging.onSort}
          pinnedIdentity={pinnedIdentity} selection={selectable
            ? <SelectPageCell names={slice.map((r) => r.name)} selected={selected} onTogglePage={onTogglePage} />
            : null} />
        <TableBody columns={columns} rows={slice} sized={sized} pinnedIdentity={pinnedIdentity}
          rowState={rowState} empty={empty} loading={loading}
          selection={selectable ? (r) => <SelectRowCell name={r.name} selected={selected} onToggle={onToggle} /> : undefined} />
        {footer ? <tfoot>{footer}</tfoot> : null}
      </table>
      </Wrap>
      {/* One page and no size to choose renders nothing at all — the pager's own
          rule, not a second copy of it here. */}
      {pager ? (
        <TablePager paging={paging} strip={strip} total={total} hasMore={hasMore} pageSizes={pageSizes}
          loading={loading} pagerLabel={pagerLabel} />
      ) : null}
    </>
  );
}
