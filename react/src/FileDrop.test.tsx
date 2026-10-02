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
    expect(screen.getByText('statement-2026-08.pdf')).toBeInTheDocument();
    expect(screen.getByText('248 KB')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAccessibleName('statement-2026-08.pdf');
    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(bar.firstElementChild).toHaveStyle({ width: '40%' });
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

  // JSDOM applies no stylesheet, so the half it can check is the markup: both
  // truncatable words carry their full text in a title. The rule that makes the
  // line refuse to wrap is read from the sheet, and the result is measured in a
  // browser capture rather than here.
  it('keeps the name and the status word on one line, with the full text in a title', () => {
    render(<FileDrop file={{ name: 'a-very-long-statement-name-2026-08.pdf', status: 'error', error: 'Larger than 10 MB' }} />);
    expect(screen.getByText('a-very-long-statement-name-2026-08.pdf'))
      .toHaveAttribute('title', 'a-very-long-statement-name-2026-08.pdf');
    expect(screen.getByText('Larger than 10 MB')).toHaveAttribute('title', 'Larger than 10 MB');

    const css = readRepo('../../src/styles/file-drop.css');
    const line = /\.ui-drop__file\s*\{([^}]*)\}/.exec(css)?.[1];
    expect(line).toMatch(/flex-wrap:\s*nowrap/);
    const words = /\.ui-drop__name,\s*\.ui-drop__word\s*\{([^}]*)\}/.exec(css)?.[1];
    expect(words).toMatch(/text-overflow:\s*ellipsis/);
    expect(words).toMatch(/white-space:\s*nowrap/);
  });

  it('closes the line with its actions, at the size the resting row already uses', () => {
    const { rerender } = render(<FileDrop note="PDF or CSV, up to 10 MB" />);
    const resting = screen.getByRole('button', { name: 'Upload' }).className;
    rerender(<FileDrop file={{ name: 'statement-2026-08.pdf', status: 'error', error: 'Larger than 10 MB' }}
      onRetry={() => {}} onRemove={() => {}} />);
    const actions = document.querySelector('.ui-drop__actions') as HTMLElement;
    expect(actions).toBeInTheDocument();
    expect([...actions.children].map(c => c.textContent)).toEqual(['Retry', 'Remove']);
    // One control size across every state, so the row keeps its height when a
    // file arrives. The resting Upload button sets it.
    expect(resting).toContain('ui-btn--sm');
    for (const button of actions.querySelectorAll('.ui-btn')) {
      expect(button.className).toContain('ui-btn--sm');
    }
  });

  it('names a failed line, so a narrow block can give up its name and keep the message', () => {
    render(<FileDrop file={{ name: 'statement-2026-08.pdf', status: 'error', error: 'Larger than 10 MB' }} />);
    expect(document.querySelector('.ui-drop__file')).toHaveClass('ui-drop__file--failed');

    // JSDOM lays nothing out, so the half it can read is the rule: the row
    // declares one height, and the narrow block drops the size and that name.
    const css = readRepo('../../src/styles/file-drop.css');
    expect(/^\.ui-drop__row\s*\{([^}]*)\}/m.exec(css)?.[1]).toMatch(/min-height:\s*var\(--space-8\)/);
    const narrow = /@container\s*\(width\s*<\s*26rem\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(narrow).toMatch(/\.ui-drop__size\s*\{\s*display:\s*none/);
    expect(narrow).toMatch(/\.ui-drop__file--failed\s+\.ui-drop__name\s*\{\s*display:\s*none/);
  });

  it('says it is uploaded when it is, and removes it on request', () => {
    const onRemove = vi.fn();
    render(<FileDrop file={{ name: 'statement-2026-08.pdf', status: 'done' }} onRemove={onRemove} />);
    expect(screen.getByText('Uploaded')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalled();
  });

  it('keeps a failed file in the row, says what failed, and offers retry beside remove', () => {
    const onRetry = vi.fn();
    render(<FileDrop file={{ name: 'statement-2026-08.pdf', status: 'error', error: 'Larger than 10 MB' }}
      onRetry={onRetry} onRemove={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Larger than 10 MB');
    expect(screen.getByText('statement-2026-08.pdf')).toBeInTheDocument();
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
