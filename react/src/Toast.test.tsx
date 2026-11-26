import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
// A page with a bar at the bottom moves the stack with `bottomOffset`, not with a selector on the
// kit's node (#907). The stub reads the inset from the stack's own style, as a browser would place it.
it('moves the stack by bottomOffset and publishes the new reach', () => {
  const reach = () => document.documentElement.style.getPropertyValue('--rx-toast-stack');
  const stack = () => document.querySelector('.rx-toast-stack') as HTMLElement;
  const real = HTMLElement.prototype.getBoundingClientRect;
  let lag = false;
  HTMLElement.prototype.getBoundingClientRect = function () {
    if (!this.classList.contains('rx-toast-stack')) return real.call(this);
    const inset = this.style.bottom && !lag ? parseFloat(this.style.bottom) : 16;
    return { height: 85, top: window.innerHeight - inset - 85 } as DOMRect;
  };
  const page = (bottomOffset?: number | string) => <Toast bottomOffset={bottomOffset}><Trigger notice={{ title: 'Saved' }} /></Toast>;
  try {
    const { rerender } = render(page());
    expect(stack().style.bottom).toBe('');
    fireEvent.click(screen.getByText('Notify'));
    expect(reach()).toBe('101px');
    rerender(page(80));
    expect(stack().style.bottom).toBe('80px');
    expect(reach()).toBe('165px');
    rerender(page('120px'));
    expect(stack().style.bottom).toBe('120px');
    expect(reach()).toBe('205px');
    // A length the browser cannot read leaves the kit's 16px.
    rerender(page('one bar'));
    expect(stack().style.bottom).toBe('');
    expect(reach()).toBe('101px');
    // Under reduced motion the move is a 0.01ms transition, so the stack is still at 16px when
    // the offset is set. The reach follows when the move ends.
    lag = true;
    rerender(page(80));
    expect(reach()).toBe('101px');
    lag = false;
    fireEvent.transitionEnd(stack().firstElementChild!);
    expect(reach()).toBe('101px');
    fireEvent.transitionEnd(stack());
    expect(reach()).toBe('165px');
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
 * file is the provider's part: which notices are in the pile and which one is
 * in front. JSDOM lays nothing out, so the heights below are stubbed — the
 * offsets themselves are a browser question. */
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

it('draws the timer line on an auto-dismissing notice and drops it on request', () => {
  setup({ title: 'Saved' });
  fireEvent.click(screen.getByText('Notify'));
  expect(screen.getByRole('status').querySelector('.ui-toast__timer')).not.toBeNull();
  cleanup();
  setup({ title: 'Saved', timer: false });
  fireEvent.click(screen.getByText('Notify'));
  expect(screen.getByRole('status').querySelector('.ui-toast__timer')).toBeNull();
});
it('keeps a notice when its timer was turned off', () => {
  vi.useFakeTimers();
  setup({ title: 'Saved', timer: false });
  fireEvent.click(screen.getByText('Notify'));
  const notice = screen.getByRole('status');
  act(() => vi.advanceTimersByTime(60000));
  expect(notice).toBeInTheDocument();
  expect(notice).not.toHaveClass('is-leaving');
});
it.each([true, false])('holds every notice while the stack is hovered (collapse: %s)', collapse => {
  vi.useFakeTimers(); const restore = stubHeights(80);
  try {
    render(<Toast collapse={collapse}><Trigger notice={{ title: 'Saved', text: 'Your changes were saved.' }} /></Toast>);
    const notify = screen.getByText('Notify');
    for (let i = 0; i < 5; i += 1) fireEvent.click(notify);
    const stack = pile();
    fireEvent.mouseEnter(stack);
    act(() => vi.advanceTimersByTime(20000));
    expect(notices()).toHaveLength(5);
    for (const notice of notices()) expect(notice).not.toHaveClass('is-leaving');
    fireEvent.mouseLeave(stack);
    act(() => vi.advanceTimersByTime(5000));
    expect(notices().every(notice => notice.classList.contains('is-leaving'))).toBe(true);
  } finally { restore(); }
});
it('lets a keyboard reader open a non-dismissible pile without actions', () => {
  vi.useFakeTimers(); const restore = stubHeights(80);
  try {
    collapsing({ title: 'Saved', dismissible: false });
    const notify = screen.getByText('Notify');
    fireEvent.click(notify); fireEvent.click(notify); fireEvent.click(notify);
    expect(pile()).toHaveAttribute('tabindex', '0');
    act(() => pile().focus());
    expect(pile()).toHaveFocus();
    act(() => vi.advanceTimersByTime(20000));
    expect(notices()).toHaveLength(3);
  } finally { restore(); }
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
it('keeps a notice when its timer is zero seconds', () => {
  vi.useFakeTimers();
  setup({ title: 'Saved', timer: 0 });
  fireEvent.click(screen.getByText('Notify'));
  const notice = screen.getByRole('status');
  act(() => vi.advanceTimersByTime(60000));
  expect(notice).toBeInTheDocument();
  expect(notice.querySelector('.ui-toast__timer')).toBeNull();
});

/* An undo notice with `timer`, in a stack with a limit (#888). Each notice pushes its own row. */
function Undos({ undo }: { undo: (row: string) => void }) {
  const push = useToast();
  return <>{['Mercado Verde', 'Tranvía Norte', 'Luz del Sur', 'Farmacia Sol'].map(row => (
    <button key={row} onClick={() => push({ title: `${row} set to Groceries`, timer: 8,
      action: { label: 'Undo', onClick: () => undo(row) } })}>{row}</button>))}</>;
}
const titles = () => notices().filter(el => !el.classList.contains('is-leaving'))
  .map(el => el.querySelector('.ui-toast__title')!.textContent);
const arcOf = (notice: Element) => notice.querySelector('.ui-toast__action .ui-toast__ring-arc') as SVGElement;

it('keeps at most `limit` notices, newest at the bottom, and the oldest leaves first', () => {
  render(<Toast limit={3}><Undos undo={() => {}} /></Toast>);
  for (const row of ['Mercado Verde', 'Tranvía Norte', 'Luz del Sur']) fireEvent.click(screen.getByText(row));
  expect(titles()).toEqual(['Mercado Verde set to Groceries', 'Tranvía Norte set to Groceries', 'Luz del Sur set to Groceries']);
  fireEvent.click(screen.getByText('Farmacia Sol'));
  expect(titles()).toEqual(['Tranvía Norte set to Groceries', 'Luz del Sur set to Groceries', 'Farmacia Sol set to Groceries']);
  const oldest = screen.getByText('Mercado Verde set to Groceries').closest('.ui-toast')!;
  expect(oldest).toHaveClass('is-leaving');
  fireEvent.animationEnd(oldest);
  expect(notices()).toHaveLength(3);
});
it.each([undefined, 0])('keeps every notice without a limit (limit: %s)', limit => {
  render(<Toast limit={limit}><Undos undo={() => {}} /></Toast>);
  for (const row of ['Mercado Verde', 'Tranvía Norte', 'Luz del Sur', 'Farmacia Sol']) fireEvent.click(screen.getByText(row));
  expect(titles()).toHaveLength(4);
});
it('gives each Undo its own notice, and the ring spends the notice time', () => {
  vi.useFakeTimers(); const undo = vi.fn();
  render(<Toast limit={3}><Undos undo={undo} /></Toast>);
  for (const row of ['Mercado Verde', 'Tranvía Norte', 'Luz del Sur']) fireEvent.click(screen.getByText(row));
  for (const notice of notices()) {
    expect(arcOf(notice)).toHaveClass('is-running');
    // A full track sits behind the arc, so the ring keeps its shape as the arc empties.
    expect(arcOf(notice).previousElementSibling).toHaveClass('ui-toast__ring-track');
    expect(arcOf(notice).previousElementSibling).toHaveAttribute('r', arcOf(notice).getAttribute('r'));
    // The ring takes the place of the timer line.
    expect(notice.querySelector('.ui-toast__timer')).toBeNull();
    expect(arcOf(notice).style).toMatchObject({ animationDuration: '8000ms', animationPlayState: 'running' });
    expect(notice.querySelector('.ui-toast__action')).toHaveAccessibleName('Undo');
    expect(notice).toHaveTextContent('Undo is available for 8 seconds.');
  }
  act(() => vi.advanceTimersByTime(3000));
  fireEvent.click(within(notices()[1]).getByRole('button', { name: 'Undo' }));
  expect(undo.mock.calls).toEqual([['Tranvía Norte']]);
  expect(titles()).toEqual(['Mercado Verde set to Groceries', 'Luz del Sur set to Groceries']);
  act(() => vi.advanceTimersByTime(4999));
  expect(titles()).toHaveLength(2);
  act(() => vi.advanceTimersByTime(1));
  expect(titles()).toEqual([]);
  expect(undo).toHaveBeenCalledTimes(1);
});
it('steps the ring once a second under reduced motion', () => {
  vi.useFakeTimers(); vi.stubGlobal('matchMedia', () => ({ matches: true }));
  render(<Toast><Undos undo={() => {}} /></Toast>);
  fireEvent.click(screen.getByText('Mercado Verde'));
  const arc = () => arcOf(notices()[0]);
  const offset = () => Number(arc().style.strokeDashoffset);
  expect(offset()).toBe(0);
  act(() => vi.advanceTimersByTime(999));
  expect(offset()).toBe(0);
  act(() => vi.advanceTimersByTime(1));
  expect(offset()).toBe(-12.5);
  act(() => vi.advanceTimersByTime(999));
  expect(offset()).toBe(-12.5);
  act(() => vi.advanceTimersByTime(1));
  expect(offset()).toBe(-25);
  act(() => vi.advanceTimersByTime(6000));
  expect(notices()).toHaveLength(0);
});
it('keeps an action notice without a ring unless it has a timer', () => {
  setup({ title: 'Removed', action: { label: 'Undo', onClick() {} } });
  fireEvent.click(screen.getByText('Notify'));
  expect(screen.getByRole('button', { name: 'Undo' })).not.toHaveClass('ui-toast__action--timed');
  expect(document.querySelector('.ui-toast__ring')).toBeNull();
});
it('keeps the focus in the stack when a focused notice leaves, and Escape closes the focused notice', () => {
  const undo = vi.fn();
  render(<Toast limit={3}><Undos undo={undo} /></Toast>);
  for (const row of ['Mercado Verde', 'Tranvía Norte', 'Luz del Sur']) fireEvent.click(screen.getByText(row));
  const undoOf = (index: number) => within(notices()[index]).getByRole('button', { name: 'Undo' });
  act(() => undoOf(1).focus());
  fireEvent.click(undoOf(1));
  // The next newer notice takes the focus.
  expect(document.activeElement).toBe(undoOf(2));
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(undo).toHaveBeenCalledTimes(1);
  // The newest notice left, so the newest older one takes the focus.
  expect(document.activeElement).toBe(undoOf(0));
  expect(titles()).toEqual(['Mercado Verde set to Groceries']);
});
/* The browser sends no mouseleave when a notice leaves from under a still pointer, so the stack
 * asks the document what lies under the pointer. JSDOM has no elementFromPoint: the stub answers. */
function pointerOver(under: () => Element | null) {
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: under });
  return () => { delete (document as { elementFromPoint?: unknown }).elementFromPoint; };
}
it.each([
  ['focus', false], ['focus', true], ['hover', false], ['hover', true],
])('releases the %s hold when the last notice leaves, so the next notice still expires (reduced motion: %s)', (hold, reduced) => {
  vi.useFakeTimers(); vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  const restore = pointerOver(() => document.body);
  try {
    render(<Toast><Undos undo={() => {}} /></Toast>);
    fireEvent.click(screen.getByText('Mercado Verde'));
    const undo = screen.getByRole('button', { name: 'Undo' });
    if (hold === 'focus') act(() => undo.focus());
    else fireEvent.mouseEnter(undo);
    fireEvent.click(undo);
    if (!reduced) fireEvent.animationEnd(notices()[0]);
    expect(notices()).toHaveLength(0);
    fireEvent.click(screen.getByText('Tranvía Norte'));
    act(() => vi.advanceTimersByTime(8000));
    if (!reduced) fireEvent.animationEnd(notices()[0]);
    expect(notices()).toHaveLength(0);
  } finally { restore(); }
});
it.each([true, false])('keeps the hover hold after a notice leaves only while a notice is under the pointer (still over one: %s)', still => {
  vi.useFakeTimers();
  render(<Toast><Undos undo={() => {}} /></Toast>);
  for (const row of ['Mercado Verde', 'Tranvía Norte']) fireEvent.click(screen.getByText(row));
  const restore = pointerOver(() => still ? notices()[0] : document.body);
  try {
    const newest = within(notices()[1]).getByRole('button', { name: 'Undo' });
    fireEvent.mouseEnter(newest);
    fireEvent.click(newest);
    fireEvent.animationEnd(notices()[1]);
    act(() => vi.advanceTimersByTime(8000));
    if (still) expect(titles()).toEqual(['Mercado Verde set to Groceries']);
    else expect(notices()[0]).toHaveClass('is-leaving');
  } finally { restore(); }
});
it('passes the focus over a newer notice without a control to a later Undo', () => {
  function Mixed() {
    const push = useToast();
    return <button onClick={() => {
      push({ title: 'Mercado Verde set to Groceries', action: { label: 'Undo', onClick() {} } });
      push({ title: 'Syncing rows', dismissible: false, timer: false });
      push({ title: 'Luz del Sur set to Groceries', action: { label: 'Undo', onClick() {} } });
    }}>Notify</button>;
  }
  render(<Toast><Mixed /></Toast>);
  fireEvent.click(screen.getByText('Notify'));
  const undoOf = (title: string) => within(screen.getByText(title).closest('.ui-toast') as HTMLElement).getByRole('button', { name: 'Undo' });
  act(() => undoOf('Mercado Verde set to Groceries').focus());
  fireEvent.click(document.activeElement!);
  expect(document.activeElement).toBe(undoOf('Luz del Sur set to Groceries'));
});
it('keeps a notice without a close button on Escape', () => {
  setup({ title: 'Removed', dismissible: false, action: { label: 'Undo', onClick() {} } });
  fireEvent.click(screen.getByText('Notify'));
  act(() => screen.getByRole('button', { name: 'Undo' }).focus());
  fireEvent.keyDown(screen.getByRole('button', { name: 'Undo' }), { key: 'Escape' });
  expect(screen.getByRole('status')).not.toHaveClass('is-leaving');
});
