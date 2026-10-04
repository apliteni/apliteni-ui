import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & {
  label: ReactNode;
  type?: 'checkbox' | 'radio';
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({
  label, type = 'checkbox', ...props
}, ref) {
  return <label className="ui-check">
    <input {...props} ref={ref} type={type} />
    <span>{label}</span>
  </label>;
});
