import { pagination, PAGE_SIZES, DEFAULT_PAGE_SIZE } from '../../src/components/pagination.js';
import { card } from '../../src/components/index.js';
import { grid, pad, specimen } from '../_gallery.js';

// One table's worth of rows, paged at the kit's default, so every specimen on
// the page is the same result set seen from a different position: 4,812 rows at
// 100 a page is 49 pages.
const TOTAL = 4812;
const LAST = Math.ceil(TOTAL / DEFAULT_PAGE_SIZE);
const MIDDLE = 25;

export default {
  title: 'Components/Pagination',
  parameters: { layout: 'fullscreen' },
  render: (a) => pad(pagination(a)),
  argTypes: {
    page: { control: 'number' },
    pageSize: { control: 'select', options: PAGE_SIZES },
    // Clear this to leave the total unknown — the shape a cursor API produces,
    // where Prev and Next are the only honest controls.
    total: { control: 'number' },
    hasMore: { control: 'boolean' },
    pageSizes: { control: 'check', options: PAGE_SIZES },
    variant: { control: 'inline-radio', options: ['steps', 'numbered', 'jump'] },
    loading: { control: 'boolean' },
    label: { control: 'text' },
  },
  args: {
    page: MIDDLE,
    pageSize: DEFAULT_PAGE_SIZE,
    total: TOTAL,
    hasMore: true,
    pageSizes: PAGE_SIZES,
    variant: 'steps',
    loading: false,
    label: 'Pagination',
  },
};

export const Playground = {};

// A heading between groups of specimens. Every pager here carries its own
// aria-label and its own id: several <nav>s on one page need telling apart, and
// two labels pointing at one id is a real defect the a11y gate would catch.
const heading = (title, note) =>
  `<div style="margin:34px 0 6px">
     <div style="font:600 15.5px/1.3 var(--font-sans);color:var(--strong)">${title}</div>
     <div style="font:400 13px/1.5 var(--font-sans);color:var(--muted);max-width:62ch">${note}</div>
   </div>`;

const at = (variant, page, extra = {}) => pagination({
  variant,
  page,
  pageSize: DEFAULT_PAGE_SIZE,
  total: TOTAL,
  id: `${variant}-${page}`,
  label: `${variant}, page ${page} of ${LAST}`,
  ...extra,
});

// The three variants at one page position. They go into ONE grid with the other
// six below, so all nine sit on the same rhythm and can be read against each
// other — choosing between them is what this page is for.
const trio = (page, where) => [
  specimen(`Steps · ${where}`, at('steps', page)),
  specimen(`Numbered · ${where}`, at('numbered', page)),
  specimen(`Jump · ${where}`, at('jump', page)),
];

export const Gallery = {
  render: () => pad(`
    ${heading('The three variants', `The same ${TOTAL.toLocaleString('en-US')} rows at ${DEFAULT_PAGE_SIZE} a page — ${LAST} pages — seen from the start, the middle and the end. A control at an end is disabled, never removed: it keeps its place in the row, and a screen reader still meets it.`)}
    ${grid(
    1,
    ...trio(1, 'first page'),
    ...trio(MIDDLE, `page ${MIDDLE} of ${LAST}`),
    ...trio(LAST, 'last page'),
  )}

    ${heading('The size control', 'Offered or not, per call site. It sits between the status and the steps, so the steps stay where the reader last left them.')}
    ${grid(
    1,
    specimen('With rows-per-page', pagination({
      page: MIDDLE, pageSize: DEFAULT_PAGE_SIZE, total: TOTAL, pageSizes: PAGE_SIZES,
      id: 'sized', label: `Pagination with a size control, page ${MIDDLE} of ${LAST}`,
    })),
    specimen('Without', at('steps', MIDDLE, { id: 'unsized', label: 'Pagination with no size control' })),
  )}

    ${heading('An unknown total', 'A cursor API cannot count what it has not fetched, so there is no last page to aim at: Prev and Next only, and the status says which page you are on rather than inventing a range. Next goes off when the caller says nothing follows.')}
    ${grid(
    1,
    specimen('More to come', pagination({
      page: 3, total: null, hasMore: true, id: 'open-more', label: 'Pagination, unknown total, more rows',
    })),
    specimen('Nothing after this page', pagination({
      page: 3, total: null, hasMore: false, id: 'open-end', label: 'Pagination, unknown total, at the end',
    })),
  )}

    ${heading('Loading', 'Every control off and aria-busy on the nav. Nothing moves and nothing goes: the row range stays readable while the next page arrives, which is the number the reader is waiting on.')}
    ${grid(
    1,
    specimen('Steps', pagination({
      page: MIDDLE, pageSize: DEFAULT_PAGE_SIZE, total: TOTAL, pageSizes: PAGE_SIZES, loading: true,
      id: 'busy-steps', label: 'Pagination, loading',
    })),
    specimen('Numbered', pagination({
      page: MIDDLE, pageSize: DEFAULT_PAGE_SIZE, total: TOTAL, variant: 'numbered', loading: true,
      id: 'busy-numbered', label: 'Pagination, numbered, loading',
    })),
  )}

    ${heading('One page of content', 'GOV.UK: “Do not show pagination if there’s only one page of content.” With sizes on offer the nav stays for the size control alone — somebody looking at 12 of 12 rows may still want a bigger page. With nothing to choose, the component renders nothing at all.')}
    ${grid(
    1,
    specimen('12 rows, sizes offered', pagination({
      page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 12, pageSizes: PAGE_SIZES,
      id: 'single', label: 'Rows per page',
    })),
    specimen(
      '12 rows, no sizes offered',
      `<div style="border:1px dashed var(--border);border-radius:var(--radius-sm);padding:var(--space-4);color:var(--muted);font:400 13px/1.5 var(--font-sans)">`
      + `${pagination({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 12 })}`
      + 'The dashed box is this story’s, not the kit’s: pagination() returned an empty string.</div>',
    ),
  )}

    ${heading('Pages as links', 'Given an href, a step renders as an anchor a reader can open in a new tab. An end that is off renders as a disabled button instead — an anchor has no disabled state, and a link that goes nowhere reads as available right up until it is followed.')}
    ${grid(
    1,
    specimen('First page, href given', pagination({
      page: 1, pageSize: DEFAULT_PAGE_SIZE, total: TOTAL, variant: 'numbered',
      href: (p) => `?page=${p}`, id: 'linked', label: 'Pagination as links, first page',
    })),
  )}
  `),
};

// Where a pager actually lives: under a table, inside the card the table sits
// in. The gallery above is on the page ground, and a boxless disabled button
// reads differently on every ground, so this is the specimen #273 was judged on —
// First and Prev off beside Next and Last on, at the first page and the last.
export const InACard = {
  name: 'In a card',
  render: () => pad(grid(
    1,
    card({
      title: 'Transactions',
      body: pagination({
        page: 1, pageSize: DEFAULT_PAGE_SIZE, total: TOTAL,
        id: 'card-first', label: `Transactions, page 1 of ${LAST}`,
      }),
    }),
    card({
      title: 'Transactions',
      body: pagination({
        page: LAST, pageSize: DEFAULT_PAGE_SIZE, total: TOTAL,
        id: 'card-last', label: `Transactions, page ${LAST} of ${LAST}`,
      }),
    }),
  )),
};
