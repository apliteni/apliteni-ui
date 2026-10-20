import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { vi } from 'vitest';
import { Feedback, type FeedbackProps } from './Feedback';

function Page(props: Partial<FeedbackProps> & { onSend: FeedbackProps['onSend'] }) {
  const ref = useRef<HTMLElement>(null);
  return <>
    <main ref={ref}>
      <h2 id="intro">Intro</h2>
      <p id="p">Select this sentence please.</p>
    </main>
    <Feedback container={ref} {...props} />
  </>;
}

async function selectText() {
  const node = document.getElementById('p')!.firstChild!;
  const range = document.createRange();
  range.setStart(node, 0);
  range.setEnd(node, 11);
  range.getBoundingClientRect = () => ({ left: 10, top: 20, width: 50, height: 10, right: 60, bottom: 30, x: 10, y: 20, toJSON() {} });
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  fireEvent.mouseUp(document.querySelector('main')!);
  await act(async () => { await new Promise(r => setTimeout(r, 5)); });
}

const pill = () => document.querySelector('.ui-fbpill') as HTMLElement;

async function openForm() {
  await selectText();
  await userEvent.click(pill());
  return screen.findByRole('dialog', { name: 'Leave feedback' });
}

it('offers the pill on a selection and hides it again', async () => {
  render(<Page onSend={vi.fn()} />);
  expect(pill()).not.toHaveClass('show');
  await selectText();
  expect(pill()).toHaveClass('show');
  window.getSelection()!.removeAllRanges();
  fireEvent.mouseUp(document.querySelector('main')!);
  await act(async () => { await new Promise(r => setTimeout(r, 5)); });
  expect(pill()).not.toHaveClass('show');
});

it('opens a form with the section chip and the quote, and uses kit buttons', async () => {
  render(<Page onSend={vi.fn()} />);
  const dialog = await openForm();
  expect(dialog).toHaveTextContent('Intro');
  expect(dialog.querySelector('q')).toHaveTextContent('Select this');
  expect(document.querySelector('.ui-fbbtn')).toBeNull();
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('ui-btn--ghost');
  expect(screen.getByRole('button', { name: 'Send feedback' })).toHaveClass('ui-btn--primary');
  expect(screen.getByRole('button', { name: 'Send feedback' })).toBeDisabled();
  expect(document.activeElement).toBe(screen.getByLabelText('Your note'));
});

it('sends the payload and says thanks once, in one line', async () => {
  const onSend = vi.fn().mockResolvedValue({ ok: true });
  render(<Page onSend={onSend} />);
  const dialog = await openForm();
  await userEvent.type(screen.getByLabelText('Your note'), ' Needs an example. ');
  await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
  expect(onSend).toHaveBeenCalledWith({
    note: 'Needs an example.', excerpt: 'Select this', anchor: 'intro', sectionLabel: 'Intro', sectionTitle: 'Intro',
  });
  const status = await screen.findByRole('status');
  expect(status).toHaveTextContent('Thanks, your note is sent.');
  expect(dialog.querySelector('h4, svg.ui-fbck')).toBeNull();
  expect(dialog.textContent!.match(/thank/gi)).toHaveLength(1);
  expect(document.querySelector('.ui-fbmark')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('keeps the note and shows the error in place when the send fails', async () => {
  const onSend = vi.fn().mockResolvedValue({ ok: false, error: 'Backend said no.' });
  render(<Page onSend={onSend} />);
  await openForm();
  await userEvent.type(screen.getByLabelText('Your note'), 'Keep me');
  await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Backend said no.');
  expect(screen.getByLabelText('Your note')).toHaveValue('Keep me');
  expect(screen.getByRole('button', { name: 'Send feedback' })).toBeEnabled();
});

it('shows a default error when the handler throws', async () => {
  render(<Page onSend={vi.fn().mockRejectedValue(new Error())} />);
  await openForm();
  await userEvent.type(screen.getByLabelText('Your note'), 'x');
  await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not send just now');
});

it('dismisses with Cancel and Escape and removes the highlight', async () => {
  render(<Page onSend={vi.fn()} />);
  await openForm();
  expect(document.querySelector('.ui-fbmark')).not.toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(document.querySelector('.ui-fbmark')).toBeNull();
  await openForm();
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('ignores a selection shorter than minChars', async () => {
  render(<Page onSend={vi.fn()} minChars={50} />);
  await selectText();
  expect(pill()).not.toHaveClass('show');
});
