import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '@apliteni/apliteni-ui';
import { DataTable, sortTableRows, type Column, type TableSort } from './DataTable';

type Row = { name: string; clicks: number };
const rows: Row[] = [
  { name: 'A', clicks: 10 }, { name: 'B', clicks: 30 }, { name: 'C', clicks: 20 },
];
const columns: Column<Row>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'clicks', label: 'Clicks', num: true, sortable: true },
];

function Harness() {
  const [sel, setSel] = useState<Set<string>>(new Set());
  return (
    <DataTable columns={columns} rows={rows} pageSize={2}
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

it('paginates (pageSize 2 of 3 rows → the first two)', () => {
  render(<Harness />);
  expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  expect(screen.getByText('1–2 of 3')).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(3);   // header + 2
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
      <DataTable columns={columns} rows={source} pageSize={2} selectable={false}
        sort={{ key: sort.key, dir: sort.dir }} onSortChange={setSort} />
      <button onClick={() => setSort((s) => ({ ...s }))}>Re-render</button>
      <button onClick={() => setSort({ key: 'clicks', dir: -1 })}>Newest first</button>
    </>;
  }
  render(<Controlled />);
  const order = () => screen.getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[0].textContent);

  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
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

// ---- the page: controlled by its owner, or the table's own ------------------

it('renders the rows it is handed and never slices them when the page is controlled', async () => {
  // A server-paged surface: these three rows ARE page 2, and the range comes
  // from page/pageSize/total rather than from the rows in hand.
  const seen: number[] = [];
  render(<DataTable columns={columns} rows={rows} selectable={false}
    sort={{ key: undefined, dir: -1 }} onSortChange={() => {}}
    page={2} pageSize={2} total={10} onPageChange={(p) => seen.push(p)} />);
  const order = () => screen.getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[0].textContent);
  expect(order()).toEqual(['A', 'B', 'C']);
  expect(screen.getByText('3–4 of 10')).toBeInTheDocument();

  // The table asks; it does not turn the page itself.
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(seen).toEqual([3]);
  expect(order()).toEqual(['A', 'B', 'C']);
});

it('takes the range from the caller when the page is controlled, whatever the row count', () => {
  render(<DataTable columns={columns} rows={rows} selectable={false}
    page={4} pageSize={25} total={4812} onPageChange={() => {}} />);
  expect(screen.getByText('76–100 of 4,812')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Last' })).toHaveAttribute('data-page', '193');
});

it('draws Prev and Next alone when the caller cannot count the result', () => {
  render(<DataTable columns={columns} rows={rows} selectable={false}
    page={2} pageSize={2} total={null} hasMore onPageChange={() => {}} />);
  expect(screen.getByRole('navigation')).toHaveClass('ui-pager--open');
  expect(screen.queryAllByRole('button', { name: /First|Last/ })).toHaveLength(0);
  expect(screen.getByText('Page 2')).toBeInTheDocument();
});

it('asks its owner for the first page when a header changes the sort', async () => {
  const seen: number[] = [];
  render(<DataTable columns={columns} rows={rows} selectable={false}
    page={3} pageSize={2} total={10} onPageChange={(p) => seen.push(p)} />);
  await userEvent.click(screen.getByRole('button', { name: /Clicks/ }));
  expect(seen).toEqual([1]);
});

it('renders no pager at all when the consumer supplies its own', () => {
  render(<DataTable columns={columns} rows={rows} pageSize={2} selectable={false} pager={false} />);
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(3);   // still paginated: header + 2
});

it('draws no pager for one page of content, and keeps one that still offers a size', () => {
  // GOV.UK: "Do not show pagination if there's only one page of content."
  const one = render(<DataTable columns={columns} rows={rows} pageSize={100} selectable={false} />);
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  one.unmount();

  render(<DataTable columns={columns} rows={rows} pageSize={100} selectable={false}
    pageSizes={[25, 100]} />);
  expect(screen.getByRole('navigation')).toHaveClass('ui-pager--single');
  expect(screen.getByLabelText('Rows')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
});

it('starts on the page size the kit ships rather than a number of its own', () => {
  const many: Row[] = Array.from({ length: 8 }, (_, i) => ({ name: `R${i}`, clicks: i }));
  render(<DataTable columns={columns} rows={many} selectable={false} />);
  expect(DEFAULT_PAGE_SIZE).toBeGreaterThan(8);
  expect(screen.getAllByRole('row')).toHaveLength(many.length + 1);
});

it('repages on a size the reader picks, and returns them to the first page', async () => {
  const source: Row[] = Array.from({ length: 6 }, (_, i) => ({ name: `R${i}`, clicks: i }));
  const seen: number[] = [];
  render(<DataTable columns={columns} rows={source} selectable={false} pageSizes={[2, 4]}
    onPageSizeChange={(s) => seen.push(s)} sort={{ key: undefined, dir: -1 }} onSortChange={() => {}} />);
  expect(screen.getAllByRole('row')).toHaveLength(source.length + 1);   // one page at the default

  await userEvent.selectOptions(screen.getByLabelText('Rows'), '2');
  expect(seen).toEqual([2]);
  expect(screen.getByText('1–2 of 6')).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(3);

  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText('3–4 of 6')).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText('Rows'), '4');
  expect(screen.getByText('1–4 of 6')).toBeInTheDocument();
});

it('stops taking input while a page loads, and keeps the numbers legible', () => {
  render(<DataTable columns={columns} rows={rows} selectable={false} loading
    page={2} pageSize={2} total={10} onPageChange={() => {}} />);
  expect(screen.getByRole('navigation')).toHaveAttribute('aria-busy', 'true');
  expect(screen.getByText('3–4 of 10')).toBeInTheDocument();
  for (const name of ['First', 'Prev', 'Next', 'Last']) {
    expect(screen.getByRole('button', { name })).toBeDisabled();
  }
});

it('shows the size it is given and reports the one the reader picked', async () => {
  // A `pageSize` prop is the caller's statement of the size in use, exactly as
  // `sort` is: the table reports the choice and waits to be told.
  const source: Row[] = Array.from({ length: 6 }, (_, i) => ({ name: `R${i}`, clicks: i }));
  const seen: number[] = [];
  render(<DataTable columns={columns} rows={source} selectable={false} pageSize={2}
    pageSizes={[2, 4]} onPageSizeChange={(s) => seen.push(s)}
    sort={{ key: undefined, dir: -1 }} onSortChange={() => {}} />);
  await userEvent.selectOptions(screen.getByLabelText('Rows'), '4');
  expect(seen).toEqual([4]);
  expect(screen.getByText('1–2 of 6')).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(3);
});
