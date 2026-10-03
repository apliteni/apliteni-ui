import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import { FilterBar, type AddFilter, type Filter } from './FilterBar';

const filters: Filter[] = ['Region', 'Status'].map(label => ({ id: label, label, value: 'All', items: [{ label: 'All', value: 'all' }, { label: 'Active', value: 'active' }] }));
const callbacks = () => ({ onRemove: vi.fn(), onClear: vi.fn(), onChange: vi.fn() });
// The catalogue the add menu offers: two filters, three values between them.
const catalogue: AddFilter[] = [
  { id: 'Month', label: 'Month', items: [{ label: 'March', value: 'March' }, { label: 'April', value: 'April' }] },
  { id: 'Unit', label: 'Unit', items: [{ label: 'EUR', value: 'EUR' }] },
];
// A consumer that answers onAdd in the same update, which is where focus on the new chip
// is measurable: a consumer that answers it a tick later owns where focus goes.
function Adding({ add = catalogue, onAdd, ...rest }: { add?: AddFilter[]; onAdd?: (id: string, value: string | undefined) => void; filters?: Filter[]; busy?: boolean; disabled?: boolean }) {
  const [items, setItems] = useState<Filter[]>(rest.filters ?? [filters[0]]);
  return <FilterBar {...rest} filters={items} add={add} onRemove={() => {}} onClear={() => {}} onChange={() => {}}
    onAdd={(id, value) => {
      onAdd?.(id, value);
      const entry = catalogue.find(f => f.id === id);
      if (entry) setItems(current => [...current, { ...entry, value: value ?? '' }]);
    }} />;
}
// DOM behavior only; Dropdown owns keyboard coverage and these tests do not measure appearance.
it('requests changes and preserves controlled filters', async () => {
  const props = callbacks();
  render(<FilterBar filters={filters} {...props} />);
  await userEvent.click(screen.getByRole('button', { name: 'Region: All' }));
  await userEvent.keyboard('{End}{Enter}');
  expect(props.onChange).toHaveBeenCalledWith('Region', 'active');
  await userEvent.click(screen.getByRole('button', { name: 'Remove Region filter' }));
  expect(props.onRemove).toHaveBeenCalledWith('Region');
  expect(screen.getByRole('button', { name: 'Region: All' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
  expect(props.onClear).toHaveBeenCalledTimes(1);
});
// DOM text and names only; these do not measure appearance.
it('prints the chosen value alone and names the field it filters', () => {
  const props = callbacks();
  render(<FilterBar filters={[{ id: 'status', label: 'Status', value: 'Active', items: [] }, { id: 'region', label: 'Region', items: [] }]} {...props} />);
  expect(screen.getByRole('button', { name: 'Status: Active' })).toHaveTextContent(/^Active$/);
  expect(screen.getByRole('button', { name: 'Region: any' })).toHaveTextContent(/^Region$/);
  expect(document.querySelector('.ui-dropdown__pre')).toBeNull();
});
// The class the sheet paints with --muted; appearance itself is not measured here.
it('marks the valueless chip so the sheet can give it the placeholder ink', () => {
  const props = callbacks();
  render(<FilterBar filters={[{ id: 'status', label: 'Status', value: 'Active', items: [] }, { id: 'region', label: 'Region', items: [] }]} {...props} />);
  const marked = document.querySelectorAll('.ui-dropdown__value.is-placeholder');
  expect(marked).toHaveLength(1);
  expect(marked[0]).toHaveTextContent('Region');
});
it('preserves focused controls across updates and moves focus after removal', async () => {
  function Example() {
    const [items, setItems] = useState(filters);
    return <FilterBar filters={items} onRemove={id => setItems(items.filter(f => f.id !== id))} onClear={() => setItems([])} onChange={() => setItems(items.map(f => ({ ...f, value: 'Active' })))} />;
  }
  render(<Example />);
  await userEvent.click(screen.getByRole('button', { name: 'Remove Region filter' }));
  expect(screen.getByRole('button', { name: 'Status: All' })).toHaveFocus();
  await userEvent.click(screen.getByRole('button', { name: 'Remove Status filter' }));
  expect(screen.getByRole('group', { name: 'Filters' })).toHaveFocus();
});
it.each(['busy', 'disabled'] as const)('blocks controls and open panels when %s', async flag => {
  const props = callbacks();
  render(<FilterBar filters={filters.map(f => ({ ...f, open: true }))} {...props} {...{ [flag]: true }} />);
  expect(screen.getByRole('button', { name: 'Region: All' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Remove Region filter' }));
  expect(props.onRemove).not.toHaveBeenCalled();
  expect(document.querySelector('.ui-dropdown.open')).toBeNull();
});
it('keeps DOM identity and focus when labels update', () => {
  const props = callbacks();
  const { rerender } = render(<FilterBar filters={filters} {...props} />);
  const remove = screen.getByRole('button', { name: 'Remove Region filter' });
  remove.focus();
  rerender(<FilterBar filters={filters.map(f => ({ ...f, label: `${f.label} updated` }))} {...props} />);
  expect(screen.getByRole('button', { name: 'Remove Region updated filter' })).toBe(remove);
  expect(remove).toHaveFocus();
});
it('responds to open prop changes after interaction', async () => {
  const props = callbacks();
  const one = [{ ...filters[0], open: false }];
  const { rerender } = render(<FilterBar filters={one} {...props} />);
  const trigger = screen.getByRole('button', { name: 'Region: All' });
  await userEvent.click(trigger);
  await userEvent.keyboard('{Escape}');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  rerender(<FilterBar filters={[{ ...one[0], open: true }]} {...props} />);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  rerender(<FilterBar filters={one} {...props} />);
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});
it('restores focus after consecutive externally controlled removals', () => {
  const props = callbacks();
  const { rerender } = render(<FilterBar filters={filters} {...props} />);
  screen.getByRole('button', { name: 'Region: All' }).focus();
  rerender(<FilterBar filters={[filters[1]]} {...props} />);
  expect(screen.getByRole('button', { name: 'Status: All' })).toHaveFocus();
  rerender(<FilterBar filters={[]} {...props} />);
  expect(screen.getByRole('group', { name: 'Filters' })).toHaveFocus();
});

it('chooses the next enabled chip even when an earlier chip is disabled', () => {
  const props = callbacks();
  const items = [
    { ...filters[0], id: 'disabled', disabled: true },
    { ...filters[0], id: 'remove' },
    { ...filters[1], id: 'next' },
    { ...filters[1], id: 'last', label: 'Last' },
  ];
  const { rerender } = render(<FilterBar filters={items} {...props} />);
  screen.getAllByRole('button', { name: 'Region: All' })[1].focus();
  rerender(<FilterBar filters={items.filter(f => f.id !== 'remove')} {...props} />);
  expect(screen.getByRole('button', { name: 'Status: All' })).toHaveFocus();
});

it('adds a filter from the bar and lands focus on the new chip', async () => {
  const onAdd = vi.fn();
  render(<Adding onAdd={onAdd} />);
  // It sits after the chips and before clear-all, which is the order Tab walks.
  const bar = screen.getByRole('group', { name: 'Filters' });
  expect([...bar.querySelectorAll('[data-filter-id], [data-filter-add], [data-filter-clear]')]
    .map(el => (el.getAttribute('data-filter-id') ? 'chip' : el.hasAttribute('data-filter-add') ? 'add' : 'clear')))
    .toEqual(['chip', 'add', 'clear']);
  await userEvent.click(screen.getByRole('button', { name: 'Add filter' }));
  expect(screen.getByRole('group', { name: 'Month' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Unit' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('menuitem', { name: 'April' }));
  expect(onAdd).toHaveBeenCalledWith('Month', 'April');
  expect(screen.getByRole('button', { name: 'Month: April' })).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Remove Month filter' })).toBeInTheDocument();
});
it('closes the add menu on Escape without adding', async () => {
  const onAdd = vi.fn();
  render(<Adding onAdd={onAdd} />);
  const trigger = screen.getByRole('button', { name: 'Add filter' });
  await userEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await userEvent.keyboard('{Escape}');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trigger).toHaveFocus();
  expect(onAdd).not.toHaveBeenCalled();
  // The panel stays in the tree and is shut by CSS, as every kit dropdown's is.
  expect(document.querySelector('[data-filter-add] .ui-dropdown.open')).toBeNull();
});
it('offers only the filters the bar is not holding, and drops the control at the last one', async () => {
  render(<Adding add={[catalogue[0]]} />);
  await userEvent.click(screen.getByRole('button', { name: 'Add filter' }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'March' }));
  expect(screen.getByRole('button', { name: 'Month: March' })).toHaveFocus();
  expect(screen.queryByRole('button', { name: 'Add filter' })).toBeNull();
});
it.each([[9, false], [10, true]] as const)('puts a field over %i options: %s', async (count, field) => {
  const items = Array.from({ length: count - 1 }, (_, i) => ({ label: `Month ${i + 1}`, value: `m${i + 1}` }));
  render(<Adding add={[{ ...catalogue[0], items }, catalogue[1]]} />);
  await userEvent.click(screen.getByRole('button', { name: 'Add filter' }));
  const search = document.querySelector('[data-dd-search]');
  expect(Boolean(search)).toBe(field);
  if (search) expect(search).toHaveAttribute('aria-label', 'Search filters');
});
it.each(['busy', 'disabled'] as const)('stops the add control when %s', async flag => {
  const onAdd = vi.fn();
  render(<Adding onAdd={onAdd} {...{ [flag]: true }} />);
  const trigger = screen.getByRole('button', { name: 'Add filter' });
  expect(trigger).toBeDisabled();
  await userEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(onAdd).not.toHaveBeenCalled();
});
it('draws no add control without a catalogue or without onAdd', () => {
  const props = callbacks();
  const { rerender } = render(<FilterBar filters={filters} {...props} />);
  expect(screen.queryByRole('button', { name: 'Add filter' })).toBeNull();
  rerender(<FilterBar filters={filters} add={catalogue} {...props} />);
  expect(screen.queryByRole('button', { name: 'Add filter' })).toBeNull();
});

it('clears the width a searching menu held when it closes inside the row', async () => {
  // #467 in React: the search panel pins the width it opened at as an inline
  // min-width, and inline beats the rule that holds a shut panel to its trigger —
  // with the menu floor that residue is 320px of shut panel, measured 121.9px past
  // the row at 320. JSDOM lays nothing out, so the pin this clears is written here
  // the way a browser would write it; that it is written at all is the browser
  // gate's to measure.
  const months = Array.from({ length: 12 }, (_, i) => ({ label: `Month ${i + 1}`, value: `m${i + 1}` }));
  render(<Adding add={[{ id: 'Month', label: 'Month', items: months }]} />);
  await userEvent.click(screen.getByRole('button', { name: 'Add filter' }));
  const panel = document.querySelector<HTMLElement>('[data-filter-add] .ui-dropdown__panel')!;
  expect(panel.querySelector('[data-dd-search]')).not.toBeNull();
  panel.style.minWidth = '320px';
  await userEvent.keyboard('{Escape}');
  expect(panel.style.minWidth).toBe('');
});
