import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import * as stories from './DataTable.ledger.stories';
import * as vanilla from '../../stories/components/Table.stories.js';

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

  it.each(['WithTotals', 'CompactRowHeaders'] as const)('%s uses the vanilla table classes', (name) => {
    const { container } = render(stories[name].render());
    const expected = new DOMParser().parseFromString(vanilla[name].render(), 'text/html');
    expect(container.querySelector('table')?.className).toBe(expected.querySelector('table')?.className);
  });

  it('uses the vanilla stacked labels and rows', () => {
    const { container } = render(stories.StackedPinned.render());
    const expected = new DOMParser().parseFromString(vanilla.StackedPinned.render(), 'text/html');
    const read = (root: ParentNode) => ({
      classes: [...(root.querySelector('table')?.classList ?? [])].sort(),
      heads: [...root.querySelectorAll('thead th')].map((cell) => cell.textContent?.trim()),
      rows: [...root.querySelectorAll('tbody tr')].map((row) => ({
        cells: [...row.querySelectorAll('td')].map((cell) => cell.textContent?.trim()),
        labels: [...row.querySelectorAll('td')].map((cell) => cell.getAttribute('data-label')),
      })),
    });
    expect(read(container)).toEqual(read(expected));
  });

  it('gives every card its icon, except the plain invoice cards', () => {
    for (const name of ['FinanceData', 'AgentTokens', 'Empty', 'StackedLog', 'StackedPinned'] as const) {
      const { container, unmount } = render(all[name].render());
      expect(container.querySelector('.ui-card__title .ui-card__icon svg')).not.toBeNull();
      unmount();
    }
  });
});
