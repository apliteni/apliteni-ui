import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SearchField } from './SearchField';
import { Dropdown } from './Dropdown';
import { Segmented } from './Segmented';
import { DataTable, type Column } from './DataTable';
import { NumericValue } from './TableValues';
import { Badge } from './primitives/Badge';
import { Card } from './primitives/Card';

const meta: Meta<typeof SearchField> = {
  title: 'React/SearchField', component: SearchField,
  args: { ariaLabel: 'Search invoices', placeholder: 'Vendor or number' },
};
export default meta;
type Story = StoryObj<typeof SearchField>;

export const Playground: Story = {};
export const WithValue: Story = { args: { defaultValue: 'Northwind' } };
export const Disabled: Story = { args: { defaultValue: 'Northwind', disabled: true } };

// ---- the toolbar ----------------------------------------------------------

// `name` because DataTable keys its rows by that field.
type Invoice = { name: string; number: string; status: 'Verified' | 'Pending'; days: number; total: string };
const INVOICES: Invoice[] = [
  { name: 'Northwind Supply', number: 'INV-2041', status: 'Verified', days: 4, total: '1,280.00' },
  { name: 'Harbour Logistics', number: 'INV-2038', status: 'Pending', days: 11, total: '460.50' },
  { name: 'Lumen Studio', number: 'INV-2029', status: 'Verified', days: 26, total: '3,900.00' },
  { name: 'Breve Coffee', number: 'INV-1994', status: 'Pending', days: 63, total: '118.40' },
  { name: 'Atlas Print', number: 'INV-1962', status: 'Verified', days: 142, total: '745.00' },
];
const columns: Column<Invoice>[] = [
  { key: 'name', label: 'Vendor', sortable: true },
  { key: 'number', label: 'Number' },
  { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'Verified' ? 'live' : 'warn'}>{r.status}</Badge> },
  { key: 'total', label: 'Total', num: true, render: (r) => <NumericValue value={r.total} unit="EUR" /> },
];

// A filter chip carries its value and nothing else: a "Status:" prefix repeats
// the column it filters. So every value has to read on its own — "Any status",
// not "Any".
const STATUS = ['Any status', 'Verified', 'Pending'];
const PERIOD: [string, number][] = [['Last 30 days', 30], ['Last 90 days', 90], ['This year', 365]];

export const Toolbar: StoryObj = {
  name: 'Toolbar: search, filters, views',
  render: function Render() {
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState(STATUS[0]);
    const [period, setPeriod] = useState(PERIOD[0][0]);
    const [view, setView] = useState('table');

    const within = PERIOD.find(([label]) => label === period)![1];
    const term = query.trim().toLowerCase();
    const rows = INVOICES.filter((row) =>
      (status === STATUS[0] || row.status === status)
      && row.days <= within
      && (term === '' || `${row.name} ${row.number}`.toLowerCase().includes(term)));

    // .ui-app__body is the kit's own column: the page gap, and min-width:0 on
    // each child, which is what lets the table scroll inside its column on a phone.
    return <div className="ui-app__body">
      <div className="ui-toolbar">
        <SearchField ariaLabel="Search invoices" placeholder="Vendor or number"
          value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
        <Dropdown variant="select" ariaLabel="Status" value={status} onSelect={(v) => setStatus(String(v))}
          items={STATUS.map((label) => ({ label, value: label, selected: label === status }))} />
        <Dropdown variant="select" ariaLabel="Period" value={period} onSelect={(v) => setPeriod(String(v))}
          items={PERIOD.map(([label]) => ({ label, value: label, selected: label === period }))} />
        <Segmented label="View" value={view} onChange={setView}
          options={[{ label: 'Table', value: 'table' }, { label: 'Board', value: 'board' }]} />
      </div>
      {view === 'table'
        ? <DataTable columns={columns} rows={rows} pager={false} selectable={false} stickyHeader />
        : <div style={{ display: 'grid', gap: 'var(--space-5)', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {rows.map((row) => <Card key={row.number} title={row.name} sub={row.number}>
            <div className="ui-card__row">
              <NumericValue value={row.total} unit="EUR" />
              <Badge variant={row.status === 'Verified' ? 'live' : 'warn'}>{row.status}</Badge>
            </div>
          </Card>)}
        </div>}
    </div>;
  },
};
