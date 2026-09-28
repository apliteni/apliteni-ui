import { render, screen, fireEvent, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Default, Loading } from './PeriodPicker.stories';

// Checks what the period drives: the figures, the ledger, the live region and
// the URL. Browser captures cover width, wrapping and focus rings.
it('changes the report, its comparison and the URL with the period', () => {
  window.history.replaceState(null, '', '?period=2026-08');
  render(Default.render());
  expect(screen.getByRole('status')).toHaveTextContent('August 2026');
  const period = screen.getByRole('toolbar', { name: 'Period' });

  // The pill reads "Apr"; the accessible name is the month, and says it once.
  const april = within(period).getByRole('button', { name: 'April 2026' });
  expect(april).toHaveTextContent('Apr');
  fireEvent.click(april);
  expect(screen.getByRole('status')).toHaveTextContent('April 2026');
  expect(screen.getByRole('heading', { level: 2, name: 'April 2026 ledger' })).toBeInTheDocument();
  // The first month has nothing to compare against, and says so rather than 0 €.
  expect(screen.getAllByText(/No earlier month/)).toHaveLength(1);
  expect(screen.getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Category', 'Apr 2026 (EUR)', 'Change', 'Earlier month']);
  const missing = screen.getAllByText('—');
  expect(missing).toHaveLength(8);
  expect(new Set(missing.map(cell => cell.getAttribute('aria-label'))).size).toBe(1);
  expect(screen.getByText('30,000 €')).toBeInTheDocument();
  expect(window.location.search).toContain('period=2026-04');

  fireEvent.keyDown(april, { key: 'End' });
  expect(screen.getByRole('status')).toHaveTextContent('September 2026');
  expect(screen.getByText('41,000 €')).toBeInTheDocument();
  // Negative money uses U+2212, not the hyphen the plain formatter emits.
  expect(screen.getByText('−17,000 €')).toBeInTheDocument();
  expect(screen.getByText('Change against August 2026')).toBeInTheDocument();
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
  expect(busy[0]).toHaveTextContent('Loading September cashflow…');
  expect(busy[1]).toHaveTextContent('Loading the September ledger…');
  // The one useful thing to do while waiting stays live.
  expect(within(screen.getByRole('toolbar', { name: 'Period' })).getByRole('button', { name: 'April 2026' })).toBeEnabled();
});
