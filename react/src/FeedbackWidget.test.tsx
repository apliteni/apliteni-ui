// jsdom checks payloads and focus; browser captures check placement and appearance.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { FeedbackWidget } from './FeedbackWidget';

afterEach(() => { cleanup(); vi.restoreAllMocks(); window.getSelection()?.removeAllRanges(); });

it('captures only page, nearest heading, capped excerpt and note', async () => {
  const send = vi.fn().mockResolvedValue(undefined);
  render(<><h2>Overview</h2><p>{'a'.repeat(1200)}</p><FeedbackWidget onSend={send} /></>);
  const range = document.createRange();
  range.selectNodeContents(screen.getByText('a'.repeat(1200)));
  window.getSelection()?.addRange(range);
  fireEvent.click(screen.getByRole('button', { name: 'Feedback' }));
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Report a problem or an idea');
  expect(screen.getByText('Overview', { selector: 'dd' })).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Your note'), 'Please explain this.');
  await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
  expect(send).toHaveBeenCalledWith({ page: window.location.pathname, section: 'Overview', excerpt: 'a'.repeat(1000), note: 'Please explain this.' });
  expect(await screen.findByRole('status')).toHaveTextContent('Feedback sent');
  expect(screen.getByRole('status').querySelector('button')).toHaveFocus();
});

it('labels context before the field, disables blank send and restores focus on Escape', async () => {
  render(<FeedbackWidget onSend={vi.fn()} />);
  const pill = screen.getByRole('button', { name: 'Feedback' });
  expect(pill).toHaveAttribute('aria-haspopup', 'dialog');
  await userEvent.click(pill);
  const field = screen.getByLabelText('Your note');
  expect(field).toHaveFocus();
  expect(screen.queryByText('Excerpt')).not.toBeInTheDocument();
  expect(document.querySelector('dl')!.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Send feedback' })).toBeDisabled();
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(pill).toHaveFocus());
});

it('blocks duplicate sends, reports failure and allows retry without losing the note', async () => {
  let reject!: (error: Error) => void;
  const send = vi.fn().mockImplementationOnce(() => new Promise<void>((_, r) => { reject = r; })).mockResolvedValue(undefined);
  render(<FeedbackWidget onSend={send} />);
  await userEvent.click(screen.getByRole('button', { name: 'Feedback' }));
  await userEvent.type(screen.getByLabelText('Your note'), 'A suggestion');
  const button = screen.getByRole('button', { name: 'Send feedback' });
  await userEvent.click(button);
  expect(button).toHaveAttribute('aria-busy', 'true');
  await userEvent.click(button);
  expect(send).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('Private server detail')));
  expect(screen.getByRole('alert')).toHaveTextContent('Could not send feedback. Try again.');
  expect(screen.getByLabelText('Your note')).toHaveValue('A suggestion');
  await userEvent.click(button);
  expect(send).toHaveBeenCalledTimes(2);
});

it('keeps Send last in tab order and passes axe with the drawer open', async () => {
  render(<FeedbackWidget onSend={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Feedback' }));
  await userEvent.type(screen.getByLabelText('Your note'), 'Something to improve');
  await userEvent.tab();
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  await userEvent.tab();
  expect(screen.getByRole('button', { name: 'Send feedback' })).toHaveFocus();
  await userEvent.tab();
  expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  const result = await axe.run(document.body, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations).toEqual([]);
});

it('moves above fixed navigation and a focused control', () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.tagName === 'NAV') return new DOMRect(0, 708, 1024, 60);
    if (this.tagName === 'INPUT') return new DOMRect(800, 640, 200, 50);
    if (this.classList.contains('rx-feedback-pill')) {
      const bottom = this.style.bottom.endsWith('px') ? parseFloat(this.style.bottom) : 16;
      return new DOMRect(850, 768 - bottom - 40, 140, 40);
    }
    return new DOMRect();
  });
  render(<><nav aria-label="Mobile" style={{ position: 'fixed' }}>Home</nav><input aria-label="Search" /><FeedbackWidget onSend={vi.fn()} /></>);
  const pill = screen.getByRole('button', { name: 'Feedback' });
  expect(pill.style.bottom).toBe('72px');
  act(() => screen.getByLabelText('Search').focus());
  expect(pill.style.bottom).toBe('140px');
});

it('ignores a response after the drawer was closed and reopened', async () => {
  let resolve!: () => void;
  render(<FeedbackWidget onSend={() => new Promise<void>(r => { resolve = r; })} />);
  await userEvent.click(screen.getByRole('button', { name: 'Feedback' }));
  await userEvent.type(screen.getByLabelText('Your note'), 'First note');
  await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await userEvent.click(screen.getByRole('button', { name: 'Feedback' }));
  await act(async () => resolve());
  expect(screen.getByLabelText('Your note')).toHaveValue('');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
