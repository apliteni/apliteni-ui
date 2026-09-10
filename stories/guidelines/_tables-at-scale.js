// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { pager } from '../../src/components/pagination.js';

export const TITLE = 'Tables at scale';

export const BLURB = 'What a pager owes the reader of a long table: their position, an honest total, and a way back to it.';

// Every specimen on this page is a real pager() call. That is not decoration —
// three of the four don'ts here are wrong in an ARGUMENT the consumer passed,
// and the whole point is that the same factory renders both halves. A don't
// faked in markup would prove nothing about the kit.
//
// The stage is the shared .gl-stage with the pager's own leading margin taken
// off: .ui-pager carries margin-top: 16px so it clears the table it sits under,
// and the first pager in a specimen has no table above it.
export const SPEC_CSS = `
  <style>
    .gl-stage--pager > .ui-pager:first-child { margin-top: 0; }
    /* The ledger under rule 3's pair, so "a second pager beneath the first"
       has a first to be beneath. Dressing, not the specimen. */
    .gl-ledger { width: 100%; }
    .gl-ledger td, .gl-ledger th { white-space: nowrap; }
  </style>`;

const stage = (html) => `<div class="gl-stage gl-stage--pager">${html}</div>`;

const ROWS = [
  ['TXN-4812', 'Settled', '€1,204.00'],
  ['TXN-4811', 'Settled', '€96.40'],
  ['TXN-4810', 'Pending', '€18,204.60'],
];

// A short ledger in the kit's own table CSS. Rule 3 is about how many pagers a
// table gets, and that question needs a table on screen to mean anything.
const ledger = () => `
  <table class="ui-table ui-table--dense gl-ledger">
    <thead><tr>
      <th scope="col">Transaction</th><th scope="col">Status</th>
      <th scope="col" class="ui-table__num">Amount</th>
    </tr></thead>
    <tbody>${ROWS.map(([id, status, amount]) => `
      <tr><td class="ui-table__code">${id}</td><td>${status}</td>
        <td class="ui-table__num">${amount}</td></tr>`).join('')}
    </tbody>
  </table>`;

// --- Rule 2: the total ------------------------------------------------------
// One argument apart. The do states what an overshoot query knows; the don't
// passes the rows on THIS page as the total, and the factory faithfully reports
// a finished table over a server page with 4,812 rows behind it.
export const totalDo = () => stage(pager({
  page: 1, perPage: 100, hasMore: true, rowsOnPage: 100, tier: 'advanced', label: 'Payouts pagination',
}));
export const totalDont = () => stage(pager({
  page: 1, perPage: 100, total: 100, tier: 'advanced', label: 'Payouts pagination, stated total',
}));

// --- Rule 3: how many pagers ------------------------------------------------
export const onePagerDo = () => stage(ledger() + pager({
  page: 3, perPage: 100, total: 4812, label: 'Transactions pagination',
}));
export const onePagerDont = () => stage(ledger()
  + pager({ page: 3, perPage: 100, total: 4812, label: 'Transactions pagination, server' })
  + pager({ page: 1, perPage: 25, total: 100, label: 'Transactions pagination, this page' }));

// --- Rule 4: how many rows --------------------------------------------------
export const sizeDo = () => stage(pager({
  page: 1, perPage: 25, total: 4812, tier: 'advanced', label: 'Invoices pagination',
}));
export const sizeDont = () => stage(pager({
  page: 1, perPage: 4, total: 4812, tier: 'advanced', label: 'Invoices pagination, four rows a page',
}));

// --- Rule 7: the fetch in flight --------------------------------------------
// Both halves are busy. The difference is what the consumer kept while it waited.
export const loadingDo = () => stage(pager({
  page: 4, perPage: 100, total: 4812, busy: true, label: 'Refunds pagination',
}));
export const loadingDont = () => stage(pager({
  page: 1, perPage: 100, hasMore: true, rowsOnPage: 100, busy: true,
  label: 'Refunds pagination, reset while loading',
}));

export const RULES = [
  {
    id: 'range',
    imperative: 'Say how much there is, not only which page the reader is on.',
    why: 'Page 3 of 49 answers which slice you were handed. 201–300 of 4,812 answers how much '
      + 'there is, where in it you are standing, and how far the rest goes — which is what '
      + 'somebody reconciling a ledger actually asked. Four surfaces of the Finance portal each '
      + 'answered the first question or neither: two say Page N of M, two say Newer and Older '
      + 'with no position at all. Nobody chose that; it is what a kit with a component and no '
      + 'rule for it produces. This page\'s don\'t cannot be drawn, and that is the rule working '
      + 'rather than a gap in it: no argument to pagerRange yields a bare page number, so the '
      + 'factory cannot state one. The rule is enforced in the code instead of asked for in prose.',
    kit: [
      { ref: 'src/components/pagination.js:24', pattern: 'export function pagerRange' },
      { ref: 'src/styles/pagination.css:24', pattern: '.ui-pager__range' },
    ],
  },
  {
    id: 'unknown-total',
    imperative: 'When the query never counted the rows, say so. Never state a total you were not given.',
    why: 'A total is a capability, not a given: COUNT(*) over a large table is a second query and '
      + 'somebody has to pay for it. The honest alternative is an overshoot — ask for one row more '
      + 'than the page needs — and the sentence then stops exactly where the knowledge does.',
    except: 'the last page, where hasMore comes back false and the total stops being a guess: the '
      + 'rows before this page plus the rows on it IS the count, so the pager states it exactly.',
    doCaption: 'LIMIT 101 knows only that a 101st row exists, so the range says more than 100 and '
      + 'nothing further. Next is live; there is no Last, because there is no last page to offer.',
    dontCaption: 'The same call with one argument changed — the 100 rows on this page passed as '
      + 'total. The pager reports a finished table of 100 over a server page with 4,812 rows behind '
      + 'it, and disables all four of the controls that would have carried the reader to them.',
    doHtml: totalDo,
    dontHtml: totalDont,
    kit: [
      { ref: 'src/components/pagination.js:34', pattern: 'of more than' },
      { ref: 'src/components/pagination.js:93', pattern: 'the numbered tier requires a total' },
    ],
  },
  {
    id: 'one-pager',
    imperative: 'One table, one pager. A second one is a second answer to the same question.',
    doCaption: 'The table is paged on the server and says so once: 201–300 of 4,812.',
    dontCaption: 'A client pager under the server pager, each telling the truth about a different '
      + 'thing — 4,812 rows in the table, 100 fetched — and neither saying which. The reader is '
      + 'left to work out that page 1 of 4 lives inside page 3 of 49.',
    doHtml: onePagerDo,
    dontHtml: onePagerDont,
    kit: [
      { ref: 'src/components/pagination.js:141', pattern: 'class="ui-pager__range"' },
      { ref: 'stories/components/Pagination.stories.js:4', pattern: 'Two pagers on one page are two different' },
    ],
  },
  {
    id: 'page-size',
    imperative: 'Start at 25 rows and let the reader change it.',
    why: 'Twenty-five fills a laptop viewport without a scroll and costs one query. Four does not '
      + 'fill anything, and turns reading a table into operating one.',
    except: 'a table nobody reads in bulk — a list of three API keys does not need a page size, '
      + 'and the compact tier draws nothing at all on a single page.',
    doCaption: '25 rows, and the size is the reader\'s: the select carries 10, 25, 50 and 100.',
    dontCaption: '1–4 of 4,812 is 1,203 pages of a table somebody has to reconcile. The select '
      + 'lists 4 alongside the four real steps, because a size the caller is on is still the truth '
      + 'about the table — the list admits the number rather than hiding it.',
    doHtml: sizeDo,
    dontHtml: sizeDont,
    kit: [
      { ref: 'src/components/pagination.js:80', pattern: 'perPageOptions = [10, 25, 50, 100]' },
      { ref: 'src/components/pagination.test.js:129', pattern: 'a page size nobody offered is still the truth' },
    ],
  },
  {
    id: 'keyboard',
    imperative: 'Leave the pager in the tab order and keep it out of the arrow keys.',
    why: 'A pager is a row of links or buttons, and the browser already gives that row Tab, Enter '
      + 'and Space. Binding ArrowLeft and ArrowRight to it takes those keys from whatever else on '
      + 'the page wants them — a grid with roving focus, a text field, the caret the reader is '
      + 'moving through a cell — and gives back nothing they were missing. The one control that '
      + 'needs a key is the advanced tier\'s Go to page field, and a number input already commits '
      + 'on Enter. So there is no keyboard handler to write: the factory ships real anchors and '
      + 'real buttons, and the behaviour is the one the roles carry. That is also why a control '
      + 'with nowhere to go is a disabled button in link mode too — aria-disabled on an anchor is '
      + 'a promise the browser does not keep, and a reader who tabs to it still lands somewhere.',
    kit: [
      { ref: 'src/components/pagination.js:67', pattern: 'disabled aria-disabled="true"' },
      { ref: 'src/components/pagination.js:69', pattern: '<a href=' },
    ],
  },
  {
    id: 'announce',
    imperative: 'Announce the new range, then move focus to the rows it describes.',
    why: 'In button mode the document never reloads, so nothing tells a screen reader the table '
      + 'changed under it. The range is the sentence that did change, and the live region on it is '
      + 'what makes the move audible. In link mode the factory leaves that region off on purpose: '
      + 'the browser reloads and reads the new document, and a live region on top of that reads the '
      + 'position twice. Focus is the half the factory cannot do for you. After a page turns the '
      + 'reader is still on the Next button below a table they have not seen, and Tab from there '
      + 'walks out of the page rather than into it — so send focus to the table, or to its first '
      + 'row, or the pager becomes a control that reads its own label back forever.',
    kit: [
      { ref: 'src/components/pagination.js:140', pattern: 'aria-live="polite"' },
      { ref: 'src/components/pagination.test.js:159', pattern: 'the range announces itself when it changes' },
    ],
  },
  {
    id: 'loading',
    imperative: 'Do not take the reader\'s place away while a fetch is in flight.',
    why: 'The rows are what is loading. The position is not, and it was true a moment ago.',
    except: 'a table that is genuinely empty, which honestly has zero rows: pagerRange returns '
      + '0 of 0 for it, pager() draws no control at all, and the table\'s own empty state takes '
      + 'the space. The fault this rule names is reaching that state mid-fetch, when the reader '
      + 'had a position and the consumer discarded it — not the string itself.',
    doCaption: 'The range holds at 301–400 of 4,812 and only the controls go quiet, so the reader '
      + 'can still read where they are while the rows arrive.',
    dontCaption: 'Also mid-fetch, and the consumer reset to page 1 and dropped the total on the way '
      + 'in. A reader who was on 301–400 of 4,812 a second ago is now told they are at the start of '
      + 'something of unknown size, and has no way to tell whether the fetch moved them.',
    doHtml: loadingDo,
    dontHtml: loadingDont,
    kit: [
      { ref: 'src/components/pagination.js:164', pattern: 'aria-busy' },
      { ref: 'src/styles/pagination.css:94', pattern: '.ui-pager[aria-busy="true"]' },
    ],
  },
  {
    id: 'no-infinite-scroll',
    imperative: 'Do not reach for infinite scroll on a ledger.',
    why: 'It removes the three things a ledger reader needs. There is no stable position — Nielsen '
      + 'Norman put it that in an infinite list "it is hard to remember the location of any '
      + 'specific item and return to it", and returning to one item is the entire job of a '
      + 'reconciliation. There is no deep link, because the scroll offset is not in the URL and the '
      + 'back button lands at the top of a list somebody spent four minutes descending. And there '
      + 'is no sense of how much there is: a scrollbar that keeps growing answers the one question '
      + 'the range answers, with a lie. It also takes the footer with it and breaks Ctrl+F over '
      + 'every row not yet fetched.',
    except: 'a feed, where the argument reverses: nobody bookmarks the 340th post, the reader is '
      + 'browsing rather than looking something up, and there is no total worth stating.',
  },
  {
    id: 'url',
    imperative: 'Put the page in the URL.',
    why: 'A page that lives only in component state cannot be linked, bookmarked, reloaded or '
      + 'reached with the back button, and every one of those is something a reader of a long '
      + 'table does. Pass href and the factory writes real anchors: the browser does the '
      + 'navigation, the URL carries the page, the row is still there tomorrow, and the control '
      + 'works with JavaScript switched off. It also costs nothing — the same call, one argument '
      + 'more. Omit href only for a table that filters in place, and then the consumer owes the '
      + 'reader a history entry of its own.',
    kit: [
      { ref: 'src/components/pagination.js:69', pattern: '<a href=' },
      { ref: 'src/components/pagination.test.js:52', pattern: 'href turns the controls into real links' },
    ],
  },
];
