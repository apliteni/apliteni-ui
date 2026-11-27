import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FilterBar } from '../../react/src/FilterBar';
import { SearchField } from '../../react/src/SearchField';
import { Button } from '../../react/src/primitives/Button';

// These records and values are fabricated for the design review.
const choices = {
  Month: ['May 2026', 'June 2026', 'September 2026'],
  Unit: ['Studio', 'Research', 'International operations'],
  Category: ['Software', 'Travel', 'Office supplies', 'Equipment repairs', 'Staff training',
    'Customer research', 'Building maintenance', 'Shipping services', 'Insurance',
    'Translation services', 'Conference registration', 'Professional advisory services'],
  Amount: ['Under EUR 100', 'EUR 100 to 999', 'EUR 10,000 and above'],
  Source: ['Manual entry', 'Card payment', 'Imported bank statement'],
};
const names = Object.keys(choices);
const variant = document.documentElement.dataset.variant!;
const titles = { main: 'Today on main', shared: 'Shared cap', product: 'Per-chip caps', current: 'Current value' };
const records = Array.from({ length: 12 }, (_, i) => ({
  name: ['Paper supplies', 'Workshop materials', 'Research tools'][i % 3],
  unit: ['Studio', 'Research'][i % 2], category: ['Office supplies', 'Staff training', 'Software'][i % 3],
  amount: [84, 240, 128][i % 3], source: ['Manual entry', 'Card payment'][i % 2],
}));

function App() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [missing, setMissing] = useState(false);
  const [dark, setDark] = useState(false);
  const filters = names.map(label => ({ id: label.toLowerCase(), label, value: values[label.toLowerCase()],
    items: [{ label: `Any ${label.toLowerCase()}`, value: '' },
      ...choices[label].map(value => ({ label: value, value }))] }));
  const rows = records.filter(row => !missing && row.name.toLowerCase().includes(query.toLowerCase()));
  return <main className="study">
    <header className="study-head">
      <h1>Transactions</h1>
      <Button size="sm" variant="ghost" aria-label={dark ? 'Light theme' : 'Dark theme'} onClick={() => {
        document.documentElement.dataset.theme = dark ? 'light' : 'dark'; setDark(!dark);
      }}>{dark ? 'Light' : 'Dark'}</Button>
    </header>
    <div className="ui-toolbar study-toolbar">
      <SearchField size="sm" ariaLabel="Search transactions" placeholder="Search transactions" width="320px"
        value={query} onChange={event => setQuery(event.target.value)} />
      <FilterBar size="sm" filters={filters} onClear={() => setValues({})}
        onChange={(id, value) => setValues(old => ({ ...old, [id]: value || '' }))} />
      <Button size="sm" variant="secondary" className="study-extra" aria-pressed={missing}
        onClick={() => setMissing(!missing)}>Missing unit or category</Button>
    </div>
    <div className="ui-table-scroll" tabIndex={0} role="region" aria-label="Demo transactions">
      <table className="ui-table ui-table--dense">
        <thead><tr>{['Description', 'Unit', 'Category', 'Amount', 'Source'].map(name => <th key={name}>{name}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i}><td>{row.name}</td><td>{row.unit}</td><td>{row.category}</td>
          <td>EUR {row.amount.toFixed(2)}</td><td>{row.source}</td></tr>)}</tbody>
      </table>
      {rows.length === 0 && <div className="study-empty" role="status">No matches. Clear the search or turn off the missing-value filter.</div>}
    </div>
    <footer className="study-review">
      <p>{titles[variant]} / Design proposal for issue #915. Fabricated data.</p>
      <div className="study-actions" role="group" aria-label="Sample values">
        <Button size="sm" variant="secondary" aria-label="Long values" onClick={() => setValues(Object.fromEntries(names.map(name =>
          [name.toLowerCase(), choices[name].at(-1)!])))}>Long</Button>
        <Button size="sm" variant="secondary" aria-label="Short values" onClick={() => setValues(Object.fromEntries(names.map(name =>
          [name.toLowerCase(), choices[name][0]])))}>Short</Button>
        <Button size="sm" variant="ghost" aria-label="Reset values" onClick={() => setValues({})}>Reset</Button>
      </div>
      <p>Pick a value from each chip. The table is a layout sample.</p>
    </footer>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
