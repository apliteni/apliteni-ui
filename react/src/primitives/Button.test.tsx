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

it('defaults to type="button" so it never submits a form', () => {
  const { getByRole } = render(<Button>Go</Button>);
  expect(getByRole('button')).toHaveAttribute('type', 'button');
});

// The glyph is aria-hidden, so an icon-only button has no name of its own.
it('names an icon-only button from its children', () => {
  const { getByRole } = render(<Button iconOnly icon="x">Close</Button>);
  expect(getByRole('button', { name: 'Close' })).toHaveAttribute('title', 'Close');
});

it('lets an explicit aria-label win over the children fallback', () => {
  const { getByRole } = render(<Button iconOnly icon="x" aria-label="Dismiss">Close</Button>);
  expect(getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
});

it('falls back to the icon name rather than shipping a nameless button', () => {
  const { getByRole } = render(<Button iconOnly icon="trash" />);
  expect(getByRole('button', { name: 'trash' })).toBeInTheDocument();
});

// The glyph itself is hidden by the vanilla icon() (gated in the root
// workspace); here we assert the React wrapper doesn't reopen the hole.
it('hides the decorative glyph wrapper from assistive tech', () => {
  const { container } = render(<Button icon="check">Save</Button>);
  expect(container.querySelector('span[aria-hidden="true"] svg')).not.toBeNull();
});
