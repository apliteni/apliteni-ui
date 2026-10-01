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
it('appends polite notices without moving focus', () => {
  setup();
  const trigger = screen.getByText('Notify');
  trigger.focus();
  fireEvent.click(trigger); fireEvent.click(trigger);
  expect(screen.getAllByText('Saved')).toHaveLength(2);
  expect(screen.getAllByRole('status')).toHaveLength(2);
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
it.each([false, true])('pauses on hover and resumes the remaining time (reduced motion: %s)', reduced => {
  vi.useFakeTimers(); vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  setup(); fireEvent.click(screen.getByText('Notify'));
  const notice = screen.getByText('Saved').closest('.ui-toast')!;
  act(() => vi.advanceTimersByTime(2000));
  fireEvent.mouseEnter(notice);
  expect(notice.querySelector('.ui-toast__timer')).toHaveStyle({ animationPlayState: 'paused' });
  act(() => vi.advanceTimersByTime(10000));
  expect(notice).toBeInTheDocument();
  expect(notice).not.toHaveClass('is-leaving');
  fireEvent.mouseLeave(notice);
  expect(notice.querySelector('.ui-toast__timer')).toHaveStyle({ animationPlayState: 'running' });
  act(() => vi.advanceTimersByTime(2999));
  expect(notice).toBeInTheDocument();
  expect(notice).not.toHaveClass('is-leaving');
  act(() => vi.advanceTimersByTime(1));
  if (reduced) expect(notice).not.toBeInTheDocument();
  else expect(notice).toHaveClass('is-leaving');
});
it('stays paused until both hover and focus leave, including repeated pauses', () => {
  vi.useFakeTimers(); setup(); fireEvent.click(screen.getByText('Notify'));
  const notice = screen.getByText('Saved').closest('.ui-toast')!;
  const close = screen.getByRole('button', { name: 'Dismiss' });
  act(() => vi.advanceTimersByTime(1000));
  act(() => close.focus());
  act(() => vi.advanceTimersByTime(10000));
  expect(notice).not.toHaveClass('is-leaving');
  fireEvent.mouseEnter(notice);
  act(() => screen.getByText('Notify').focus());
  act(() => vi.advanceTimersByTime(10000));
  expect(notice).not.toHaveClass('is-leaving');
  fireEvent.mouseLeave(notice);
  act(() => vi.advanceTimersByTime(1000));
  fireEvent.mouseEnter(notice);
  act(() => close.focus());
  fireEvent.mouseLeave(notice);
  act(() => vi.advanceTimersByTime(10000));
  expect(notice).not.toHaveClass('is-leaving');
  act(() => screen.getByText('Notify').focus());
  act(() => vi.advanceTimersByTime(2999));
  expect(notice).not.toHaveClass('is-leaving');
  act(() => vi.advanceTimersByTime(1));
  expect(notice).toHaveClass('is-leaving');
});
it.each(['success', 'danger', 'warn', 'info', 'neutral'] as const)('announces %s with the correct urgency', tone => {
  setup({ tone, title: 'Notice', text: 'Details' });
  const trigger = screen.getByText('Notify'); trigger.focus(); fireEvent.click(trigger);
  const notice = screen.getByText('Notice').closest('.ui-toast');
  expect(notice).toHaveAttribute('role', tone === 'danger' ? 'alert' : 'status');
  expect(notice).toHaveAttribute('aria-live', tone === 'danger' ? 'assertive' : 'polite');
  expect(notice?.parentElement).not.toHaveAttribute('aria-live');
  expect(trigger).toHaveFocus();
});

// The published reach is what lets a fixed page action clear ANY number of
// notices, instead of an offset tuned to one (#388). JSDOM lays nothing out, so
// the stack's box is stubbed here; the real clearance is measured in a browser.
it('publishes how far the stack reaches so a fixed page action can clear it', () => {
  const reach = () => document.documentElement.style.getPropertyValue('--rx-toast-stack');
  const real = HTMLElement.prototype.getBoundingClientRect;
  let height = 0;
  HTMLElement.prototype.getBoundingClientRect = function () {
    if (!this.classList.contains('rx-toast-stack')) return real.call(this);
    return { height, top: window.innerHeight - 16 - height } as DOMRect;
  };
  try {
    const { unmount } = setup();
    expect(reach()).toBe('0px');
    height = 85;
    fireEvent.click(screen.getByText('Notify'));
    expect(reach()).toBe('101px');
    height = 182;
    fireEvent.click(screen.getByText('Notify'));
    expect(reach()).toBe('198px');
    unmount();
    expect(reach()).toBe('');
  } finally {
    HTMLElement.prototype.getBoundingClientRect = real;
  }
});

it('omits compact body text from both the screen and announcement', () => {
  setup({ title: 'Copied to clipboard', text: 'Hidden details', compact: true });
  fireEvent.click(screen.getByText('Notify'));
  expect(screen.getByRole('status')).toHaveClass('ui-toast--compact');
  expect(screen.getByRole('status')).toHaveTextContent('Copied to clipboard');
  expect(screen.queryByText('Hidden details')).not.toBeInTheDocument();
});
it('expires a notice without a close button, including hover pause', () => {
  vi.useFakeTimers(); vi.stubGlobal('matchMedia', () => ({ matches: true }));
  setup({ title: 'Saved', dismissible: false });
  fireEvent.click(screen.getByText('Notify'));
  expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
  const notice = screen.getByRole('status');
  act(() => vi.advanceTimersByTime(2000));
  fireEvent.mouseEnter(notice);
  act(() => vi.advanceTimersByTime(10000));
  expect(notice).toBeInTheDocument();
  fireEvent.mouseLeave(notice);
  act(() => vi.advanceTimersByTime(3000));
  expect(notice).not.toBeInTheDocument();
});
it('keeps a compact, non-dismissible action notice until its action is selected', () => {
  vi.useFakeTimers(); vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const onClick = vi.fn();
  setup({ title: 'Draft removed', text: 'Hidden details', compact: true, dismissible: false,
    action: { label: 'Undo', onClick } });
  fireEvent.click(screen.getByText('Notify'));
  act(() => vi.advanceTimersByTime(20000));
  expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
  expect(screen.getByRole('status').querySelector('.ui-toast__timer')).toBeNull();
  const action = screen.getByRole('button', { name: 'Undo' });
  action.focus();
  expect(action).toHaveFocus();
  fireEvent.click(action);
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
it('has no axe violations in compact non-dismissible presentation', async () => {
  setup({ title: 'Copied to clipboard', compact: true, dismissible: false });
  fireEvent.click(screen.getByText('Notify'));
  const result = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  expect(result.violations).toEqual([]);
});

/* Collapsing a stack into a pile.
 *
 * The geometry is the kit's own and is measured in src/logic/toast-stack.test.js;
 * the sheet's half is walked in stories/toast-pile.test.js. What is left for this
 * file is the provider's part: which notices are in the pile and which one is in
 * front. JSDOM lays nothing out, so the heights below
 * are stubbed — the offsets themselves are a browser question. */
function stubHeights(height: number) {
  const real = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => height });
  return () => {
    if (real) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', real);
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>).offsetHeight;
  };
}
function collapsing(notice: ToastNotice = { title: 'Saved', text: 'Your changes were saved.' }) {
  return render(<Toast collapse><Trigger notice={notice} /></Toast>);
}
const pile = () => document.querySelector('.rx-toast-stack') as HTMLElement;
const notices = () => [...pile().children].filter(el => el.classList.contains('ui-toast')) as HTMLElement[];

it('collapses several notices into one pile, and leaves a single notice alone', () => {
  const restore = stubHeights(80);
  try {
    collapsing();
    const notify = screen.getByText('Notify');
    fireEvent.click(notify);
    expect(pile()).not.toHaveClass('ui-toast-stack--collapsed');
    expect(notices()).toHaveLength(1);
    fireEvent.click(notify); fireEvent.click(notify);
    expect(pile()).toHaveClass('ui-toast-stack--collapsed');
    // The pile is the notices themselves and nothing else: no chip above it.
    expect(notices()).toHaveLength(3);
    expect(pile().children).toHaveLength(3);
  } finally { restore(); }
});
it('keeps the newest notice at the front of the pile and the oldest furthest back', () => {
  const restore = stubHeights(80);
  try {
    collapsing();
    const notify = screen.getByText('Notify');
    fireEvent.click(notify); fireEvent.click(notify); fireEvent.click(notify);
    const cards = notices();
    const lifts = cards.map(card => parseFloat(card.style.getPropertyValue('--toast-card-lift')));
    const front = cards[cards.length - 1];
    expect(lifts[lifts.length - 1]).toBe(0);
    expect(front.style.getPropertyValue('--toast-card-scale')).toBe('1');
    expect([...lifts].sort((a, b) => a - b)).toEqual(lifts);
    expect(pile().style.getPropertyValue('--toast-pile-height')).not.toBe('');
    expect(pile().style.getPropertyValue('--toast-fan-height')).not.toBe('');
  } finally { restore(); }
});
it('gives the stack back when the pile drops below two notices', () => {
  const restore = stubHeights(80);
  try {
    collapsing({ title: 'Saved', dismissible: true });
    const notify = screen.getByText('Notify');
    fireEvent.click(notify); fireEvent.click(notify);
    expect(pile()).toHaveClass('ui-toast-stack--collapsed');
    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0]);
    act(() => { fireEvent.animationEnd(notices()[0]); });
    expect(pile()).not.toHaveClass('ui-toast-stack--collapsed');
    expect(notices()[0].style.getPropertyValue('--toast-card-lift')).toBe('');
    expect(pile().style.getPropertyValue('--toast-pile-height')).toBe('');
  } finally { restore(); }
});
it('leaves the stack alone unless collapsing was asked for', () => {
  setup(); const notify = screen.getByText('Notify');
  fireEvent.click(notify); fireEvent.click(notify);
  expect(pile()).not.toHaveClass('ui-toast-stack--collapsed');
});

it('draws the progress line on an auto-dismissing notice and drops it on request', () => {
  setup({ title: 'Saved' });
  fireEvent.click(screen.getByText('Notify'));
  expect(screen.getByRole('status').querySelector('.ui-toast__timer')).not.toBeNull();
  cleanup();
  setup({ title: 'Saved', progress: false });
  fireEvent.click(screen.getByText('Notify'));
  expect(screen.getByRole('status').querySelector('.ui-toast__timer')).toBeNull();
});
it('still expires a notice whose progress line was turned off', () => {
  vi.useFakeTimers();
  setup({ title: 'Saved', progress: false });
  fireEvent.click(screen.getByText('Notify'));
  const notice = screen.getByRole('status');
  act(() => vi.advanceTimersByTime(4999));
  expect(notice).not.toHaveClass('is-leaving');
  act(() => vi.advanceTimersByTime(1));
  expect(notice).toHaveClass('is-leaving');
});
it('has no axe violations with a collapsed pile on screen', async () => {
  const restore = stubHeights(80);
  try {
    collapsing();
    const notify = screen.getByText('Notify');
    fireEvent.click(notify); fireEvent.click(notify);
    const result = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(result.violations).toEqual([]);
  } finally { restore(); }
});
