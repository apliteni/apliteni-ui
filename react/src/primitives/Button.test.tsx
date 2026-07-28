import { render } from '@testing-library/react';
import { button } from '@apliteni/apliteni-ui';
import { Button } from './Button';
import { classesOf, classesOfEl } from '../test/classlist';

it('matches the vanilla button class list (primary, sm)', () => {
  const { getByRole } = render(<Button variant="primary" size="sm">Save</Button>);
  const react = classesOfEl(getByRole('button'));
  const vanilla = classesOf(button({ label: 'Save', variant: 'primary', size: 'sm' }));
  expect(react).toEqual(vanilla);
});

it('fires onClick', async () => {
  let hit = 0;
  const { getByRole } = render(<Button onClick={() => { hit++; }}>Go</Button>);
  getByRole('button').click();
  expect(hit).toBe(1);
});
