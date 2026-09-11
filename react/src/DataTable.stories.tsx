import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DataTable, sortTableRows, type Column, type TableSort } from './DataTable';
import { Badge } from './primitives/Badge';

type Row = { name: string; status: string; clicks: number };
const rows: Row[] = [
  { name: 'Nutra — DE push', status: 'live', clicks: 48210 },
  { name: 'Sweeps — BR pop', status: 'live', clicks: 91032 },
  { name: 'Dating — FR native', status: 'paused', clicks: 33890 },
  { name: 'Crypto — global', status: 'paused', clicks: 60112 },
  { name: 'Ecom — UK shopping', status: 'live', clicks: 8830 },
];
const TONE: Record<string, string> = { live: 'live', paused: 'warn' };
const columns: Column<Row>[] = [
  { key: 'name', label: 'Campaign', sortable: true },
  { key: 'status', label: 'Status', render: (r) => <Badge variant={TONE[r.status]}>{r.status}</Badge> },
  { key: 'clicks', label: 'Clicks', num: true, sortable: true, render: (r) => r.clicks.toLocaleString() },
];

const meta: Meta<typeof DataTable> = { title: 'React/DataTable', component: DataTable as never };
export default meta;

export const Playground: StoryObj = {
  render: () => {
    const [sel, setSel] = useState<Set<string>>(new Set());
    return (
      <DataTable columns={columns} rows={rows} pageSize={3} selected={sel}
        onToggle={(n) => setSel((s) => { const x = new Set(s); x.has(n) ? x.delete(n) : x.add(n); return x; })}
        onTogglePage={(ns) => setSel((s) => {
          const x = new Set(s); const all = ns.every((n) => x.has(n));
          ns.forEach((n) => all ? x.delete(n) : x.add(n)); return x;
        })} />
    );
  },
};


export const SharedOrder: StoryObj = {
  render: function Render() {
    const [sort, setSort] = useState<TableSort<Row>>({ key: 'clicks', dir: -1 });
    return <>
      {/* pager={false}, not pageSize={rows.length}. The second is the workaround
          this release exists to retire, and it would read as the recommendation
          sitting in the kit's own story. */}
      <DataTable columns={columns} rows={rows} pager={false} selectable={false}
        sort={sort} onSortChange={setSort} />
      <section className="ui-card" aria-label="Same rows as a list">
        <ol>{sortTableRows(rows, sort).map(row => <li key={row.name}>{row.name}</li>)}</ol>
      </section>
    </>;
  },
};

export const ServerPaged: StoryObj = {
  render: function Render() {
    // Stands in for a server: the page is the owner's, the table renders the
    // rows it is handed and states the range from `total`.
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(2);
    const [loading, setLoading] = useState(false);
    // The sort is CONTROLLED, which is what the readme tells a server-paged
    // surface to do. A constant sort with a no-op handler compiles and looks
    // right, and then every header press asks for page 1 again for a sort that
    // never changed. The table itself asks for page 1 through onPageChange on a
    // real sort change, so the handler here only records the sort.
    const [sort, setSort] = useState<TableSort<Row>>({ key: 'clicks', dir: -1 });
    // The server orders and slices; this stands in for both, so the rows handed
    // over are already the page and the table divides them no further.
    const fetched = sortTableRows(rows, sort).slice((page - 1) * size, page * size);
    const turn = (next: number, nextSize = size) => {
      setLoading(true);
      setPage(next);
      setSize(nextSize);
      setTimeout(() => setLoading(false), 400);
    };
    return (
      <DataTable columns={columns} rows={fetched} selectable={false}
        sort={sort} onSortChange={setSort}
        page={page} total={rows.length} pageSize={size} pageSizes={[2, 3, 5]}
        loading={loading} onPageChange={turn} onPageSizeChange={(s) => turn(1, s)} />
    );
  },
};

export const NoPager: StoryObj = {
  render: () => (
    // A surface that pages elsewhere on the screen asks for no pager at all.
    // pageSize={2} is load-bearing: at the default of 100 these five rows are one
    // page, the pager would be absent anyway, and the story would demonstrate
    // nothing. Take pager={false} off and a three-page strip appears.
    <DataTable columns={columns} rows={rows} pageSize={2} selectable={false} pager={false} />
  ),
};
