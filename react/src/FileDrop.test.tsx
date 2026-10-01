// What this does not check: the system picker it opens, whether a screen reader
// speaks the progress bar or the alert, and the paint — the drop target's cover
// and the row's one accent are measured by the contrast and ring gates.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileDrop } from './FileDrop';

const file = (name = 'statement-2026-08.pdf') => new File(['demo'], name, { type: 'application/pdf' });

/** A drag that carries files, as the browser reports one. */
const withFiles = (files: File[] = []) => ({ dataTransfer: { types: ['Files'], files } });

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
    fireEvent.dragOver(row(), withFiles([file()]));
    expect(target()).toBeNull();
    fireEvent.drop(row(), withFiles([file()]));
    expect(onFile).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    expect(row()).toHaveClass('is-disabled');
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
