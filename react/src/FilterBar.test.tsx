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
// DOM only: which control is rendered, not how it looks.
it('offers the clear action only once there is something to clear', () => {
  const props = callbacks();
  const { rerender } = render(<FilterBar filters={[]} {...props} />);
  expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument();
  rerender(<FilterBar filters={filters} {...props} />);
  const clear = screen.getByRole('button', { name: 'Clear all filters' });
  expect(clear).toBeEnabled();
  // The bordered skin, as the vanilla factory writes it; the class, not the colour.
  expect(clear).toHaveClass('ui-btn--secondary');
  expect(clear).not.toHaveClass('ui-btn--ghost');
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
// A bar beside the caller's own action, which is how both showcases compose it.
function Example({ start = filters }: { start?: Filter[] }) {
  const [items, setItems] = useState(start);
  return <><FilterBar filters={items} onRemove={id => setItems(items.filter(f => f.id !== id))} onClear={() => setItems([])} onChange={() => setItems(items.map(f => ({ ...f, value: 'Active' })))} />
    <button type="button">Add filter</button></>;
}
it('preserves focused controls across updates and moves focus after removal', async () => {
  render(<Example />);
  await userEvent.click(screen.getByRole('button', { name: 'Remove Region filter' }));
  expect(screen.getByRole('button', { name: 'Status: All' })).toHaveFocus();
  // Which control holds the focus, not whether it draws a box: JSDOM has no
  // layout. The emptied fieldset measuring 0 high is measured in a browser and
  // reported in the pull request.
  await userEvent.click(screen.getByRole('button', { name: 'Remove Status filter' }));
  expect(screen.getByRole('button', { name: 'Add filter' })).toHaveFocus();
});
it('hands the focus to the action beside it when clearing empties the bar', async () => {
  render(<Example />);
  await userEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
  expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add filter' })).toHaveFocus();
});
it('keeps the ring on the bar while it still holds chips', async () => {
  render(<FilterBar filters={filters} disabled {...callbacks()} />);
  const chip = screen.getByRole('button', { name: 'Region: All' });
  expect(chip).toBeDisabled();
  // The fieldset still draws a box around two chips, so it may hold the ring.
  expect(screen.getByRole('group', { name: 'Filters' })).toBeInTheDocument();
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
  const beside = (items: Filter[]) => <><FilterBar filters={items} {...props} /><button type="button">Add filter</button></>;
  const { rerender } = render(beside(filters));
  screen.getByRole('button', { name: 'Region: All' }).focus();
  rerender(beside([filters[1]]));
  expect(screen.getByRole('button', { name: 'Status: All' })).toHaveFocus();
  rerender(beside([]));
  expect(screen.getByRole('button', { name: 'Add filter' })).toHaveFocus();
});
// An empty bar is not a fallback: the ring would sit on a line with no height.
// With nothing beside it to take the focus, the focus goes nowhere instead.
it('does not park the ring on an empty bar when nothing stands beside it', () => {
  const props = callbacks();
  const { rerender } = render(<FilterBar filters={filters} {...props} />);
  screen.getByRole('button', { name: 'Region: All' }).focus();
  rerender(<FilterBar filters={[]} {...props} />);
  expect(screen.getByRole('group', { name: 'Filters' })).not.toHaveFocus();
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
