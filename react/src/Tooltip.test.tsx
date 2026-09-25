// Geometry is supplied explicitly: JSDOM does not lay out the tooltip or paint focus.
import { cleanup, fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { Tooltip } from './Tooltip';

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
