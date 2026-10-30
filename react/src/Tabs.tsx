import { useEffect, useId, useRef, type ReactNode } from 'react';
import { playEntrance } from '@apliteni/apliteni-ui/motion';

export type TabItem = { value: string; label: string; count?: number; panel: ReactNode };
export type TabsProps = {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  label: string;
};

/** The tab a key moves to from tab `i` of `count`, or undefined for a key a tab row ignores. */
export function tabKeyIndex(key: string, i: number, count: number): number | undefined {
  switch (key) {
    case 'ArrowRight': return (i + 1) % count;
    case 'ArrowLeft': return (i - 1 + count) % count;
    case 'Home': return 0;
    case 'End': return count - 1;
    default: return undefined;
  }
}

export function Tabs({ items, value, onChange, label }: TabsProps) {
  const id = useId();
  const previous = useRef(value);
  const activePanel = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (previous.current !== value) playEntrance(activePanel.current);
    previous.current = value;
  }, [value]);

  return <div className="ui-tabs">
    <div className="ui-tabs__list" role="tablist" aria-label={label}>
      {items.map((item, i) => <button key={item.value} type="button" role="tab"
        ref={el => { buttons.current[i] = el; }}
        className={`ui-tabs__tab${item.value === value ? ' is-active' : ''}`}
        id={`${id}-tab-${i}`} aria-controls={`${id}-panel-${i}`}
        aria-selected={item.value === value} tabIndex={item.value === value ? 0 : -1}
        onClick={() => onChange(item.value)} onKeyDown={event => {
          const next = tabKeyIndex(event.key, i, items.length);
          if (next === undefined) return;
          event.preventDefault();
          buttons.current[next]?.focus();
          onChange(items[next].value);
        }}>{item.label}{item.count != null && <> {item.count}</>}</button>)}
    </div>
    <div className="ui-tabs__panels">
      {items.map((item, i) => <div key={item.value} className="ui-tabs__panel" role="tabpanel"
        ref={item.value === value ? activePanel : undefined}
        id={`${id}-panel-${i}`} aria-labelledby={`${id}-tab-${i}`} tabIndex={0}
        hidden={item.value !== value}>{item.value === value ? item.panel : null}</div>)}
    </div>
  </div>;
}
