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

function SelectableExample() {
  const rows = [{ name: 'Aster Systems', price: 228.87, sector: 'Technology' }, { name: 'Birch Energy', price: 84.12, sector: 'Energy' }];
  const [selected, setSelected] = useState(new Set<string>());
  return <main className="pinned-selection" style={{ padding: 'var(--space-6)' }}>
    <style>{'.pinned-selection .ui-table { min-width: 70rem; }'}</style>
    <h1>Select companies</h1><p>Fictional data. Scroll to compare values while keeping company selection in view.</p>
    <DataTable rows={rows} selected={selected} onToggle={name => setSelected(current => {
      const next = new Set(current); if (next.has(name)) next.delete(name); else next.add(name); return next;
    })} onTogglePage={names => setSelected(current => names.every(name => current.has(name)) ? new Set() : new Set(names))}
      density="compact" stickyHeader pinnedIdentity scrollLabel="Selectable companies" pager={false}
      columns={[{ key: 'name', label: 'Company', render: r => <RowIdentity symbol={r.name.slice(0, 4).toUpperCase()} name={r.name} href="#company" /> }, { key: 'price', label: 'Price', num: true, render: r => <NumericValue value={r.price} unit="USD" /> }, { key: 'sector', label: 'Sector' }]} />
  </main>;
}

// These assertions need a browser: jsdom cannot detect a checkbox covered by a sticky cell.
export const PinnedSelection = { render: () => <SelectableExample />, play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const region = canvasElement.querySelector<HTMLElement>('.ui-table-scroll')!;
  const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const themeBefore = document.documentElement.dataset.theme;
  const measurements = [];
  try {
    for (const theme of ['light', 'dark']) {
      document.documentElement.dataset.theme = theme;
      for (const scroll of [0, 400]) {
        region.scrollLeft = scroll; await frame();
        if (scroll && !region.scrollLeft) throw new Error('Fixture must overflow horizontally');
        for (const section of ['thead', 'tbody']) {
          const selection = region.querySelector<HTMLElement>(`${section} .ui-table__selection`)!;
          const identity = region.querySelector<HTMLElement>(`${section} .ui-table__identity`)!;
          const input = selection.querySelector<HTMLInputElement>('input')!;
          const s = selection.getBoundingClientRect(), i = identity.getBoundingClientRect(), c = input.getBoundingClientRect();
          const edge = region.getBoundingClientRect().left;
          if (s.left < edge - 1 || Math.abs(i.left - s.right) > 1) throw new Error(`${theme}/${scroll}/${section}: pinned columns overlap or separate`);
          const hit = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2);
          if (hit !== input) throw new Error(`${theme}/${scroll}/${section}: checkbox is covered`);
          const before = input.checked;
          (hit as HTMLInputElement).click(); await frame();
          if (input.checked === before) throw new Error(`${theme}/${scroll}/${section}: selection did not change`);
          input.click(); await frame();
          measurements.push({ theme, scroll: region.scrollLeft, section, selectionWidth: s.width, identityLeft: i.left, selectionRight: s.right });
        }
      }
    }
    canvasElement.dataset.pinnedSelectionChecks = JSON.stringify(measurements);
  } finally {
    if (themeBefore) document.documentElement.dataset.theme = themeBefore;
    else delete document.documentElement.dataset.theme;
    region.scrollLeft = 0;
  }
} };
