import { forwardRef, type InputHTMLAttributes } from 'react';

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & {
  label: string;
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch({
  label, className, ...props
}, ref) {
  // `className` goes on the label, not the input: `.ui-switch input` is a 0x0
  // transparent box, so a margin or a utility class placed there paints nothing.
  // The empty-label fallback is switchToggle()'s, so a switch is never unnamed.
  return <label className={['ui-switch', className].filter(Boolean).join(' ')}>
    <input aria-label={label || 'Toggle'} {...props} ref={ref} type="checkbox" />
    <span className="ui-switch__track" />
  </label>;
});
