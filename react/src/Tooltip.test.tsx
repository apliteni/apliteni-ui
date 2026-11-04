// Geometry is supplied explicitly: JSDOM does not lay out the tooltip or paint focus.
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { Tooltip } from './Tooltip';
import { placeTip } from './tip';

// A fake clock: a hover opens after a delay, and a recent close skips it. Each
// test starts an hour after the last, so no close carries into its skip window.
let run = 0;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(Date.now() + 3_600_000 * ++run);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
function hover(target: Element) {
  fireEvent.mouseEnter(target);
  wait(300);
}
// userEvent and axe wait on real timeouts. Keyboard focus and an open readout need no clock.
function typist() {
  vi.useRealTimers();
  return userEvent.setup();
}

function mount() {
  const view = render(<Tooltip text="Updated daily">Balance</Tooltip>);
  const trigger = view.getByText('Balance');
  const tip = view.getByRole('tooltip');
  return { ...view, trigger, tip };
}

it('uses the kit classes and connects a focusable trigger to unique descriptions', () => {
  const { trigger, tip } = mount();
  expect(trigger).toHaveClass('ui-focusable');
  expect(trigger).toHaveAttribute('tabindex', '0');
  expect(trigger).toHaveAttribute('aria-describedby', tip.id);
  expect(tip).toHaveClass('ui-tip');
  expect(tip).not.toHaveClass('is-open');
  expect(tip.firstElementChild).toHaveClass('ui-tip__label');
  const second = render(<Tooltip text="Another description">Another trigger</Tooltip>);
  expect(second.getByText('Another trigger').getAttribute('aria-describedby')).not.toBe(tip.id);
});

it('opens on hover and closes on mouse leave', () => {
  const { trigger, tip } = mount();
  hover(trigger);
  expect(tip).toHaveClass('is-open');
  fireEvent.mouseLeave(trigger);
  expect(tip).not.toHaveClass('is-open');
});

it('opens on keyboard focus, dismisses with Escape without moving focus, then reopens', async () => {
  const user = typist();
  const { trigger, tip } = mount();
  await user.tab();
  expect(trigger).toHaveFocus();
  expect(tip).toHaveClass('is-open');
  await user.keyboard('{Escape}');
  expect(tip).not.toHaveClass('is-open');
  expect(trigger).toHaveFocus();
  await user.tab();
  await user.tab({ shift: true });
  expect(tip).toHaveClass('is-open');
  await user.tab();
  expect(tip).not.toHaveClass('is-open');
});

it('waits before a hover opens it, and skips the wait just after a readout closed', () => {
  const view = render(<><Tooltip text="Edit">A</Tooltip><Tooltip text="Remove">B</Tooltip></>);
  const [first, second] = view.getAllByRole('tooltip');
  fireEvent.mouseEnter(view.getByText('A'));
  wait(299);
  expect(first).not.toHaveClass('is-open');
  wait(1);
  expect(first).toHaveClass('is-open');
  fireEvent.mouseLeave(view.getByText('A'));
  expect(first).not.toHaveClass('is-open');
  fireEvent.mouseEnter(view.getByText('B'));
  expect(second).toHaveClass('is-open');
  fireEvent.mouseLeave(view.getByText('B'));
  wait(300);
  fireEvent.mouseEnter(view.getByText('A'));
  expect(first).not.toHaveClass('is-open');
});

it('opens nothing for a pointer that leaves before the wait ends', () => {
  const { trigger, tip } = mount();
  fireEvent.mouseEnter(trigger);
  wait(200);
  expect(tip).not.toHaveClass('is-open');
  fireEvent.mouseLeave(trigger);
  wait(500);
  expect(tip).not.toHaveClass('is-open');
});

it('leaves a mouse press that focuses the mark to the hover wait', () => {
  const { trigger, tip } = mount();
  pointer(trigger, 'pointerdown', 'mouse');
  fireEvent.focus(trigger);
  expect(tip).not.toHaveClass('is-open');
});

it('names no tab stop and no description for a control that names itself', async () => {
  const user = typist();
  const view = render(<Tooltip text="Edit" control><button type="button" aria-label="Edit Mara">E</button></Tooltip>);
  const button = view.getByRole('button', { name: 'Edit Mara' });
  const tip = view.getByRole('tooltip', { hidden: true });
  expect(view.container.querySelector('[tabindex]')).toBeNull();
  expect(view.container.querySelector('[aria-describedby]')).toBeNull();
  expect(tip).toHaveAttribute('aria-hidden', 'true');
  await user.tab();
  expect(button).toHaveFocus();
  expect(tip).toHaveClass('is-open');
});

it('dismisses a hover-only tooltip with Escape', () => {
  const { trigger, tip } = mount();
  hover(trigger);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(tip).not.toHaveClass('is-open');
});

it('toggles on touch, ignoring the following compatibility mouse and focus events', () => {
  const { trigger, tip } = mount();
  fireEvent.touchStart(trigger);
  fireEvent.touchEnd(trigger);
  fireEvent.mouseEnter(trigger);
  fireEvent.focus(trigger);
  expect(tip).toHaveClass('is-open');
  fireEvent.touchStart(trigger);
  fireEvent.touchEnd(trigger);
  fireEvent.mouseEnter(trigger);
  fireEvent.focus(trigger);
  expect(tip).not.toHaveClass('is-open');
});

function geometry(trigger: HTMLElement, tip: HTMLElement, top: number) {
  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({ top, bottom: top + 20, left: 100, right: 160, width: 60, height: 20 } as DOMRect);
  vi.spyOn(tip, 'offsetHeight', 'get').mockReturnValue(30);
  vi.spyOn(tip, 'offsetWidth', 'get').mockReturnValue(100);
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(800);
  vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(600);
}

it.each([[100, false], [10, true]])('places a trigger at %spx on the available side', (top, below) => {
  const { trigger, tip } = mount();
  geometry(trigger, tip, top);
  hover(trigger);
  expect(tip.classList.contains('is-below')).toBe(below);
  expect(tip.style.getPropertyValue('--ui-tip-y')).toBe(`${below ? top + 20 : top}px`);
});

it('repositions on scroll and resize while open', () => {
  const { trigger, tip } = mount();
  geometry(trigger, tip, 100);
  hover(trigger);
  vi.mocked(trigger.getBoundingClientRect).mockReturnValue({ top: 5, bottom: 25, left: 0, width: 20 } as DOMRect);
  fireEvent.scroll(window);
  expect(tip).toHaveClass('is-below');
  expect(tip.style.getPropertyValue('--ui-tip-shift')).toBe('40px');
  vi.mocked(trigger.getBoundingClientRect).mockReturnValue({ top: 100, bottom: 120, left: 100, width: 60 } as DOMRect);
  fireEvent.resize(window);
  expect(tip).not.toHaveClass('is-below');
});

it('flips inside a clipping ancestor', () => {
  const { trigger, tip } = mount();
  geometry(trigger, tip, 100);
  const host = trigger.parentElement!;
  host.style.overflow = 'hidden';
  vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({ top: 95, bottom: 300, left: 0, right: 500 } as DOMRect);
  hover(trigger);
  expect(tip).toHaveClass('is-below');
});

it('has no axe violations when open (colour and layout require a browser)', async () => {
  vi.useRealTimers();
  const { trigger, container } = mount();
  fireEvent.focus(trigger);
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations).toEqual([]);
});

it('does not treat a scrolling or cancelled touch as a tap', () => {
  const { trigger, tip } = mount();
  fireEvent.touchStart(trigger);
  fireEvent.touchMove(trigger);
  fireEvent.touchEnd(trigger);
  expect(tip).not.toHaveClass('is-open');
  fireEvent.touchStart(trigger);
  fireEvent.touchCancel(trigger);
  fireEvent.touchEnd(trigger);
  expect(tip).not.toHaveClass('is-open');
});

it('renders structured inline content and keeps text as the label shorthand', () => {
  const view = render(<Tooltip text="Fallback" label="March" value="€48,210" detail="+4.2% on February">Revenue</Tooltip>);
  fireEvent.focus(view.getByText('Revenue'));
  expect(view.getByRole('tooltip')).toHaveTextContent('March€48,210+4.2% on February');
  expect(view.queryByText('Fallback')).toBeNull();
});

it('anchors the inline readout to a nested anchor', () => {
  const view = render(<Tooltip value="42"><span data-tip-anchor="">Value</span></Tooltip>);
  const anchor = view.getByText('Value');
  const tip = view.getByRole('tooltip');
  geometry(anchor, tip, 100);
  fireEvent.focus(anchor.parentElement!);
  expect(tip.style.getPropertyValue('--ui-tip-x')).toBe('130px');
  expect(tip.style.getPropertyValue('--ui-tip-y')).toBe('100px');
});

function pointer(target: Element, type: string, kind: string) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'pointerType', { value: kind });
  fireEvent(target, event);
}

it('toggles the inline readout on pen taps after compatibility mouse and focus events', () => {
  const { trigger, tip } = mount();
  const tap = () => {
    pointer(trigger, 'pointerover', 'pen');
    fireEvent.mouseOver(trigger);
    pointer(trigger, 'pointerdown', 'pen');
    fireEvent.focus(trigger);
    pointer(trigger, 'pointerup', 'pen');
    fireEvent.click(trigger);
  };
  tap();
  expect(tip).toHaveClass('is-open');
  tap();
  expect(tip).not.toHaveClass('is-open');
});

// These event sequences check input changes, not native browser event synthesis.
it.each([1, 2])('toggles with a pen after %s touch taps and their compatibility clicks', (touchTaps) => {
  const { trigger, tip } = mount();
  for (let tap = 0; tap < touchTaps; tap++) {
    pointer(trigger, 'pointerover', 'touch');
    pointer(trigger, 'pointerdown', 'touch');
    fireEvent.touchStart(trigger);
    pointer(trigger, 'pointerup', 'touch');
    fireEvent.touchEnd(trigger);
    fireEvent.mouseOver(trigger);
    fireEvent.focus(trigger);
    fireEvent.click(trigger);
    expect(tip.classList.contains('is-open')).toBe(tap % 2 === 0);
  }
  pointer(trigger, 'pointerover', 'pen');
  fireEvent.mouseOver(trigger);
  pointer(trigger, 'pointerdown', 'pen');
  fireEvent.focus(trigger);
  pointer(trigger, 'pointerup', 'pen');
  fireEvent.click(trigger);
  expect(tip.classList.contains('is-open')).toBe(touchTaps === 2);
});

// ---- The readout's own markup and what it costs the page -------------------

it('marks every readout with data-tip, the attribute the vanilla wiring reads', () => {
  const { tip } = mount();
  expect(tip).toHaveAttribute('data-tip');
});

// Five listeners per document and none for a closed readout: the version this
// replaced stood up five per instance, plus a capturing window scroll listener
// that hears every scroller on the page.
const DOC_TYPES = ['pointerdown', 'pointercancel', 'click', 'keydown', 'touchend'];
const typesOf = (spy: { mock: { calls: unknown[][] } }, wanted: string[]) =>
  spy.mock.calls.map((call) => String(call[0])).filter((type) => wanted.includes(type)).sort();

it('wires the document once for every readout and the window only while one is open', () => {
  const onDoc = vi.spyOn(document, 'addEventListener');
  const onWin = vi.spyOn(window, 'addEventListener');
  const offWin = vi.spyOn(window, 'removeEventListener');
  const view = render(<>{[0, 1, 2, 3].map((i) =>
    <Tooltip key={i} value={`€${i}`}>{`mark ${i}`}</Tooltip>)}</>);

  expect(typesOf(onDoc, DOC_TYPES)).toEqual([...DOC_TYPES].sort());
  expect(typesOf(onWin, ['scroll', 'resize'])).toEqual([]);

  const host = view.container.firstElementChild as HTMLElement;
  fireEvent.mouseOver(view.getByText('mark 0'));
  wait(300);
  expect(typesOf(onWin, ['scroll', 'resize'])).toEqual(['resize', 'scroll']);
  fireEvent.mouseLeave(host);
  expect(typesOf(offWin, ['scroll', 'resize'])).toEqual(['resize', 'scroll']);
});

it('drops the document listeners when the last readout unmounts', () => {
  const off = vi.spyOn(document, 'removeEventListener');
  const first = render(<Tooltip text="One">A</Tooltip>);
  const second = render(<Tooltip text="Two">B</Tooltip>);
  first.unmount();
  expect(typesOf(off, DOC_TYPES)).toEqual([]);
  second.unmount();
  expect(typesOf(off, DOC_TYPES)).toEqual([...DOC_TYPES].sort());
});

it('honours a gap of zero instead of falling back to the sheet default', () => {
  const { trigger, tip } = mount();
  // 35px of room above, a 30px readout: it fits with no gap and not with 8px.
  geometry(trigger, tip, 35);
  tip.style.setProperty('--ui-tip-gap', '0px');
  hover(trigger);
  expect(tip).not.toHaveClass('is-below');
});

it('keeps the fallback gap equal to the number the stylesheet declares', async () => {
  const { readFile } = await import('node:fs/promises');
  const read = (rel: string) => readFile(new URL(rel, import.meta.url), 'utf8');
  const sheet = parseFloat(/--ui-tip-gap:\s*([\d.]+)px/.exec(await read('../../src/styles/tooltip.css'))![1]);
  const source = parseFloat(/const TIP_GAP = ([\d.]+)/.exec(await read('./tip.ts'))![1]);
  expect(source, 'TIP_GAP is the fallback for a document without the sheet').toBe(sheet);
});

// JSDOM supplies geometry but does not paint the readout.
it.each([[100, true], [560, false]])('shared placement prefers bottom at %spx and flips when needed', (top, below) => {
  const { trigger, tip } = mount();
  geometry(trigger, tip, top);
  placeTip(trigger.parentElement!, trigger, tip, undefined, 'bottom');
  expect(tip.classList.contains('is-below')).toBe(below);
  expect(tip.style.getPropertyValue('--ui-tip-y')).toBe(`${below ? top + 20 : top}px`);
});
