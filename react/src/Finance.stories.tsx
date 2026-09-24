import { useState } from 'react';
import { DataTable } from './DataTable';
import { NumericValue, DeltaValue, RowIdentity } from './TableValues';
import { FilterBar, type Filter } from './FilterBar';
import { Segmented } from './Segmented';
export default { title: 'Components/Finance composition', parameters: { layout: 'fullscreen' } };
function Example() {
  const [view, setView] = useState('overview');
  const [filters, setFilters] = useState<Filter[]>([{ id: 'sector', label: 'Sector', value: 'Technology', items: [{ label: 'Technology', value: 'Technology' }, { label: 'Energy', value: 'Energy' }] }]);
  return <main style={{ padding: 'var(--space-6)' }}><h1>Company comparison</h1><p id="react-finance-basis">Fictional data. Changes versus previous close.</p>
    <FilterBar filters={filters} onRemove={id => setFilters(filters.filter(f => f.id !== id))} onClear={() => setFilters([])} onChange={(id, value) => setFilters(filters.map(f => f.id === id ? { ...f, value: value || '' } : f))} />
    <Segmented label="Dataset view" value={view} onChange={setView} appearance="underline" options={[{ label: 'Overview', value: 'overview' }, { label: 'Performance', value: 'performance' }]} />
    <DataTable rows={[{ name: 'Aster Systems', sector: 'Technology', price: 228.87, change: '+0.66%' }, { name: 'Birch Energy', sector: 'Energy', price: 0, change: '0.00%' }].filter(r => !filters.length || r.sector === filters[0].value)} selectable={false} density="compact" stickyHeader pinnedIdentity scrollLabel="Company comparison"
      columns={[{ key: 'name', label: 'Company', render: r => <RowIdentity symbol={r.name.slice(0, 4).toUpperCase()} name={r.name} href="#company" /> }, ...(view === 'overview' ? [{ key: 'price' as const, label: 'Price', num: true, sortable: true, render: (r: {price: number}) => <NumericValue value={r.price.toFixed(2)} unit="USD" /> }] : []), { key: 'change', label: 'Change', num: true, render: r => <DeltaValue value={r.change} tone="success" basisId="react-finance-basis" /> }]} />
  </main>;
}
export const Comparison = { render: () => <Example /> };
