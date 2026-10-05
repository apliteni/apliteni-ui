import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SearchField } from './SearchField';
import { Dropdown } from './Dropdown';
import { Segmented } from './Segmented';
import { DataTable, type Column } from './DataTable';
import { NumericValue } from './TableValues';
import { Badge } from './primitives/Badge';
import { Card } from './primitives/Card';

// On the card, as the vanilla Inputs gallery has been since #556: a search field
// paints --surface, so on the page ground it has only its edge left to be seen by.
// This is the meta's render, which is what the three args-only stories below get —
// the card is the story rather than a decorator, and react/src/field-ground.test.tsx
// measures it there.
//
// The title is load-bearing, not decoration. A field carries no text of its own — its
// name is an aria-label and its placeholder is not content — so without it these three
// stories render no text-owning element at all, and react/src/contrast.test.tsx reaches
// them and has nothing to judge. The name is the vanilla gallery's for the same control.
const meta: Meta<typeof SearchField> = {
  title: 'React/SearchField', component: SearchField,
  args: { ariaLabel: 'Search invoices', placeholder: 'Vendor or number' },
  render: (args) => <div style={{ maxWidth: 'calc(var(--panel-md) + var(--space-6) * 2)' }}><Card title="Search input"><SearchField {...args} /></Card></div>,
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
    // Toolbar and table each on a card. The search field is a field, and the
    // toolbar is a layout class that paints nothing, so on the app column's
    // ground the field sat on --bg. The toolbar stays the input group's direct
    // parent — `.ui-toolbar > .ui-input-group` is what sizes it — so the card
    // goes around the toolbar, not inside it.
    // react/src/field-ground.test.tsx holds the numbers.
    return <div className="ui-app__body">
      {/* A panel's floor is 240px and the kit hangs it off its trigger with no
          measuring of its own — #572 — so `align` chooses which screen edge a
          narrow row's panel crosses, not whether it crosses one. Containment is
          this composition's: under 720px each chip takes the whole row, so its
          panel opens from the card's inner edge — 41–281 at 375, whichever
          values are chosen — and above it the row holds on one line and the
          chips sit left of the slack. 720 is the smallest of the kit's three
          breakpoints that holds: at 560 the clipping runs on to 578, where
          THESE labels stop fitting on one line. Measured at 375, 390 and 1280
          in both themes, all nine value pairs, open and closed, and at every
          width from 320 to 1440.
          why: guidelines/layout-and-density.md#use-the-three-breakpoints */}
      <style>{'@media (max-width: 720px) { .invoice-toolbar > .ui-dropdown { flex: 0 0 100%; } }'}</style>
      <Card><div className="ui-toolbar invoice-toolbar">
        <SearchField ariaLabel="Search invoices" placeholder="Vendor or number"
          value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
        <Dropdown variant="select" ariaLabel="Status" value={status} onSelect={(v) => setStatus(String(v))}
          items={STATUS.map((label) => ({ label, value: label, selected: label === status }))} />
        <Dropdown variant="select" ariaLabel="Period" value={period} onSelect={(v) => setPeriod(String(v))}
          items={PERIOD.map(([label]) => ({ label, value: label, selected: label === period }))} />
        <Segmented label="View" value={view} onChange={setView}
          options={[{ label: 'Table', value: 'table' }, { label: 'Board', value: 'board' }]} />
      </div></Card>
      {view === 'table'
        ? <Card><DataTable columns={columns} rows={rows} pager={false} selectable={false} stickyHeader
          scrollLabel="Invoices" /></Card>
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
