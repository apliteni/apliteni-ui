import { useMemo, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '@apliteni/apliteni-ui';
import { sizeOf } from '../Pagination';
import type { Column, TableSort } from './columns';

// The absence of a sort, as a value: the order is whatever the rows arrived in.
const NO_SORT = { key: undefined, dir: -1 } as const;

// why: docs/components.md#data-table
// Every path returns a copy. Values must be comparable with JavaScript < and >.
export function sortTableRows<T>(rows: T[], sort: TableSort<T>): T[] {
  if (sort.key === undefined) return [...rows];
  const key = sort.key;
  return [...rows].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * sort.dir);
}

type PagingInput<T> = {
  columns: Column<T>[]; rows: T[];
  controlledSort: TableSort<T> | undefined; onSortChange: ((sort: TableSort<T>) => void) | undefined;
  controlledPage: number | undefined; onPageChange: ((page: number) => void) | undefined;
  pageSize: number | undefined; onPageSizeChange: ((size: number) => void) | undefined;
};

// The sort and the page of a table, owned here or by the caller.
export function useTablePaging<T>({
  columns, rows, controlledSort, onSortChange, controlledPage, onPageChange, pageSize, onPageSizeChange,
}: PagingInput<T>) {
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
  const onSizeChange = (s: number) => {
    if (pageSize === undefined) setLocalSize(s);
    onPageSizeChange?.(s);
    // A size change already means page 1, so a controlled table reports
    // the size and stops: the onPageChange(1) that used to follow it
    // carried the old size, and an owner refetching on either call
    // landed back on the size the reader had just replaced.
    if (owned) setLocalPage(1);
  };
  return { owned, sort, sortIsKnown, size, ordered, page, slice, goTo, onSort, onSizeChange };
}
