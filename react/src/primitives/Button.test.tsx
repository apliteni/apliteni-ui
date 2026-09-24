import { render, fireEvent } from '@testing-library/react';
import { button } from '@apliteni/apliteni-ui';
import { Button } from './Button';
import { classesOf, classesOfEl } from '../test/classlist';

it.each(['xs', 'sm', 'md', 'lg'] as const)('matches the vanilla button class list (primary, %s)', (size) => {
  const { getByRole } = render(<Button variant="primary" size={size}>Save</Button>);
  const react = classesOfEl(getByRole('button'));
  const vanilla = classesOf(button({ label: 'Save', variant: 'primary', size }));
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

it('slides busy label changes and clears interrupted outgoing copies', () => {
  const { container, rerender, getByRole, unmount } = render(<Button>Save</Button>);
  expect(container.querySelector('.ui-btn__label-old')).toBeNull();
  rerender(<Button busy>Saving…</Button>);
  expect(getByRole('button', { name: 'Saving…' })).toHaveAttribute('aria-disabled', 'true');
  expect(container.querySelector('.ui-btn__label-old')).toHaveTextContent('Save');
  rerender(<Button busy>Almost done</Button>);
  expect(container.querySelectorAll('.ui-btn__label-old')).toHaveLength(1);
  expect(container.querySelector('.ui-btn__label-old')).toHaveTextContent('Saving…');
  rerender(<Button>Saved</Button>);
  expect(getByRole('button', { name: 'Saved' })).not.toBeDisabled();
  expect(container.querySelector('.ui-btn__bars')).toBeNull();
  unmount();
});

it('does not animate an unchanged rendered label after a busy rerender', () => {
  const { container, rerender } = render(<Button busy><b>Saving</b></Button>);
  rerender(<Button busy><b>Saving</b></Button>);
  expect(container.querySelector('.ui-btn__label-old')).toBeNull();
});

it('keeps focus while busy, blocks clicks and activation keys, and announces label changes', () => {
  const click = vi.fn();
  const key = vi.fn();
  const { getByRole, rerender } = render(<Button onClick={click} onKeyDown={key}>Save</Button>);
  const button = getByRole('button');
  const status = getByRole('status');
  expect(status).toHaveTextContent('');
  button.focus();
  rerender(<Button busy onClick={click} onKeyDown={key}>Saving</Button>);
  expect(button).toHaveFocus();
  expect(button).toBeEnabled();
  expect(button).toHaveAttribute('aria-disabled', 'true');
  expect(status).toHaveTextContent('Saving');
  expect(button.contains(status)).toBe(false);
  fireEvent.click(button);
  for (const activationKey of ['Enter', ' ']) {
    expect(fireEvent.keyDown(button, { key: activationKey })).toBe(false);
    expect(fireEvent.keyUp(button, { key: activationKey })).toBe(false);
  }
  expect(click).not.toHaveBeenCalled();
  expect(key).not.toHaveBeenCalled();
  rerender(<Button onClick={click}>Saved</Button>);
  expect(status).toHaveTextContent('Saved');
  expect(button).toHaveFocus();
  fireEvent.click(button);
  expect(click).toHaveBeenCalledTimes(1);
});

it('keeps an explicitly disabled busy button natively disabled', () => {
  const { getByRole } = render(<Button disabled busy>Saving</Button>);
  expect(getByRole('button')).toBeDisabled();
});
