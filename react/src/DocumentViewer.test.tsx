import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { DocumentViewer } from './DocumentViewer';

afterEach(cleanup);
const file = { name: 'sample.pdf', size: '24 KB', href: '/sample.pdf' };
const document = ({ page, zoom }: { page: number; zoom: string | number }) => <p>Page {page}, zoom {zoom}</p>;
const fields = <label>Reference<input defaultValue="DEMO-001" /></label>;

it('starts at page one and fit width, with a named document scroll region', () => {
  render(<DocumentViewer file={file} pageCount={3} renderDocument={document}>{fields}</DocumentViewer>);
  expect(screen.getByRole('region', { name: 'sample.pdf' })).toHaveAttribute('tabindex', '0');
  expect(screen.getByRole('document')).toHaveTextContent('Page 1, zoom fit-width');
  expect(screen.getByText('1 of 3')).toHaveAttribute('aria-live', 'polite');
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('download', 'sample.pdf');
});

it('keeps page controls at the bounds and responds to Page Up/Down only on the region', async () => {
  const user = userEvent.setup();
  render(<DocumentViewer file={file} pageCount={2} renderDocument={document}>{fields}</DocumentViewer>);
  const region = screen.getByRole('region', { name: 'sample.pdf' });
  region.focus();
  await user.keyboard('{PageDown}');
  expect(screen.getByText('2 of 2')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  await user.keyboard('{PageDown}{PageUp}');
  expect(screen.getByText('1 of 2')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Next page' }));
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'PageUp' });
  expect(screen.getByText('2 of 2')).toBeVisible();
});

it('does not intercept page keys from document descendants', () => {
  render(<DocumentViewer file={file} pageCount={2} renderDocument={() => <input aria-label="Document search" />}>{fields}</DocumentViewer>);
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Document search' }), { key: 'PageDown' });
  expect(screen.getByText('1 of 2')).toBeVisible();
});

it('clamps the page when the host reduces the count', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<DocumentViewer file={file} pageCount={3} renderDocument={document}>{fields}</DocumentViewer>);
  await user.click(screen.getByRole('button', { name: 'Next page' }));
  rerender(<DocumentViewer file={file} pageCount={1} renderDocument={document}>{fields}</DocumentViewer>);
  expect(screen.getByText('1 of 1')).toBeVisible();
  expect(screen.getByRole('document')).toHaveTextContent('Page 1');
});

it('uses fixed zoom steps, fit modes and disabled limits', async () => {
  const user = userEvent.setup();
  render(<DocumentViewer file={file} renderDocument={document}>{fields}</DocumentViewer>);
  await user.click(screen.getByRole('button', { name: 'Zoom in' }));
  expect(screen.getByRole('document')).toHaveTextContent('zoom 1.25');
  for (let i = 0; i < 5; i++) await user.click(screen.getByRole('button', { name: 'Zoom in' }));
  expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
  for (let i = 0; i < 8; i++) await user.click(screen.getByRole('button', { name: 'Zoom out' }));
  expect(screen.getByRole('document')).toHaveTextContent('zoom 0.5');
  expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Fit page' }));
  expect(screen.getByRole('button', { name: 'Fit page' })).toHaveAttribute('aria-pressed', 'true');
  await user.click(screen.getByRole('button', { name: 'Fit width' }));
  expect(screen.getByRole('document')).toHaveTextContent('zoom fit-width');
});

it('omits page controls for images', () => {
  render(<DocumentViewer file={file} kind="image" renderDocument={() => <img src="/sample.svg" alt="Sample scan" />}>{fields}</DocumentViewer>);
  expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  expect(screen.getByRole('img')).toHaveAccessibleName('Sample scan');
});

it('keeps fields and review actions usable while loading and after failure', async () => {
  const user = userEvent.setup();
  const renderer = vi.fn(document);
  const accept = vi.fn();
  const props = { file, renderDocument: renderer, footer: <button onClick={accept}>Accept</button> };
  const { rerender } = render(<DocumentViewer {...props} state="loading">{fields}</DocumentViewer>);
  expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
  expect(renderer).not.toHaveBeenCalled();
  await user.type(screen.getByRole('textbox'), '-edited');
  rerender(<DocumentViewer {...props} state="error">{fields}</DocumentViewer>);
  expect(screen.getByText('Cannot preview this document')).toBeVisible();
  expect(screen.getByText('sample.pdf · 24 KB')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Download document' })).toHaveAttribute('href', '/sample.pdf');
  expect(screen.getByRole('textbox')).toHaveValue('DEMO-001-edited');
  await user.click(screen.getByRole('button', { name: 'Accept' }));
  expect(accept).toHaveBeenCalledOnce();
  rerender(<DocumentViewer {...props} state="ready">{fields}</DocumentViewer>);
  expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false');
  expect(renderer).toHaveBeenCalled();
});

// JSDOM checks semantics; browser evidence covers scrolling and stacking.
it.each(['ready', 'loading', 'error'] as const)('has no axe violations in %s', async state => {
  const { container } = render(<main><DocumentViewer file={file} state={state} renderDocument={document}>{fields}</DocumentViewer></main>);
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations).toEqual([]);
});
