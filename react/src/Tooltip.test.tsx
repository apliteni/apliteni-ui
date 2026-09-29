// Geometry is supplied explicitly: JSDOM does not lay out the tooltip or paint focus.
import { cleanup, fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { Tooltip, TooltipHost } from './Tooltip';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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
  fireEvent.mouseEnter(trigger);
  expect(tip).toHaveClass('is-open');
  fireEvent.mouseLeave(trigger);
  expect(tip).not.toHaveClass('is-open');
});

it('opens on keyboard focus, dismisses with Escape without moving focus, then reopens', async () => {
  const user = userEvent.setup();
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

it('dismisses a hover-only tooltip with Escape', () => {
  const { trigger, tip } = mount();
  fireEvent.mouseEnter(trigger);
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
  fireEvent.mouseEnter(trigger);
  expect(tip.classList.contains('is-below')).toBe(below);
  expect(tip.style.getPropertyValue('--ui-tip-y')).toBe(`${below ? top + 20 : top}px`);
});

it('repositions on scroll and resize while open', () => {
  const { trigger, tip } = mount();
  geometry(trigger, tip, 100);
  fireEvent.mouseEnter(trigger);
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
  fireEvent.mouseEnter(trigger);
  expect(tip).toHaveClass('is-below');
});

it('has no axe violations when open (colour and layout require a browser)', async () => {
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

function chart(props: Partial<React.ComponentProps<typeof TooltipHost>> = {}) {
  const view = render(<TooltipHost {...props}>
    <svg aria-label="Demo revenue" role="img">
      <g tabIndex={0} data-tip-label="March" data-tip-value="€48,210" data-tip-detail="+4.2% on February" data-testid="march">
        <rect data-tip-anchor="" data-testid="anchor" />
      </g>
      <g tabIndex={0} data-tip-label="April" data-tip-value="€50,000" data-testid="april"><rect /></g>
    </svg>
  </TooltipHost>);
  const host = view.container.firstElementChild as HTMLDivElement;
  return { ...view, host, tip: host.querySelector<HTMLElement>('.ui-tip')!, first: view.getByTestId('march'), second: view.getByTestId('april'), anchor: view.getByTestId('anchor') };
}

it('moves one readout across chart targets and clears absent content', () => {
  const { first, second, tip, host } = chart();
  fireEvent.mouseOver(first);
  expect(tip).toHaveTextContent('March€48,210+4.2% on February');
  expect(first).toHaveAttribute('aria-describedby', tip.id);
  fireEvent.mouseOver(second);
  expect(tip).toHaveTextContent('April€50,000');
  expect(tip.querySelector('.ui-tip__detail')).toHaveAttribute('hidden');
  expect(first).not.toHaveAttribute('aria-describedby');
  expect(second).toHaveAttribute('aria-describedby', tip.id);
  expect(host.querySelectorAll('.ui-tip')).toHaveLength(1);
  fireEvent.mouseLeave(host);
  expect(tip).not.toHaveClass('is-open');
  expect(second).not.toHaveAttribute('aria-describedby');
});

it('anchors to a nested chart mark instead of its larger hit area', () => {
  const { anchor, first, tip } = chart();
  geometry(anchor as unknown as HTMLElement, tip, 100);
  fireEvent.mouseOver(first);
  expect(tip.style.getPropertyValue('--ui-tip-x')).toBe('130px');
  expect(tip.style.getPropertyValue('--ui-tip-y')).toBe('100px');
});

it('respects bottom placement and flips up near the viewport bottom', () => {
  const { anchor, first, tip } = chart({ placement: 'bottom' });
  geometry(anchor as unknown as HTMLElement, tip, 100);
  fireEvent.mouseOver(first);
  expect(tip).toHaveClass('is-below');
  expect(tip.style.getPropertyValue('--ui-tip-y')).toBe('120px');
  vi.mocked(anchor.getBoundingClientRect).mockReturnValue({ top: 580, bottom: 600, left: 100, width: 60 } as DOMRect);
  fireEvent.resize(window);
  expect(tip).not.toHaveClass('is-below');
});

it('retains existing descriptions and removes only its own on unmount', () => {
  const { first, second, tip, unmount } = chart();
  first.setAttribute('aria-describedby', 'existing');
  fireEvent.focus(first);
  expect(first).toHaveAttribute('aria-describedby', 'existing');
  fireEvent.focus(second);
  expect(second).toHaveAttribute('aria-describedby', tip.id);
  unmount();
  expect(first).toHaveAttribute('aria-describedby', 'existing');
  expect(second).not.toHaveAttribute('aria-describedby');
});

it('keeps Escape-dismissed chart marks closed until leaving or choosing another', () => {
  const { first, second, tip, host } = chart();
  fireEvent.mouseOver(first);
  fireEvent.keyDown(document, { key: 'Escape' });
  fireEvent.mouseOver(first);
  expect(tip).not.toHaveClass('is-open');
  fireEvent.mouseOver(second);
  expect(tip).toHaveClass('is-open');
  fireEvent.mouseOver(first);
  expect(tip).toHaveTextContent('March');
  fireEvent.mouseLeave(host);
  fireEvent.mouseOver(first);
  expect(tip).toHaveClass('is-open');
});

it('supports keyboard arrival and Escape without changing chart focus', async () => {
  const user = userEvent.setup();
  const { first, second, tip } = chart();
  await user.tab();
  expect(first).toHaveFocus();
  expect(tip).toHaveTextContent('March');
  await user.keyboard('{Escape}');
  expect(first).toHaveFocus();
  expect(tip).not.toHaveClass('is-open');
  await user.tab();
  expect(second).toHaveFocus();
  expect(tip).toHaveTextContent('April');
});

it('toggles touch targets and dismisses on an outside tap', () => {
  const { first, second, tip } = chart();
  const tap = (target: Element) => { fireEvent.touchStart(target); fireEvent.touchEnd(target); fireEvent.click(target); };
  tap(first);
  expect(tip).toHaveClass('is-open');
  tap(second);
  expect(tip).toHaveTextContent('April');
  tap(second);
  expect(tip).not.toHaveClass('is-open');
  tap(second);
  expect(tip).toHaveClass('is-open');
  tap(document.body);
  expect(tip).not.toHaveClass('is-open');
});

it('spends the opening tap on the readout but passes it to document dismissal listeners', () => {
  const onClick = vi.fn();
  const onDocument = vi.fn();
  const view = render(<TooltipHost><button data-tip-value="42" onClick={onClick}>Value</button></TooltipHost>);
  const target = view.getByRole('button');
  document.addEventListener('click', onDocument);
  fireEvent.touchStart(target); fireEvent.touchEnd(target); fireEvent.click(target);
  expect(onClick).not.toHaveBeenCalled();
  expect(onDocument).toHaveBeenCalledTimes(1);
  fireEvent.touchStart(target); fireEvent.touchEnd(target); fireEvent.click(target);
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onDocument).toHaveBeenCalledTimes(2);
  document.removeEventListener('click', onDocument);
});

it('isolates nested hosts and does not add chart tab stops', () => {
  const view = render(<TooltipHost><TooltipHost><span data-tip-value="42">Mark</span></TooltipHost></TooltipHost>);
  const target = view.getByText('Mark');
  fireEvent.mouseOver(target);
  expect(view.container.querySelectorAll('.ui-tip.is-open')).toHaveLength(1);
  expect(target).not.toHaveAttribute('tabindex');
});

it('has no axe violations for a structured chart readout', async () => {
  const { first, container } = chart();
  fireEvent.focus(first);
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations).toEqual([]);
});

function pointer(target: Element, type: string, kind: string) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'pointerType', { value: kind });
  fireEvent(target, event);
}

it('supports pen taps, then mouse hover and keyboard focus on the same device', () => {
  const { first, second, tip } = chart();
  pointer(first, 'pointerover', 'pen');
  fireEvent.mouseOver(first);
  expect(tip).not.toHaveClass('is-open');
  pointer(first, 'pointerdown', 'pen');
  fireEvent.focus(first);
  expect(tip).not.toHaveClass('is-open');
  fireEvent.click(first);
  expect(tip).toHaveClass('is-open');
  pointer(first, 'pointerdown', 'pen'); fireEvent.click(first);
  expect(tip).not.toHaveClass('is-open');
  pointer(second, 'pointerover', 'mouse');
  expect(tip).toHaveTextContent('April');
  fireEvent.keyDown(document, { key: 'Tab' });
  fireEvent.focus(first);
  expect(tip).toHaveTextContent('March');
});

it('supports focus arriving without a tap after a touch interaction', () => {
  const { first, second, tip } = chart();
  fireEvent.touchStart(first); fireEvent.touchEnd(first); fireEvent.click(first);
  fireEvent.focus(second);
  expect(tip).toHaveTextContent('April');
});

it('updates a visible mark after React changes its content and closes when it is removed', () => {
  const view = render(<TooltipHost><span data-tip-value="42">Mark</span></TooltipHost>);
  fireEvent.mouseOver(view.getByText('Mark'));
  view.rerender(<TooltipHost><span data-tip-value="57">Mark</span></TooltipHost>);
  expect(view.getByRole('tooltip')).toHaveTextContent('57');
  view.rerender(<TooltipHost><p>No marks</p></TooltipHost>);
  expect(view.container.querySelector('.ui-tip')).not.toHaveClass('is-open');
});
