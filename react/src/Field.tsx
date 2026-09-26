import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { esc, icon } from '@apliteni/apliteni-ui';
import '../../src/styles/input.css';
import { Icon } from './primitives/Icon';
import './Field.css';

type FieldMessage = { label: string; hint?: string; error?: string };
type Wiring = 'id' | 'aria-describedby' | 'aria-invalid';

function Frame({ id, label, hint, error, required, children }: FieldMessage & { id: string; required?: boolean; children: ReactNode }) {
  return <div className="ui-field">
    <label className="ui-field__label" htmlFor={id}>{label}{required && <span className="ui-field__req" aria-hidden="true">*</span>}</label>
    {children}
    {(error || hint) && <div id={`${id}-message`} className={error ? 'ui-field__error' : 'ui-field__hint'}
      dangerouslySetInnerHTML={{ __html: (error ? icon('alert') : '') + esc(error || hint) }} />}
  </div>;
}

function wiring(id: string, hint?: string, error?: string) {
  return { id, 'aria-describedby': error || hint ? `${id}-message` : undefined, 'aria-invalid': error ? true as const : undefined };
}

export type TextFieldProps = FieldMessage & Omit<InputHTMLAttributes<HTMLInputElement>, Wiring | 'type'> & {
  type?: 'text' | 'number' | 'email'; unit?: string;
};
export function TextField({ label, hint, error, required, type = 'text', unit, className = '', ...props }: TextFieldProps) {
  const id = useId();
  const hasUnit = type === 'number' && !!unit;
  const describedBy = [error || hint ? `${id}-message` : '', hasUnit ? `${id}-unit` : ''].filter(Boolean).join(' ') || undefined;
  const control = <input {...props} {...wiring(id, hint, error)} required={required} type={type} aria-describedby={describedBy}
    inputMode={type === 'number' ? 'decimal' : props.inputMode}
    className={`ui-input${error ? ' is-invalid' : ''} ${className}`} />;
  return <Frame {...{ id, label, hint, error, required }}>
    {hasUnit ? <div className="ui-field-number">{control}<span id={`${id}-unit`} className="ui-field-number__unit">{unit}</span></div> : control}
  </Frame>;
}

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
