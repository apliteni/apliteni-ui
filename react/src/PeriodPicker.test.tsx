// Interaction and semantics in JSDOM; overflow is checked in the browser.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PeriodPicker, type PeriodMonth } from './PeriodPicker';

const months: PeriodMonth[] = [
  { value: '2026-01', label: 'January 2026', shortLabel: 'Jan', state: 'closed' },
  { value: '2026-02', label: 'February 2026', shortLabel: 'Feb', state: 'restated' },
  { value: '2026-03', label: 'March 2026', shortLabel: 'Mar', state: 'complete-not-closed' },
  { value: '2026-04', label: 'April 2026', shortLabel: 'Apr', state: 'incomplete' },
];
afterEach(cleanup);
it('names every state and keeps selection controlled', () => {
  const onChange = vi.fn();
  render(<PeriodPicker months={months} value="2026-01" onChange={onChange} />);
  expect(screen.getByRole('listbox', { name: 'Choose a month' })).toBeInTheDocument();
  for (const name of ['January 2026, Closed', 'February 2026, Restated', 'March 2026, Complete, not closed', 'April 2026, Incomplete']) {
    expect(screen.getByRole('option', { name })).toBeInTheDocument();
  }
  fireEvent.click(screen.getAllByRole('option')[1]);
  expect(onChange).toHaveBeenCalledWith('2026-02');
  expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
});
it('moves focus with arrows and Home/End without wrapping', () => {
  const onChange = vi.fn();
  render(<PeriodPicker months={months} value="2026-01" onChange={onChange} />);
  const options = screen.getAllByRole('option');
  options[0].focus();
  for (const [key, index] of [['ArrowRight', 1], ['End', 3], ['ArrowRight', 3], ['ArrowLeft', 2], ['Home', 0]] as const) {
    fireEvent.keyDown(document.activeElement!, { key });
    expect(options[index]).toHaveFocus();
    expect(options.filter(option => option.tabIndex === 0)).toEqual([options[index]]);
  }
  expect(onChange).toHaveBeenCalledWith('2026-04');
});
it('keeps named chevrons in place at both ends', () => {
  const onChange = vi.fn();
  const { rerender } = render(<PeriodPicker months={months} value="2026-01" onChange={onChange} />);
  expect(screen.getByRole('button', { name: 'No earlier month' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Next month: February 2026' }));
  expect(onChange).toHaveBeenCalledWith('2026-02');
  rerender(<PeriodPicker months={months} value="2026-04" onChange={onChange} />);
  expect(screen.getByRole('button', { name: 'No later month' })).toBeDisabled();
});
it('accepts a closed-only range and an empty range', () => {
  const { rerender } = render(<PeriodPicker months={months.filter(month => month.state === 'closed')} value="2026-01" onChange={vi.fn()} />);
  expect(screen.getAllByRole('option')).toHaveLength(1);
  expect(screen.getAllByRole('button').every(button => button.hasAttribute('disabled'))).toBe(true);
  rerender(<PeriodPicker months={[]} value="" onChange={vi.fn()} />);
  expect(screen.queryAllByRole('option')).toHaveLength(0);
  expect(screen.getAllByRole('button').every(button => button.hasAttribute('disabled'))).toBe(true);
});
it('does not invent a selected month for a missing URL value', () => {
  render(<PeriodPicker months={months} value="unknown" onChange={vi.fn()} />);
  expect(screen.getAllByRole('option').every(option => option.getAttribute('aria-selected') === 'false')).toBe(true);
  expect(screen.getAllByRole('option')[0]).toHaveAttribute('tabindex', '0');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
