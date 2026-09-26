import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DiffPreview } from './DiffPreview';

const rows = [
  { id: '1', label: 'Invoice 1001', period: 'September', from: 'Services', to: 'Software', amount: '€120.00' },
  { id: '2', label: 'Credit 1002', period: 'September', from: null, to: 'Software', amount: '−€20.00' },
];
const totals = [{ period: 'September', amount: '€100.00' }];

// DOM semantics and supplied text; browser evidence checks scrolling and paint.
describe('DiffPreview', () => {
  it('shows the supplied signed totals before a native dense table', () => {
    render(<DiffPreview rows={rows} totals={totals} context="Category change" />);
    const table = screen.getByRole('table');
    const summary = screen.getByText(/2 rows would move/);
    expect(summary.textContent).toContain('September: €100.00');
    expect(summary.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(table).toHaveClass('ui-table', 'ui-table--dense');
    expect(within(table).getAllByRole('columnheader').map(el => el.textContent)).toEqual(['Row', 'Period', 'From', 'To', 'Amount']);
    expect(screen.getByText('−€20.00')).toHaveClass('ui-table__num');
    expect(screen.getByText('Unclassified')).toBeInTheDocument();
    expect(table.querySelector('thead [aria-hidden="true"]')).toHaveTextContent('');
    expect(table.querySelectorAll('tbody td[aria-hidden="true"]')).toHaveLength(2);
  });
  it('renders ownership context and the server adjustment note without changing periods', () => {
    render(<DiffPreview rows={rows.slice(0, 1)} totals={totals} context="Owner: West team to Central team" note="September is closed. Booked as an adjustment in October." />);
    expect(screen.getByText(/1 row would move/)).toBeInTheDocument();
    expect(screen.getByText('Owner: West team to Central team')).toBeInTheDocument();
    expect(screen.getByText(/September is closed/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Change preview' })).toHaveAttribute('tabindex', '0');
  });
  it('replaces the table and stale totals when no rows would move', () => {
    render(<DiffPreview rows={[]} totals={totals} />);
    expect(screen.getByText('No rows would move')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(/€100/)).not.toBeInTheDocument();
  });
});
