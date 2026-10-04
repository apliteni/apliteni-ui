// What this does not check: the system picker it opens, whether a screen reader
// speaks the progress bar or the alert, and the paint — the drop target's cover
// and the row's one accent are measured by the contrast and ring gates.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, createEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FileDrop } from './FileDrop';

const readRepo = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const file = (name = 'statement-2026-08.pdf') => new File(['demo'], name, { type: 'application/pdf' });

/** A drag that carries files, as the browser reports one. */
const withFiles = (files: File[] = []) => ({ dataTransfer: { types: ['Files'], files } });

/** A real dragover event, dispatched so its own defaultPrevented can be read. */
const dragOver = (on: HTMLElement, files: File[] = []) => {
  const event = createEvent.dragOver(on);
  Object.defineProperty(event, 'dataTransfer', { value: { types: ['Files'], files } });
  fireEvent(on, event);
  return event;
};

const row = () => document.querySelector('.ui-drop') as HTMLElement;
const target = () => document.querySelector('.ui-drop__target');
/** The name is drawn in two spans so the stem can truncate and the tail cannot,
 *  so it is read back off the element rather than matched as one text node. */
const name = () => document.querySelector('.ui-drop__name') as HTMLElement;

describe('FileDrop at rest', () => {
  it('spends one row: the picker button and the accepted types, with no target', () => {
    render(<FileDrop note="PDF or CSV, up to 10 MB" />);
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
    expect(screen.getByText('PDF or CSV, up to 10 MB')).toBeInTheDocument();
    expect(target()).toBeNull();
    expect(document.querySelector('.ui-drop__bar')).toBeNull();
  });

  it('opens the picker from the button, so nothing needs dragging', () => {
    render(<FileDrop />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    expect(click).toHaveBeenCalled();
  });

  it('reports a chosen file and clears the input, so the same file can be chosen again', () => {
    const onFile = vi.fn();
    render(<FileDrop onFile={onFile} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file()] } });
    expect(onFile).toHaveBeenCalledWith(expect.objectContaining({ name: 'statement-2026-08.pdf' }));
    expect(input.value).toBe('');
  });

  it('keeps the native input out of the tab order and the accessibility tree', () => {
    render(<FileDrop />);
    expect(document.querySelector('input[type="file"]')).toHaveAttribute('hidden');
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});

describe('FileDrop while a file is over it', () => {
  it('paints the target on a drag carrying files and drops it again on leave', () => {
    render(<FileDrop />);
    fireEvent.dragOver(row(), withFiles());
    expect(target()).toHaveTextContent('Drop to upload');
    fireEvent.dragLeave(row(), { relatedTarget: document.body });
    expect(target()).toBeNull();
  });

  it('ignores a drag that carries no file, so selected text paints nothing', () => {
    render(<FileDrop />);
    fireEvent.dragOver(row(), { dataTransfer: { types: ['text/plain'], files: [] } });
    expect(target()).toBeNull();
  });

  it('reports the dropped file and clears the target', () => {
    const onFile = vi.fn();
    render(<FileDrop onFile={onFile} />);
    fireEvent.dragOver(row(), withFiles([file()]));
    fireEvent.drop(row(), withFiles([file()]));
    expect(onFile).toHaveBeenCalledWith(expect.objectContaining({ name: 'statement-2026-08.pdf' }));
    expect(target()).toBeNull();
  });

  it('lets a parent that owns the region drive the target', () => {
    const { rerender } = render(<FileDrop dragging={false} />);
    fireEvent.dragOver(row(), withFiles());
    expect(target()).toBeNull();
    rerender(<FileDrop dragging />);
    expect(target()).toHaveTextContent('Drop to upload');
  });

  it('covers the region it is given, and nothing wider', () => {
    render(<FileDrop dragging><p>Statements received</p></FileDrop>);
    expect(screen.getByText('Statements received')).toBeInTheDocument();
    expect(target()!.parentElement).toBe(row());
  });
});

describe('FileDrop once a file is in hand', () => {
  it('replaces the button with the name, size and progress in the same row', () => {
    render(<FileDrop file={{ name: 'statement-2026-08.pdf', size: '248 KB', status: 'uploading', progress: 40 }} />);
    expect(screen.queryByRole('button', { name: 'Upload' })).toBeNull();
    expect(name().textContent).toBe('statement-2026-08.pdf');
    expect(screen.getByText('248 KB')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(bar.firstElementChild).toHaveStyle({ width: '40%' });
  });

  it('splits the name so the stem truncates and the extension never does', () => {
    render(<FileDrop file={{ name: 'frankfurt-settlement-statement-2026-08.pdf' }} />);
    expect(name().querySelector('.ui-drop__stem')!.textContent)
      .toBe('frankfurt-settlement-statement-2026-08');
    expect(name().querySelector('.ui-drop__ext')!.textContent).toBe('.pdf');
    expect(name()).toHaveAttribute('title', 'frankfurt-settlement-statement-2026-08.pdf');
  });

  it('gives a name with no extension its whole self as the stem', () => {
    render(<FileDrop file={{ name: 'statement' }} />);
    expect(name().querySelector('.ui-drop__stem')!.textContent).toBe('statement');
    expect(name().querySelector('.ui-drop__ext')!.textContent).toBe('');
  });

  // The one deviation option A takes from "name every status in words": while the
  // upload is measurable the track is the status, so the row spends no word on it
  // and the word reaches a screen reader as the track's own name instead.
  it('lets the track be the status while it is measurable, and still says the word to a reader', () => {
    render(<FileDrop file={{ name: 'statement-2026-08.pdf', size: '248 KB', status: 'uploading', progress: 40 }} />);
    expect(screen.queryByText('Uploading')).toBeNull();
    expect(screen.getByRole('progressbar'))
      .toHaveAccessibleName('Uploading statement-2026-08.pdf');
  });

  it('takes the word from `state` when the consumer renames it', () => {
    render(<FileDrop file={{ name: 'statement-2026-08.pdf', status: 'uploading', progress: 40, state: 'Scanning' }} />);
    expect(screen.getByRole('progressbar')).toHaveAccessibleName('Scanning statement-2026-08.pdf');
  });

  it('treats a file given with no status as uploading, never as uploaded', () => {
    render(<FileDrop file={{ name: 'statement-2026-08.pdf' }} />);
    expect(screen.getByText('Uploading')).toBeInTheDocument();
    expect(screen.queryByText('Uploaded')).toBeNull();
  });

  it('gives an upload with no progress value a word and a mark, and no bar', () => {
    render(<FileDrop file={{ name: 'statement-2026-08.pdf', status: 'uploading' }} />);
    expect(screen.getByText('Uploading')).toBeInTheDocument();
    expect(document.querySelector('.ui-drop__state svg')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  // JSDOM applies no stylesheet, so the half it can check is the markup: the
  // tiers are there in order and the truncatable text carries its full self in a
  // title. The declarations that make each tier one line are read from the sheet
  // here and measured in a browser by stories/row-height.test.js.
  it('stacks the name over the facts, with the full text in a title', () => {
    render(<FileDrop file={{ name: 'a-very-long-statement-name-2026-08.pdf', status: 'error', error: 'Larger than 10 MB' }} />);
    expect(name()).toHaveAttribute('title', 'a-very-long-statement-name-2026-08.pdf');
    expect(screen.getByText('Larger than 10 MB')).toHaveAttribute('title', 'Larger than 10 MB');
    expect([...document.querySelector('.ui-drop__file')!.children].map((c) => c.className))
      .toEqual(['ui-drop__line', 'ui-drop__facts ui-drop__error']);

    const css = readRepo('../../src/styles/file-drop.css');
    expect(/\.ui-drop__file\s*\{([^}]*)\}/.exec(css)?.[1]).toMatch(/display:\s*grid/);
    expect(/\.ui-drop__line\s*\{([^}]*)\}/.exec(css)?.[1]).toMatch(/flex-wrap:\s*nowrap/);
    expect(/\.ui-drop__stem\s*\{([^}]*)\}/.exec(css)?.[1]).toMatch(/text-overflow:\s*ellipsis/);
    expect(/\.ui-drop__ext\s*\{([^}]*)\}/.exec(css)?.[1]).toMatch(/flex:\s*none/);
  });

  it('closes the name line with its actions, at the size the resting row already uses', () => {
    const { rerender } = render(<FileDrop note="PDF or CSV, up to 10 MB" />);
    const resting = screen.getByRole('button', { name: 'Upload' }).className;
    rerender(<FileDrop file={{ name: 'statement-2026-08.pdf', status: 'error', error: 'Larger than 10 MB' }}
      onRetry={() => {}} onRemove={() => {}} />);
    const actions = document.querySelector('.ui-drop__actions') as HTMLElement;
    // On the name's line, not under it: that is what keeps the facts tier whole.
    expect(actions.parentElement).toHaveClass('ui-drop__line');
    // Retry keeps its word and remove drops one: `x` is on the kit's icon-only
    // list and `refresh` is not, so the wordless button is the allowed one.
    expect([...actions.children].map(c => c.textContent)).toEqual(['Retry', '']);
    expect(screen.getByRole('button', { name: 'Remove file' })).toHaveClass('ui-btn--icon');
    // One control size across every state, so the row keeps its height when a
    // file arrives. The resting Upload button sets it.
    expect(resting).toContain('ui-btn--sm');
    for (const button of actions.querySelectorAll('.ui-btn')) {
      expect(button.className).toContain('ui-btn--sm');
    }
  });

  it('names a failed line, and drops nothing from it at any width', () => {
    render(<FileDrop file={{ name: 'statement-2026-08.pdf', size: '248 KB', status: 'error', error: 'Larger than 10 MB' }} />);
    expect(document.querySelector('.ui-drop__file')).toHaveClass('ui-drop__file--failed');
    expect(name()).toBeVisible();
    // A refused file drops its size: the tier has room for the message or the
    // size, and only one of them says what to do next.
    expect(screen.queryByText('248 KB')).toBeNull();

    // One layout at every width. The row truncates its name rather than moving
    // anything, so the sheet names no breakpoint and hides nothing; the heights
    // are measured in a browser by stories/row-height.test.js.
    const css = readRepo('../../src/styles/file-drop.css');
    expect(css).not.toMatch(/@container/);
    expect(css).not.toMatch(/display:\s*none/);
  });

  it('says it is uploaded when it is, and removes it on request', () => {
    const onRemove = vi.fn();
    render(<FileDrop file={{ name: 'statement-2026-08.pdf', status: 'done' }} onRemove={onRemove} />);
    expect(screen.getByText('Uploaded')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Remove file' }));
    expect(onRemove).toHaveBeenCalled();
  });

  it('keeps a failed file in the row, says what failed, and offers retry beside remove', () => {
    const onRetry = vi.fn();
    render(<FileDrop file={{ name: 'statement-2026-08.pdf', status: 'error', error: 'Larger than 10 MB' }}
      onRetry={onRetry} onRemove={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Larger than 10 MB');
    expect(name().textContent).toBe('statement-2026-08.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('marks a status with a glyph as well as a word, so neither is colour alone', () => {
    const { rerender } = render(<FileDrop file={{ name: 'statement-2026-08.pdf', status: 'done' }} />);
    expect(document.querySelector('.ui-drop__state svg')).toBeInTheDocument();
    rerender(<FileDrop file={{ name: 'statement-2026-08.pdf', status: 'error', error: 'Larger than 10 MB' }} />);
    expect(document.querySelector('.ui-drop__error svg')).toBeInTheDocument();
  });

  it('offers only the actions the consumer handles', () => {
    render(<FileDrop file={{ name: 'statement-2026-08.pdf', status: 'error', error: 'Larger than 10 MB' }} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('a disabled FileDrop', () => {
  it('accepts nothing by drag or by picker and paints no target', () => {
    const onFile = vi.fn();
    render(<FileDrop disabled onFile={onFile} />);
    dragOver(row(), [file()]);
    expect(target()).toBeNull();
    fireEvent.drop(row(), withFiles([file()]));
    expect(onFile).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    expect(row()).toHaveClass('is-disabled');
  });

  it('never tells the browser it is a drop target, so the cursor promises nothing', () => {
    const { rerender } = render(<FileDrop disabled />);
    expect(dragOver(row(), [file()]).defaultPrevented).toBe(false);
    rerender(<FileDrop />);
    expect(dragOver(row(), [file()]).defaultPrevented).toBe(true);
  });

  it('refuses the target even when a parent asks for it', () => {
    render(<FileDrop disabled dragging />);
    expect(target()).toBeNull();
  });
});

it('merges a caller class with the kit class instead of replacing it', () => {
  render(<FileDrop className="demo" />);
  expect(row()).toHaveClass('ui-drop', 'demo');
});
