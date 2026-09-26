import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import { Confirm } from './Confirm';

const props = {
  title: 'Revoke demo token?',
  body: 'This token will stop working. You cannot restore it.',
  confirmLabel: 'Revoke token',
  cancelLabel: 'Keep the token',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

// JSDOM checks behavior; Modal tests own motion timing and browser captures check appearance.
it('renders nothing while closed', () => {
  render(<Confirm {...props} open={false} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it.each([false, true])('names the dialog and renders safe then committing actions (danger=%s)', danger => {
  render(<Confirm {...props} open danger={danger} />);
  expect(screen.getByRole('dialog', { name: props.title })).toHaveAttribute('aria-modal', 'true');
  const safe = screen.getByRole('button', { name: props.cancelLabel });
  const commit = screen.getByRole('button', { name: props.confirmLabel });
  expect(safe).toHaveClass('ui-btn--ghost');
  expect(commit).toHaveClass(danger ? 'ui-btn--danger' : 'ui-btn--primary');
  expect(screen.getAllByRole('button').slice(-2)).toEqual([safe, commit]);
  expect(screen.getByText(props.body)).toHaveFocus();
});

it('calls only onConfirm and leaves open state with the consumer', async () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(<Confirm {...props} open onConfirm={onConfirm} onCancel={onCancel} />);
  await userEvent.click(screen.getByRole('button', { name: props.confirmLabel }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(onCancel).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

it.each(['safe', 'Escape', 'scrim', 'close'])('dismisses through %s and restores the opener', async how => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  function Example() {
    const [open, setOpen] = useState(false);
    return <>
      <button onClick={() => setOpen(true)}>Review action</button>
      <Confirm {...props} open={open} onConfirm={onConfirm}
        onCancel={() => { onCancel(); setOpen(false); }} />
    </>;
  }
  const { container } = render(<Example />);
  const opener = screen.getByRole('button', { name: 'Review action' });
  await userEvent.click(opener);
  expect(container).toHaveAttribute('inert');
  if (how === 'Escape') await userEvent.keyboard('{Escape}');
  else if (how === 'scrim') await userEvent.click(document.querySelector('.rx-scrim')!);
  else await userEvent.click(screen.getByRole('button', { name: how === 'safe' ? props.cancelLabel : 'Close' }));
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
  expect(container).not.toHaveAttribute('inert');
});

it('keeps body clicks inside and wraps Tab in both directions', async () => {
  const onCancel = vi.fn();
  render(<Confirm {...props} open onCancel={onCancel} />);
  await userEvent.click(screen.getByText(props.body));
  expect(onCancel).not.toHaveBeenCalled();
  await userEvent.tab();
  expect(screen.getByRole('button', { name: props.cancelLabel })).toHaveFocus();
  await userEvent.tab();
  const commit = screen.getByRole('button', { name: props.confirmLabel });
  expect(commit).toHaveFocus();
  await userEvent.tab();
  expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  await userEvent.tab({ shift: true });
  expect(commit).toHaveFocus();
});

it('keeps busy focus, blocks repeat clicks and keys, announces progress, and permits Escape', async () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const { rerender } = render(<Confirm {...props} open onConfirm={onConfirm} onCancel={onCancel} />);
  const commit = screen.getByRole('button', { name: props.confirmLabel });
  commit.focus();
  rerender(<Confirm {...props} open busy onConfirm={onConfirm} onCancel={onCancel} />);
  expect(commit).toHaveFocus();
  expect(commit).not.toBeDisabled();
  expect(commit).toHaveAttribute('aria-busy', 'true');
  expect(commit).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(commit);
  await userEvent.keyboard('{Enter} ');
  expect(onConfirm).not.toHaveBeenCalled();
  await waitFor(() => expect(document.querySelector('[role="status"]')).toHaveTextContent('Revoke token: in progress'));
  await userEvent.keyboard('{Escape}');
  expect(onCancel).toHaveBeenCalledTimes(1);
  rerender(<Confirm {...props} open onConfirm={onConfirm} onCancel={onCancel} />);
  await userEvent.click(commit);
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

it('keeps the busy announcement available when opened during a write', async () => {
  const { container } = render(<Confirm {...props} open busy />);
  await waitFor(() => expect(document.querySelector('[role="status"]')).toHaveTextContent('Revoke token: in progress'));
  expect(document.querySelector('[role="status"]')!.closest('[inert]')).toBeNull();
  expect(container).toHaveAttribute('inert');
});
