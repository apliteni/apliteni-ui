/* Rule: the position indicator is a ROW RANGE, and it never implies a total the
 * caller did not have.
 *
 * "Page 1 of 6" answers half the question — how many rows is the half a reader
 * of a ledger actually asks. And on an overshoot pager (`LIMIT n+1`, the shape
 * two Finance surfaces already run) there is no total to state at all, except on
 * the last page, where it is arithmetic: (page - 1) * perPage + rowsOnPage.
 *
 * why: docs/specification.md, "Table pagination"
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pagerRange } from './pagination.js';

test('a known total reads as a grouped row range', () => {
  assert.equal(pagerRange({ page: 1, perPage: 100, total: 4812 }), '1–100 of 4,812');
});

test('an unknown total with more pages says so rather than inventing one', () => {
  assert.equal(
    pagerRange({ page: 1, perPage: 100, hasMore: true, rowsOnPage: 100 }),
    '1–100 of more than 100',
  );
});

test('the last page of an overshoot pager resolves the total exactly', () => {
  assert.equal(
    pagerRange({ page: 3, perPage: 100, hasMore: false, rowsOnPage: 47 }),
    '201–247 of 247',
  );
});

// The pager itself draws nothing over an empty table — the empty state belongs
// to the table. The sentence still has to answer when asked directly, and the
// only honest answer over no rows is that there are none.
test('no rows reads as none, in both total shapes', () => {
  assert.equal(pagerRange({ page: 1, perPage: 25, total: 0 }), '0 of 0');
  assert.equal(pagerRange({ page: 1, perPage: 25, hasMore: false, rowsOnPage: 0 }), '0 of 0');
});
