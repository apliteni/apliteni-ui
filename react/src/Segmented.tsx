import { segmentedNextIndex } from '@apliteni/apliteni-ui';
import { Icon } from './primitives/Icon';
/** `icon` leads the label. With `iconOnly` the glyph is all a reader sees and `label` is the button's name. */
export type SegmentOption = { label: string; value: string; ariaLabel?: string; disabled?: boolean; icon?: string; iconOnly?: boolean };
export type SegmentedProps = { options: SegmentOption[]; value: string; onChange: (value: string) => void; label: string; appearance?: 'pill' | 'underline'; size?: 'sm'; block?: boolean; disabled?: boolean };
export function Segmented({ options, value, onChange, label, appearance = 'pill', size, block = false, disabled = false }: SegmentedProps) {
  const enabled = options.filter(o => !o.disabled);
  const tabValue = enabled.some(o => o.value === value) ? value : enabled[0]?.value;
  return <div className={`ui-seg${size === 'sm' ? ' ui-seg--sm' : ''}${block ? ' ui-seg--block' : ''}${appearance === 'underline' ? ' ui-seg--underline' : ''}`} role="toolbar" aria-label={label}>
    {options.map(option => <button type="button" key={option.value} data-value={option.value} disabled={disabled || option.disabled}
      className={value === option.value ? 'is-active' : undefined} aria-label={option.ariaLabel ?? (option.icon && option.iconOnly ? option.label : undefined)} aria-pressed={value === option.value} tabIndex={option.value === tabValue ? 0 : -1}
      onClick={() => onChange(option.value)} onKeyDown={e => {
        const next = segmentedNextIndex(e.key, enabled.indexOf(option), enabled.length);
        if (next == null) return;
        e.preventDefault();
        const buttons = [...e.currentTarget.parentElement!.querySelectorAll('button:not(:disabled)')];
        (buttons[next] as HTMLButtonElement)?.focus(); onChange(enabled[next].value);
      }}>{option.icon && <Icon name={option.icon} />}{!(option.icon && option.iconOnly) && option.label}</button>)}
  </div>;
}
