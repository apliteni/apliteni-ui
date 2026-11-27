import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { vi } from 'vitest';
import { SelectionBar, fitActions, type SelectionBarAction } from './SelectionBar';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';

const STATUS: SelectionBarAction = { id: 'status', label: 'Status', items: [{ label: 'Draft', value: 'draft' }, { label: 'Ready', value: 'ready' }] };
const actions: SelectionBarAction[] = [STATUS, { id: 'archive', label: 'Archive' }, { id: 'owner', label: 'Owner', items: [{ label: 'Avery' }, { label: 'Blair' }] }];
const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const handlers = () => ({ onAction: vi.fn(), onClear: vi.fn() });

// jsdom lays nothing out, so the widths are given: the count 100, each action 60, More 50,
// and the room `width()`. `shrunk` is the count on the bar, which large text can squeeze
// under its full width. Stand-in ResizeObservers let a test call every fit again.
const laidOut = (width: () => number, shrunk = 100) => {
  const notify = new Set<() => void>();
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { notify.add(callback); }
    observe() {}
    disconnect() {}
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const measured = this.parentElement?.classList.contains('ui-selection-bar__measure');
    const size = this.classList.contains('ui-selection-bar__count') ? (measured ? 100 : shrunk) : this.parentElement?.classList.contains('ui-selection-bar__measure') ? (this.textContent === 'More' ? 50 : 60) : 0;
    return { width: size, height: 32, top: 0, left: 0, right: size, bottom: 32, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('ui-selection-room') ? width() : 0;
  });
  return () => act(() => notify.forEach(callback => callback()));
};
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

// The arithmetic only. A browser decides the widths it is given.
it('stands every action that fits, and leaves room for More when they do not', () => {
  expect(fitActions([60, 60, 60], 188, 20, 4)).toBe(3);
  expect(fitActions([60, 60, 60], 150, 20, 4)).toBe(2);
  expect(fitActions([60, 60, 60], 143, 20, 4)).toBe(1);
  expect(fitActions([60, 60], 50, 70, 4)).toBe(0);
  expect(fitActions([], 0, 70, 4)).toBe(0);
});

// The count's full width is 100, so 150 is free for three actions of 60: one stands, with
// More. A fit that read the squeezed count of 40 would stand all three.
it('fits the actions beside the count at its full width, not at the width it is squeezed to', () => {
  laidOut(() => 250, 40);
  render(<SelectionBar count={2} actions={actions} {...handlers()} />);
  expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(['Clear', 'Status', 'More']);
});

// DOM only: what is drawn and what it is called. A browser measures the paint.
it('draws nothing at 0, and a named region with the count and Clear once rows are selected', () => {
  const props = handlers();
  const { rerender } = render(<SelectionBar count={0} actions={actions} {...props} />);
  expect(screen.queryByRole('region')).toBeNull();
  rerender(<SelectionBar count={2} actions={actions} noun="documents" {...props} />);
  const bar = screen.getByRole('region', { name: 'Selected documents' });
  expect(within(bar).getByText('2 selected', { ignore: '.ui-selection-bar__measure *' })).toBeInTheDocument();
  // Clear stands beside the count, before the actions, in the Tab order.
  expect(within(bar).getAllByRole('button').map(button => button.textContent)).toEqual(['Clear', 'Status', 'Archive', 'Owner']);
});

it('says each count politely, and says when the selection goes back to none', () => {
  const props = handlers();
  const { rerender } = render(<SelectionBar count={0} actions={actions} {...props} />);
  const status = screen.getByRole('status');
  expect(status).toHaveAttribute('aria-live', 'polite');
  expect(status).toHaveAttribute('aria-atomic', 'true');
  expect(status).toHaveTextContent(/^$/);
  rerender(<SelectionBar count={3} actions={actions} {...props} />);
  expect(screen.getByRole('status')).toHaveTextContent('3 rows selected');
  rerender(<SelectionBar count={0} actions={actions} {...props} />);
  expect(screen.getByRole('status')).toHaveTextContent('No rows selected');
});

it('applies a pick at once, keeps the field name on the trigger, and runs a button', async () => {
  const props = handlers();
  render(<SelectionBar count={2} actions={actions} {...props} />);
  const status = screen.getByRole('button', { name: 'Status' });
  await userEvent.click(status);
  await userEvent.click(screen.getByRole('menuitem', { name: 'Ready' }));
  expect(props.onAction).toHaveBeenCalledWith('status', 'ready');
  expect(status).toHaveTextContent(/^Status$/);
  await userEvent.click(screen.getByRole('button', { name: 'Owner' }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Blair' }));
  expect(props.onAction).toHaveBeenCalledWith('owner', 'Blair');
  await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
  expect(props.onAction).toHaveBeenLastCalledWith('archive');
  expect(props.onClear).not.toHaveBeenCalled();
});

it('closes an open list on the first Escape and clears on the second', async () => {
  const props = handlers();
  render(<SelectionBar count={2} actions={actions} {...props} />);
  const status = screen.getByRole('button', { name: 'Status' });
  await userEvent.click(status);
  expect(status).toHaveAttribute('aria-expanded', 'true');
  await userEvent.keyboard('{Escape}');
  expect(status).toHaveAttribute('aria-expanded', 'false');
  expect(status).toHaveFocus();
  expect(props.onClear).not.toHaveBeenCalled();
  await userEvent.keyboard('{Escape}');
  expect(props.onClear).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(props.onClear).toHaveBeenCalledTimes(2);
});

it('adds a search field to a list of ten', async () => {
  const many = Array.from({ length: 10 }, (_, index) => ({ label: `Person ${index + 1}` }));
  render(<SelectionBar count={1} actions={[{ id: 'owner', label: 'Owner', items: many }, STATUS]} {...handlers()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Owner' }));
  expect(screen.getByRole('combobox', { name: 'Search owner' })).toBeInTheDocument();
});

it('gives a list under ten rows no search field', async () => {
  render(<SelectionBar count={1} actions={[STATUS]} {...handlers()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Status' }));
  expect(screen.getByRole('menu', { name: 'Status' })).toBeInTheDocument();
  expect(screen.queryByRole('combobox')).toBeNull();
});

// A room of 250 holds Status and More beside the count, and not Archive and Owner.
it('moves the actions that do not fit into More, and opens a list action from there as its own picker', async () => {
  const props = handlers();
  laidOut(() => 250);
  render(<SelectionBar count={2} actions={actions} {...props} />);
  const bar = screen.getByRole('region');
  expect(within(bar).getAllByRole('button').map(button => button.textContent)).toEqual(['Clear', 'Status', 'More']);
  await userEvent.click(screen.getByRole('button', { name: 'More' }));
  const menu = screen.getByRole('menu', { name: 'More' });
  // More holds the actions by name, not their values.
  expect(within(menu).getAllByRole('menuitem').map(row => row.textContent)).toEqual(['Archive', 'Owner']);
  await userEvent.click(within(menu).getByRole('menuitem', { name: 'Owner' }));
  expect(props.onAction).not.toHaveBeenCalled();
  const picker = screen.getByRole('menu', { name: 'More' });
  expect(within(picker).getByText('Owner')).toHaveClass('ui-dropdown__group');
  await userEvent.click(within(picker).getByRole('menuitem', { name: 'Avery' }));
  expect(props.onAction).toHaveBeenCalledExactlyOnceWith('owner', 'Avery');
  await userEvent.click(screen.getByRole('button', { name: 'More' }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
  expect(props.onAction).toHaveBeenLastCalledWith('archive');
});

// Two lists in More with the same five values: a pick from the second list's picker calls
// the second action. The keys walk More's list, then the picker.
it('keeps two lists that share their values apart in More', async () => {
  const props = handlers();
  laidOut(() => 200);
  const levels = ['1', '2', '3', '4', '5'].map(value => ({ label: `Level ${value}`, value }));
  render(<SelectionBar count={2} actions={[{ id: 'priority', label: 'Priority', items: levels }, { id: 'risk', label: 'Risk', items: levels }]} {...props} />);
  screen.getByRole('button', { name: 'More' }).focus();
  await userEvent.keyboard('{ArrowDown}');
  expect(screen.getByRole('menuitem', { name: 'Priority' })).toHaveFocus();
  await userEvent.keyboard('{ArrowDown}{Enter}');
  expect(screen.getByRole('menuitem', { name: 'Level 1' })).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  expect(props.onAction).toHaveBeenCalledExactlyOnceWith('risk', '1');
  expect(screen.getByRole('button', { name: 'More' })).toHaveFocus();
});

// jsdom runs no transition, so the exit is the kit's timer. A browser measures the motion.
it('shows a bar that comes with the page at once, and keeps the last count while it goes', async () => {
  const props = handlers();
  const { rerender } = render(<SelectionBar count={2} actions={actions} {...props} />);
  const bar = screen.getByRole('region');
  expect(bar).toHaveClass('is-shown');
  rerender(<SelectionBar count={0} actions={actions} {...props} />);
  expect(bar).not.toHaveClass('is-shown');
  expect(bar).toHaveTextContent('2 selected');
  expect(bar.parentElement).toHaveAttribute('inert');
  await waitFor(() => expect(bar).not.toBeInTheDocument());
});

// A room of 400 holds every action, and a room of 250 sends Archive into More.
it('keeps the focus on the bar when an action moves into More and out again', async () => {
  let width = 400;
  const fit = laidOut(() => width);
  render(<SelectionBar count={2} actions={actions} {...handlers()} />);
  screen.getByRole('button', { name: 'Archive' }).focus();
  width = 250;
  fit();
  expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull();
  expect(screen.getByRole('button', { name: 'More' })).toHaveFocus();
  width = 400;
  fit();
  expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Archive' })).toHaveFocus();
});

// A room of 250 puts Archive and Owner into More. When More goes, a disabled action that
// came out of it cannot take the focus, so the next enabled one does, or else Clear.
it('gives the focus from More that goes to an enabled control, or else to Clear', () => {
  let width = 250;
  const fit = laidOut(() => width);
  const archive = { id: 'archive', label: 'Archive', disabled: true };
  const { rerender } = render(<SelectionBar count={2} actions={[STATUS, archive, actions[2]]} {...handlers()} />);
  screen.getByRole('button', { name: 'More' }).focus();
  width = 400;
  fit();
  expect(screen.getByRole('button', { name: 'Owner' })).toHaveFocus();
  width = 250;
  rerender(<SelectionBar count={2} actions={[STATUS, archive, { ...actions[2], disabled: true }]} {...handlers()} />);
  fit();
  screen.getByRole('button', { name: 'More' }).focus();
  width = 400;
  fit();
  expect(screen.getByRole('button', { name: 'Clear' })).toHaveFocus();
});

// The sheet, read as text: the bar's inks sit on its parts, never on the bar or the room,
// so a list opened from it keeps the page ink. A browser measures the paint itself.
it('keeps the inverse ink off the bar box, so its lists keep the page theme', () => {
  const css = read('./SelectionBar.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const boxes = rules.filter(([, selector]) => splitSelectorList(selector).some((part: string) => /^\s*\.ui-selection-(bar|room)\s*$/.test(part)));
  expect(boxes.length).toBeGreaterThan(2);
  for (const [, , body] of boxes) expect(body).not.toMatch(/(^|;|\s)color\s*:/);
});

// The sheet, read as text. The bar's corner is the pill's corner and the gap, so the curves
// share a centre. The gap is the same at the side and the top, and the parts stand at the top,
// so a wrapped count keeps the gaps. The words keep their side padding on each line, and Clear
// takes the pill's corner, because it stands in the corner with no inset. The pill's edge is
// drawn inside it, so the pill is as tall as the control at the other end. The browser half,
// stories/selection-bar.test.js, measures the gaps and the corners. rev_972adb4864fb/d80, d81
it('gives the bar, the pill and Clear corners that share a centre', () => {
  const css = read('./SelectionBar.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const rule = (name: string) => rules.filter(([, selector]) => selector.trim() === name).map(([, , body]) => body).join(';');
  const bar = rule('.ui-selection-bar');
  expect(bar).toMatch(/align-items:\s*flex-start;/);
  expect(bar).toMatch(/padding:\s*var\(--space-3\);/);
  expect(bar).toMatch(/border:\s*1px solid var\(--inverse-frame\);/);
  expect(bar).toMatch(/border-radius:\s*calc\(var\(--ui-selection-corner, calc\(var\(--btn-height-sm\) \/ 2\)\) \+ var\(--space-3\) \+ 1px\);/);
  const pill = rule('.ui-selection-bar__count');
  expect(pill).toMatch(/outline:\s*1px solid var\(--inverse-edge\);\s*outline-offset:\s*-1px;/);
  expect(pill).not.toMatch(/(^|;|\s)(border(-width)?|padding(-left)?|gap)\s*:/);
  expect(pill).toMatch(/min-width:\s*min-content;/);
  expect(pill).toMatch(/border-radius:\s*var\(--ui-selection-corner, calc\(var\(--btn-height-sm\) \/ 2\)\);/);
  expect(rule('.ui-selection-bar__tally')).toMatch(/padding:\s*max\(0px, calc\(var\(--ui-selection-corner, calc\(var\(--btn-height-sm\) \/ 2\)\) - 0\.5lh\)\) var\(--space-2\);/);
  const clear = rule('.ui-selection-bar .ui-selection-bar__count > .ui-selection-bar__control');
  expect(clear).toMatch(/border-radius:\s*var\(--ui-selection-corner, calc\(var\(--btn-height-sm\) \/ 2\)\);/);
  // Clear's ground stands inside a clear band, so it keeps an even gap to the pill's edge and
  // a corner that is the pill's corner less the band. The band and the padding are the other
  // controls' edge and padding, so Clear keeps their height. A press does not move it, and the
  // hover sets the colour only, so the ground keeps its clip. #911
  expect(clear).toMatch(/border-width:\s*var\(--space-1\);/);
  expect(clear).toMatch(/background-clip:\s*padding-box;/);
  expect(clear).toMatch(/padding:\s*3px var\(--space-2\);/);
  expect(rule('.ui-selection-bar .ui-selection-bar__count > .ui-selection-bar__control:active')).toMatch(/transform:\s*none;/);
  const hover = rule('.ui-selection-bar .ui-selection-bar__control:enabled:hover,\n.ui-selection-bar .ui-selection-bar__control:enabled:active,\n.ui-selection-bar .ui-dropdown.open > .ui-selection-bar__control');
  expect(hover).toMatch(/background-color:\s*var\(--inverse-hover\);/);
  expect(hover).not.toMatch(/(^|;|\s)background:/);
});

// jsdom lays nothing out, so Clear's height is given. The pill's corner is half of it: 16px
// at normal text, and 22.6px when 200% text makes Clear 45.19px. A narrow room does not change
// it, and a bar first drawn at 200% text has the corner of a bar that grew. A bar with no
// layout keeps the sheet's value. Limits: the heights are given, and the browser half
// measures the heights a font gives.
it('takes the pill corner from the height of Clear, and not from the room', () => {
  let tall = 32;
  let room = 400;
  const fit = laidOut(() => room);
  const sized = vi.mocked(HTMLElement.prototype.getBoundingClientRect);
  const widths = sized.getMockImplementation()!;
  sized.mockImplementation(function (this: HTMLElement) {
    const box = widths.call(this);
    return this.matches('.ui-selection-bar > .ui-selection-bar__count > .ui-selection-bar__control') ? { ...box, height: tall } : box;
  });
  const corner = () => screen.getByRole('region').style.getPropertyValue('--ui-selection-corner');
  const grown = render(<SelectionBar count={2} actions={actions} {...handlers()} />);
  expect(corner()).toBe('16px');
  tall = 45.19;
  fit();
  expect(corner()).toBe('22.6px');
  room = 200;
  fit();
  expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument();
  expect(corner()).toBe('22.6px');
  grown.unmount();
  render(<SelectionBar count={2} actions={actions} {...handlers()} />);
  expect(corner()).toBe('22.6px');
});

it('keeps the sheet corner on a bar with no layout', () => {
  render(<SelectionBar count={2} actions={actions} {...handlers()} />);
  expect(screen.getByRole('region').style.getPropertyValue('--ui-selection-corner')).toBe('');
});
