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
import { pager, pagerRange } from './pagination.js';

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

/* Rule: the control is real HTML — a labelled landmark, real links when the
 * caller can express a page as a URL, real buttons when it cannot, and never one
 * faked with the other. A button fires on Enter and Space, a link on Enter
 * alone, and a reader who learned one does not get the other silently.
 */

test('the pager is a labelled navigation landmark', () => {
  const html = pager({ page: 1, perPage: 25, total: 100 });
  assert.match(html, /<nav[^>]+aria-label="Pagination"/);
});

test('href turns the controls into real links', () => {
  const html = pager({ page: 2, perPage: 25, total: 100, href: (p) => `?page=${p}` });
  assert.match(html, /<a[^>]+href="\?page=1"[^>]*aria-label="Go to previous page"/);
});

test('without href the controls are real buttons', () => {
  const html = pager({ page: 2, perPage: 25, total: 100 });
  assert.match(html, /<button[^>]+type="button"[^>]*aria-label="Go to previous page"/);
});

test('the numbered tier marks the page the reader is on', () => {
  const html = pager({ page: 2, perPage: 25, total: 100, tier: 'numbered' });
  assert.match(html, /aria-current="page"/);
});

test('the numbered tier refuses an unknown total instead of drawing a false last page', () => {
  assert.throws(
    () => pager({ page: 1, perPage: 25, hasMore: true, rowsOnPage: 25, tier: 'numbered' }),
    /numbered .* requires a total/i,
  );
});

test('a single known page draws nothing', () => {
  assert.equal(pager({ page: 1, perPage: 25, total: 10 }), '');
});

test('the advanced tier still draws at one page, because the size control is useful', () => {
  assert.notEqual(pager({ page: 1, perPage: 25, total: 10, tier: 'advanced' }), '');
});

test('busy disables the controls without taking the range off screen', () => {
  const html = pager({ page: 2, perPage: 100, total: 4812, busy: true });
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /disabled/);
  assert.match(html, /101–200 of 4,812/);
});

/* The tier detail: what each of the three actually draws, and what it refuses
 * to draw. `numbered` is Primer's truncation, `advanced` is Carbon's second
 * tier, and neither invents a page the query cannot reach.
 */

// Everything between the controls, glyphs stripped — the strip a reader sees.
const strip = (html) => html
  .replace(/<svg[\s\S]*?<\/svg>/g, '')
  .match(/<div class="ui-pager__controls">([\s\S]*)<\/div>/)[1]
  .replace(/<[^>]+>/g, ' ')
  .split(/\s+/)
  .filter(Boolean)
  .join(' ');

test('the numbered tier truncates around the page you are on, keeping the ends', () => {
  const html = pager({ page: 10, perPage: 25, total: 500, tier: 'numbered' });
  assert.equal(strip(html), 'Previous 1 … 8 9 10 11 12 … 20 Next');
});

test('a gap of one page is drawn as the page, not as an ellipsis', () => {
  const html = pager({ page: 5, perPage: 25, total: 500, tier: 'numbered' });
  assert.equal(strip(html), 'Previous 1 2 3 4 5 6 7 … 20 Next');
});

test('the advanced tier adds first and last to the ends', () => {
  const html = pager({ page: 5, perPage: 25, total: 500, tier: 'advanced' });
  assert.equal(strip(html), 'First Previous Next Last');
  assert.match(html, /aria-label="Go to first page"/);
  assert.match(html, /aria-label="Go to next page"/);
  assert.match(html, /aria-label="Go to last page"/);
});

test('the advanced tier offers a page size, with the current one selected', () => {
  const html = pager({ page: 1, perPage: 25, total: 500, tier: 'advanced' });
  assert.match(html, /Rows per page/);
  assert.match(html, /<select[^>]*class="[^"]*ui-pager__select/);
  assert.match(html, /<option value="25" selected>25<\/option>/);
  assert.match(html, /<option value="100">100<\/option>/);
});

test('a page size nobody offered is still the truth about the table', () => {
  const html = pager({ page: 1, perPage: 30, total: 500, tier: 'advanced', perPageOptions: [10, 25] });
  assert.match(html, /<option value="30" selected>30<\/option>/);
});

test('the advanced tier jumps by number, bounded by the pages that exist', () => {
  const html = pager({ page: 3, perPage: 25, total: 500, tier: 'advanced' });
  assert.match(html, /Go to page/);
  assert.match(html, /<input[^>]+type="number"[^>]*min="1"[^>]*max="20"[^>]*value="3"/);
});

test('an unknown total has no last page, so the control is absent rather than dead', () => {
  const html = pager({ page: 2, perPage: 25, hasMore: true, rowsOnPage: 25, tier: 'advanced' });
  assert.equal(strip(html), 'First Previous Next');
  assert.doesNotMatch(html, /Go to last page/);
  assert.doesNotMatch(html, /max="/);
});

test('every control names the page it goes to, so a consumer can wire one handler', () => {
  const html = pager({ page: 3, perPage: 25, total: 500, tier: 'advanced' });
  assert.match(html, /aria-label="Go to first page" data-page="1"/);
  assert.match(html, /aria-label="Go to previous page" data-page="2"/);
  assert.match(html, /aria-label="Go to next page" data-page="4"/);
  assert.match(html, /aria-label="Go to last page" data-page="20"/);
});

/* Announcing the new range belongs to button mode alone. In link mode the
 * document reloads and the announcement arrives on top of the browser's own.
 */

test('in button mode the range announces itself when it changes', () => {
  const html = pager({ page: 2, perPage: 25, total: 500 });
  assert.match(html, /<span class="ui-pager__range" aria-live="polite" aria-atomic="true">/);
});

test('in link mode the range stays quiet, because the document reloads', () => {
  const html = pager({ page: 2, perPage: 25, total: 500, href: (p) => `?page=${p}` });
  assert.doesNotMatch(html, /aria-live/);
});

/* What the factory refuses. A pager that guesses is worse than one that stops. */

test('an unknown tier is refused rather than silently treated as compact', () => {
  assert.throws(
    () => pager({ page: 1, perPage: 25, total: 500, tier: 'simple' }),
    /unknown tier "simple"/,
  );
});

test('an unknown total without hasMore and rowsOnPage is refused', () => {
  assert.throws(
    () => pager({ page: 1, perPage: 25 }),
    /needs hasMore and rowsOnPage/,
  );
});

// Clamping belongs to the consumer: a bookmarked URL that quietly shows
// different rows is worse than one that shows none.
test('a page past the end renders the range it was given', () => {
  const html = pager({ page: 9, perPage: 25, total: 100 });
  assert.match(html, /201–100 of 100/);
  assert.match(html, /aria-label="Go to next page"[^>]*disabled|disabled[^>]*aria-label="Go to next page"/);
});
