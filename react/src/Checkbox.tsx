import { forwardRef, useId, type FieldsetHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & {
  label: ReactNode;
  /** Shown under the label words and described to assistive technology. */
  hint?: ReactNode;
  type?: 'checkbox' | 'radio';
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({
  label, hint, type = 'checkbox', 'aria-describedby': describedBy, ...props
}, ref) {
  const hintId = useId();
  const described = [describedBy, hint ? hintId : undefined].filter(Boolean).join(' ') || undefined;
  const check = <label className="ui-check">
    <input {...props} ref={ref} type={type} aria-describedby={described} />
    <span>{label}</span>
  </label>;
  if (!hint) return check;
  return <div className="ui-check-item">
    {check}
    <div id={hintId} className="ui-check__hint">{hint}</div>
  </div>;
});

export type CheckListProps = Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, 'children'> & {
  legend: ReactNode;
  children: ReactNode;
};

/** A group of `Checkbox` children under a legend. */
export function CheckList({ legend, children, className = '', ...props }: CheckListProps) {
  return <fieldset {...props} className={`ui-check-list ${className}`.trim()}>
    <legend className="ui-field__label">{legend}</legend>
    {children}
  </fieldset>;
}
