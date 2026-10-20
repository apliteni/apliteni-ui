import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { FilterBar, type AddFilter, type Filter } from './FilterBar';
import { Dropdown, type DropdownEntry, type DropdownProps } from './Dropdown';

const filters: Filter[] = [
  { id: 'region', label: 'Region', value: 'All', items: [{ label: 'All', value: 'All' }, { label: 'Europe', value: 'Europe' }] },
  { id: 'status', label: 'Status', value: 'Active', items: [{ label: 'All', value: 'All' }, { label: 'Active', value: 'Active' }] },
];
// What the bar can still be given, with the twelve months that earn the menu a field.
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const catalogue: AddFilter[] = [
  { id: 'month', label: 'Month', items: months.map(label => ({ label, value: label })) },
  { id: 'unit', label: 'Unit', items: [{ label: 'EUR', value: 'EUR' }, { label: 'USD', value: 'USD' }] },
];
const meta: Meta<typeof FilterBar> = { title: 'React/FilterBar', component: FilterBar,
  args: { filters, onRemove: () => {}, onClear: () => {}, onChange: () => {} } };
export default meta;
type Story = StoryObj<typeof FilterBar>;
export const Controlled: Story = { render: function Example(args) {
  const [items, setItems] = useState(args.filters);
  return <FilterBar {...args} filters={items} onRemove={id => setItems(items.filter(f => f.id !== id))}
    onClear={() => setItems([])} onChange={(id, value) => setItems(items.map(f => f.id === id ? { ...f, value: value ?? '' } : f))} />;
} };
// A chip with nothing chosen shows the field it filters; a chosen one shows the value.
export const Unset: Story = { args: { filters: [{ id: 'listing', label: 'Listing', items: [{ label: 'Any listing', value: '' }, { label: 'Primary', value: 'Primary' }] }, ...filters] } };
export const Adding: Story = { args: { add: catalogue }, render: function Example(args) {
  const [items, setItems] = useState(args.filters);
  return <FilterBar {...args} filters={items} onRemove={id => setItems(items.filter(f => f.id !== id))}
    onClear={() => setItems([])} onChange={(id, value) => setItems(items.map(f => f.id === id ? { ...f, value: value ?? '' } : f))}
    onAdd={(id, value) => {
      const entry = catalogue.find(f => f.id === id);
      if (entry) setItems(current => [...current, { ...entry, value: value ?? '' }]);
    }} />;
} };
export const Busy: Story = { args: { busy: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Empty: Story = { args: { filters: [] } };

const SECTORS: DropdownEntry[] = [
  { label: 'All', value: 'All', selected: true },
  { label: 'Technology', value: 'tech' },
  { label: 'Consumer Discretionary', value: 'cons' },
];
/* And a chosen row named in full, which is longer than the menu that holds it.
   Flex lays a row's label out at its own length before anything wraps, so
   whatever the mark is allowed to give up it is given up here: this is the one
   shape in which a painted tick can be clipped, and the rows above are all short
   enough that a clip would never show on them. The chip still prints a short
   value — `MSCI` is the row's own value — which keeps the 48px-trigger geometry
   the rest of this bar measures. #550 */
const MARKED: DropdownEntry[] = [
  { label: 'All', value: 'All' },
  { label: 'MSCI World consumer discretionary investments', value: 'MSCI', selected: true },
];

const Chip = ({ id, name, ...rest }: { id: string; name: string } & Partial<DropdownProps>) => (
  <fieldset className="ui-filter-bar__chip" data-filter-id={id}>
    <legend className="ui-filter-bar__legend">{name}</legend>
    <Dropdown variant="select" ariaLabel={name} value="All" items={SECTORS} {...rest} />
    <button type="button" className="ui-filter-bar__remove" data-filter-remove=""
      aria-label={`Remove ${name} filter`}>×</button>
  </fieldset>
);

/* Two compositions <FilterBar> does not pass through, written as markup the way
   the row itself is: a chip whose menu is pinned at its inline end, and a
   searchable one. This is the React half's subject in
   `scripts/evidence/filter-bar-fit.mjs`, which sweeps stories rather than naming
   them — without it the browser gate measured both options in vanilla only, and
   the shut-panel residue of #467 came back in React alone. The end-aligned chip
   goes first because an end-anchored panel grows backwards, so a chip at the
   row's start has the least room behind it.

   `scripts/evidence/filter-bar-fit.html` renders this bar chip for chip, so one
   composition is measured through two implementations.
   why: docs/components.md#a-filter-row-holds-its-panels */
export const Composed: Story = { render: () => (
  <fieldset className="ui-filter-bar" data-filter-bar="">
    <legend className="ui-filter-bar__legend">Composed filters</legend>
    <Chip id="ending" name="Aligned" align="end" />
    <Chip id="plain" name="Sector" />
    <Chip id="searchable" name="Lookup" search />
    <Chip id="marked" name="Holdings" value="MSCI" items={MARKED} />
  </fieldset>
) };
