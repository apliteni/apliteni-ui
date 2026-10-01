import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react';
import '../../src/styles/file-drop.css';
import { Button } from './primitives/Button';
import { Icon } from './primitives/Icon';

export type FileDropStatus = 'uploading' | 'done' | 'error';

/** The file in hand, as the consumer knows it: it owns the request and the clock. */
export type FileDropFile = {
  name: string;
  /** Already written for a reader — the kit picks no unit and no decimal mark. */
  size?: string;
  status?: FileDropStatus;
  /** 0 to 100 while uploading; left out, no bar is drawn. */
  progress?: number;
  /** What this file did wrong, when the status is an error. */
  error?: string;
  /** Replaces "Uploaded" when the status is done. */
  state?: string;
};

export type FileDropProps = {
  /** The button that opens the picker. */
  label?: string;
  /** The accepted types and the size limit, stated once beside the button. */
  note?: string;
  /** Filters the system picker only; the consumer still validates the file. */
  accept?: string;
  /** The words on the drop target. */
  dropLabel?: string;
  removeLabel?: string;
  retryLabel?: string;
  /** The file the consumer is holding. Left out, the row is at rest. */
  file?: FileDropFile | null;
  /** Drives the target from a parent that owns the drag region. */
  dragging?: boolean;
  disabled?: boolean;
  onFile?: (file: File) => void;
  onRemove?: () => void;
  onRetry?: () => void;
  /** What the region accepts the file for; the target covers it while dragging. */
  children?: ReactNode;
  className?: string;
};

/** A drag carrying files, rather than selected text or a link. */
const carriesFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes('Files');

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

export function FileDrop({
  label = 'Upload', note, accept, dropLabel = 'Drop to upload',
  removeLabel = 'Remove', retryLabel = 'Retry',
  file, dragging, disabled, onFile, onRemove, onRetry, children, className,
}: FileDropProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const nameId = useId();
  const status = file?.status ?? 'done';
  // An explicit `dragging` wins, so a parent that owns the drag region decides.
  const showTarget = (dragging ?? over) && !disabled;

  const take = (chosen: File | null | undefined) => { if (chosen && !disabled) onFile?.(chosen); };

  return <div className={cx('ui-drop', disabled && 'is-disabled', className)}
    onDragOver={event => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      if (!disabled) setOver(true);
    }}
    onDragLeave={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
    }}
    onDrop={event => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      setOver(false);
      take(event.dataTransfer.files[0]);
    }}>
    {children}
    <div className="ui-drop__row">
      {file
        ? <div className="ui-drop__file">
          <span className="ui-drop__name" id={nameId}>{file.name}</span>
          {file.size && <span>{file.size}</span>}
          {status === 'uploading' && file.progress !== undefined && <span className="ui-drop__bar"
            role="progressbar" aria-labelledby={nameId}
            aria-valuenow={file.progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${file.progress}%` }} />
          </span>}
          {status === 'done' && <span className="ui-drop__state"><Icon name="circleCheck" />{file.state ?? 'Uploaded'}</span>}
          {status === 'error' && <span className="ui-drop__state ui-drop__error" role="alert">
            <Icon name="circleAlert" />{file.error}</span>}
          {status === 'error' && onRetry
            && <Button size="xs" onClick={onRetry} disabled={disabled}>{retryLabel}</Button>}
          {onRemove
            && <Button variant="ghost" size="xs" onClick={onRemove} disabled={disabled}>{removeLabel}</Button>}
        </div>
        : <>
          <Button size="sm" icon="upload" disabled={disabled}
            onClick={() => input.current?.click()}>{label}</Button>
          {note && <p className="ui-drop__note">{note}</p>}
        </>}
      {/* Hidden rather than laid over the button: a one-row control has no field
          label to name an overlaid input, and the button keeps the kit's own
          ring. Cleared after each choice so re-picking the same file reports. */}
      <input ref={input} type="file" accept={accept} disabled={disabled} hidden
        onChange={event => { take(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
    </div>
    {showTarget && <div className="ui-drop__target" aria-hidden="true">{dropLabel}</div>}
  </div>;
}
