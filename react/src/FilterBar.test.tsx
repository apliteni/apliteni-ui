import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import { composeStories } from '@storybook/react';
import { FilterBar, type Filter } from './FilterBar';
import * as stories from './FilterBar.stories';

const { Open } = composeStories(stories);

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

// Markup only: the wash is drawn by CSS on .is-selected, which jsdom does not paint. What is
// held here is that the state is in the markup rather than only in the paint — aria-selected
// names the chosen row, and the check stays in the DOM as the mark a forced palette falls
// back to. src/styles/filter-bar-mark.test.js holds the CSS side.
it('marks the current value in the open menu and nothing else', () => {
  const props = callbacks();
  const chips: Filter[] = [
    { id: 'Region', label: 'Region', value: 'All', open: true,
      items: [{ label: 'All', value: 'all' }, { label: 'Active', value: 'active', selected: true }, { label: 'All', value: 'legacy' }] },
    { id: 'Status', label: 'Status', value: 'active', items: [{ label: 'All', value: 'all' }, { label: 'Active', value: 'active' }] },
    { id: 'Plan', label: 'Plan', value: 'Gone', items: [{ label: 'Free', value: 'free' }] },
  ];
  render(<FilterBar filters={chips} {...props} />);
  const state = (id: string) => Array.from(document.querySelectorAll(`[data-filter-id="${id}"] [data-dd-item]`))
    .map(row => `${row.getAttribute('aria-selected')}${row.classList.contains('is-selected') ? '+' : ''}`);
  expect(screen.getByRole('button', { name: 'Region: All' })).toHaveAttribute('aria-expanded', 'true');
  expect(state('Region')).toEqual(['true+', 'false', 'false']);
  expect(state('Status')).toEqual(['false', 'true+']);
  expect(state('Plan')).toEqual(['false']);
  // Kept in the DOM on purpose: a forced palette drops the wash and falls back to this.
  expect(document.querySelector('[data-filter-id="Region"] .is-selected .ui-dropdown__tick')).not.toBeNull();
});

// Markup only, as above. Guards filterBarItems' separator pass-through: without it a '---'
// string spreads character by character into a blank selectable row. Filter.value is typed
// string, so the numeric chip below is cast: the case is reachable from untyped callers of a
// published function, not from typed React, and widening the prop is not this fix's business.
it('leaves separators alone while it marks, and matches a numeric value as a string', () => {
  const props = callbacks();
  const chips: Filter[] = [
    { id: 'Region', label: 'Region', value: 'Europe', open: true,
      items: [{ label: 'All', value: 'all' }, '---', { label: 'Europe', value: 'europe' }, { separator: true }] },
    // The labels differ from the numbers' string form on purpose: with label '2024' the label
    // branch matches first and the value branch decides nothing.
    { id: 'Year', label: 'Year', value: 2024 as unknown as string,
      items: [{ label: 'FY 2023', value: 2023 }, { label: 'FY 2024', value: 2024 }] },
  ];
  render(<FilterBar filters={chips} {...props} />);
  const rows = (id: string) => Array.from(document.querySelectorAll(`[data-filter-id="${id}"] [data-dd-item]`))
    .map(row => row.getAttribute('aria-selected'));
  expect(document.querySelectorAll('[data-filter-id="Region"] [data-dd-item]')).toHaveLength(2);
  expect(document.querySelectorAll('[data-filter-id="Region"] .ui-dropdown__sep')).toHaveLength(2);
  expect(rows('Region')).toEqual(['false', 'true']);
  expect(rows('Year')).toEqual(['false', 'true']);
});

// Renders the Open story itself, so an args-only story cannot come back: with the meta's
// no-op onChange the menu ticks the row just clicked while the trigger keeps the old
// value, which is #466's own confusion. Markup only: CSS paints the tick, jsdom does not.
it('Open moves the chip and its mark together on a pick, and keeps both after a reopen', async () => {
  render(<Open />);
  const marked = () => Array.from(document.querySelectorAll('[data-filter-id="region"] [data-dd-item].is-selected')).map(row => row.getAttribute('data-value'));
  expect(screen.getByRole('button', { name: 'Region: All' })).toHaveAttribute('aria-expanded', 'true');
  expect(marked()).toEqual(['All']);
  await userEvent.click(screen.getByRole('option', { name: 'Europe' }));
  const trigger = screen.getByRole('button', { name: 'Region: Europe' });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(marked()).toEqual(['Europe']);
  await userEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(marked()).toEqual(['Europe']);
});
