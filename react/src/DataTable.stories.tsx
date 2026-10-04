import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DataTable, sortTableRows, type Column, type TableSort } from './DataTable';
import { Badge } from './primitives/Badge';

// `country` and `revenue` are read only by the stacked story; no other story lists them.
type Row = { name: string; status: string; clicks: number; country: string; revenue: string };
const rows: Row[] = [
  { name: 'Nutra — DE push', status: 'live', clicks: 48210, country: 'Germany', revenue: '18,402.55 EUR' },
  { name: 'Sweeps — BR pop', status: 'live', clicks: 91032, country: 'Brazil', revenue: '9,118.40 EUR' },
  { name: 'Dating — FR native', status: 'paused', clicks: 33890, country: 'France', revenue: '12,775.09 EUR' },
  { name: 'Crypto — global', status: 'paused', clicks: 60112, country: 'Worldwide', revenue: '31,560.72 EUR' },
  { name: 'Ecom — UK shopping', status: 'live', clicks: 8830, country: 'United Kingdom', revenue: '2,904.13 EUR' },
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

// The pinned identity column is capped on a phone (#500), and the first column is
// the one that can be sortable and long at the same time. The label gives way; the
// caret does not, because the direction has no other visible signal.
const pinnedColumns: Column<Row>[] = [
  { key: 'name', label: 'Campaign and registered trading name', sortable: true },
  ...columns.slice(1),
];
// Five columns, because a card wants more than two lines under its heading to show what
// the composition is for. `revenue` puts its unit in the header, so its header is markup
// and not a word — the case `labelText` exists for. And its label is not just the header's
// words: the unit was ONLY in the header, which a card does not draw, so the stacked line
// has to carry it. A column names what its line should read, not what its header says.
const stackedColumns: Column<Row>[] = [
  { key: 'name', label: 'Campaign', render: (r) => <a href={`#${encodeURIComponent(r.name)}`}>{r.name}</a> },
  { key: 'status', label: 'Status', render: (r) => <Badge variant={TONE[r.status]}>{r.status}</Badge> },
  { key: 'clicks', label: 'Clicks', num: true, render: (r) => r.clicks.toLocaleString() },
  { key: 'revenue', labelText: 'Revenue (EUR)', num: true,
    label: <>Revenue <span className="ui-value__unit">EUR</span></>,
    render: (r) => r.revenue.replace(' EUR', '') },
  { key: 'country', label: 'Country' },
];

export const PinnedSortable: StoryObj = {
  render: () => (
    <div className="ui-card" style={{ maxWidth: 'var(--panel-lg)' }}>
      <DataTable columns={pinnedColumns} rows={rows} selectable={false} pager={false}
        columnPager={false} density="compact" stickyHeader pinnedIdentity scrollLabel="Campaigns" />
    </div>
  ),
};

// Stacked rows at 560px and below: each row is a card headed by its identity, every
// other column a label/value line. Open it at 390. `stacked` is what writes the two
// things CSS cannot — a `data-label` per cell, from the column, and the ARIA roles a
// browser drops the moment `display` stops being `table-*`.
export const StackedRows: StoryObj = {
  name: 'Stacked rows (390)',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: () => (
    // No width cap, unlike PinnedSortable above: the step asks the viewport, not the card
    // it sits in, so a card narrower than the step would still draw the table at 1280 —
    // with its columns scrolling — and say nothing about where the cards begin.
    <div className="ui-card">
      <DataTable columns={stackedColumns} rows={rows} selectable={false} pager={false}
        columnPager={false} density="compact" stickyHeader pinnedIdentity stacked scrollLabel="Campaigns" />
    </div>
  ),
};
