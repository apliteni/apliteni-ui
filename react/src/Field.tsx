import { forwardRef, useEffect, useId, useRef, useState, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { esc, icon } from '@apliteni/apliteni-ui';
import { Icon } from './primitives/Icon';
import './Field.css';

type FieldMessage = { label: string; hint?: string; error?: string };
type Wiring = 'id' | 'aria-describedby' | 'aria-invalid';

// The error and the hint are siblings, not alternatives: a hint that carries a
// consent, safety or legal detail is exactly what a reader needs while deciding
// whether to retry, and the vanilla field's swap took it away at that moment.
// The error comes first — it is the new thing and the closest to the control —
// and both ids are described, in that order (#388).
function messages(id: string, hint?: string, error?: string) {
  return [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
}

function Frame({ id, label, hint, error, required, children }: FieldMessage & { id: string; required?: boolean; children: ReactNode }) {
  return <div className="ui-field">
    <label className="ui-field__label" htmlFor={id}>{label}{required && <span className="ui-field__req" aria-hidden="true">*</span>}</label>
    {children}
    {error && <div id={`${id}-error`} className="ui-field__error" role="alert"
      dangerouslySetInnerHTML={{ __html: icon('alert') + esc(error) }} />}
    {hint && <div id={`${id}-hint`} className="ui-field__hint">{hint}</div>}
  </div>;
}

// The attributes a caller spreads onto its control, written out rather than
// derived: `ReturnType<typeof wiring>` compiles, but it pushes the private
// helper into the published .d.ts and hovers as its name instead of these
// three. This is the one type in the Field API a consumer has to read.
export type FieldControlProps = {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  required?: boolean;
};

function wiring(id: string, hint?: string, error?: string): Omit<FieldControlProps, 'required'> {
  return { id, 'aria-describedby': messages(id, hint, error), 'aria-invalid': error ? true as const : undefined };
}

export type FieldProps = FieldMessage & {
  id?: string;
  required?: boolean;
  children: (control: FieldControlProps) => ReactNode;
};

/** Spread the supplied attributes onto one labelable control. */
export function Field({ id: suppliedId, label, hint, error, required, children }: FieldProps) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return <Frame {...{ id, label, hint, error, required }}>
    {children({ ...wiring(id, hint, error), required })}
  </Frame>;
}

export type TextFieldProps = FieldMessage & Omit<InputHTMLAttributes<HTMLInputElement>, Wiring | 'type'> & {
  type?: 'text' | 'number' | 'email' | 'password' | 'search'; unit?: string;
  /** Kit glyph name, as Button, Dropdown and vanilla input() take it. Decorative;
      the label supplies the control's name. */
  icon?: string;
};
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField({ label, hint, error, required, type = 'text', unit, icon: glyph, className = '', ...props }, ref) {
  const id = useId();
  const hasUnit = type === 'number' && !!unit;
  const describedBy = [messages(id, hint, error), hasUnit ? `${id}-unit` : ''].filter(Boolean).join(' ') || undefined;
  const control = <input ref={ref} {...props} {...wiring(id, hint, error)} required={required} type={type} aria-describedby={describedBy}
    inputMode={type === 'number' ? 'decimal' : props.inputMode}
    className={`ui-input${error ? ' is-invalid' : ''} ${className}`} />;
  // icon() already marks the svg aria-hidden, so the span vanilla emits carries
  // nothing extra — this is byte-for-byte the vanilla input({ icon }) group.
  const unitSpan = hasUnit ? <span id={`${id}-unit`} className="ui-field-number__unit">{unit}</span> : null;
  return <Frame {...{ id, label, hint, error, required }}>
    {glyph
      ? <div className={`ui-input-group${hasUnit ? ' ui-field-number' : ''}`}>
        <span className="ui-input-group__icon" dangerouslySetInnerHTML={{ __html: icon(glyph) }} />{control}{unitSpan}
      </div>
      : hasUnit ? <div className="ui-field-number">{control}{unitSpan}</div> : control}
  </Frame>;
});

export type TextAreaProps = FieldMessage & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, Wiring>;
export function TextArea({ label, hint, error, required, className = '', ...props }: TextAreaProps) {
  const id = useId();
  return <Frame {...{ id, label, hint, error, required }}><textarea rows={4} {...props} {...wiring(id, hint, error)} required={required}
    className={`ui-textarea${error ? ' is-invalid' : ''} ${className}`} /></Frame>;
}

export type SelectFieldProps = FieldMessage & Omit<SelectHTMLAttributes<HTMLSelectElement>, Wiring>;
export function SelectField({ label, hint, error, required, className = '', children, ...props }: SelectFieldProps) {
  const id = useId();
  return <Frame {...{ id, label, hint, error, required }}><select {...props} {...wiring(id, hint, error)} required={required}
    className={`ui-select${error ? ' is-invalid' : ''} ${className}`}>{children}</select></Frame>;
}

export type FileFieldProps = FieldMessage & Omit<InputHTMLAttributes<HTMLInputElement>, Wiring | 'type' | 'multiple' | 'value' | 'defaultValue' | 'onChange'> & {
  onFileChange?: (file: File | null) => void;
};
export function FileField({ label, hint, error, required, disabled, onFileChange, className = '', ...props }: FileFieldProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const form = input.current?.form;
    const reset = () => { setFile(null); setDragging(false); };
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, []);
  const update = (next: File | null) => { setFile(next); onFileChange?.(next); };
  return <Frame {...{ id, label, hint, error, required }}>
    <div className={`ui-file${dragging && !disabled ? ' is-dragging' : ''}${file ? ' has-file' : ''}${error ? ' is-invalid' : ''}${disabled ? ' is-disabled' : ''}`}
      onDragOver={event => { event.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
      onDrop={event => {
        event.preventDefault(); setDragging(false);
        if (disabled || !event.dataTransfer.files.length || !input.current) return;
        const transfer = new DataTransfer();
        transfer.items.add(event.dataTransfer.files[0]);
        input.current.files = transfer.files;
        update(transfer.files[0]);
      }}>
      <span className="ui-file__glyph"><Icon name="upload" /></span>
      <div aria-live="polite">{file ? file.name : 'Drop a file here'}</div>
      <div>or choose one from your device</div>
      <span className="ui-file__choose">
        <span className="ui-btn ui-btn--secondary ui-btn--sm" aria-hidden="true" aria-disabled={disabled || undefined}>{file ? 'Replace file' : 'Choose file'}</span>
        <input {...props} {...wiring(id, hint, error)} ref={input} type="file" required={required} disabled={disabled}
          className={`ui-file__input ${className}`} onChange={event => update(event.currentTarget.files?.[0] ?? null)} />
      </span>
    </div>
  </Frame>;
}
