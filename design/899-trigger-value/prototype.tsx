import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Dropdown } from '../../react/src/Dropdown';
import { Dropdown as ProposedDropdown } from 'proposal:Dropdown';
import { Field } from '../../react/src/Field';
import { FilterBar } from '../../react/src/FilterBar';
import { Card } from '../../react/src/primitives/Card';
import { Button } from '../../react/src/primitives/Button';
import '../../src/index.css';
import './prototype.css';

const units = [
  { label: 'Engine team', value: 'engine' },
  { label: 'Support team', value: 'support' },
  { label: 'Research and development team', value: 'research' },
];
const cases = [
  { id: 'form', title: 'Form field', name: 'Unit', value: 'Engine team', items: units },
  { id: 'empty', title: 'Form without a value', name: 'Unit', value: '', items: units },
  { id: 'filter', title: 'Filter with a value', name: 'Unit', value: 'Engine team', items: units },
  { id: 'filter-empty', title: 'Filter without a value', name: 'Unit', value: '', items: units },
  { id: 'entity', title: 'Entity switcher', name: 'Entity', prefix: 'Entity:', value: 'Studio', items: [
    { label: 'Studio', value: 'studio' }, { label: 'Trading', value: 'trading' }, { label: 'Archive', value: 'archive' },
  ] },
  { id: 'currency', title: 'Currency choice', name: 'Currency', prefix: 'currency:', value: 'EUR', items: [
    { label: 'EUR', value: 'EUR' }, { label: 'USD', value: 'USD' }, { label: 'CAD', value: 'CAD' },
  ] },
  { id: 'version', title: 'Version captions', name: 'Version', prefix: 'version:', value: 'phoenix.2026.002', items: [
    { label: 'phoenix.2026.002', value: 'current' }, { label: 'phoenix.2026.001', value: 'earlier' },
  ] },
];
function Specimen({ entry, after }) {
  const [value, setValue] = useState(entry.value);
  const [removed, setRemoved] = useState(false);
  const D = after ? ProposedDropdown : Dropdown;
  const isFilter = entry.id.startsWith('filter');
  const form = entry.id === 'form' || entry.id === 'empty';
  const placeholder = 'Choose a unit';
  const expected = isFilter ? `Unit: ${value || 'any'}` : after
    ? `${entry.name}${form ? ' ' : ': '}${value || placeholder}`
    : `${form ? 'Unit ' : ''}${entry.prefix || entry.name} ${value || placeholder}`;
  const dropdown = (control = {}) => <D {...control} label={after ? undefined : entry.prefix || entry.name}
    ariaLabel={entry.name} variant="select" value={value || undefined} placeholder={placeholder}
    selectedValue={entry.items.find(item => item.label === value)?.value ?? ''}
    items={entry.items} search={entry.id === 'currency' ? { label: 'Search currencies' } : undefined}
    onSelect={(_, item) => setValue(item.label)} />;
  return <article className="specimen" data-side={after ? 'after' : 'before'} data-case={entry.id}>
    <h3 className="ui-card__title">{after ? 'Proposed' : 'Today on main'}</h3>
    <div className="sample">
      {isFilter ? <FilterBar filters={removed ? [] : [{ id: 'unit', label: 'Unit', value, items: units }]}
        add={removed ? [{ id: 'unit', label: 'Unit', items: units }] : undefined}
        onAdd={(_, picked) => { setRemoved(false); setValue(units.find(item => item.value === picked)?.label || ''); }}
        onChange={(_, picked) => setValue(units.find(item => item.value === picked)?.label || '')}
        onRemove={() => { setRemoved(true); setValue(''); }} onClear={() => setValue('')} />
      : form ? <Card><Field label="Unit">{dropdown}</Field></Card> : dropdown()}
    </div>
    <p className="name"><strong>Accessible name</strong><br />{removed ? 'Filter' : expected}</p>
  </article>;
}
function App() {
  const params = new URLSearchParams(location.search);
  const [theme, setTheme] = useState(params.get('theme') === 'dark' ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  const side = params.get('side');
  return <main className="review">
    <header className="heading">
      <div><h1 className="ui-title">Compare dropdown triggers</h1><p>Issue 899. Fabricated data. Main 26028b76.</p></div>
      <div className="theme-controls" role="group" aria-label="Theme">
        <Button variant="secondary" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>Light</Button>
        <Button variant="secondary" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>Dark</Button>
      </div>
    </header>
    <p className="rule">Show only the value or placeholder inside the trigger. Keep form names above the control.</p>
    {cases.map(entry => <section className="case" key={entry.id} aria-labelledby={`title-${entry.id}`}>
      <h2 className="ui-section-title" id={`title-${entry.id}`}>{entry.title}</h2>
      <div className={`pair ${side ? 'single' : ''}`}>
        {side !== 'after' && <Specimen entry={entry} after={false} />}
        {side !== 'before' && <Specimen entry={entry} after={true} />}
      </div>
    </section>)}
    <section className="decision" aria-labelledby="decision-title">
      <h2 className="ui-section-title" id="decision-title">Keep the value only</h2>
      <p>Recommended filter variant: keep FilterBar unchanged. It shows Unit only when no value is set.</p>
      <p>The accessible name keeps Unit and the value. An extra visible name would break the requested rule.</p>
      <p>Open any trigger to test selection. Escape closes the panel and returns focus.</p>
    </section>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App />);
