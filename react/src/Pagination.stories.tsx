import type { Meta, StoryObj } from '@storybook/react';
import { useRef, useState } from 'react';
import { Pagination } from './Pagination';

// Every specimen names its own table. Two pagers on one page are two different
// navigations, and "Pagination" twice is the kind of label a reader tabbing by
// landmark cannot tell apart. why: stories/components/Pagination.stories.js
const meta: Meta<typeof Pagination> = {
  title: 'React/Pagination',
  component: Pagination,
  parameters: { layout: 'centered' },
  argTypes: {
    tier: { control: 'inline-radio', options: ['compact', 'advanced', 'numbered'] },
    page: { control: { type: 'number', min: 1 } },
    perPage: { control: { type: 'number', min: 1 } },
    total: { control: { type: 'number', min: 0 } },
    busy: { control: 'boolean' },
  },
};
export default meta;

// The state the wrapper exists for: the page belongs to the consumer, and the
// component reports a move rather than making one.
export const Playground: StoryObj<typeof Pagination> = {
  args: { perPage: 100, total: 4812, tier: 'compact', label: 'Transactions pagination' },
  render: function Render(args) {
    const [page, setPage] = useState(3);
    return <Pagination {...args} page={page} onPageChange={setPage} onPerPageChange={() => {}} />;
  },
};

export const Compact: StoryObj = {
  render: function Render() {
    const [page, setPage] = useState(3);
    return <Pagination page={page} perPage={100} total={4812}
      label="Transactions pagination" onPageChange={setPage} />;
  },
};

// Page size and a jump, for a table someone works in rather than glances at.
export const Advanced: StoryObj = {
  render: function Render() {
    const [page, setPage] = useState(3);
    const [perPage, setPerPage] = useState(100);
    return <Pagination page={page} perPage={perPage} total={4812} tier="advanced"
      label="Invoices pagination" onPageChange={setPage} onPerPageChange={setPerPage} />;
  },
};

// First and last always reachable, ±2 either side, … for the rest.
export const Numbered: StoryObj = {
  render: function Render() {
    const [page, setPage] = useState(10);
    return <Pagination page={page} perPage={25} total={500} tier="numbered"
      label="Audit log pagination" onPageChange={setPage} />;
  },
};

// `LIMIT n + 1`, no COUNT(*), and therefore no total to state. There is no last
// page to offer either, so that control is absent rather than dead.
export const UnknownTotal: StoryObj = {
  render: function Render() {
    const [page, setPage] = useState(2);
    return <Pagination page={page} perPage={100} hasMore rowsOnPage={100} tier="advanced"
      label="Payouts pagination" onPageChange={setPage} onPerPageChange={() => {}} />;
  },
};

// The consumer owns the element and its href; the component owns everything else.
// No live region here: the document reloads and reads the new position itself.
export const LinkMode: StoryObj = {
  render: () => (
    <Pagination page={2} perPage={100} total={4812} label="Linked pagination"
      renderLink={(page, children) => <a href={`?page=${page}`}>{children}</a>} />
  ),
};

// The rows are what is loading. The position is not, and it was true a moment ago.
export const Loading: StoryObj = {
  render: () => (
    <Pagination page={3} perPage={100} total={4812} busy
      label="Refunds pagination" onPageChange={() => {}} />
  ),
};

// Focus is the half the factory cannot do. After the page turns the reader is
// sent to the rows the new range describes, not left on the control below them.
export const MovesFocusToTheRows: StoryObj = {
  render: function Render() {
    const [page, setPage] = useState(1);
    const rows = useRef<HTMLTableElement>(null);
    const perPage = 5;
    const total = 23;
    const from = (page - 1) * perPage;
    return (
      <>
        <table className="ui-table ui-table--zebra" ref={rows}>
          <thead><tr><th scope="col">Reference</th><th scope="col" className="ui-table__num">Row</th></tr></thead>
          <tbody>
            {Array.from({ length: Math.min(perPage, total - from) }, (_, i) => (
              <tr key={from + i}>
                <td>TXN-{String(from + i + 1).padStart(4, '0')}</td>
                <td className="ui-table__num">{from + i + 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} perPage={perPage} total={total} label="Ledger pagination"
          onPageChange={setPage} focusRef={rows} />
      </>
    );
  },
};
