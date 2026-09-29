import { createRef } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
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

it('retains the last action label while busy and restores the next label on completion', () => {
  const { container, rerender, getByRole } = render(<Button><b>Save</b></Button>);
  rerender(<Button busy>Saving…</Button>);
  expect(getByRole('button', { name: 'Save' })).toHaveAttribute('aria-busy', 'true');
  expect(container.querySelectorAll('.ui-btn__dots i')).toHaveLength(3);
  rerender(<Button busy>Almost done</Button>);
  expect(getByRole('button', { name: 'Save' })).toBeEnabled();
  expect(container.querySelectorAll('.ui-btn__dots')).toHaveLength(1);
  rerender(<Button>Saved</Button>);
  expect(getByRole('button', { name: 'Saved' })).not.toHaveAttribute('aria-busy');
  expect(container.querySelector('.ui-btn__dots')).toBeNull();
});

it('keeps focus while busy, blocks clicks and activation keys, and announces label changes', async () => {
  const click = vi.fn();
  const key = vi.fn();
  const { getByRole, rerender } = render(<Button onClick={click} onKeyDown={key}>Save</Button>);
  const button = getByRole('button');
  expect(document.querySelector('.ui-btn__status')).toBeNull();
  button.focus();
  rerender(<Button busy onClick={click} onKeyDown={key}>Saving</Button>);
  expect(button).toHaveFocus();
  expect(button).toBeEnabled();
  expect(button).toHaveAttribute('aria-disabled', 'true');
  const status = getByRole('status');
  await waitFor(() => expect(status).toHaveTextContent('Save: in progress'));
  expect(button.contains(status)).toBe(false);
  fireEvent.click(button);
  for (const activationKey of ['Enter', ' ']) {
    expect(fireEvent.keyDown(button, { key: activationKey })).toBe(false);
    expect(fireEvent.keyUp(button, { key: activationKey })).toBe(false);
  }
  expect(click).not.toHaveBeenCalled();
  expect(key).not.toHaveBeenCalled();
  rerender(<Button onClick={click}>Saved</Button>);
  await waitFor(() => expect(status).toHaveTextContent('Saved'));
  expect(button).toHaveFocus();
  fireEvent.click(button);
  expect(click).toHaveBeenCalledTimes(1);
});

it('keeps an explicitly disabled busy button natively disabled', () => {
  const { getByRole } = render(<Button disabled busy>Saving</Button>);
  expect(getByRole('button')).toBeDisabled();
});

it('keeps one root per button and shares the announcer only after busy is used', async () => {
  const first = render(<Button>Save</Button>);
  const second = render(<Button>Send</Button>);
  expect(document.querySelectorAll('.ui-btn__status')).toHaveLength(0);
  first.rerender(<Button busy>Saving</Button>);
  second.rerender(<Button busy>Sending</Button>);
  expect(first.container.children).toHaveLength(1);
  expect(second.container.children).toHaveLength(1);
  expect(document.querySelectorAll('.ui-btn__status')).toHaveLength(1);
  const status = document.querySelector('.ui-btn__status');
  await waitFor(() => expect(status).toHaveTextContent('Send: in progress'));
  first.unmount();
  expect(status).toBeInTheDocument();
  second.rerender(<Button>Sent</Button>);
  await waitFor(() => expect(status).toHaveTextContent('Sent'));
  second.unmount();
  expect(document.querySelector('.ui-btn__status')).toBeNull();
});

// Checks live-region text in JSDOM, not speech output from a screen reader.
it('can suppress completion when an error is announced by the form', async () => {
  const { rerender, getByRole } = render(<Button>Send</Button>);
  rerender(<Button busy>Send</Button>);
  const status = getByRole('status');
  await waitFor(() => expect(status).toHaveTextContent('Send: in progress'));
  rerender(<Button completionMessage="">Send</Button>);
  await waitFor(() => expect(status).toHaveTextContent(/^$/));
  expect(getByRole('button')).not.toHaveAttribute('aria-busy');
});

// JSDOM checks semantics and event guards; browser evidence checks paint and focus rings.
it('renders a native link with anchor attributes and the shared button classes', () => {
  const { getByRole } = render(<Button href="#details" target="_blank" rel="noreferrer" className="custom">Details</Button>);
  const link = getByRole('link', { name: 'Details' });
  expect(link.tagName).toBe('A');
  expect(link).toHaveAttribute('href', '#details');
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noreferrer');
  expect(link).not.toHaveAttribute('type');
  expect(link).not.toHaveAttribute('disabled');
  expect(link).toHaveClass('ui-btn', 'ui-btn--secondary', 'custom');
});

it.each(['disabled', 'busy'] as const)('blocks all link activation while %s', state => {
  const handler = vi.fn();
  const { getByRole, rerender } = render(<Button href="#details">Details</Button>);
  const link = getByRole('link');
  link.focus();
  rerender(<Button href="#details" {...{ [state]: true }} onClick={handler} onClickCapture={handler}
    onAuxClick={handler} onAuxClickCapture={handler} onKeyDown={handler} onKeyUp={handler}>Details</Button>);
  expect(link).toHaveAttribute('aria-disabled', 'true');
  expect(link).not.toHaveAttribute('href');
  expect(link).not.toHaveAttribute('disabled');
  expect(link).toHaveAttribute('tabindex', state === 'disabled' ? '-1' : '0');
  expect(link).toHaveFocus();
  expect(fireEvent.click(link)).toBe(false);
  expect(fireEvent(link, new MouseEvent('auxclick', { button: 1, bubbles: true, cancelable: true }))).toBe(false);
  for (const key of ['Enter', ' ']) {
    expect(fireEvent.keyDown(link, { key })).toBe(false);
    expect(fireEvent.keyUp(link, { key })).toBe(false);
  }
  expect(handler).not.toHaveBeenCalled();
  rerender(<Button href="#details" onClick={handler}>Details</Button>);
  expect(link).toHaveAttribute('href', '#details');
  fireEvent.click(link);
  expect(handler).toHaveBeenCalledTimes(1);
});

it('places decorative caller artwork before the label and prefers it over icon', () => {
  const { getByRole } = render(<Button leading={<svg data-testid="art"><title>Decoration</title></svg>} icon="check" iconRight="arrowRight">Continue</Button>);
  const button = getByRole('button', { name: 'Continue' });
  expect(button.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  expect(button.firstElementChild?.querySelector('[data-testid="art"]')).not.toBeNull();
  expect(button.children[1]).toHaveClass('ui-btn__label-slot');
  expect(button.querySelectorAll('svg')).toHaveLength(2);
});

it('names icon-only caller artwork and respects explicit labels', () => {
  const { getByRole, rerender } = render(<Button leading={<svg />} iconOnly>Close</Button>);
  expect(getByRole('button', { name: 'Close' })).toHaveAttribute('title', 'Close');
  rerender(<Button href="#details" leading={<svg />} iconOnly aria-label="Dismiss">Close</Button>);
  expect(getByRole('link', { name: 'Dismiss' })).toBeInTheDocument();
  rerender(<Button leading={<svg />} iconOnly />);
  expect(getByRole('button', { name: 'Button' })).toBeInTheDocument();
});

it('marks explicitly disabled busy controls for the existing disabled paint', () => {
  const { getByRole } = render(<Button href="#details" disabled busy>Details</Button>);
  expect(getByRole('link')).toHaveAttribute('data-btn-disabled', '');
});


it('forwards refs to the native root, including after changing roots', () => {
  const buttonRef = createRef<HTMLButtonElement>();
  const linkRef = createRef<HTMLAnchorElement>();
  const { getByRole, rerender } = render(<Button ref={buttonRef}>Save</Button>);
  expect(buttonRef.current).toBe(getByRole('button'));
  rerender(<Button href="#details" ref={linkRef}>Details</Button>);
  expect(linkRef.current).toBe(getByRole('link'));
  expect(buttonRef.current).toBeNull();
});
