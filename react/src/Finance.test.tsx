import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FilterBar } from './FilterBar';
import { Segmented } from './Segmented';
import { DataTable } from './DataTable';
import { RowIdentity, NumericValue, DeltaValue } from './TableValues';
import { Comparison } from './Finance.stories';

// This checks rendered tone classes and signs. Browser evidence checks the paint in both themes.
it('matches comparison daily-change tones to their signs', () => {
  const { container } = render(<Comparison.render />);
  const deltas = [...container.querySelectorAll('.ui-delta')];
  const positive = deltas.filter(delta => delta.textContent?.startsWith('+'));
  const negative = deltas.filter(delta => delta.textContent?.startsWith('−'));
  const zero = deltas.filter(delta => delta.textContent === '0.00%');
  expect(deltas).toHaveLength(20);
  expect(positive.length).toBeGreaterThan(0);
  expect(negative.length).toBeGreaterThan(0);
  expect(zero.length).toBeGreaterThan(0);
  expect(positive.length + negative.length + zero.length).toBe(deltas.length);
  for (const delta of positive) {
    expect(delta).toHaveClass('ui-delta--success');
    expect(delta).not.toHaveClass('ui-delta--danger');
  }
  for (const delta of negative) {
    expect(delta).toHaveClass('ui-delta--danger');
    expect(delta).not.toHaveClass('ui-delta--success');
  }
  for (const delta of zero) {
    expect(delta).not.toHaveClass('ui-delta--success', 'ui-delta--danger');
  }
});

describe('finance composition', () => {
  it('keeps short option text while exposing the supplied full accessible name', () => {
    render(<Segmented label="Period" value="apr" onChange={() => {}} options={[
      { label: 'Apr', value: 'apr', ariaLabel: 'April 2026, Closed' },
      { label: 'May', value: 'may' },
    ]} />);
    expect(screen.getByRole('button', { name: 'April 2026, Closed' })).toHaveTextContent('Apr');
    expect(screen.getByRole('button', { name: 'May' })).toBeInTheDocument();
  });
  it('keeps the first data column pinned with selection enabled and exposes scroll semantics', () => {
    const { container } = render(<DataTable rows={[{ name: 'Aster', price: 0 }]} columns={[{ key: 'name', label: 'Company', render: r => <RowIdentity symbol="ASTR" name={r.name} /> }, { key: 'price', label: 'Price', num: true, render: r => <NumericValue value={r.price} unit="USD" /> }]} selected={new Set()} onToggle={() => {}} onTogglePage={() => {}} density="compact" pinnedIdentity stickyHeader scrollLabel="Stocks" />);
    expect(screen.getByRole('region', { name: 'Stocks' })).toHaveAttribute('tabindex', '0');
    expect(container.querySelector('tbody .ui-table__identity')).toHaveTextContent('ASTR');
    expect(container.querySelector('tbody td')).toHaveClass('ui-table__selection');
    expect(container.querySelector('thead th')).toHaveClass('ui-table__selection');
    expect(screen.getByText('USD')).toBeInTheDocument();
  });
  it('removes and clears controlled filters while recovering keyboard focus', () => {
    function Demo() {
      const [filters, setFilters] = useState([{ id: 'a', label: 'Sector', value: 'Energy', items: [] }, { id: 'b', label: 'Market', value: 'US', items: [] }]);
      return <><FilterBar filters={filters} onChange={() => {}} onRemove={id => setFilters(filters.filter(f => f.id !== id))} onClear={() => setFilters([])} />
        <button type="button">Add filter</button></>;
    }
    render(<Demo />); const remove = screen.getByRole('button', { name: 'Remove Sector filter' }); remove.focus(); fireEvent.click(remove);
    expect(screen.queryByRole('button', { name: 'Remove Sector filter' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Market/ , expanded: false })).toHaveFocus();
    const clear = screen.getByRole('button', { name: 'Clear all' }); clear.focus(); fireEvent.click(clear);
    // The bar is empty and draws no box, so the focus leaves it for the action beside it.
    expect(screen.getByRole('button', { name: 'Add filter' })).toHaveFocus();
  });
  it('skips disabled views and keeps zero deltas neutral', () => {
    function Demo() { const [value, set] = useState('a'); return <Segmented label="Views" value={value} onChange={set} options={[{ label: 'A', value: 'a' }, { label: 'B', value: 'b', disabled: true }, { label: 'C', value: 'c' }]} appearance="underline" />; }
    const { container } = render(<><Demo /><DeltaValue value="0.00%" tone="danger" /></>);
    fireEvent.keyDown(screen.getByRole('button', { name: 'A' }), { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: 'C' })).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.ui-delta')).not.toHaveClass('ui-delta--danger');
  });
});

// This checks filtering and recovery. Browser evidence checks column visibility and text alignment.
it('recovers the twenty-company comparison from an empty sector', () => {
  const { container } = render(<Comparison.render />);
  expect(container.querySelectorAll('tbody a')).toHaveLength(20);
  fireEvent.click(screen.getByRole('button', { name: 'Sector: All sectors' }));
  fireEvent.click(screen.getByRole('option', { name: 'Technology' }));
  expect(container.querySelectorAll('tbody a')).toHaveLength(4);
  fireEvent.click(screen.getByRole('button', { name: 'Sector: Technology' }));
  fireEvent.click(screen.getByRole('option', { name: 'Utilities' }));
  expect(screen.getByText('No companies match these filters.')).toBeInTheDocument();
  const clear = screen.getByRole('button', { name: 'Clear filters' });
  expect(clear.closest('.ui-table-scroll')).toBeNull();
  fireEvent.click(clear);
  expect(container.querySelectorAll('tbody a')).toHaveLength(20);
  expect(screen.getByRole('button', { name: 'Filter' })).toHaveFocus();
});

// This checks the combined filter state. Browser evidence checks the card's measured width.
it('adds and unsets a market filter inside the content-width comparison', () => {
  const { container } = render(<Comparison.render />);
  expect(container.querySelector('.ui-card--fit .ui-table')).not.toBeNull();
  expect(container.querySelectorAll('tbody a')).toHaveLength(20);
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'New York' }));
  expect(screen.getByRole('button', { name: 'Market: New York' })).toHaveFocus();
  expect(container.querySelectorAll('tbody a')).toHaveLength(10);
  fireEvent.click(screen.getByRole('button', { name: 'Sector: All sectors' }));
  fireEvent.click(screen.getByRole('option', { name: 'Technology' }));
  expect(container.querySelectorAll('tbody a')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Market: New York' }));
  fireEvent.click(screen.getByRole('option', { name: 'All markets' }));
  expect(container.querySelectorAll('tbody a')).toHaveLength(4);
  fireEvent.click(screen.getByRole('button', { name: 'Sector: Technology' }));
  fireEvent.click(screen.getByRole('option', { name: 'All sectors' }));
  expect(container.querySelectorAll('tbody a')).toHaveLength(20);
});
