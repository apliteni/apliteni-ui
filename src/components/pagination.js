// Pagination — the position sentence and the control, as HTML strings.
//
// The indicator is a ROW RANGE, not a page number: `1–100 of 4,812`. A page
// number answers which slice you are on; a range answers how much there is,
// which is what a reader of a ledger asks.
//
// A total is a capability, not a given. An overshoot pager (`LIMIT n+1`) knows
// only whether another row exists, so it says `1–100 of more than 100` — except
// on the last page, where the total IS knowable and we state it exactly.

const group = (n) => Number(n).toLocaleString('en-US');

// The sentence on its own, without the control around it. Exported because the
// guidelines page and the React wrapper both need it; two implementations of one
// sentence is how they drift apart.
export function pagerRange({ page, perPage, total, hasMore, rowsOnPage } = {}) {
  const from = (page - 1) * perPage + 1;
  if (total != null) {
    if (total === 0) return '0 of 0';
    return `${group(from)}–${group(Math.min(page * perPage, total))} of ${group(total)}`;
  }
  const to = from + rowsOnPage - 1;
  if (to < from) return '0 of 0';
  // `hasMore` is the only thing the query paid for. Without it there is no last
  // page to recognise, so the range would silently claim a total it never had.
  return hasMore ? `${group(from)}–${group(to)} of more than ${group(to)}` : `${group(from)}–${group(to)} of ${group(to)}`;
}
