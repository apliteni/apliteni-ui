import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import '../../src/styles/file-drop.css';
import { Button } from './primitives/Button';
import { EmptyState } from './EmptyState';
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
  /** The word on the remove button. */
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

// A status the reader can see drawn carries a mark and a word, so none of them
// is colour alone. The marks are circled because the kit's circled glyph means
// a state. A measurable upload draws its track instead and spends no word on
// the row: the word still reaches a screen reader, as the track's own name.
const MARKS: Record<FileDropStatus, string> = {
  uploading: 'clock', done: 'circleCheck', error: 'circleAlert',
};
const WORDS: Record<FileDropStatus, string> = {
  uploading: 'Uploading', done: 'Uploaded', error: 'Upload failed',
};

/** The stem gives way and the extension never does: a row cut to
 *  `frankfurt-settlement-state…` has stopped saying what it is holding. */
const splitName = (name: string) => {
  const cut = name.lastIndexOf('.');
  return cut > 0 ? [name.slice(0, cut), name.slice(cut)] : [name, ''];
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
  const status = file?.status ?? 'uploading';
  const word = status === 'error' ? file?.error ?? WORDS.error : file?.state ?? WORDS[status];
  const [stem, ext] = splitName(file?.name ?? '');
  // A measurable upload says so with its track; every other state needs the word.
  const hasBar = status === 'uploading' && file?.progress !== undefined;
  const showWord = !hasBar;
  const showSize = Boolean(file?.size) && status !== 'error';
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
        ? <div className={cx('ui-drop__file', status === 'error' && 'ui-drop__file--failed')}>
          {/* The name tier. It keeps the actions on its own line at every width:
              the name truncates for them rather than anything leaving the row. */}
          <div className="ui-drop__line">
            <span className="ui-drop__name" title={file.name}>
              <span className="ui-drop__stem">{stem}</span><span className="ui-drop__ext">{ext}</span>
            </span>
            {(onRemove || (status === 'error' && onRetry)) && <span className="ui-drop__actions">
              {status === 'error' && onRetry
                && <Button size="sm" icon="refresh" onClick={onRetry} disabled={disabled}>{retryLabel}</Button>}
              {/* Both actions carry their word. `x` is on the kit's icon-only
                  list for close and dismiss, and taking a file off a row is
                  neither: the row stays and the file leaves it. Remove stays
                  plain beside Retry's glyph: a dismissing action is not the
                  committing one's peer. why: guidelines/button-labels.md */}
              {onRemove && <Button variant="ghost" size="sm"
                onClick={onRemove} disabled={disabled}>{removeLabel}</Button>}
            </span>}
          </div>
          {/* The facts tier: the size while it uploads, the message when it is
              refused. A refused file drops its size — only one of the two says
              what to do next. */}
          {(showSize || showWord) && <div
            className={cx('ui-drop__facts', status === 'error' && 'ui-drop__error')}
            role={status === 'error' ? 'alert' : undefined}>
            {showSize && <span className="ui-drop__size">{file.size}</span>}
            {showWord && <span className="ui-drop__state">
              <Icon name={MARKS[status]} />
              <span className="ui-drop__word" title={word}>{word}</span>
            </span>}
          </div>}
          {/* The track is the status while it is measurable, so it runs the full
              width and carries the word in its own accessible name. */}
          {hasBar && <span className="ui-drop__bar"
            role="progressbar" aria-label={`${word} ${file.name}`}
            aria-valuenow={file.progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${file.progress}%` }} />
          </span>}
        </div>
        : <>
          <Button size="sm" icon="upload" disabled={disabled}
            onClick={() => input.current?.click()}>{label}</Button>
          {note && <p className="ui-drop__note">{note}</p>}
        </>}
      {/* Hidden rather than laid over the button: a one-row control has no field
          label to name an overlaid input, and the button keeps the kit's own
          ring. Never a keyboard stop, so it takes no focus rule. Cleared after
          each choice so re-picking the same file reports. */}
      <input ref={input} type="file" accept={accept} disabled={disabled} hidden tabIndex={-1}
        onChange={event => { take(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
    </div>
    {showTarget && <div className="ui-drop__target" aria-hidden="true">{dropLabel}</div>}
  </div>;
}

export type FileDropAreaProps = {
  /** What the area is for, in the first-run block's title. */
  title: string;
  /** The accepted types and the size limit, under the title. */
  note?: string;
  /** The button that opens the picker. */
  label?: string;
  accept?: string;
  multiple?: boolean;
  /** Drives the accent edge from a parent that owns the drag. */
  dragging?: boolean;
  disabled?: boolean;
  onFiles?: (files: File[]) => void;
  className?: string;
};

/** The empty page's drop: a dashed box around the first-run block. The button is
 *  the keyboard path and opens the picker; a click on the box is only a pointer
 *  shortcut for it, and a file dropped anywhere in the box is taken. */
export function FileDropArea({
  title, note, label = 'Upload', accept, multiple, dragging, disabled, onFiles, className,
}: FileDropAreaProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const pick = () => { if (!disabled) input.current?.click(); };
  const take = (files: File[]) => { if (files.length && !disabled) onFiles?.(files); };
  return <div className={cx('ui-drop', 'ui-drop--area', (dragging ?? over) && !disabled && 'is-dragging', disabled && 'is-disabled', className)}
    onClick={pick}
    onDragOver={event => {
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
      take(Array.from(event.dataTransfer.files));
    }}>
    <EmptyState icon="upload" title={title} sub={note ?? ''}
      actions={<Button variant="primary" size="sm" icon="upload" disabled={disabled}
        onClick={event => { event.stopPropagation(); pick(); }}>{label}</Button>} />
    <input ref={input} type="file" accept={accept} multiple={multiple} disabled={disabled} hidden tabIndex={-1}
      onClick={event => event.stopPropagation()}
      onChange={event => { take(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ''; }} />
  </div>;
}

export type PageDropProps = {
  /** The words on the layer. */
  label?: string;
  /** Shows the layer from a parent, for a story or a capture. Left out, a file dragged over the page shows it. */
  open?: boolean;
  disabled?: boolean;
  /** Every file dropped anywhere on the page, unless something under the pointer already took the drop. */
  onFiles?: (files: File[]) => void;
};

/** The whole page as a drop target. The layer is on screen only while a file is
 *  dragged over the page. It never takes the pointer, so the page keeps working
 *  under it, and the screen's own upload button stays the keyboard path. */
export function PageDrop({ label = 'Drop files to upload', open, disabled, onFiles }: PageDropProps) {
  const [over, setOver] = useState(false);
  const take = useRef(onFiles);
  take.current = onFiles;
  useEffect(() => {
    if (disabled) { setOver(false); return; }
    const aim = (event: globalThis.DragEvent) => {
      if (!event.dataTransfer || !Array.from(event.dataTransfer.types).includes('Files')) return;
      // preventDefault() is how the page says "drop here"; without it the browser opens the file.
      event.preventDefault();
      setOver(true);
    };
    // Leaving the window reports no element entered; moving between elements does.
    const leave = (event: globalThis.DragEvent) => { if (event.relatedTarget === null) setOver(false); };
    const drop = (event: globalThis.DragEvent) => {
      setOver(false);
      if (event.defaultPrevented || !event.dataTransfer || !Array.from(event.dataTransfer.types).includes('Files')) return;
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files);
      if (files.length) take.current?.(files);
    };
    const end = () => setOver(false);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOver(false); };
    window.addEventListener('dragenter', aim);
    window.addEventListener('dragover', aim);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    window.addEventListener('dragend', end);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('dragenter', aim);
      window.removeEventListener('dragover', aim);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
      window.removeEventListener('dragend', end);
      window.removeEventListener('keydown', escape);
    };
  }, [disabled]);
  return <div className={cx('ui-drop-page', (open ?? over) && !disabled && 'is-open')} aria-hidden="true">
    <EmptyState icon="upload" title={label} sub="" />
  </div>;
}
