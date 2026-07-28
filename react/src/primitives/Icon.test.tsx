import { render } from '@testing-library/react';
import { Icon } from './Icon';

it('renders the kit SVG for a named icon', () => {
  const { container } = render(<Icon name="check" />);
  expect(container.querySelector('svg')).not.toBeNull();
});
