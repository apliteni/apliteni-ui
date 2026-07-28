import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DataTable, type Column } from './DataTable';
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
