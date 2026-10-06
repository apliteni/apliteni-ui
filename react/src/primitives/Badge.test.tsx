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

/* Neutral is named, not implied. It used to be the one tone left out of the class list, which
 * is how a status column mapping two of its four rows to neutral got a bare .ui-badge — the
 * card's own colour until #459. Both faces write the tone, so the two cannot drift apart. */
it('names the neutral tone, and matches the vanilla badge there too', () => {
  const { container } = render(<Badge>live</Badge>);
  expect(classesOfEl(container.firstElementChild!)).toEqual(['ui-badge', 'ui-badge--neutral']);
  expect(classesOfEl(container.firstElementChild!)).toEqual(classesOf(badge('live')));
});
