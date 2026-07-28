import { render } from '@testing-library/react';
import { Card } from './Card';

it('renders title, sub and body', () => {
  const { getByText, container } = render(<Card title="Top" sub="last 7d"><p>body</p></Card>);
  expect(container.querySelector('.ui-card')).not.toBeNull();
  expect(getByText('Top')).toHaveClass('ui-card__title');
  expect(getByText('last 7d')).toHaveClass('ui-card__sub');
  expect(getByText('body')).not.toBeNull();
});
