import { useRef, useState } from 'react';
import { Dropdown, type DropdownEntry } from './Dropdown';
import { Button } from './primitives/Button';
import { useIsoLayoutEffect } from './dialog';
import { filterChipText, filterChipName, filterChipUnset, filterChipItems, focusNextStop } from '@apliteni/apliteni-ui';
export type Filter = { id: string; label: string; /** empty or absent while nothing is chosen; the chip then shows `label` */ value?: string; items: DropdownEntry[]; disabled?: boolean; open?: boolean };
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
    // No chip of its own left to hold it: the shared pair decides where the focus
    // goes — the bar itself only while it still holds chips, since emptied it
    // draws no box and the ring would sit on a 0-height line — and checks that it
    // arrived. why: docs/library.md#a-filter-row-holds-its-panels
    if (target) target.focus();
    else focusNextStop(bar.current);
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
      {/* The chip's own value is marked in the items its menu gets, so the line
          the chip prints and the row the menu washes cannot disagree — the same
          shared call the vanilla factory makes. why: src/logic/filter-bar.js */}
      <Dropdown items={filterChipItems(filter)} variant="select" ariaLabel={filterChipName(filter)}
        triggerContent={<span className={filterChipUnset(filter) ? 'ui-dropdown__value is-placeholder' : 'ui-dropdown__value'}>{filterChipText(filter)}</span>}
        open={!blocked && !filter.disabled && (opened[filter.id] && opened[filter.id].against === filter.open ? opened[filter.id].open : !!filter.open)}
        onOpenChange={open => setOpened(previous => ({ ...previous, [filter.id]: { open, against: filter.open } }))}
        onSelect={value => { if (!blocked && !filter.disabled) onChange(filter.id, value == null ? undefined : String(value)); }} />
      <button type="button" className="ui-filter-bar__remove" data-filter-remove="" aria-label={`Remove ${filter.label} filter`}
        onClick={() => { if (!blocked && !filter.disabled) onRemove(filter.id); }}>×</button>
    </fieldset>)}
    {/* Shown only once there is something to clear, in the bordered skin. The
        vanilla factory carries the reasoning. why: docs/library.md#a-filter-row-holds-its-panels */}
    {filters.length > 0 && <span data-filter-clear="" onFocus={() => { focused.current = { id: null, index: 0 }; }}><Button size="sm" onClick={() => { if (!blocked) onClear(); }}>{clearLabel}</Button></span>}
  </fieldset></div>;
}
