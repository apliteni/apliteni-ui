import { useLayoutEffect, useRef } from 'react';
import { filterBar, initFilterBar } from '@apliteni/apliteni-ui';
import type { DropdownEntry } from './Dropdown';
export type Filter = { id: string; label: string; value: string; items: DropdownEntry[]; disabled?: boolean; open?: boolean };
export type FilterBarProps = { filters: Filter[]; label?: string; clearLabel?: string; disabled?: boolean; busy?: boolean;
  onRemove: (id: string) => void; onClear: () => void; onChange: (id: string, value: string | undefined) => void };
// A shared DOM adapter keeps Dropdown and removal focus identical in both entry points.
export function FilterBar(props: FilterBarProps) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props); latest.current = props;
  const controller = useRef<ReturnType<typeof initFilterBar> | null>(null);
  const initial = useRef({ __html: filterBar(props) });
  useLayoutEffect(() => {
    const el = host.current!;
    controller.current = initFilterBar(el, latest.current);
    const remove = (e: Event) => latest.current.onRemove((e as CustomEvent).detail.id);
    const clear = () => latest.current.onClear();
    const change = (e: Event) => { const { id, value } = (e as CustomEvent).detail; latest.current.onChange(id, value); };
    el.addEventListener('ui-filter-remove', remove); el.addEventListener('ui-filter-clear', clear); el.addEventListener('ui-filter-change', change);
    return () => { controller.current?.destroy(); el.removeEventListener('ui-filter-remove', remove); el.removeEventListener('ui-filter-clear', clear); el.removeEventListener('ui-filter-change', change); };
  }, []);
  useLayoutEffect(() => { controller.current?.update(props); }, [props.filters, props.label, props.clearLabel, props.disabled, props.busy]);
  return <div ref={host} dangerouslySetInnerHTML={initial.current} />;
}
