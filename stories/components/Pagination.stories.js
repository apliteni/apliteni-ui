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
  render: (a) => pad(card({ body: pagination(a) })),
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

// A group of specimens under its own heading, on the card. The pager carries a
// size select and a jump input, and a field paints --surface: on light's page
// ground an inert one measured 1.11:1 fill under a 1.12:1 edge, which is what
// stories/field-ground.test.js holds. Every pager here carries its own
// aria-label and its own id: several <nav>s on one page need telling apart, and
// two labels pointing at one id is a real defect the a11y gate would catch.
const section = (title, note, ...specimens) =>
  card({ title, sub: note, body: grid(1, ...specimens) });

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
  render: () => pad(grid(
    1,
    section(
      'The three variants',
      `The same ${TOTAL.toLocaleString('en-US')} rows at ${DEFAULT_PAGE_SIZE} a page — ${LAST} pages — seen from the start, the middle and the end. A control at an end is disabled, never removed: it keeps its place in the row, and a screen reader still meets it.`,
      ...trio(1, 'first page'),
      ...trio(MIDDLE, `page ${MIDDLE} of ${LAST}`),
      ...trio(LAST, 'last page'),
    ),

    section(
      'The size control',
      'Offered or not, per call site. It sits between the status and the steps, so the steps stay where the reader last left them.',
      specimen('With rows-per-page', pagination({
        page: MIDDLE, pageSize: DEFAULT_PAGE_SIZE, total: TOTAL, pageSizes: PAGE_SIZES,
        id: 'sized', label: `Pagination with a size control, page ${MIDDLE} of ${LAST}`,
      })),
      specimen('Without', at('steps', MIDDLE, { id: 'unsized', label: 'Pagination with no size control' })),
    ),

    section(
      'An unknown total',
      'A cursor API cannot count what it has not fetched, so there is no last page to aim at: Prev and Next only, and the status says which page you are on rather than inventing a range. Next goes off when the caller says nothing follows.',
      specimen('More to come', pagination({
        page: 3, total: null, hasMore: true, id: 'open-more', label: 'Pagination, unknown total, more rows',
      })),
      specimen('Nothing after this page', pagination({
        page: 3, total: null, hasMore: false, id: 'open-end', label: 'Pagination, unknown total, at the end',
      })),
    ),

    section(
      'Loading',
      'Every control off and aria-busy on the nav. Nothing moves and nothing goes: the row range stays readable while the next page arrives, which is the number the reader is waiting on.',
      specimen('Steps', pagination({
        page: MIDDLE, pageSize: DEFAULT_PAGE_SIZE, total: TOTAL, pageSizes: PAGE_SIZES, loading: true,
        id: 'busy-steps', label: 'Pagination, loading',
      })),
      specimen('Numbered', pagination({
        page: MIDDLE, pageSize: DEFAULT_PAGE_SIZE, total: TOTAL, variant: 'numbered', loading: true,
        id: 'busy-numbered', label: 'Pagination, numbered, loading',
      })),
    ),

    section(
      'One page of content',
      'GOV.UK: \u201CDo not show pagination if there\u2019s only one page of content.\u201D With sizes on offer the nav stays for the size control alone \u2014 somebody looking at 12 of 12 rows may still want a bigger page. With nothing to choose, the component renders nothing at all.',
      specimen('12 rows, sizes offered', pagination({
        page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 12, pageSizes: PAGE_SIZES,
        id: 'single', label: 'Rows per page',
      })),
      specimen(
        '12 rows, no sizes offered',
        `<div style="border:1px dashed var(--border);border-radius:var(--radius-sm);padding:var(--space-4);color:var(--muted);font:400 13px/1.5 var(--font-sans)">`
        + `${pagination({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 12 })}`
        + 'The dashed box is this story\u2019s, not the kit\u2019s: pagination() returned an empty string.</div>',
      ),
    ),

    section(
      'Pages as links',
      'Given an href, a step renders as an anchor a reader can open in a new tab. An end that is off renders as a disabled button instead \u2014 an anchor has no disabled state, and a link that goes nowhere reads as available right up until it is followed.',
      specimen('First page, href given', pagination({
        page: 1, pageSize: DEFAULT_PAGE_SIZE, total: TOTAL, variant: 'numbered',
        href: (p) => `?page=${p}`, id: 'linked', label: 'Pagination as links, first page',
      })),
    ),
  )),
};

// Where a pager actually lives: under a table, inside the card the table sits
// in, with the card's own title above it. This is the specimen #273 was judged
// on — First and Prev off beside Next and Last on, at the first page and the
// last. The gallery above used to be the other half of that pair, read on the
// page ground; it is on the card now, so a boxless disabled button is judged on
// the one ground the kit puts a pager on.
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
