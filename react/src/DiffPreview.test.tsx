import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import meta from './DiffPreview.stories';

const scroll = vi.fn();
const originalScroll = Element.prototype.scrollIntoView;
beforeEach(() => { Element.prototype.scrollIntoView = scroll; scroll.mockClear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); Element.prototype.scrollIntoView = originalScroll; });
const mount = (empty = false) => render(meta.render!({ change: 'category', empty }, {} as never));
const bandFigures = (container: HTMLElement) => [...container.querySelectorAll('.ui-stats--band .ui-stat')]
  .map(stat => [
    stat.querySelector('.ui-stat__label')?.textContent,
    stat.querySelector('.ui-stat__value')?.textContent,
    stat.querySelector('.ui-stat__change')?.textContent,
  ]);

// JSDOM checks focus and the scroll request, not occlusion. The phone keyboard
// capture measures Undo and the fixed navigation in the real browser.
it('keeps focus on Undo and scrolls the changed action into view', () => {
  vi.useFakeTimers();
  mount();
  const action = screen.getByRole('button', { name: 'Apply changes' });
  action.focus();
  fireEvent.click(action);
  act(() => { vi.advanceTimersByTime(700); });
  expect(screen.getByRole('button', { name: 'Undo changes' })).toHaveFocus();
  expect(scroll).toHaveBeenCalledWith({ block: 'nearest', behavior: 'instant' });
  fireEvent.click(action);
  expect(screen.getByRole('button', { name: 'Apply changes' })).toHaveFocus();
  expect(screen.getByRole('heading', { name: 'Proposed changes' })).toBeInTheDocument();
});

it('names the comparison in the column header and behind each signed amount', () => {
  const { container } = mount();
  expect(screen.getByRole('columnheader', { name: 'Change to Software' })).toBeInTheDocument();
  const deltas = [...container.querySelectorAll('.ui-delta')];
  expect(deltas).toHaveLength(4);
  for (const delta of deltas) {
    const basis = document.getElementById(delta.getAttribute('aria-describedby')!);
    expect(basis).toHaveTextContent('Each change is measured against the Software total.');
  }
});

// The count a reader needs is the table itself, so no sentence may recite it.
it('carries the change without a sentence built on a live row count', () => {
  const { container } = mount();
  expect(container.textContent).not.toMatch(/\d+\s+rows?\b/);
  expect(container.textContent).not.toMatch(/would move to/);
});

// Before Apply the figure is what is booked now and the change is what Apply moves;
// after Apply the figure has moved and the same change reads as history.
it('states each booked month and the change applying makes, without a tone', () => {
  vi.useFakeTimers();
  const { container } = mount();
  expect(container.querySelector('.ui-stats__basis'))
    .toHaveTextContent('These costs by booked month, and what applying would change.');
  expect(bandFigures(container)).toEqual([
    ['September 2026', '390.00 €', '−390.00 €'],
    ['October 2026', '120.00 €', '+390.00 €'],
  ]);
  // A reroute moves the same money, so neither month is scored good or bad news.
  expect(container.querySelector('.ui-stat--good, .ui-stat--bad')).toBeNull();
  for (const delta of container.querySelectorAll('.ui-stats--band .ui-stat__delta')) {
    const basis = document.getElementById(delta.getAttribute('aria-describedby')!);
    expect(basis).toHaveClass('ui-stats__basis');
  }
  fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
  act(() => { vi.advanceTimersByTime(700); });
  expect(container.querySelector('.ui-stats__basis'))
    .toHaveTextContent('These costs by booked month, and what applying changed.');
  expect(bandFigures(container)).toEqual([
    ['September 2026', '0.00 €', '−390.00 €'],
    ['October 2026', '510.00 €', '+390.00 €'],
  ]);
});

// Each block names itself above its own box, as the period showcase does.
it('puts the block title outside the card it names', () => {
  const { container } = mount();
  const title = screen.getByRole('heading', { name: 'Proposed changes' });
  expect(title.closest('.ui-card')).toBeNull();
  const section = container.querySelector('section')!;
  expect(section).toHaveAttribute('aria-labelledby', title.id);
  const card = section.querySelector('.ui-card')!;
  expect(card.querySelector('.ui-card__title')).toBeNull();
  expect(title.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

// Animation timing and reduced motion are checked in Chromium, not JSDOM.
it('emphasizes recovery and gives the inserted content a kit entrance', () => {
  const { container } = mount(true);
  expect(container.querySelector('.ui-stack')).not.toHaveClass('m-fade-in');
  const recovery = screen.getByRole('button', { name: 'Load sample changes' });
  expect(recovery).toHaveClass('ui-btn--primary');
  fireEvent.click(recovery);
  expect(screen.getByRole('region', { name: 'Cost changes' })).toHaveFocus();
  expect(container.querySelector('.ui-stack')).toHaveClass('m-fade-in');
});

// The kit's DataTable owns the scroll region and its own overflow tests; this
// only proves the showcase adds no controls of its own beside it, and that one
// section leaves the phone's bottom bar unrendered.
it('scrolls its columns in the kit region, with no pager and no one-row bottom bar', () => {
  const { container } = mount();
  const region = screen.getByRole('region', { name: 'Cost changes' });
  for (const name of ['Previous columns', 'More columns']) {
    expect(screen.queryByRole('button', { name })).toBeNull();
  }
  expect(screen.queryByRole('group', { name: 'Cost changes columns' })).toBeNull();
  expect(container.querySelector('.ui-react-app__bottom')).toBeNull();
  expect(screen.queryByRole('navigation', { name: 'Sections on mobile' })).toBeNull();
  expect(region.closest('.ui-card')).not.toBeNull();
  expect(container.querySelectorAll('thead th')).toHaveLength(5);
  expect(container.querySelector('thead [aria-hidden]')).toBeNull();
});
