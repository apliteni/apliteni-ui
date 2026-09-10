import { pager } from '../../src/components/pagination.js';
import { pad, specimen, stack } from '../_gallery.js';

// Every specimen names its own table. Two pagers on one page are two different
// navigations, and "Pagination" twice is the kind of label a reader tabbing by
// landmark cannot tell apart.
export default {
  title: 'Components/Pagination',
  parameters: { layout: 'centered' },
  render: (a) => pager(a),
  argTypes: {
    tier: { control: 'inline-radio', options: ['compact', 'advanced', 'numbered'] },
    page: { control: { type: 'number', min: 1 } },
    perPage: { control: { type: 'number', min: 1 } },
    total: { control: { type: 'number', min: 0 } },
    busy: { control: 'boolean' },
  },
  args: { page: 3, perPage: 100, total: 4812, tier: 'compact' },
};

export const Playground = {};

// The three tiers over the same table, so the only difference on screen is what
// each one lets a reader do.
export const Tiers = {
  parameters: { layout: 'fullscreen' },
  render: () => pad(stack(
    specimen('Compact — the range, and a way either side of it',
      pager({ page: 3, perPage: 100, total: 4812, label: 'Transactions pagination' })),
    specimen('Advanced — page size and a jump, for a table someone works in',
      pager({ page: 3, perPage: 100, total: 4812, tier: 'advanced', label: 'Invoices pagination' })),
    specimen('Numbered — first and last always reachable, ±2 either side, … for the rest',
      pager({ page: 10, perPage: 25, total: 500, tier: 'numbered', label: 'Audit log pagination' })),
  )),
};

// The shape the kit was missing: `LIMIT n + 1`, no COUNT(*), and therefore no
// total to state — until the last page, where it is arithmetic.
export const UnknownTotal = {
  parameters: { layout: 'fullscreen' },
  render: () => pad(stack(
    specimen('More pages behind it — "more than", never an invented total',
      pager({ page: 1, perPage: 100, hasMore: true, rowsOnPage: 100, label: 'Payouts pagination' })),
    specimen('The last page — the total resolves exactly',
      pager({ page: 3, perPage: 100, hasMore: false, rowsOnPage: 47, label: 'Refunds pagination' })),
    specimen('Advanced, with no last page to offer',
      pager({
        page: 2, perPage: 100, hasMore: true, rowsOnPage: 100, tier: 'advanced', label: 'Ledger pagination',
      })),
  )),
};

// `href` is how all four of the consumer's pagers already work: real links, no
// JavaScript, a page a reader can bookmark and a browser can prefetch.
export const States = {
  parameters: { layout: 'fullscreen' },
  render: () => pad(stack(
    specimen('Link mode — every control is a real anchor, and needs no JavaScript',
      pager({
        page: 2, perPage: 100, total: 4812, href: (p) => `?page=${p}`, label: 'Linked pagination',
      })),
    specimen('First page — nowhere back, so the control says so',
      pager({ page: 1, perPage: 100, total: 4812, label: 'First page pagination' })),
    specimen('Last page — the range closes on the real total',
      pager({ page: 49, perPage: 100, total: 4812, label: 'Last page pagination' })),
    specimen('Loading — the range stays put; only the controls go quiet',
      pager({ page: 3, perPage: 100, total: 4812, busy: true, label: 'Loading pagination' })),
  )),
};
