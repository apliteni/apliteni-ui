import { useState } from 'react';
import { FilterBar } from '../react/src/FilterBar';
import { SearchField } from '../react/src/SearchField';

/** One chip: its name, the value that means no filter, and the cell it reads. */
export type Facet<Row> = { id: string; label: string; any: string; of: (row: Row) => string };
type Options<Row> = { search: string; placeholder: string; label: string; text: (row: Row) => string; facets: Facet<Row>[] };

/** The filter bar every table has directly above it: a search field and the chips
 *  that fit the table's columns, each chip offering the values its column holds.
 *  A table with no column worth a chip gets the search field alone. The caller puts
 *  `bar` on a card, because a field never stands on the page ground.
 *  why: guidelines/dense-tables.md */
export function useTableFilters<Row>(rows: Row[], { search, placeholder, label, text, facets }: Options<Row>) {
  const [query, setQuery] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const term = query.trim().toLowerCase();
  const shown = rows.filter((row) => text(row).toLowerCase().includes(term)
    && facets.every((facet) => !values[facet.id] || facet.of(row) === values[facet.id]));
  const set = (id: string, value?: string) => setValues((previous) => ({ ...previous, [id]: value ?? '' }));
  const clear = () => { setQuery(''); setValues({}); };
  const bar = <div className="ui-toolbar">
    <SearchField ariaLabel={search} placeholder={placeholder} value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
    {facets.length > 0 && <FilterBar label={label} onChange={set} onRemove={(id) => set(id)} onClear={() => setValues({})}
      filters={facets.map((facet) => ({
        id: facet.id, label: facet.label, value: values[facet.id] ?? '',
        items: [{ label: facet.any, value: '' }, ...[...new Set(rows.map(facet.of))].map((value) => ({ label: value, value }))],
      }))} />}
  </div>;
  return { bar, shown, clear };
}

const noop = () => {};
/** One chip at rest: its name, the value that means no filter, and the values its column holds. */
export type Chip = { id: string; label: string; any: string; values: string[] };
/** The same bar at rest on its card, for a guideline specimen: nothing typed, every chip
 *  unset, nothing wired. */
export const RestingFilters = ({ search, placeholder, label, chips = [] }: { search: string; placeholder: string; label: string; chips?: Chip[] }) =>
  <div className="ui-card ui-card--pad-sm"><div className="ui-toolbar">
    <SearchField ariaLabel={search} placeholder={placeholder} />
    {chips.length > 0 && <FilterBar label={label} onChange={noop} onRemove={noop} onClear={noop}
      filters={chips.map((chip) => ({ id: chip.id, label: chip.label, value: '',
        items: [{ label: chip.any, value: '' }, ...chip.values.map((value) => ({ label: value, value }))] }))} />}
  </div></div>;
