import { useRef, useState } from 'react';
import { Dropdown, type DropdownEntry, type DropdownItem } from './Dropdown';
import { Button } from './primitives/Button';
import { useIsoLayoutEffect } from './dialog';
import { filterChipText, filterChipName, filterChipUnset } from '@apliteni/apliteni-ui';
export type Filter = { id: string; label: string; /** empty or absent while nothing is chosen; the chip then shows `label` */ value?: string; items: DropdownEntry[]; disabled?: boolean; open?: boolean };
/** A filter the bar can put on itself: the chip's name, and the values its menu offers. */
export type AddFilter = { id: string; label: string; items: DropdownEntry[] };
export type FilterBarProps = { filters: Filter[]; label?: string; clearLabel?: string; disabled?: boolean; busy?: boolean;
  add?: AddFilter[]; addLabel?: string;
  onRemove: (id: string) => void; onClear: () => void; onChange: (id: string, value: string | undefined) => void;
  onAdd?: (id: string, value: string | undefined) => void };

// A menu of ten gets a field over it. why: guidelines/component-choice.md#add-dropdown-search
const SEARCH_AT = 10;
const isRow = (entry: DropdownEntry): entry is DropdownItem => entry !== '---' && !(entry as { separator?: boolean }).separator;

export function FilterBar({ filters, label = 'Filters', clearLabel = 'Clear all filters', add, addLabel = 'Add filter', disabled = false, busy = false, onRemove, onClear, onChange, onAdd }: FilterBarProps) {
  const bar = useRef<HTMLFieldSetElement>(null);
  const focused = useRef<{ id: string | null; index: number } | null>(null);
  // The filter the add menu just asked for. Consumed by the first layout pass after the
  // pick, which is the pass a controlled consumer answers it in.
  const landing = useRef<string | null>(null);
  const [opened, setOpened] = useState<Record<string, { open: boolean; against: boolean | undefined }>>({});
  const [adding, setAdding] = useState(false);
  const blocked = disabled || busy;
  // Only the filters the bar is not already holding: a second chip under one id is the
  // one thing the bar cannot carry.
  const offer = (add || []).filter(entry => !filters.some(filter => filter.id === entry.id));
  // Which filter a picked row belongs to. The rows are copies, so two filters offering
  // the same item object still answer for themselves.
  const source = new Map<DropdownEntry, string>();
  const sections = offer.map(entry => ({ label: entry.label, items: entry.items.map(item => {
    if (!isRow(item)) return item;
    const copy = { ...item };
    source.set(copy, entry.id);
    return copy;
  }) }));
  const options = sections.reduce((count, section) => count + section.items.filter(isRow).length, 0);
  const offering = Boolean(onAdd && offer.length);
  useIsoLayoutEffect(() => {
    const stale = Object.keys(opened).filter(id => !filters.some(filter => filter.id === id && filter.open === opened[id].against));
    if (stale.length) setOpened(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => !stale.includes(id))));
    const chips = Array.from(bar.current?.querySelectorAll<HTMLFieldSetElement>('[data-filter-id]') ?? []);
    const asked = landing.current;
    landing.current = null;
    if (asked !== null) {
      const chip = chips.find(c => c.dataset.filterId === asked && !c.disabled);
      const trigger = !blocked && chip?.querySelector<HTMLButtonElement>('[data-dropdown-trigger]');
      if (trigger) { focused.current = null; trigger.focus(); return; }
    }
    const prior = focused.current;
    if (!prior || (prior.id === null && filters.length > 0) || filters.some(f => f.id === prior.id)) return;
    const next = chips.slice(prior.index).find(chip => !chip.disabled)
      || chips.slice(0, prior.index).reverse().find(chip => !chip.disabled);
    const target = !blocked && next?.querySelector<HTMLButtonElement>('[data-dropdown-trigger]');
    focused.current = null;
    (target || bar.current)?.focus();
  });
  return <div><fieldset ref={bar} className="ui-filter-bar" data-filter-bar="" disabled={blocked} aria-busy={busy || undefined} tabIndex={-1}
    onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) focused.current = null;
    }}>
    <legend className="ui-filter-bar__legend">{label}</legend>
    {filters.map((filter, index) => <fieldset key={filter.id} className="ui-filter-bar__chip" data-filter-id={filter.id} disabled={filter.disabled}
      onFocus={() => { focused.current = { id: filter.id, index }; }}>
      <legend className="ui-filter-bar__legend">{filter.label}</legend>
      {/* The chip prints one line; the field's name reaches a reader through the
          trigger's name and the chip's own legend. why: docs/specification.md#dense-financial-tables */}
      <Dropdown items={filter.items} variant="select" ariaLabel={filterChipName(filter)}
        triggerContent={<span className={filterChipUnset(filter) ? 'ui-dropdown__value is-placeholder' : 'ui-dropdown__value'}>{filterChipText(filter)}</span>}
        open={!blocked && !filter.disabled && (opened[filter.id] && opened[filter.id].against === filter.open ? opened[filter.id].open : !!filter.open)}
        onOpenChange={open => setOpened(previous => ({ ...previous, [filter.id]: { open, against: filter.open } }))}
        onSelect={value => { if (!blocked && !filter.disabled) onChange(filter.id, value == null ? undefined : String(value)); }} />
      <button type="button" className="ui-filter-bar__remove" data-filter-remove="" aria-label={`Remove ${filter.label} filter`}
        onClick={() => { if (!blocked && !filter.disabled) onRemove(filter.id); }}>×</button>
    </fieldset>)}
    {/* Its onFocus clears the restore target, so nothing a controlled change does to the
        chips takes focus off this trigger. */}
    {offering && <div data-filter-add="" onFocus={() => { focused.current = null; }}>
      <Dropdown variant="menu" sections={sections} ariaLabel={addLabel} triggerContent={addLabel}
        search={options >= SEARCH_AT && { label: `Search ${label.toLowerCase()}` }}
        open={adding && !blocked} onOpenChange={setAdding}
        onSelect={(value, item) => {
          const id = source.get(item);
          if (blocked || !id) return;
          landing.current = id;
          onAdd?.(id, value == null ? undefined : String(value));
        }} />
    </div>}
    <span data-filter-clear="" onFocus={() => { focused.current = { id: null, index: 0 }; }}><Button size="sm" variant="ghost" disabled={!filters.length} onClick={() => { if (!blocked) onClear(); }}>{clearLabel}</Button></span>
  </fieldset></div>;
}
