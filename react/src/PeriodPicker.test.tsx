import { render, screen, fireEvent, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Default, Loading } from './PeriodPicker.stories';

// Checks what the period drives: the figures, the ledger, the live region and
// the URL. Browser captures cover width, wrapping and focus rings.
it('changes the report, its comparison and the URL with the period', () => {
  window.history.replaceState(null, '', '?period=2026-08');
  render(Default.render());
  expect(screen.getByRole('status')).toHaveTextContent('Complete');
  const period = screen.getByRole('toolbar', { name: 'Period' });

  // The pill reads "Apr"; the accessible name is the month, and says it once.
  const april = within(period).getByRole('button', { name: 'April 2026' });
  expect(april).toHaveTextContent('Apr');
  fireEvent.click(april);
  expect(screen.getByRole('status')).toHaveTextContent('Closed');
  expect(screen.getByRole('heading', { level: 2, name: 'Ledger' })).toBeInTheDocument();
  // The first month has nothing to compare against, and says so rather than 0 €.
  expect(document.querySelector('[id^=period-basis]')).toHaveTextContent('No earlier month to compare.');
  expect(screen.getAllByRole('columnheader').map(cell => cell.querySelector('.ui-focusable')?.textContent ?? cell.textContent)).toEqual(['Category', 'Apr 2026', 'Change', 'Previous']);
  const missing = screen.getAllByText('—');
  expect(missing).toHaveLength(8);
  expect(new Set(missing.map(cell => cell.getAttribute('aria-label'))).size).toBe(1);
  expect(screen.getByText('30,000 €')).toBeInTheDocument();
  expect(window.location.search).toContain('period=2026-04');

  fireEvent.keyDown(april, { key: 'End' });
  expect(screen.getByRole('status')).toHaveTextContent('Open');
  expect(screen.getByText('41,000 €')).toBeInTheDocument();
  // Negative money uses U+2212, not the hyphen the plain formatter emits.
  expect(screen.getByText('−17,000')).toBeInTheDocument();
  expect(document.querySelector('[id^=period-basis]')).toHaveTextContent('Compared with August 2026');
  expect(window.location.search).toContain('period=2026-09');
});

it('offers no second route to a month already on screen, and speaks once', () => {
  window.history.replaceState(null, '', '?period=2026-09');
  render(Default.render());
  expect(screen.queryByRole('button', { name: /^Previous/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /^Next/ })).toBeNull();
  // The loaded page has one live region: the period line.
  expect(screen.getAllByRole('status')).toHaveLength(1);
});

it('announces both pending regions while the period is fetched', () => {
  window.history.replaceState(null, '', '?period=2026-09');
  render(Loading.render());
  const busy = screen.getAllByRole('status').filter(node => node.getAttribute('aria-busy') === 'true');
  // Two regions plus the period line; the figures and the rows land separately.
  expect(busy).toHaveLength(2);
  expect(screen.getAllByRole('status')).toHaveLength(3);
  expect(busy[0]).toHaveTextContent('Loading September cash flow…');
  expect(busy[1]).toHaveTextContent('Loading September ledger…');
  // The one useful thing to do while waiting stays live.
  expect(within(screen.getByRole('toolbar', { name: 'Period' })).getByRole('button', { name: 'April 2026' })).toBeEnabled();
});

// The palette opens another monthly report, rather than linking to this page.
it('opens a different report from the command palette', () => {
  window.history.replaceState(null, '', '?period=2026-09');
  render(Default.render());
  fireEvent.click(screen.getByRole('button', { name: /Search or run a command/ }));
  expect(screen.queryByRole('option', { name: 'September 2026 report' })).toBeNull();
  fireEvent.click(screen.getByRole('option', { name: 'April 2026 report' }));
  expect(screen.getByRole('heading', { name: 'Ledger' })).toBeInTheDocument();
  expect(window.location.search).toContain('period=2026-04');
});

it('shares one comparison across stat and ledger changes without repeating the month heading', () => {
  window.history.replaceState(null, '', '?period=2026-09');
  const { container } = render(Default.render());
  expect(screen.queryByText('September 2026')).toBeNull();
  expect(document.querySelectorAll('[id^=period-basis]')).toHaveLength(1);
  const changes = [...container.querySelectorAll('.ui-stat__delta, .ui-delta')];
  expect(changes).toHaveLength(7);
  for (const change of changes) {
    expect(document.getElementById(change.getAttribute('aria-describedby')!)).toHaveTextContent('Compared with August 2026');
  }
});

it('puts the ledger heading outside its card and keeps comparison copy off the reading surface', () => {
  window.history.replaceState(null, '', '?period=2026-09');
  render(Default.render());
  const heading = screen.getByRole('heading', { name: 'Ledger' });
  expect(heading.closest('.ui-card')).toBeNull();
  expect(heading.nextElementSibling).toHaveClass('ui-card');
  expect(document.querySelector('[id^=period-basis]')).toHaveClass('ui-sr');
});

// Component events verify wiring; real browser touch captures verify placement.
it('explains the Change header and all summary deltas on hover, focus and tap', () => {
  window.history.replaceState(null, '', '?period=2026-09');
  const { container } = render(Default.render());
  const triggers = [...container.querySelectorAll<HTMLElement>('.ui-tip-host > .ui-focusable')];
  expect(triggers).toHaveLength(4);
  for (const trigger of triggers) {
    const tip = document.getElementById(trigger.getAttribute('aria-describedby')!)!;
    expect(tip).toHaveTextContent('Compared with August 2026');
    fireEvent.mouseEnter(trigger);
    expect(tip).toHaveClass('is-open');
    fireEvent.mouseLeave(trigger);
    fireEvent.focus(trigger);
    expect(tip).toHaveClass('is-open');
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(tip).not.toHaveClass('is-open');
    fireEvent.touchStart(trigger);
    fireEvent.touchEnd(trigger);
    expect(tip).toHaveClass('is-open');
    fireEvent.touchStart(trigger);
    fireEvent.touchEnd(trigger);
    expect(tip).not.toHaveClass('is-open');
  }
});
