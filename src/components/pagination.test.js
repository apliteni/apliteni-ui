import { test } from 'node:test';
import assert from 'node:assert/strict';
import { button } from './index.js';
import { pagination, PAGE_SIZES, DEFAULT_PAGE_SIZE } from './pagination.js';

/** Every step/page control in document order, as [tag, page, disabled, label]. */
const controls = (html) =>
  [...html.matchAll(/<(button|a)\b([^>]*)>([^<]*)</g)]
    .filter((m) => /ui-pager__(step|page)/.test(m[2]))
    .map((m) => ({
      tag: m[1],
      page: Number(/data-page="(\d+)"/.exec(m[2])[1]),
      disabled: / disabled\b/.test(m[2]),
      label: m[3],
    }));

const labels = (html) => controls(html).map((c) => c.label);
const byLabel = (html, label) => controls(html).find((c) => c.label === label);

/** The middle of a numbered strip: page numbers and gaps, in document order. */
const SLOT = /class="[^"]*ui-pager__page[^"]*"[^>]*data-page="(\d+)"|class="ui-pager__gap"/g;
const slots = (html) => [...html.matchAll(SLOT)].map((m) => (m[1] ? Number(m[1]) : '…'));

const numbered = (page, pageCount) =>
  slots(pagination({ page, pageSize: 10, total: pageCount * 10, variant: 'numbered' }));

// ---- the classes, which a React component will be held to ------------------

// The kit has one ghost/sm button and the pager may not become a second one. The
// class list is read off button() rather than repeated, so a change there fails
// here instead of leaving two definitions of the same control.
test('every pager control carries exactly the classes button({ghost, sm}) emits', () => {
  const ghostSm = /class="([^"]+)"/.exec(button({ variant: 'ghost', size: 'sm' }))[1];
  assert.equal(ghostSm, 'ui-btn ui-btn--ghost ui-btn--sm', 'button() no longer emits the trio the pager copies');

  const html = pagination({ page: 4, pageSize: 10, total: 400, variant: 'numbered' });
  const classes = [...html.matchAll(/<(?:button|a)[^>]*class="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(classes.length >= 5, 'no controls found — the sweep is reading nothing');
  for (const cls of classes) {
    assert.ok(
      cls === `${ghostSm} ui-pager__step`
      || cls === `${ghostSm} ui-pager__page`
      || cls === `${ghostSm} ui-pager__page is-current`,
      `a pager control is classed "${cls}", which is not ${ghostSm} plus one pager class`,
    );
  }
});

test('the disabled attributes match the pair button() writes', () => {
  const off = /(<button[^>]*)>/.exec(button({ variant: 'ghost', size: 'sm', disabled: true }))[1];
  assert.match(off, / disabled aria-disabled="true"/);
  const html = pagination({ page: 1, pageSize: 10, total: 400 });
  assert.match(html, /data-page="1" disabled aria-disabled="true">First</);
});

// ---- a control at an end is disabled, never removed ------------------------

test('page 1 keeps First and Prev, disabled — they do not disappear', () => {
  const html = pagination({ page: 1, pageSize: 10, total: 400 });
  assert.deepEqual(labels(html), ['First', 'Prev', 'Next', 'Last']);
  assert.equal(byLabel(html, 'First').disabled, true);
  assert.equal(byLabel(html, 'Prev').disabled, true);
  assert.equal(byLabel(html, 'Next').disabled, false);
  assert.equal(byLabel(html, 'Last').disabled, false);
});

test('the last page keeps Next and Last, disabled', () => {
  const html = pagination({ page: 40, pageSize: 10, total: 400 });
  assert.deepEqual(labels(html), ['First', 'Prev', 'Next', 'Last']);
  assert.equal(byLabel(html, 'Next').disabled, true);
  assert.equal(byLabel(html, 'Last').disabled, true);
  assert.equal(byLabel(html, 'First').disabled, false);
});

test('a disabled end is a <button> even when href would make it an anchor', () => {
  // An <a> cannot be disabled, and a link that goes nowhere reads as available
  // right up until it is followed.
  const html = pagination({ page: 1, pageSize: 10, total: 400, href: (p) => `/rows?page=${p}` });
  assert.equal(byLabel(html, 'First').tag, 'button');
  assert.equal(byLabel(html, 'Prev').tag, 'button');
  assert.equal(byLabel(html, 'Next').tag, 'a');
  assert.match(html, /<a href="\/rows\?page=2"/);
});

test('loading disables every control and announces itself on the nav, removing nothing', () => {
  const live = pagination({ page: 4, pageSize: 10, total: 400, variant: 'jump', pageSizes: PAGE_SIZES });
  const busy = pagination({
    page: 4, pageSize: 10, total: 400, variant: 'jump', pageSizes: PAGE_SIZES, loading: true,
  });
  assert.match(busy, /<nav[^>]* aria-busy="true"/);
  assert.deepEqual(labels(busy), labels(live), 'loading removed a control');
  assert.deepEqual(controls(busy).map((c) => c.disabled), [true, true, true, true]);
  assert.match(busy, /<select[^>]* disabled>/, 'the size control stays clickable while it loads');
  assert.match(busy, /<input[^>]* disabled>/, 'the jump input stays typeable while it loads');
  // The row range is what a reader is waiting on; it must survive the state.
  assert.match(busy, /31–40 of 400/);
});

// ---- the numbered strip's truncation ---------------------------------------

// (page, pageCount) → the slots the strip shows, `…` for a gap. Written out by
// hand from the rules rather than generated: 1 and the last page are always
// there, the current page brings a neighbour each side, and a run that is cut
// leaves one gap — unless the run is a single page, which is drawn instead.
//
// Two pages is where the table starts: one page draws no strip at all, which is
// the single-page rule below rather than a truncation of anything.
const TRUNCATION = [
  [1, 2, [1, 2]],
  [1, 4, [1, 2, 3, 4]],
  [1, 5, [1, 2, '…', 5]],
  [3, 5, [1, 2, 3, 4, 5]],
  [3, 9, [1, 2, 3, 4, '…', 9]],
  [4, 9, [1, 2, 3, 4, 5, '…', 9]],
  [5, 9, [1, '…', 4, 5, 6, '…', 9]],
  [6, 9, [1, '…', 5, 6, 7, 8, 9]],
  [7, 9, [1, '…', 6, 7, 8, 9]],
  [9, 9, [1, '…', 8, 9]],
  [2, 100, [1, 2, 3, '…', 100]],
  [50, 100, [1, '…', 49, 50, 51, '…', 100]],
  [99, 100, [1, '…', 98, 99, 100]],
  [100, 100, [1, '…', 99, 100]],
];

for (const [page, pageCount, expected] of TRUNCATION) {
  test(`numbered: page ${page} of ${pageCount} → ${expected.join(' ')}`, () => {
    assert.deepEqual(numbered(page, pageCount), expected);
  });
}

test('numbered: no strip is longer than seven slots, anywhere', () => {
  for (let pageCount = 2; pageCount <= 40; pageCount += 1) {
    for (let page = 1; page <= pageCount; page += 1) {
      const got = numbered(page, pageCount);
      assert.ok(got.length <= 7, `page ${page} of ${pageCount} drew ${got.length} slots: ${got.join(' ')}`);
    }
  }
});

test('numbered: never two gaps together, and never a gap hiding one page', () => {
  for (let pageCount = 2; pageCount <= 40; pageCount += 1) {
    for (let page = 1; page <= pageCount; page += 1) {
      const got = numbered(page, pageCount);
      const where = `page ${page} of ${pageCount}: ${got.join(' ')}`;
      assert.equal(got[0], 1, `${where} — the first page is always a slot`);
      assert.equal(got[got.length - 1], pageCount, `${where} — the last page is always a slot`);
      assert.ok(got.includes(page), `${where} — the current page is always a slot`);
      got.forEach((slot, i) => {
        if (slot !== '…') return;
        assert.notEqual(got[i + 1], '…', `${where} — two gaps side by side`);
        const before = got[i - 1];
        const after = got[i + 1];
        assert.ok(
          typeof before === 'number' && typeof after === 'number' && after - before > 2,
          `${where} — a gap standing in for ${after - before - 1} page(s); at one, draw the page`,
        );
      });
    }
  }
});

test('numbered: the current page is the one marked, and First/Last are not drawn', () => {
  const html = pagination({ page: 5, pageSize: 10, total: 90, variant: 'numbered' });
  assert.deepEqual(labels(html).filter((l) => l === 'First' || l === 'Last'), []);
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  assert.match(html, /ui-pager__page is-current" data-page="5" aria-current="page">5</);
});

// ---- the open shape: no total, so no last page -----------------------------

test('an unknown total renders Prev and Next only — no First, no Last, no numbers', () => {
  for (const variant of ['steps', 'numbered', 'jump']) {
    const html = pagination({ page: 3, total: null, hasMore: true, variant });
    assert.deepEqual(labels(html), ['Prev', 'Next'], `${variant} drew a control it cannot aim`);
    assert.doesNotMatch(html, /ui-pager__page|ui-pager__jump|ui-pager__gap/, `${variant} drew a middle`);
    assert.match(html, /class="ui-pager ui-pager--[a-z]+ ui-pager--open"/);
    assert.match(html, />Page 3</, 'the status cannot count what it has not been told');
  }
});

test('the open shape takes its ends from page and hasMore', () => {
  const first = pagination({ page: 1, total: null, hasMore: true });
  assert.equal(byLabel(first, 'Prev').disabled, true);
  assert.equal(byLabel(first, 'Next').disabled, false);

  const end = pagination({ page: 7, total: null, hasMore: false });
  assert.equal(byLabel(end, 'Prev').disabled, false);
  assert.equal(byLabel(end, 'Next').disabled, true);
});

// ---- one page of content ---------------------------------------------------

test('one page and nothing to choose renders nothing at all', () => {
  // GOV.UK: "Do not show pagination if there's only one page of content."
  assert.equal(pagination({ page: 1, pageSize: 100, total: 12 }), '');
  assert.equal(pagination({ page: 1, pageSize: 100, total: 0 }), '');
  assert.equal(pagination({ page: 1, pageSize: 100, total: 12, pageSizes: [] }), '');
  assert.equal(pagination({ page: 1, pageSize: 100, total: 12, variant: 'numbered' }), '');
});

test('one page with sizes on offer keeps the nav, the status and the size control', () => {
  const html = pagination({ page: 1, pageSize: 100, total: 12, pageSizes: PAGE_SIZES });
  assert.match(html, /class="ui-pager ui-pager--steps ui-pager--single"/);
  assert.match(html, />1–12 of 12</);
  assert.match(html, /ui-pager__size-select/);
  assert.doesNotMatch(html, /ui-pager__steps/, 'a single page has no step to take');
  assert.deepEqual(controls(html), []);
});

// ---- numbers off a URL -----------------------------------------------------

test('a page past the end clamps to the last page', () => {
  const html = pagination({ page: 999, pageSize: 100, total: 4812 });
  assert.match(html, />4,801–4,812 of 4,812</);
  assert.equal(byLabel(html, 'Prev').page, 48);
  assert.equal(byLabel(html, 'Next').disabled, true);
  assert.equal(byLabel(html, 'Next').page, 49, 'a disabled control still points somewhere real');
});

test('a page below 1 clamps to 1', () => {
  for (const page of [0, -5, '-5']) {
    const html = pagination({ page, pageSize: 100, total: 4812 });
    assert.match(html, />1–100 of 4,812</, `page ${page}`);
    assert.equal(byLabel(html, 'Prev').disabled, true);
    assert.equal(byLabel(html, 'Prev').page, 1, 'no control points at page 0');
  }
});

test('nothing a URL can carry reaches the markup as NaN', () => {
  const html = pagination({ page: 'abc', pageSize: 'x', total: 'many', pageSizes: ['nope', 25] });
  assert.doesNotMatch(html, /NaN|undefined|Infinity/);
  // An uncountable total is an unknown total: the open shape is the honest answer.
  assert.match(html, /ui-pager--open/);
  assert.deepEqual(labels(html), ['Prev', 'Next']);
});

test('the numbers in the status are grouped, and the range takes an en dash', () => {
  const html = pagination({ page: 2, pageSize: 100, total: 4812 });
  assert.match(html, />101–200 of 4,812</);
  assert.doesNotMatch(html, />101-200/, 'a hyphen is not a range');
});

test('a total nobody can page through still reads as a sentence', () => {
  // 1–0 of 0 and 7–7 of 7 are both arithmetic a reader has to undo.
  assert.match(pagination({ page: 1, pageSize: 10, total: 0, pageSizes: [10] }), />0 of 0</);
  assert.match(pagination({ page: 3, pageSize: 1, total: 3 }), />3 of 3</);
});

// ---- the announcement, the label and the ids -------------------------------

test('the status line is the only live region in the component', () => {
  const html = pagination({ page: 2, pageSize: 10, total: 400, variant: 'jump', pageSizes: PAGE_SIZES });
  assert.equal((html.match(/aria-live=/g) || []).length, 1);
  assert.match(html, /<p class="ui-pager__status" aria-live="polite" aria-atomic="true">/);
});

test('id seeds both label/control pairs, and label names the nav', () => {
  const html = pagination({
    page: 2, pageSize: 10, total: 400, variant: 'jump', pageSizes: PAGE_SIZES,
    id: 'payouts', label: 'Payout pages',
  });
  assert.match(html, /<label class="ui-pager__size-label" for="payouts-size">Rows<\/label>/);
  assert.match(html, /<select class="ui-select ui-pager__size-select" id="payouts-size"/);
  assert.match(html, /<label for="payouts-jump">Page<\/label>/);
  assert.match(html, /<input class="ui-input ui-pager__jump-input" id="payouts-jump"/);
  assert.match(html, /aria-label="Payout pages"/);
});

test('a caller string cannot break out of the attribute it is written into', () => {
  // `id` reaches four attributes and `label` one, so both are exercised where
  // they are actually written: a pager with a size control and a jump input.
  const html = pagination({
    page: 2, pageSize: 10, total: 400, variant: 'jump', pageSizes: PAGE_SIZES,
    id: '"><script>x</script>', label: '"><b>x</b>',
  });
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /for="&quot;&gt;&lt;script&gt;/, 'the id is escaped where it is used');
});

// ---- the size control ------------------------------------------------------

test('the size control offers the sizes given, selecting the one in use', () => {
  const html = pagination({ page: 1, pageSize: 50, total: 4812, pageSizes: PAGE_SIZES });
  assert.deepEqual(
    [...html.matchAll(/<option value="(\d+)"( selected)?>/g)].map((m) => [Number(m[1]), Boolean(m[2])]),
    PAGE_SIZES.map((s) => [s, s === 50]),
  );
});

test('a page size missing from the list is offered anyway, in its place', () => {
  // A <select> whose value is not among its options renders as the first one,
  // which reports a page size the table is not using.
  const html = pagination({ page: 1, pageSize: 75, total: 4812, pageSizes: PAGE_SIZES });
  assert.deepEqual(
    [...html.matchAll(/<option value="(\d+)"( selected)?>/g)].map((m) => [Number(m[1]), Boolean(m[2])]),
    [[25, false], [50, false], [75, true], [100, false]],
  );
});

test('no sizes on offer means no size control at all', () => {
  for (const pageSizes of [null, undefined, []]) {
    const html = pagination({ page: 2, pageSize: 100, total: 4812, pageSizes });
    assert.doesNotMatch(html, /ui-pager__size/, String(pageSizes));
  }
});

// ---- the constants ---------------------------------------------------------

test('the kit ships one page-size scale, and starts on a step of it', () => {
  assert.ok(Array.isArray(PAGE_SIZES) && PAGE_SIZES.length > 0);
  assert.ok(
    PAGE_SIZES.includes(DEFAULT_PAGE_SIZE),
    'the default page size is not one of the sizes offered, so the first render disagrees '
    + 'with the control that reports it',
  );
  assert.deepEqual([...PAGE_SIZES].sort((a, b) => a - b), PAGE_SIZES, 'the scale is not in order');
});

test('pagination() defaults to the shipped page size rather than a number of its own', () => {
  const html = pagination({ page: 1, total: DEFAULT_PAGE_SIZE * 3 });
  assert.match(html, new RegExp(`>1–${DEFAULT_PAGE_SIZE.toLocaleString('en-US')} of `));
});
