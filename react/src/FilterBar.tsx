import { useRef, useState } from 'react';
import { Dropdown, type DropdownEntry } from './Dropdown';
import { Button } from './primitives/Button';
import { useIsoLayoutEffect } from './dialog';
export type Filter = { id: string; label: string; value: string; items: DropdownEntry[]; disabled?: boolean; open?: boolean };
export type FilterBarProps = { filters: Filter[]; label?: string; clearLabel?: string; disabled?: boolean; busy?: boolean;
  onRemove: (id: string) => void; onClear: () => void; onChange: (id: string, value: string | undefined) => void };

export function FilterBar({ filters, label = 'Filters', clearLabel = 'Clear all filters', disabled = false, busy = false, onRemove, onClear, onChange }: FilterBarProps) {
  const bar = useRef<HTMLFieldSetElement>(null);
  const focused = useRef<{ id: string | null; index: number } | null>(null);
  const [opened, setOpened] = useState<Record<string, { open: boolean; against: boolean | undefined }>>({});
  const blocked = disabled || busy;
  useIsoLayoutEffect(() => {
    const stale = Object.keys(opened).filter(id => !filters.some(filter => filter.id === id && filter.open === opened[id].against));
    if (stale.length) setOpened(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => !stale.includes(id))));
    const prior = focused.current;
    if (!prior || (prior.id === null && filters.length > 0) || filters.some(f => f.id === prior.id)) return;
    const chips = Array.from(bar.current?.querySelectorAll<HTMLFieldSetElement>('[data-filter-id]') ?? []);
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
      <Dropdown label={filter.label} value={filter.value} items={filter.items} variant="select" ariaLabel={`${filter.label}: ${filter.value}`}
        open={!blocked && !filter.disabled && (opened[filter.id] && opened[filter.id].against === filter.open ? opened[filter.id].open : !!filter.open)}
        onOpenChange={open => setOpened(previous => ({ ...previous, [filter.id]: { open, against: filter.open } }))}
        onSelect={value => { if (!blocked && !filter.disabled) onChange(filter.id, value == null ? undefined : String(value)); }} />
      <button type="button" className="ui-filter-bar__remove" data-filter-remove="" aria-label={`Remove ${filter.label} filter`}
        onClick={() => { if (!blocked && !filter.disabled) onRemove(filter.id); }}>×</button>
    </fieldset>)}
    <span data-filter-clear="" onFocus={() => { focused.current = { id: null, index: 0 }; }}><Button size="sm" variant="ghost" disabled={!filters.length} onClick={() => { if (!blocked) onClear(); }}>{clearLabel}</Button></span>
  </fieldset></div>;
}
