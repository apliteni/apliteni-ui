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

  it('names each stacked payout amount and lets the table reach the card', () => {
    const { container } = render(all.FinanceData.render());
    const table = container.querySelector('table')!;
    expect(table).toHaveClass('ui-table--stack');
    expect(table.parentElement).toHaveClass('ui-card');
    const amounts = [...container.querySelectorAll('tbody tr:first-child td.ui-table__num')];
    expect(amounts.map((cell) => cell.getAttribute('data-label'))).toEqual(['Gross', 'Fees', 'Net (EUR)']);
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

  it('shows the stacked pinned heads, labels and four rows', () => {
    const { container } = render(stories.StackedPinned.render());
    const table = container.querySelector('table')!;
    expect([...table.classList]).toEqual([
      'ui-table', 'ui-table--hover', 'ui-table--stack', 'ui-table--dense', 'ui-table--sticky', 'ui-table--pinned',
    ]);
    expect([...table.querySelectorAll('thead th')].map((cell) => cell.textContent)).toEqual([
      'Company', 'Weight', 'Size', 'Note',
    ]);
    const rows = [...table.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => [...row.cells].map((cell) => cell.getAttribute('data-label')))).toEqual(
      Array.from({ length: 4 }, () => [null, null, null, null]),
    );
    expect(rows.map((row) => [
      row.querySelector('.ui-identity__symbol')?.textContent ?? '',
      row.querySelector('.ui-identity__name')?.textContent ?? row.cells[0].textContent,
      ...[...row.cells].slice(1).map((cell) => cell.textContent),
    ])).toEqual([
      ['NORT', 'Northstar Analytics', '128.40bp', '3lots', 'Rebalanced into short-duration paper after the June print; the committee asked for the note to be kept on the position until September.'],
      ['HARB', 'Harbor Software', '96.12bp', '12lots', 'Holding. The renewal cohort is the whole thesis and it does not settle until the next quarter closes.'],
      ['CEDA', 'Cedar Infrastructure', '71.85bp', '2lots', 'Trimmed on the roll. Fabricated position, kept here because the note runs longer than the row.'],
      ['', 'Cedar Infrastructure Holdings International', '18.40bp', '4lots', 'On the watchlist until the next sample review.'],
    ]);
  });

  it('gives every card its icon, except the plain invoice cards', () => {
    for (const name of ['FinanceData', 'AgentTokens', 'Empty', 'StackedLog', 'StackedPinned'] as const) {
      const { container, unmount } = render(all[name].render());
      expect(container.querySelector('.ui-card__title .ui-card__icon svg')).not.toBeNull();
      unmount();
    }
  });
});
