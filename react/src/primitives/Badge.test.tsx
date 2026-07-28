import { render } from '@testing-library/react';
import { badge } from '@apliteni/apliteni-ui';
import { Badge } from './Badge';
import { classesOf, classesOfEl } from '../test/classlist';

it('matches the vanilla badge class list (warn)', () => {
  const { container } = render(<Badge variant="warn">paused</Badge>);
  const react = classesOfEl(container.firstElementChild!);
  const vanilla = classesOf(badge('paused', 'warn'));
  expect(react).toEqual(vanilla);
});

it('neutral badge has no modifier class', () => {
  const { container } = render(<Badge>live</Badge>);
  expect(classesOfEl(container.firstElementChild!)).toEqual(['ui-badge']);
});
