import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { Toast, useToast, type ToastNotice } from './Toast';

// JSDOM covers lifecycle and semantics; browser captures cover CSS and motion.
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
function Trigger({ notice }: { notice: ToastNotice }) {
  const push = useToast();
  return <button onClick={() => push(notice)}>Notify</button>;
}
function setup(notice: ToastNotice = { title: 'Saved', text: 'Your changes were saved.' }) {
  return render(<Toast><Trigger notice={notice} /></Toast>);
}
it('appends notices to one polite region without moving focus', () => {
  setup();
  const trigger = screen.getByText('Notify');
  trigger.focus();
  fireEvent.click(trigger); fireEvent.click(trigger);
  expect(screen.getAllByText('Saved')).toHaveLength(2);
  expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'false');
  expect(trigger).toHaveFocus();
});
it('leaves after five seconds and removes only after its own animation', () => {
  vi.useFakeTimers(); setup(); fireEvent.click(screen.getByText('Notify'));
  const notice = screen.getByText('Saved').closest('.ui-toast')!;
  act(() => vi.advanceTimersByTime(5000));
  expect(notice).toHaveClass('is-leaving');
  fireEvent.animationEnd(screen.getByText('Saved'));
  expect(notice).toBeInTheDocument();
  fireEvent.animationEnd(notice);
  expect(notice).not.toBeInTheDocument();
});
it('keeps actions until pressed and calls them only once', () => {
  vi.useFakeTimers(); const onClick = vi.fn();
  setup({ title: 'Removed', action: { label: 'Undo', onClick } });
  fireEvent.click(screen.getByText('Notify'));
  act(() => vi.advanceTimersByTime(20000));
  const button = screen.getByRole('button', { name: 'Undo' });
  fireEvent.click(button); fireEvent.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
  act(() => vi.advanceTimersByTime(260));
  expect(screen.queryByText('Removed')).not.toBeInTheDocument();
});
it('dismisses immediately with reduced motion and still expires notices', () => {
  vi.useFakeTimers(); vi.stubGlobal('matchMedia', () => ({ matches: true }));
  setup(); fireEvent.click(screen.getByText('Notify'));
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Notify'));
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.queryByText('Saved')).not.toBeInTheDocument();
});
it.each(['success', 'danger', 'warn', 'info', 'neutral'] as const)('renders %s with the kit classes', tone => {
  setup({ tone, title: 'Notice' }); fireEvent.click(screen.getByText('Notify'));
  expect(screen.getByText('Notice').closest('.ui-toast')).toHaveClass(`ui-toast--${tone}`, 'ui-toast--soft');
});
it('clears timers on unmount', () => {
  vi.useFakeTimers(); const view = setup(); fireEvent.click(screen.getByText('Notify'));
  view.unmount(); expect(vi.getTimerCount()).toBe(0);
});
it('has no axe violations with an action present', async () => {
  setup({ title: 'Removed', text: 'The draft was removed.', action: { label: 'Undo', onClick() {} } });
  fireEvent.click(screen.getByText('Notify'));
  const result = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  expect(result.violations).toEqual([]);
});
