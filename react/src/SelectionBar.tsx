import { useRef, useState, type KeyboardEvent } from 'react';
import { Dropdown, type DropdownEntry, type DropdownItem, type DropdownSearch, type DropdownSection } from './Dropdown';
import { Button } from './primitives/Button';
import { useIsoLayoutEffect } from './dialog';
import './SelectionBar.css';

/** One thing the bar does to the selected rows. With `items`, it opens a list, and a pick
 *  applies that value at once. Without `items`, it is a button. */
export type SelectionBarAction = {
  id: string;
  label: string;
  items?: DropdownEntry[];
  /** The list's search field. From ten rows the bar adds one itself. */
  search?: boolean | DropdownSearch;
  disabled?: boolean;
};

export type SelectionBarProps = {
  /** The number of selected rows. At 0 the bar is not drawn. */
  count: number;
  actions: SelectionBarAction[];
  /** A button, or a pick from a list: the action's id, and the picked value. */
  onAction: (id: string, value?: string) => void;
  /** Clear and Escape. Move the focus yourself, such as to the Select all box. */
  onClear: () => void;
  /** The rows' noun, for the region name and the announcement. */
  noun?: string;
  label?: string;
  clearLabel?: string;
  moreLabel?: string;
  /** Centred over the table, or on the table's start edge. */
  place?: 'centre' | 'start';
};

// A menu of ten gets a field over it. why: guidelines/component-choice.md#add-dropdown-search
const SEARCH_AT = 10;
const isRow = (entry: DropdownEntry): entry is DropdownItem => entry !== '---' && !(entry as { separator?: boolean }).separator;
const rowsOf = (items: DropdownEntry[] = []) => items.filter(isRow).length;
const searchOf = (action: SelectionBarAction, rows: number) =>
  action.search ?? (rows >= SEARCH_AT && { label: `Search ${action.label.toLowerCase()}` });

/**
 * How many actions, from the first, stand on the bar. All of them when they fit in `room`.
 * Otherwise More takes the end, and the rest go into it. `more` is More's width with the
 * gap before it, and `gap` is the gap between two actions. Widths in px.
 * why: docs/components.md#selection-bar
 */
export function fitActions(widths: number[], room: number, more: number, gap: number): number {
  const span = (shown: number) => widths.slice(0, shown).reduce((sum, width, index) => sum + width + (index ? gap : 0), 0);
  if (span(widths.length) <= room) return widths.length;
  let shown = 0;
  while (shown < widths.length && span(shown + 1) + more <= room) shown += 1;
  return shown;
}

const px = (value: string) => parseFloat(value) || 0;

export function SelectionBar({ count, actions, onAction, onClear, noun = 'rows', label, clearLabel = 'Clear', moreLabel = 'More', place = 'centre' }: SelectionBarProps) {
  const room = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const tally = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(actions.length);
  // The announcement says when the selection goes back to none, but not before the first.
  const seen = useRef(false);
  if (count > 0) seen.current = true;
  const said = count > 0 ? `${count} ${noun} selected` : seen.current ? `No ${noun} selected` : '';
  const key = actions.map(action => action.label).join('\n');

  // The bar measures its own room: the widths of every action as a button, from the hidden
  // row, against the room's width less the count and the bar's own padding.
  useIsoLayoutEffect(() => {
    const fit = () => {
      const host = room.current;
      const frame = bar.current;
      const sizes = measure.current;
      if (!host || !frame || !sizes || !tally.current || !slot.current) return;
      const cells = Array.from(sizes.children) as HTMLElement[];
      const widths = cells.slice(0, -1).map(cell => cell.getBoundingClientRect().width);
      const more = cells[cells.length - 1]?.getBoundingClientRect().width ?? 0;
      const box = getComputedStyle(frame);
      const chrome = px(box.paddingLeft) + px(box.paddingRight) + px(box.borderLeftWidth) + px(box.borderRightWidth);
      const barGap = px(box.columnGap);
      const free = host.clientWidth - chrome - tally.current.getBoundingClientRect().width - barGap;
      // A room that is not laid out, as in jsdom, has no width to judge, so every action stands.
      setShown(host.clientWidth ? fitActions(widths, free, more + barGap, px(getComputedStyle(slot.current).columnGap)) : widths.length);
    };
    fit();
    if (typeof ResizeObserver === 'undefined' || !room.current) return;
    const watch = new ResizeObserver(fit);
    watch.observe(room.current);
    if (measure.current) watch.observe(measure.current);
    return () => watch.disconnect();
  }, [count, key]);

  const visible = actions.slice(0, shown);
  const extra = actions.slice(shown);
  // More holds the buttons in one group and each list as a group under its name. The rows
  // are copies, so a pick knows its action even when two actions share an item.
  const source = new Map<DropdownEntry, { id: string; value?: string }>();
  const sections: DropdownSection[] = [];
  for (const action of extra) {
    if (action.items) {
      sections.push({ label: action.label, items: action.items.map(item => {
        if (!isRow(item)) return item;
        const copy = { ...item, disabled: item.disabled || action.disabled };
        source.set(copy, { id: action.id, value: String(item.value ?? item.label) });
        return copy;
      }) });
    } else {
      const copy: DropdownItem = { label: action.label, disabled: action.disabled };
      source.set(copy, { id: action.id });
      const last = sections[sections.length - 1];
      if (last && !last.label) last.items!.push(copy);
      else sections.push({ items: [copy] });
    }
  }
  const moreRows = sections.reduce((sum, section) => sum + rowsOf(section.items), 0);

  const onKeyDown = (event: KeyboardEvent) => {
    // An open list stops its own Escape, so this one has no list to close.
    if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); onClear(); }
  };

  return <>
    {count > 0 && <div ref={room} className={`ui-selection-room${place === 'start' ? ' ui-selection-room--start' : ''}`}>
      <section ref={bar} className="ui-selection-bar" aria-label={label ?? `Selected ${noun}`} onKeyDown={onKeyDown}>
        <div ref={tally} className="ui-selection-bar__count">
          <span className="ui-selection-bar__tally">{count} selected</span>
          <Button variant="ghost" size="sm" className="ui-selection-bar__control" onClick={onClear}>{clearLabel}</Button>
        </div>
        <div ref={slot} className="ui-selection-bar__actions">
          {visible.map(action => action.items
            ? <Dropdown key={action.id} variant="menu" direction="up" chevron={false} triggerClass="ui-selection-bar__control"
              triggerContent={action.label} ariaLabel={action.label} items={action.items} disabled={action.disabled}
              search={searchOf(action, rowsOf(action.items))}
              onSelect={(value, item) => onAction(action.id, String(value ?? item.label))} />
            : <Button key={action.id} variant="ghost" size="sm" className="ui-selection-bar__control" disabled={action.disabled} onClick={() => onAction(action.id)}>{action.label}</Button>)}
        </div>
        {extra.length > 0 && <Dropdown variant="menu" direction="up" align="end" chevron={false} triggerClass="ui-selection-bar__control"
          triggerContent={moreLabel} ariaLabel={moreLabel} sections={sections}
          search={moreRows >= SEARCH_AT && { label: `Search ${moreLabel.toLowerCase()}` }}
          onSelect={(value, item) => {
            const picked = source.get(item);
            if (!picked) return;
            if (picked.value === undefined) onAction(picked.id);
            else onAction(picked.id, picked.value);
          }} />}
        {/* Every action as a button, and More, out of sight: the widths the fit reads. */}
        <div ref={measure} className="ui-selection-bar__measure" aria-hidden="true">
          {actions.map(action => <span key={action.id} className="ui-btn ui-btn--ghost ui-btn--sm ui-selection-bar__control">{action.label}</span>)}
          <span className="ui-btn ui-btn--ghost ui-btn--sm ui-selection-bar__control">{moreLabel}</span>
        </div>
      </section>
    </div>}
    <span className="ui-sr" role="status" aria-live="polite" aria-atomic="true">{said}</span>
  </>;
}
