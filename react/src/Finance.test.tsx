import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FilterBar } from './FilterBar';
import { Segmented } from './Segmented';
import { DataTable } from './DataTable';
import { RowIdentity, NumericValue, DeltaValue } from './TableValues';
describe('finance composition', () => {
  it('keeps the first data column pinned with selection enabled and exposes scroll semantics', () => {
    const { container } = render(<DataTable rows={[{ name: 'Aster', price: 0 }]} columns={[{ key: 'name', label: 'Company', render: r => <RowIdentity symbol="ASTR" name={r.name} /> }, { key: 'price', label: 'Price', num: true, render: r => <NumericValue value={r.price} unit="USD" /> }]} selected={new Set()} onToggle={() => {}} onTogglePage={() => {}} density="compact" pinnedIdentity stickyHeader scrollLabel="Stocks" />);
    expect(screen.getByRole('region', { name: 'Stocks' })).toHaveAttribute('tabindex', '0');
    expect(container.querySelector('tbody .ui-table__identity')).toHaveTextContent('ASTR');
    expect(container.querySelector('tbody td')).not.toHaveClass('ui-table__identity');
    expect(screen.getByText('USD')).toBeInTheDocument();
  });
  it('removes and clears controlled filters while recovering keyboard focus', () => {
    function Demo() {
      const [filters, setFilters] = useState([{ id: 'a', label: 'Sector', value: 'Energy', items: [] }, { id: 'b', label: 'Market', value: 'US', items: [] }]);
      return <FilterBar filters={filters} onChange={() => {}} onRemove={id => setFilters(filters.filter(f => f.id !== id))} onClear={() => setFilters([])} />;
    }
    render(<Demo />); const remove = screen.getByRole('button', { name: 'Remove Sector filter' }); remove.focus(); fireEvent.click(remove);
    expect(screen.queryByRole('button', { name: 'Remove Sector filter' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Market/ , expanded: false })).toHaveFocus();
    const clear = screen.getByRole('button', { name: 'Clear all filters' }); clear.focus(); fireEvent.click(clear);
    expect(screen.getByRole('group', { name: 'Filters' })).toHaveFocus();
  });
  it('skips disabled views and keeps zero deltas neutral', () => {
    function Demo() { const [value, set] = useState('a'); return <Segmented label="Views" value={value} onChange={set} options={[{ label: 'A', value: 'a' }, { label: 'B', value: 'b', disabled: true }, { label: 'C', value: 'c' }]} appearance="underline" />; }
    const { container } = render(<><Demo /><DeltaValue value="0.00%" tone="danger" /></>);
    fireEvent.keyDown(screen.getByRole('button', { name: 'A' }), { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: 'C' })).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.ui-delta')).not.toHaveClass('ui-delta--danger');
  });
});
