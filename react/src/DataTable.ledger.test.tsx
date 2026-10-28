import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import * as stories from './DataTable.ledger.stories';

const { default: _meta, ...all } = stories;

describe('the ledger stories', () => {
  it.each(Object.entries(all))('renders %s without a table title sub-line', (_name, story) => {
    const { container } = render((story as { render: () => ReactElement }).render());
    expect(container.querySelector('.ui-card__sub')).toBeNull();
  });

  it('shows a revoked row as the word', () => {
    const { container } = render(all.AgentTokens.render());
    const dead = container.querySelector('tr.is-dead')!;
    expect(dead).toHaveTextContent('Revoked');
  });

  it('keeps the payouts a pinned table in its scroll frame, with no stacked rows', () => {
    const { container } = render(all.FinanceData.render());
    const frame = container.querySelector('.ui-table-scroll')!;
    expect(frame).toHaveAttribute('aria-label', 'Payouts, scroll for more columns');
    const table = frame.querySelector('table')!;
    expect(table).toHaveClass('ui-table--pinned');
    expect(table).not.toHaveClass('ui-table--stack');
    expect([...table.querySelectorAll('tbody tr')].every((row) => row.cells[0].classList.contains('ui-table__identity'))).toBe(true);
    expect(container.querySelector('[data-label]')).toBeNull();
  });

  it('shows the invoice rows and totals without row hover', () => {
    const { container } = render(stories.WithTotals.render());
    const table = container.querySelector('table')!;
    expect([...table.classList]).toEqual(['ui-table', 'ui-table--dense']);
    expect(table).not.toHaveClass('ui-table--hover');
    expect(table.querySelector('caption')).toHaveTextContent('Sample services and totals in EUR');
    expect([...table.querySelectorAll('thead th')].map((cell) => cell.textContent)).toEqual(['Service', 'Amount (EUR)']);
    expect([...table.querySelectorAll('tbody tr')].map((row) =>
      [...row.cells].map((cell) => cell.textContent))).toEqual([
      ['Interface design', '450.00'],
      ['Prototype review', '300.00'],
    ]);
    expect([...table.querySelectorAll('tfoot tr')].map((row) =>
      [...row.cells].map((cell) => cell.textContent))).toEqual([
      ['Subtotal', '750.00'],
      ['VAT (20%)', '150.00'],
      ['Total', '900.00'],
    ]);
  });

  it('shows compact row headers without row hover', () => {
    const { container } = render(stories.CompactRowHeaders.render());
    const table = container.querySelector('table')!;
    expect([...table.classList]).toEqual(['ui-table', 'ui-table--compact']);
    expect(table).not.toHaveClass('ui-table--hover');
    expect(table.querySelector('caption')).toHaveTextContent('Service hours with row headers');
    expect([...table.querySelectorAll('thead th')].map((cell) => cell.textContent)).toEqual(['Service', 'Hours']);
    const rows = [...table.querySelectorAll('tbody tr')];
    expect(rows.map((row) => [...row.cells].map((cell) => cell.textContent))).toEqual([
      ['Interface design', '6'],
      ['Prototype review', '4'],
    ]);
    expect(rows.map((row) => row.querySelector('th')?.getAttribute('scope'))).toEqual(['row', 'row']);
  });

  it('keeps the payments a pinned table in its scroll frame', () => {
    const { container } = render(stories.PinnedScroll.render());
    const frame = container.querySelector('.ui-table-scroll')!;
    expect(frame).toHaveAttribute('aria-label', 'October payments, scroll for more columns');
    const table = frame.querySelector('table')!;
    expect([...table.classList]).toEqual(['ui-table', 'ui-table--hover', 'ui-table--pinned']);
    expect([...table.querySelectorAll('thead th')].map((cell) => cell.textContent)).toEqual([
      'Counterparty', 'Date', 'Amount', 'Notes',
    ]);
    const rows = [...table.querySelectorAll('tbody tr')];
    expect(rows.map((row) => row.cells[0].textContent)).toEqual([
      'Northwind Studio', 'Blue Fern Hosting', 'Kestrel Print Co.', 'Orchard Lane Café', 'Harbor Freight Lines',
    ]);
    expect(rows.every((row) => row.cells[0].matches('th.ui-table__identity[scope="row"]'))).toBe(true);
    expect(rows.every((row) => row.cells[3].classList.contains('ui-table__long'))).toBe(true);
  });

  it('gives every card its icon, except the plain invoice and payment cards', () => {
    for (const name of ['FinanceData', 'AgentTokens', 'Empty'] as const) {
      const { container, unmount } = render(all[name].render());
      expect(container.querySelector('.ui-card__title .ui-card__icon svg')).not.toBeNull();
      unmount();
    }
  });
});
