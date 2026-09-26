import { useEffect, useRef, useState } from 'react';
import { Badge } from './primitives/Badge';
import { Button } from './primitives/Button';
import './PeriodPicker.css';

export type PeriodState = 'closed' | 'restated' | 'complete-not-closed' | 'incomplete';
export type PeriodMonth = {
  value: string;
  /** Full month and year, for example January 2026. */
  label: string;
  shortLabel: string;
  state: PeriodState;
};
export type PeriodPickerProps = {
  months: readonly PeriodMonth[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

const states = {
  closed: { label: 'Closed', badge: 'success' },
  restated: { label: 'Restated', badge: 'info' },
  'complete-not-closed': { label: 'Complete, not closed', badge: 'neutral' },
  incomplete: { label: 'Incomplete', badge: 'warn' },
};

export function PeriodPicker({ months, value, onChange, label = 'Choose a month' }: PeriodPickerProps) {
  const selected = months.findIndex(month => month.value === value);
  const current = months[selected];
  const [focused, setFocused] = useState(value);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const tabValue = months.some(month => month.value === focused) ? focused : current?.value ?? months[0]?.value;

  useEffect(() => {
    setFocused(value);
    options.current[selected]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [value, selected]);

  const choose = (index: number, focus = false) => {
    const month = months[index];
    if (!month) return;
    if (focus) options.current[index]?.focus();
    options.current[index]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    if (month.value !== value) onChange(month.value);
  };
  const previous = months[selected - 1];
  const next = selected >= 0 ? months[selected + 1] : undefined;

  return <div className="ui-period">
    <div className="ui-period__navigation">
      <Button variant="ghost" size="sm" icon="chevronLeft" disabled={!previous}
        aria-label={previous ? `Previous month: ${previous.label}` : 'No earlier month'}
        onClick={() => choose(selected - 1, true)}>Prev</Button>
      <div className="ui-seg ui-period__strip" role="listbox" aria-label={label} aria-orientation="horizontal">
        {months.map((month, index) => <button type="button" role="option" key={month.value}
          ref={element => { options.current[index] = element; }}
          aria-selected={month.value === value} aria-label={`${month.label}, ${states[month.state].label}`}
          title={`${month.label}, ${states[month.state].label}`}
          tabIndex={month.value === tabValue ? 0 : -1}
          onFocus={() => setFocused(month.value)} onClick={() => choose(index)}
          onKeyDown={event => {
            const target = event.key === 'ArrowLeft' ? Math.max(0, index - 1)
              : event.key === 'ArrowRight' ? Math.min(months.length - 1, index + 1)
                : event.key === 'Home' ? 0 : event.key === 'End' ? months.length - 1 : null;
            if (target === null) return;
            event.preventDefault();
            choose(target, true);
          }}>
          <span className={`ui-period__dot ui-period__dot--${month.state}`} aria-hidden="true" />
          {month.shortLabel}
        </button>)}
      </div>
      <Button variant="ghost" size="sm" iconRight="chevronRight" disabled={!next}
        aria-label={next ? `Next month: ${next.label}` : 'No later month'}
        onClick={() => choose(selected + 1, true)}>Next</Button>
    </div>
    {current && <div className="ui-period__summary" role="status" aria-atomic="true">
      <span>{current.label}</span><Badge variant={states[current.state].badge}>{states[current.state].label}</Badge>
    </div>}
  </div>;
}
