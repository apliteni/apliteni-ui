import { useState, type CSSProperties } from 'react';
import { DataTable } from './DataTable';
import { NumericValue, DeltaValue, RowIdentity } from './TableValues';
import { FilterBar, type AddFilter, type Filter } from './FilterBar';
import { Segmented } from './Segmented';
import { SearchField } from './SearchField';
import { Card } from './primitives/Card';
import { useTableFilters } from '../../stories/_table-filters';
import './FinanceComposition.css';
export default { title: 'Components/Finance composition', parameters: { layout: 'fullscreen' } };
// Approved comparison for #504. All company data is fabricated.
const names = ['Aster Systems', 'Birch Semiconductor', 'Cobalt Energy', 'Dovetail Health', 'Elm Networks', 'Fable Robotics', 'Grove Financial', 'Harbor Software', 'Iris Materials', 'Juniper Devices', 'Kestrel Logistics', 'Linden Foods', 'Morrow Industries', 'Northstar Analytics', 'Opal Telecom', 'Pine Mobility', 'Quartz Medical', 'Reed Computing', 'Solstice Power', 'Tern Aerospace', 'Umber Retail', 'Vale Instruments', 'Willow Biotech', 'Xenon Storage', 'Yarrow Payments', 'Zephyr Motors', 'Alder Water', 'Bracken Research', 'Cedar Infrastructure Group', 'Drift Media'];
const sectors = ['Technology', 'Energy', 'Health care', 'Financials', 'Industrials'];
const rows = names.slice(0, 20).map((name, i) => ({ name, sector: sectors[i % sectors.length], market: i % 2 ? 'Frankfurt' : 'New York', price: 340 - i * 8.37, change: i === 8 ? 0 : ((i * 17) % 63 - 28) / 10 }));
const catalogue: AddFilter[] = [
  { id: 'sector', label: 'Sector', items: ['All sectors', ...sectors, 'Utilities'].map(value => ({ label: value, value })) },
  { id: 'market', label: 'Market', items: ['All markets', 'New York', 'Frankfurt'].map(value => ({ label: value, value })) },
];
function Example() {
  const [view, setView] = useState('overview');
  const [filters, setFilters] = useState<Filter[]>([{ ...catalogue[0], value: 'All sectors' }]);
  const [query, setQuery] = useState('');
  return <main className="ui-app__main ui-app__main--wide finance-comparison"><header className="finance-comparison__head"><h1>Company comparison</h1><p id="react-finance-basis" className="ui-app__sub">Changes since the previous close.</p></header>
    <div className="finance-comparison__data">
    <Card pad="sm"><div className="ui-toolbar">
    <SearchField ariaLabel="Search companies" placeholder="Company" value={query} onChange={e => setQuery(e.currentTarget.value)} />
    <FilterBar clearVariant="link" clearLabel="Clear filters" filters={filters} add={catalogue} onRemove={id => setFilters(filters.filter(f => f.id !== id))} onClear={() => setFilters([])} onChange={(id, value) => setFilters(filters.map(f => f.id === id ? { ...f, value: value || '' } : f))}
      onAdd={(id, value) => { const entry = catalogue.find(f => f.id === id); if (entry) setFilters(current => [...current, { ...entry, value: value || '' }]); }} />
    </div></Card>
    <div className="ui-card ui-card--fit finance-comparison__card"><Segmented label="Dataset view" value={view} onChange={setView} appearance="underline" options={[{ label: 'Overview', value: 'overview' }, { label: 'Performance', value: 'performance' }]} />
    <DataTable rows={rows.filter(r => r.name.toLowerCase().includes(query.trim().toLowerCase()) && filters.every(f => !f.value || f.value === (f.id === 'sector' ? 'All sectors' : 'All markets') || r[f.id as 'sector' | 'market'] === f.value))} pageSize={20} empty="No companies match these filters." selectable={false} density="compact" stickyHeader pinnedIdentity scrollLabel="Company comparison"
      columns={[{ key: 'name', label: 'Company', linked: true, render: r => <a href="#company">{r.name}</a> }, ...(view === 'overview' ? [{ key: 'price' as const, label: 'Price', num: true, sortable: true, render: (r: {price: number}) => <NumericValue value={r.price.toFixed(2)} unit="USD" /> }] : []), { key: 'change', label: 'Daily change', num: true, render: r => <DeltaValue value={`${r.change > 0 ? '+' : r.change < 0 ? '−' : ''}${Math.abs(r.change).toFixed(2)}%`} tone={r.change > 0 ? 'success' : r.change < 0 ? 'danger' : undefined} basisId="react-finance-basis" /> }]} /></div>
    </div>
  </main>;
}
export const Comparison = { render: () => <Example /> };

function SelectableExample() {
  const rows = [{ name: 'Aster Systems', price: 228.87, sector: 'Technology' }, { name: 'Birch Energy', price: 84.12, sector: 'Energy' }];
  const [selected, setSelected] = useState(new Set<string>());
  const { bar, shown } = useTableFilters(rows, {
    search: 'Search companies', placeholder: 'Company', label: 'Company filters', text: r => r.name,
    facets: [{ id: 'sector', label: 'Sector', any: 'Any sector', of: r => r.sector }],
  });
  return <main className="ui-app__main ui-app__main--wide pinned-selection" style={{ '--ui-app-main': '60rem' } as CSSProperties}>
    <style>{'.pinned-selection .ui-table { min-width: 70rem; }'}</style>
    <h1>Select companies</h1><p className="ui-app__sub">Fictional data. Scroll to compare values while keeping company selection in view.</p>
    <div className="ui-card-stack">
    <Card>{bar}</Card>
    <DataTable rows={shown} selected={selected} empty="No companies match" onToggle={name => setSelected(current => {
      const next = new Set(current); if (next.has(name)) next.delete(name); else next.add(name); return next;
    })} onTogglePage={names => setSelected(current => names.every(name => current.has(name)) ? new Set() : new Set(names))}
      density="compact" stickyHeader pinnedIdentity scrollLabel="Selectable companies, scroll for more columns" pager={false}
      columns={[{ key: 'name', label: 'Company', linked: true, render: r => <RowIdentity symbol={r.name.slice(0, 4).toUpperCase()} name={r.name} href="#company" /> }, { key: 'price', label: 'Price', num: true, render: r => <NumericValue value={r.price} unit="USD" /> }, { key: 'sector', label: 'Sector' }]} />
    </div>
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
