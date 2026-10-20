import { render } from '@testing-library/react';
import * as stories from './DataTable.ledger.stories';

const { default: _meta, ...all } = stories;

describe('the ledger stories', () => {
  it.each(Object.entries(all))('renders %s without a table title sub-line', (_name, story) => {
    const { container } = render((story as { render: () => JSX.Element }).render());
    expect(container.querySelector('.ui-card__sub')).toBeNull();
  });

  it('shows a revoked row as the word, with no strike line', () => {
    const { container } = render(all.AgentTokens.render());
    const dead = container.querySelector('tr.is-dead')!;
    expect(dead).toHaveTextContent('Revoked');
    expect(dead.querySelector('[style]')).toBeNull();
  });

  it('keeps every payout amount in a stacked row', () => {
    const { container } = render(all.FinanceData.render());
    expect(container.querySelector('table')).toHaveClass('ui-table--stack');
    expect(container.querySelectorAll('tbody tr:first-child .ui-value')).toHaveLength(3);
  });
});
