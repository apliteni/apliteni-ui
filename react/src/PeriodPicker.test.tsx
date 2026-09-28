import { render, screen, fireEvent, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Default } from './PeriodPicker.stories';

// Checks report selection and URL state; browser captures cover width and focus rings.
it('changes the report with the period and disables navigation at both ends', () => {
  window.history.replaceState(null, '', '?period=2026-08');
  render(Default.render());
  expect(screen.getByRole('status')).toHaveTextContent('August 2026');
  const period = screen.getByRole('toolbar', { name: 'Period' });
  const april = within(period).getByRole('button', { name: 'April 2026, Closed' });
  fireEvent.click(april);
  expect(screen.getByRole('button', { name: 'No earlier month' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('April 2026');
  expect(screen.getByText('€30,000')).toBeInTheDocument();
  expect(window.location.search).toContain('period=2026-04');
  fireEvent.keyDown(april, { key: 'End' });
  expect(screen.getByRole('button', { name: 'No later month' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('September 2026');
  expect(screen.getByText('€41,000')).toBeInTheDocument();
  expect(window.location.search).toContain('period=2026-09');
});
