import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SearchField } from './SearchField';
import { FilterBar } from './FilterBar';
import { Segmented } from './Segmented';
import { Dropdown } from './Dropdown';
import { Button } from './primitives/Button';
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
// not "Any". The chips start unset, so the table opens on every invoice.
const STATUS = { id: 'status', label: 'Status', items: [{ label: 'Any status', value: '' }, { label: 'Verified', value: 'Verified' }, { label: 'Pending', value: 'Pending' }] };
const PERIOD = { id: 'period', label: 'Period', items: [{ label: 'Any time', value: '' }, { label: 'Last 30 days', value: '30' }, { label: 'Last 90 days', value: '90' }, { label: 'This year', value: '365' }] };

export const Toolbar: StoryObj = {
  name: 'Toolbar: search, filters, views',
  render: function Render() {
    const [query, setQuery] = useState('');
    const [chosen, setChosen] = useState<Record<string, string>>({});
    const [view, setView] = useState('table');

    const term = query.trim().toLowerCase();
    const rows = INVOICES.filter((row) =>
      (!chosen.status || row.status === chosen.status)
      && (!chosen.period || row.days <= Number(chosen.period))
      && (term === '' || `${row.name} ${row.number}`.toLowerCase().includes(term)));
    const set = (id: string, value?: string) => setChosen((previous) => ({ ...previous, [id]: value ?? '' }));

    // .ui-app__body is the kit's own column: the page gap, and min-width:0 on
    // each child, which is what lets the table scroll inside its column on a phone.
    // The toolbar is a filter bar, so it stands on the page above the table card,
    // with no card of its own. The toolbar stays the input group's direct parent,
    // because `.ui-toolbar > .ui-input-group` sizes it.
    // react/src/field-ground.test.tsx holds the numbers.
    return <div className="ui-app__body">
      <div className="ui-toolbar">
        <SearchField ariaLabel="Search invoices" placeholder="Vendor or number"
          value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
        <FilterBar label="Invoice filters" onChange={set} onRemove={(id) => set(id)} onClear={() => setChosen({})}
          filters={[STATUS, PERIOD].map((filter) => ({ ...filter, value: chosen[filter.id] ?? '' }))} />
        <Segmented neutral label="View" value={view} onChange={setView}
          options={[{ label: 'Table', value: 'table' }, { label: 'Board', value: 'board' }]} />
      </div>
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

// The small size: a toolbar above a dense table. With a mouse the field, the trigger,
// the chips, Clear all, the small switch and the small button all stand at 32px, and the
// filter bar takes that height from the field. On a touch screen the field is the full
// field and every other control is a chip's height. #822
const CURRENCIES = [{ label: 'Any currency', value: '' }, { label: 'EUR', value: 'EUR' }, { label: 'USD', value: 'USD' }];
export const SmallToolbar: StoryObj = {
  name: 'Toolbar at the small size',
  render: function Render() {
    const [query, setQuery] = useState('');
    const [currency, setCurrency] = useState('');
    const [chosen, setChosen] = useState<Record<string, string>>({ status: 'Pending' });
    const [view, setView] = useState('table');

    const term = query.trim().toLowerCase();
    const rows = INVOICES.filter((row) =>
      (!chosen.status || row.status === chosen.status)
      && (!chosen.period || row.days <= Number(chosen.period))
      && (term === '' || `${row.name} ${row.number}`.toLowerCase().includes(term)));
    const set = (id: string, value?: string) => setChosen((previous) => ({ ...previous, [id]: value ?? '' }));

    return <div className="ui-app__body">
      {/* The create action stands on its own row, above the filters. rev_462a2ac56f32/d12 */}
      <div className="ui-toolbar">
        <Button variant="primary" size="sm" icon="plus">New invoice</Button>
      </div>
      <div className="ui-toolbar">
        <SearchField size="sm" ariaLabel="Search invoices" placeholder="Vendor or number"
          value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
        <Dropdown variant="select" ariaLabel="Currency" onSelect={(value) => setCurrency(String(value))}
          items={CURRENCIES.map((item) => ({ ...item, selected: item.value === currency }))} />
        <FilterBar label="Invoice filters" onChange={set} onRemove={(id) => set(id)} onClear={() => setChosen({})}
          filters={[STATUS, PERIOD].map((filter) => ({ ...filter, value: chosen[filter.id] ?? '' }))} />
        <Segmented neutral label="View" size="sm" value={view} onChange={setView}
          options={[{ label: 'Table', value: 'table', icon: 'table', iconOnly: true }, { label: 'Board', value: 'board', icon: 'grid', iconOnly: true }]} />
      </div>
      <Card><DataTable columns={columns} rows={rows} density="dense" pager={false} selectable={false} stickyHeader
        scrollLabel="Invoices" /></Card>
    </div>;
  },
};
