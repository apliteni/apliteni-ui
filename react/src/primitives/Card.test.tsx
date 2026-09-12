import { render } from '@testing-library/react';
import { Card } from './Card';

it('renders title, sub and body', () => {
  const { getByText, container } = render(<Card title="Top" sub="last 7d"><p>body</p></Card>);
  expect(container.querySelector('.ui-card')).not.toBeNull();
  expect(getByText('Top')).toHaveClass('ui-card__title');
  expect(getByText('last 7d')).toHaveClass('ui-card__sub');
  expect(getByText('body')).not.toBeNull();
});

// why: docs/specification.md#labels-and-titles
it('titles a card with a heading one level under the page title', () => {
  const { getByRole, rerender } = render(<Card title="Payouts" />);
  expect(getByRole('heading', { level: 2, name: 'Payouts' })).toHaveClass('ui-card__title');
  rerender(<Card title="Payouts" level={3} />);
  expect(getByRole('heading', { level: 3, name: 'Payouts' })).toHaveClass('ui-card__title');
});

it('renders no heading for a card without a title', () => {
  const { queryByRole, rerender } = render(<Card><p>body</p></Card>);
  expect(queryByRole('heading')).toBeNull();
  rerender(<Card title=""><p>body</p></Card>);
  expect(queryByRole('heading')).toBeNull();
  rerender(<Card title={false}><p>body</p></Card>);
  expect(queryByRole('heading')).toBeNull();
});

it('falls back to h2 for a level that is not 2 to 6', () => {
  const { getByRole } = render(<Card title="Payouts" level={7 as 2} />);
  expect(getByRole('heading', { level: 2, name: 'Payouts' })).toBeTruthy();
});
