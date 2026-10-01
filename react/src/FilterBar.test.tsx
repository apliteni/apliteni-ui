import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import { FilterBar, type Filter } from './FilterBar';

const filters: Filter[] = ['Region', 'Status'].map(label => ({ id: label, label, value: 'All', items: [{ label: 'All', value: 'all' }, { label: 'Active', value: 'active' }] }));
const callbacks = () => ({ onRemove: vi.fn(), onClear: vi.fn(), onChange: vi.fn() });
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
  expect(screen.getByRole('button', { name: 'Region' })).toHaveTextContent(/^Region$/);
  expect(document.querySelector('.ui-dropdown__pre')).toBeNull();
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
