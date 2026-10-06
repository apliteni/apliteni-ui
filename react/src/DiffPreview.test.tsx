import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import meta from './DiffPreview.stories';

const scroll = vi.fn();
const originalScroll = Element.prototype.scrollIntoView;
beforeEach(() => { Element.prototype.scrollIntoView = scroll; scroll.mockClear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); Element.prototype.scrollIntoView = originalScroll; });
const mount = (empty = false) => render(meta.render!({ change: 'category', empty }, {} as never));

// JSDOM checks focus and the scroll request, not occlusion. The phone keyboard
// capture measures Undo and the fixed navigation in the real browser.
it('keeps focus on Undo and scrolls the changed action into view', () => {
  vi.useFakeTimers();
  mount();
  const action = screen.getByRole('button', { name: 'Apply' });
  action.focus();
  fireEvent.click(action);
  act(() => { vi.advanceTimersByTime(700); });
  expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
  expect(scroll).toHaveBeenCalledWith({ block: 'nearest', behavior: 'instant' });
  fireEvent.click(action);
  expect(screen.getByRole('button', { name: 'Apply' })).toHaveFocus();
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

// Applying has one effect — September is closed, so its rows are rerouted — and the
// callout under the table states it. A figure block above the table would have to
// restate the table's own totals under a caption, so there is none, in either state.
it('states the one effect below the table and sets no figures above it', () => {
  vi.useFakeTimers();
  const { container } = mount();
  expect(container.querySelector('.ui-stats')).toBeNull();
  const says = (text: string) => {
    const callout = [...container.querySelectorAll('.ui-callout')]
      .find(node => node.textContent?.includes(text));
    expect(callout, text).toBeDefined();
    // The table is what the reader reads; the effect follows it.
    expect(container.querySelector('table')!.compareDocumentPosition(callout!)
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  };
  says('September is closed. Its 390.00 € will be booked in October.');
  // The rerouted total is stated once. A second place for it is the block this removed.
  expect(container.textContent!.match(/390\.00 €/g)).toHaveLength(1);

  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  act(() => { vi.advanceTimersByTime(700); });
  expect(container.querySelector('.ui-stats')).toBeNull();
  says('September is closed. Its 390.00 € was booked in October.');
  // What applying did is in the table: every row is now booked in the open month.
  expect([...container.querySelectorAll('tbody tr')]
    .map(row => row.querySelectorAll('td')[4].textContent)).toEqual(Array(4).fill('2026-10'));
  expect(screen.getByRole('heading', { name: 'Changes applied' })).toBeInTheDocument();
  expect(screen.queryByText('Move these costs to Software.')).toBeNull();
});

// The block's name is the card's own title, so the title and the table's first
// column share the card's text edge. JSDOM supplies no layout, so the edge itself
// is measured in Chromium; what this holds is that the title is the kit's card
// title and that the showcase hand-rolls neither the heading nor its spacing.
it('gives the card its own title instead of standing one on the page ground', () => {
  const { container } = mount();
  const title = screen.getByRole('heading', { name: 'Proposed changes' });
  const card = container.querySelector('.ui-card')!;
  expect(title.closest('.ui-card')).toBe(card);
  expect(title).toHaveClass('ui-card__title');
  expect(title.tagName).toBe('H2');
  // The kit owns the title's rank and its step to the table; no inline style
  // re-states either, and no section wrapper is left behind to carry a heading.
  expect(title.getAttribute('style')).toBeNull();
  expect(container.querySelector('section')).toBeNull();
});

// Animation timing and reduced motion are checked in Chromium, not JSDOM.
it('emphasizes recovery and gives the inserted content a kit entrance', () => {
  const { container } = mount(true);
  expect(container.querySelector('.ui-stack')).not.toHaveClass('m-fade-in');
  expect(screen.queryByRole('heading', { name: 'Proposed changes' })).toBeNull();
  expect(screen.queryByText('Move these costs to Software.')).toBeNull();
  const recovery = screen.getByRole('button', { name: 'Load samples' });
  expect(recovery).toHaveClass('ui-btn--primary');
  fireEvent.click(recovery);
  expect(screen.getByRole('region', { name: 'Cost changes' })).toHaveFocus();
  expect(container.querySelector('.ui-stack')).toHaveClass('m-fade-in');
});

// The kit's DataTable owns the scroll region and its own overflow tests, and the
// kit's AppShell owns the one-section rule; this only proves the showcase adds no
// controls of its own beside either.
it('scrolls its columns in the kit region, with no pager and no navigation to one place', () => {
  const { container } = mount();
  const region = screen.getByRole('region', { name: 'Cost changes' });
  for (const name of ['Previous columns', 'More columns']) {
    expect(screen.queryByRole('button', { name })).toBeNull();
  }
  expect(screen.queryByRole('group', { name: 'Cost changes columns' })).toBeNull();
  for (const name of ['Sections', 'Sections on mobile']) {
    expect(screen.queryByRole('navigation', { name })).toBeNull();
  }
  expect(container.querySelector('.ui-react-app__bottom')).toBeNull();
  expect(region.closest('.ui-card')).not.toBeNull();
  expect(container.querySelectorAll('thead th')).toHaveLength(5);
  expect(container.querySelector('thead [aria-hidden]')).toBeNull();
});
