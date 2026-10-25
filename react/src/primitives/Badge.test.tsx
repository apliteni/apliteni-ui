import { render } from '@testing-library/react';
import { Badge } from './Badge';
import { classesOfEl } from '../test/classlist';

// The class lists the vanilla badge() wrote, held after #429 removed it.
it('writes the badge class list (warn)', () => {
  const { container } = render(<Badge variant="warn">paused</Badge>);
  expect(classesOfEl(container.firstElementChild!)).toEqual(['ui-badge', 'ui-badge--warn']);
});

/* Neutral is named, not implied. It used to be the one tone left out of the class list, which
 * is how a status column mapping two of its four rows to neutral got a bare .ui-badge — the
 * card's own colour until #459. */
it('names the neutral tone', () => {
  const { container } = render(<Badge>live</Badge>);
  expect(classesOfEl(container.firstElementChild!)).toEqual(['ui-badge', 'ui-badge--neutral']);
});
