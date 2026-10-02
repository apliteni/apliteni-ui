import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { FilterBar, type Filter } from './FilterBar';

const filters: Filter[] = [
  { id: 'region', label: 'Region', value: 'All', items: [{ label: 'All', value: 'All' }, { label: 'Europe', value: 'Europe' }] },
  { id: 'status', label: 'Status', value: 'Active', items: [{ label: 'All', value: 'All' }, { label: 'Active', value: 'Active' }] },
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
export const Busy: Story = { args: { busy: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Empty: Story = { args: { filters: [] } };
