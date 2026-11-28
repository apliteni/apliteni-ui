import { Pagination } from '../Pagination';
import type { useTablePaging } from './paging';
import type { usePagerStrip } from './frame';

type Paging = Pick<ReturnType<typeof useTablePaging<unknown>>, 'owned' | 'ordered' | 'page' | 'size' | 'goTo' | 'onSizeChange'>;

export function TablePager({ paging, strip: { holdPagerBox, strip }, total, hasMore, pageSizes, loading, pagerLabel }: {
  paging: Paging; strip: ReturnType<typeof usePagerStrip>;
  total: number | null | undefined; hasMore: boolean; pageSizes: readonly number[] | null; loading: boolean; pagerLabel?: string;
}) {
  return (
    // The strip that pages a table may not be wider than the rows it pages (#504).
    // The two are siblings, and no selector sizes one to the other, so the width is
    // measured: a cap rather than a width, so a pager wider than the table wraps
    // inside it and a table wider than the room still leaves the strip in the room.
    <div className="rx-table-pager" ref={holdPagerBox}
      style={strip ? { maxWidth: strip.width, marginInlineStart: strip.inset || undefined } : undefined}>
      <Pagination page={paging.page} pageSize={paging.size} total={paging.owned ? paging.ordered.length : total ?? null}
        hasMore={hasMore} pageSizes={pageSizes} loading={loading}
        {...(pagerLabel === undefined ? {} : { label: pagerLabel })}
        onPageChange={paging.goTo}
        onPageSizeChange={paging.onSizeChange} />
    </div>
  );
}
