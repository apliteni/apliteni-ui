import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useRef, useState } from 'react';
import { vi } from 'vitest';
import { Feedback, type FeedbackProps } from './Feedback';

function Page({ focusableContainer = false, ...props }: Partial<FeedbackProps> & {
  onSend: FeedbackProps['onSend']; focusableContainer?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  return <>
    <main ref={ref} tabIndex={focusableContainer ? 0 : undefined}>
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

it.each(['Cancel', 'Close'])('keeps the focused pill visible after pointer dismissal with %s', async (button) => {
  render(<Page onSend={vi.fn()} />);
  await selectText();
  pill().focus();
  await userEvent.keyboard('{Enter}');
  await screen.findByRole('dialog');
  await userEvent.click(screen.getByRole('button', { name: button }));
  await act(async () => { await new Promise(r => setTimeout(r, 5)); });
  expect(document.activeElement).toBe(pill());
  expect(pill()).toHaveClass('show');
  expect(pill()).toHaveAttribute('tabindex', '0');
  expect(pill()).not.toHaveAttribute('aria-hidden');
});

it('ignores an old send result after the form closes and reopens', async () => {
  let finish!: (result: { ok: boolean }) => void;
  const onSend = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<Page onSend={onSend} />);
  await openForm();
  await userEvent.type(screen.getByLabelText('Your note'), 'First note');
  await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await userEvent.keyboard('{Enter}');
  await screen.findByRole('dialog');
  await userEvent.type(screen.getByLabelText('Your note'), 'Second note');
  await act(async () => { finish({ ok: true }); });
  expect(screen.getByLabelText('Your note')).toHaveValue('Second note');
  expect(screen.queryByText('Thanks, your note is sent.')).not.toBeInTheDocument();
});

it('highlights the same passage when the pill reopens after Escape', async () => {
  render(<Page onSend={vi.fn()} />);
  await selectText();
  pill().focus();
  await userEvent.keyboard('{Enter}');
  await screen.findByRole('dialog');
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await userEvent.keyboard('{Enter}');
  await screen.findByRole('dialog');
  expect(document.querySelector('.ui-fbmark')).toHaveTextContent('Select this');
  expect(document.getElementById('p')).toHaveTextContent('Select this sentence please.');
});

it('ignores a selection shorter than minChars', async () => {
  render(<Page onSend={vi.fn()} minChars={50} />);
  await selectText();
  expect(pill()).not.toHaveClass('show');
});

function Live({ name, onSend, late = false }: { name: string; onSend: FeedbackProps['onSend']; late?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(!late);
  useEffect(() => { if (late) setTimeout(() => setShown(true), 0); }, [late]);
  return <>
    <Feedback container={ref} onSend={onSend} />
    {shown && <main ref={ref}><p id="live">Hello there {name} and more words here.</p></main>}
  </>;
}

async function selectIn(node: Node, start: number, end: Node = node, endAt = start) {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(end, endAt);
  range.getBoundingClientRect = () => ({ left: 10, top: 20, width: 50, height: 10, right: 60, bottom: 30, x: 10, y: 20, toJSON() {} });
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  fireEvent.mouseUp(document.querySelector('main')!);
  await act(async () => { await new Promise(r => setTimeout(r, 5)); });
}

const live = () => document.getElementById('live')!;
const textNodes = () => Array.from(live().childNodes);

describe('closing the form leaves the consumer\'s text nodes in place', () => {
  const cases: [string, () => Promise<void>][] = [
    ['inside one text node', () => selectIn(textNodes()[0], 6, textNodes()[0], 11)],
    ['from offset 0', () => selectIn(textNodes()[0], 0, textNodes()[0], 5)],
    ['across two text nodes', () => selectIn(textNodes()[0], 6, textNodes()[2], 5)],
  ];
  for (const [name, select] of cases) {
    for (const how of ['Cancel', 'send'] as const) {
      it(`${name}, after ${how}, shows a re-render`, async () => {
        const onSend = vi.fn().mockResolvedValue({ ok: true });
        const { rerender } = render(<Live name="Alpha" onSend={onSend} />);
        const before = textNodes();
        await select();
        await userEvent.click(pill());
        await screen.findByRole('dialog');
        if (how === 'send') {
          await userEvent.type(screen.getByLabelText('Your note'), 'x');
          await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
          await screen.findByRole('status');
        } else {
          await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        }
        expect(live().textContent).toBe('Hello there Alpha and more words here.');
        rerender(<Live name="Beta" onSend={onSend} />);
        expect(live().textContent).toBe('Hello there Beta and more words here.');
        expect(textNodes().slice(0, before.length).every((n, i) => n === before[i])).toBe(true);
      });
    }
  }
});

it('hands focus to a visible target when the form opened from the pill by keyboard', async () => {
  render(<Page onSend={vi.fn()} />);
  await selectText();
  pill().focus();
  await userEvent.keyboard('{Enter}');
  await screen.findByRole('dialog');
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(document.activeElement).toBe(pill());
  expect(pill()).toHaveClass('show');
  expect(document.querySelector('main')).not.toHaveAttribute('tabindex');
  expect(document.activeElement!.closest('[aria-hidden="true"]')).toBeNull();
});

it('returns focus to the control used before a pointer open', async () => {
  render(<><button type="button">Read more</button><Page onSend={vi.fn()} /></>);
  await selectText();
  const before = screen.getByRole('button', { name: 'Read more' });
  before.focus();
  await userEvent.click(pill());
  await screen.findByRole('dialog');
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(document.activeElement).toBe(before);
  expect(document.querySelector('main')).not.toHaveAttribute('tabindex');
});

it('returns focus to the visible pill after a pointer open from plain text', async () => {
  render(<Page onSend={vi.fn()} />);
  await selectText();
  await userEvent.click(pill());
  await screen.findByRole('dialog');
  await act(async () => { await new Promise(r => setTimeout(r, 5)); });
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(document.activeElement).toBe(pill());
  expect(pill()).toHaveClass('show');
});

it('uses the pill when the prior focus was a focusable reading container', async () => {
  render(<Page onSend={vi.fn()} focusableContainer />);
  await selectText();
  document.querySelector('main')!.focus();
  await userEvent.click(pill());
  await screen.findByRole('dialog');
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(document.activeElement).toBe(pill());
  expect(document.querySelector('main')).toHaveAttribute('tabindex', '0');
});

it('uses the pill when the prior control disappears before Escape', async () => {
  function WithControl({ show }: { show: boolean }) {
    return <>{show && <button type="button">Read more</button>}<Page onSend={vi.fn()} /></>;
  }
  const { rerender } = render(<WithControl show />);
  await selectText();
  screen.getByRole('button', { name: 'Read more' }).focus();
  await userEvent.click(pill());
  await screen.findByRole('dialog');
  rerender(<WithControl show={false} />);
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(document.activeElement).toBe(pill());
  expect(pill()).toHaveClass('show');
});

it('uses the pill when the prior control becomes disabled before Escape', async () => {
  function WithControl({ disabled }: { disabled: boolean }) {
    return <><button type="button" disabled={disabled}>Read more</button><Page onSend={vi.fn()} /></>;
  }
  const { rerender } = render(<WithControl disabled={false} />);
  await selectText();
  screen.getByRole('button', { name: 'Read more' }).focus();
  await userEvent.click(pill());
  await screen.findByRole('dialog');
  rerender(<WithControl disabled />);
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(document.activeElement).toBe(pill());
});

it('offers the pill for a container that mounts after the component', async () => {
  render(<Live name="Alpha" late onSend={vi.fn()} />);
  await waitFor(() => expect(live()).toBeInTheDocument());
  await selectIn(textNodes()[0], 6, textNodes()[0], 11);
  expect(pill()).toHaveClass('show');
});
