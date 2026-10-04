import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DataTable, sortTableRows, type Column, type TableSort } from './DataTable';
import { Badge } from './primitives/Badge';
import { Card } from './primitives/Card';

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

// The campaign name opens the campaign. One linked cell, so a DataTable surface shows the
// kit's focus ring on a cell link (#510); the rest of the stories keep plain names.
const linkedColumns: Column<Row>[] = [
  { ...columns[0], render: (r) => <a href={`#${encodeURIComponent(r.name)}`}>{r.name}</a> },
  ...columns.slice(1),
];

export const Playground: StoryObj = {
  render: () => {
    const [sel, setSel] = useState<Set<string>>(new Set());
    return (
      <DataTable columns={linkedColumns} rows={rows} pageSize={3} selected={sel}
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

// The column pager, in the container that showed it did not fit. Its two actions
// are 301px of labelled buttons, and a card at a 320px viewport offers 238px, so
// the row used to leave the card and take the page sideways with it; now it
// stacks. Thirteen columns overflow a card at every width the kit draws, so the
// pager is on screen at 320 and at 1280 alike. #571
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
type Ledger = { name: string } & Record<typeof MONTHS[number], number>;
const ledgerRow = (name: string, from: number): Ledger => MONTHS.reduce(
  (out, month, index) => ({ ...out, [month]: from + index * 137 }), { name } as Ledger);
const ledgerRows: Ledger[] = [
  ledgerRow('Nutra — DE push', 4821),
  ledgerRow('Sweeps — BR pop', 9103),
  ledgerRow('Dating — FR native', 3389),
];
const ledgerColumns: Column<Ledger>[] = [
  { key: 'name', label: 'Campaign' },
  ...MONTHS.map((month) => ({
    key: month, label: month, num: true,
    render: (r: Ledger) => r[month].toLocaleString(),
  })),
];

export const ColumnPagerInCard: StoryObj = {
  render: () => (
    <div className="column-pager-card">
      {/* The story is about the pager, so the table overflows at every width
          rather than only at the ones where the month columns happen not to fit —
          the same scaffold Finance composition's PinnedSelection uses. */}
      <style>{'.column-pager-card .ui-table { min-width: 80rem; }'}</style>
      <Card title="Monthly clicks" sub="Fabricated figures. Scroll the table, or step the columns.">
        <DataTable columns={ledgerColumns} rows={ledgerRows} selectable={false} pager={false}
          dense stickyHeader pinnedIdentity scrollLabel="Monthly clicks" />
      </Card>
    </div>
  ),
};
