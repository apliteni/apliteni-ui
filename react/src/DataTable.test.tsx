import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DataTable, sortTableRows, type Column, type TableSort } from './DataTable';

type Row = { name: string; clicks: number };
const rows: Row[] = [
  { name: 'A', clicks: 10 }, { name: 'B', clicks: 30 }, { name: 'C', clicks: 20 },
];
const columns: Column<Row>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'clicks', label: 'Clicks', num: true, sortable: true },
];

// Thirty rows: more than the new default page size of 25, so "paged" and "not
// paged" are two visibly different row counts rather than the same one.
const many: Row[] = Array.from({ length: 30 }, (_, i) => ({
  name: `row-${String(i).padStart(2, '0')}`, clicks: i,
}));

function Harness() {
  const [sel, setSel] = useState<Set<string>>(new Set());
  return (
    <DataTable columns={columns} rows={rows} pageSize={2} pager
      selected={sel}
      onToggle={(n) => setSel((s) => { const x = new Set(s); x.has(n) ? x.delete(n) : x.add(n); return x; })}
      onTogglePage={(ns) => setSel((s) => {
        const x = new Set(s);
        const all = ns.every((n) => x.has(n));
        ns.forEach((n) => (all ? x.delete(n) : x.add(n)));
        return x;
      })} />
  );
}

it('sorts by a column ascending on second click of default-desc', async () => {
  render(<Harness />);
  await userEvent.click(screen.getByText('Clicks'));           // default desc → B(30),C(20)
  const first = screen.getAllByRole('row')[1];
  expect(within(first).getByText('B')).toBeInTheDocument();
});

// The sentence is the kit's now, and the kit says a row range rather than a page
// number: how much there is, not which slice you are on. why: react/src/Pagination.tsx
it('paginates (pageSize 2 → the first two of three rows)', () => {
  render(<Harness />);
  expect(screen.getByText('1–2 of 3')).toBeInTheDocument();
});

it('toggles a row selection', async () => {
  render(<Harness />);
  const boxes = screen.getAllByRole('checkbox');       // [selectAll, row0, row1]
  await userEvent.click(boxes[1]);
  expect(boxes[1]).toBeChecked();
});

it('toggles select-all for the visible page', async () => {
  render(<Harness />);
  const boxes = screen.getAllByRole('checkbox');       // [selectAll, row0, row1]
  await userEvent.click(boxes[0]);
  expect(boxes[1]).toBeChecked();
  expect(boxes[2]).toBeChecked();
  await userEvent.click(boxes[0]);
  expect(boxes[1]).not.toBeChecked();
  expect(boxes[2]).not.toBeChecked();
});


it('omits selection controls when the consumer has no selection action', () => {
  render(<DataTable columns={columns} rows={rows} selectable={false} />);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.getAllByRole('columnheader')).toHaveLength(columns.length);
  expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1);
});

it('keeps a sibling list in the controlled table order, including stable ties and external changes', async () => {
  const source = [...rows, { name: 'D', clicks: 20 }];
  function Controlled() {
    const [sort, setSort] = useState<TableSort<Row>>({ key: 'clicks', dir: -1 });
    return <>
      <DataTable columns={columns} rows={source} pageSize={source.length} selectable={false}
        sort={sort} onSortChange={setSort} />
      <ol aria-label="Cards">{sortTableRows(source, sort).map(row => <li key={row.name}>{row.name}</li>)}</ol>
      <button onClick={() => setSort({ key: undefined, dir: -1 })}>Original order</button>
    </>;
  }
  render(<Controlled />);
  const order = () => screen.getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[0].textContent);
  const cards = () => within(screen.getByRole('list', { name: 'Cards' })).getAllByRole('listitem').map(row => row.textContent);
  expect(order()).toEqual(['B', 'C', 'D', 'A']);
  expect(cards()).toEqual(order());
  screen.getByRole('button', { name: 'Clicks' }).focus();
  await userEvent.keyboard('{Enter}');
  expect(order()).toEqual(['A', 'C', 'D', 'B']);
  expect(cards()).toEqual(order());
  expect(screen.getByRole('columnheader', { name: 'Clicks' })).toHaveAttribute('aria-sort', 'ascending');
  await userEvent.click(screen.getByRole('button', { name: 'Original order' }));
  expect(order()).toEqual(['A', 'B', 'C', 'D']);
  expect(cards()).toEqual(order());
  expect(source.map(row => row.name)).toEqual(['A', 'B', 'C', 'D']);
});

it('returns to the first page when something other than a header changes the sort', async () => {
  const source: Row[] = [
    { name: 'A', clicks: 1 }, { name: 'B', clicks: 2 }, { name: 'C', clicks: 3 },
    { name: 'D', clicks: 4 }, { name: 'E', clicks: 5 }, { name: 'F', clicks: 6 },
  ];
  function Controlled() {
    const [sort, setSort] = useState<TableSort<Row>>({ key: 'name', dir: 1 });
    return <>
      {/* A FRESH OBJECT EVERY RENDER. The page must follow the sort's value, not its
          identity — an owner that builds this inline re-renders constantly. */}
      <DataTable columns={columns} rows={source} pageSize={2} pager selectable={false}
        sort={{ key: sort.key, dir: sort.dir }} onSortChange={setSort} />
      <button onClick={() => setSort((s) => ({ ...s }))}>Re-render</button>
      <button onClick={() => setSort({ key: 'clicks', dir: -1 })}>Newest first</button>
    </>;
  }
  render(<Controlled />);
  const order = () => screen.getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[0].textContent);

  await userEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
  expect(screen.getByText('3–4 of 6')).toBeInTheDocument();
  expect(order()).toEqual(['C', 'D']);

  await userEvent.click(screen.getByRole('button', { name: 'Re-render' }));
  expect(screen.getByText('3–4 of 6')).toBeInTheDocument();
  expect(order()).toEqual(['C', 'D']);

  await userEvent.click(screen.getByRole('button', { name: 'Newest first' }));
  expect(screen.getByText('1–2 of 6')).toBeInTheDocument();
  expect(order()).toEqual(['F', 'E']);
});

it('hands back a list of its own even when there is no sort key', () => {
  const source: Row[] = [...rows];
  const ordered = sortTableRows(source, { key: undefined, dir: -1 });
  expect(ordered).toEqual(source);
  expect(ordered).not.toBe(source);
  ordered.reverse();
  expect(source.map(row => row.name)).toEqual(['A', 'B', 'C']);
});

it('announces the sorted column whether or not its header offers a sort control', () => {
  const oneSortable: Column<Row>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'clicks', label: 'Clicks', num: true },
  ];
  const sorted = render(<DataTable columns={oneSortable} rows={rows} pageSize={3} selectable={false}
    sort={{ key: 'clicks', dir: -1 }} onSortChange={() => {}} />);
  const clicks = screen.getByRole('columnheader', { name: 'Clicks' });
  expect(clicks).toHaveAttribute('aria-sort', 'descending');
  // The announcement is the whole fix: the header stays non-interactive.
  expect(within(clicks).queryByRole('button')).toBeNull();
  expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'none');
  sorted.unmount();

  // A column that neither sorts nor is sorted by says nothing at all.
  render(<DataTable columns={oneSortable} rows={rows} pageSize={3} selectable={false} />);
  expect(screen.getByRole('columnheader', { name: 'Clicks' })).not.toHaveAttribute('aria-sort');
});


// ---- the pager is opt-in -------------------------------------------------
// why: react/src/Pagination.tsx. DataTable used to page on the client at four
// rows a page, always, over whatever rows it was handed. A server-paged surface
// got a second pager disagreeing with the first about how much data there is.

it('draws no pager unless one is asked for', () => {
  render(<DataTable columns={columns} rows={many} selectable={false} />);
  expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
  expect(screen.queryByText(/Page \d+ of \d+/)).toBeNull();
});

it('shows every row it was handed when it is not paging', () => {
  render(<DataTable columns={columns} rows={many} selectable={false} />);
  expect(screen.getAllByRole('row')).toHaveLength(many.length + 1);   // + the header
});

it('pages at twenty-five when asked to page', () => {
  render(<DataTable columns={columns} rows={many} selectable={false} pager />);
  expect(screen.getAllByRole('row')).toHaveLength(26);
});

// The reader who turned the page is standing on the control, below a table they
// have not seen. why: react/src/Pagination.tsx `focusRef`
it('sends the reader to the rows after turning a page', async () => {
  render(<DataTable columns={columns} rows={many} selectable={false} pager pageSize={10} />);
  await userEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
  expect(screen.getByText('11–20 of 30')).toBeInTheDocument();
  expect(screen.getByRole('table')).toHaveFocus();
});
