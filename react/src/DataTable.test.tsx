import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DataTable, type Column } from './DataTable';

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

it('paginates (pageSize 2 → page 1 of 2)', () => {
  render(<Harness />);
  expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
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
