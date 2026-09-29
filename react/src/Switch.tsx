import { forwardRef, type InputHTMLAttributes } from 'react';
import '../../src/styles/input.css';

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & {
  label: string;
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch({
  label, ...props
}, ref) {
  return <label className="ui-switch">
    <input aria-label={label} {...props} ref={ref} type="checkbox" />
    <span className="ui-switch__track" />
  </label>;
});
