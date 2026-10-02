import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react';
import '../../src/styles/file-drop.css';
import { Button } from './primitives/Button';
import { Icon } from './primitives/Icon';

export type FileDropStatus = 'uploading' | 'done' | 'error';

/** The file the consumer is uploading. */
export type FileDropFile = {
  name: string;
  /** Already written for a reader; the kit picks no unit. */
  size?: string;
  /** Left out, the file is uploading: the kit never reports a success nobody claimed. */
  status?: FileDropStatus;
  /** 0 to 100. Left out, the word stands without a bar. */
  progress?: number;
  /** What this file did wrong, when the status is an error. */
  error?: string;
  /** Replaces the word the status carries. */
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

// Every status carries a mark and a word, so none of them is colour alone. The
// marks are circled because the kit's circled glyph means a state.
const MARKS: Record<FileDropStatus, string> = {
  uploading: 'clock', done: 'circleCheck', error: 'circleAlert',
};
const WORDS: Record<FileDropStatus, string> = {
  uploading: 'Uploading', done: 'Uploaded', error: 'Upload failed',
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
  const status = file?.status ?? 'uploading';
  const word = status === 'error' ? file?.error ?? WORDS.error : file?.state ?? WORDS[status];
  // An explicit `dragging` wins, so a parent that owns the drag region decides.
  const showTarget = (dragging ?? over) && !disabled;

  const take = (chosen: File | null | undefined) => { if (chosen && !disabled) onFile?.(chosen); };

  return <div className={cx('ui-drop', disabled && 'is-disabled', className)}
    onDragOver={event => {
      // preventDefault() is how an element says "drop here", so a disabled drop
      // must not call it: the cursor would promise what onDrop then refuses.
      if (disabled || !carriesFiles(event)) return;
      event.preventDefault();
      setOver(true);
    }}
    onDragLeave={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
    }}
    onDrop={event => {
      if (disabled || !carriesFiles(event)) return;
      event.preventDefault();
      setOver(false);
      take(event.dataTransfer.files[0]);
    }}>
    {children}
    <div className="ui-drop__row">
      {file
        ? <div className="ui-drop__file">
          <span className="ui-drop__name" id={nameId} title={file.name}>{file.name}</span>
          {/* A refused file drops its size: the line has room for the message or
              the size, and only one of them says what to do next. */}
          {file.size && status !== 'error' && <span className="ui-drop__size">{file.size}</span>}
          <span className={cx('ui-drop__state', status === 'error' && 'ui-drop__error')}
            role={status === 'error' ? 'alert' : undefined}>
            <Icon name={MARKS[status]} />
            <span className="ui-drop__word" title={word}>{word}</span>
          </span>
          {status === 'uploading' && file.progress !== undefined && <span className="ui-drop__bar"
            role="progressbar" aria-labelledby={nameId}
            aria-valuenow={file.progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${file.progress}%` }} />
          </span>}
          {(onRemove || (status === 'error' && onRetry)) && <span className="ui-drop__actions">
            {status === 'error' && onRetry
              && <Button size="sm" onClick={onRetry} disabled={disabled}>{retryLabel}</Button>}
            {onRemove
              && <Button variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>{removeLabel}</Button>}
          </span>}
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
