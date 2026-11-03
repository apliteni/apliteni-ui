import { createRef } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { Button } from './Button';
import { classesOfEl } from '../test/classlist';

// The class lists the vanilla button() wrote, held after #429 removed it.
it.each([
  ['xs', ['ui-btn', 'ui-btn--primary', 'ui-btn--xs']],
  ['sm', ['ui-btn', 'ui-btn--primary', 'ui-btn--sm']],
  ['md', ['ui-btn', 'ui-btn--primary']],
  ['lg', ['ui-btn', 'ui-btn--lg', 'ui-btn--primary']],
] as const)('writes the button class list (primary, %s)', (size, expected) => {
  const { getByRole } = render(<Button variant="primary" size={size}>Save</Button>);
  expect(classesOfEl(getByRole('button'))).toEqual(expected);
});

// A hold button confirms only through onConfirm, so a plain click calls neither.
it('fires onClick, and a hold button calls neither handler on a plain click', async () => {
  let hit = 0;
  const confirmed = vi.fn();
  const { getByRole, rerender } = render(<Button onClick={() => { hit++; }}>Go</Button>);
  getByRole('button').click();
  expect(hit).toBe(1);
  rerender(<Button hold onConfirm={confirmed} onClick={() => { hit++; }}>Go</Button>);
  fireEvent.click(getByRole('button'), { detail: 1 });
  expect(hit).toBe(1);
  expect(confirmed).not.toHaveBeenCalled();
});

describe('hold to confirm', () => {
  const fill = (el: HTMLElement) => Number(el.style.getPropertyValue('--hold') || 0);
  const reduce = (on: boolean) => vi.stubGlobal('matchMedia', (q: string) => ({ matches: on && q.includes('reduce') }));
  beforeEach(() => { vi.useFakeTimers(); reduce(false); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  const setup = (props: { onConfirm?: () => void; 'aria-describedby'?: string } = {}) => {
    const onConfirm = vi.fn();
    const view = render(<Button hold variant="danger" onConfirm={onConfirm} {...props}>Delete workspace</Button>);
    const button = view.getByRole('button', { name: 'Delete workspace' });
    button.setPointerCapture = vi.fn();
    return { ...view, button, onConfirm };
  };

  it('confirms after a 1000 ms hold, with the fill growing on the way', () => {
    const { button, onConfirm } = setup();
    fireEvent.pointerDown(button, { button: 0, pointerId: 7 });
    expect(button.setPointerCapture).toHaveBeenCalledWith(7);
    expect(button).toHaveAttribute('data-holding');
    vi.advanceTimersByTime(500);
    expect(fill(button)).toBeGreaterThan(0.4);
    expect(fill(button)).toBeLessThan(0.6);
    expect(onConfirm).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(button).not.toHaveAttribute('data-holding');
    fireEvent.pointerUp(button, { pointerId: 7 });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows the hint after a press under 300 ms and does not confirm', () => {
    const { button, onConfirm } = setup();
    expect(button).not.toHaveAttribute('data-hold-hint');
    fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
    vi.advanceTimersByTime(200);
    fireEvent.pointerUp(button, { pointerId: 1 });
    expect(button).toHaveAttribute('data-hold-hint');
    vi.advanceTimersByTime(2000);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
    expect(button).not.toHaveAttribute('data-hold-hint');
  });

  it('sends the fill back to 0 on an early release, cancel or lost capture, without the hint after 300 ms', () => {
    const { button, onConfirm } = setup();
    for (const leave of ['pointerUp', 'pointerCancel', 'lostPointerCapture', 'blur'] as const) {
      fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
      vi.advanceTimersByTime(600);
      expect(fill(button)).toBeGreaterThan(0);
      fireEvent[leave](button, { pointerId: 1 });
      expect(fill(button)).toBe(0);
      expect(button).not.toHaveAttribute('data-holding');
      expect(button).not.toHaveAttribute('data-hold-hint');
    }
    vi.advanceTimersByTime(2000);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('ignores a secondary button and keeps the context menu shut', () => {
    const { button, onConfirm } = setup();
    fireEvent.pointerDown(button, { button: 2, pointerId: 1 });
    vi.advanceTimersByTime(1000);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(fireEvent.contextMenu(button)).toBe(false);
  });

  it.each(['Enter', ' '])('holds on %j the same as a pointer', key => {
    const { button, onConfirm } = setup();
    expect(fireEvent.keyDown(button, { key })).toBe(false);
    vi.advanceTimersByTime(900);
    fireEvent.keyDown(button, { key, repeat: true });
    fireEvent.keyUp(button, { key });
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.keyDown(button, { key });
    vi.advanceTimersByTime(1000);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('describes the second way in, keeping a caller description', () => {
    const { button, getByText } = setup({ 'aria-describedby': 'own' });
    const own = document.createElement('span');
    own.id = 'own';
    own.textContent = 'Removes every report.';
    document.body.append(own);
    expect(button).toHaveAccessibleDescription('Removes every report. Hold to confirm, or press twice.');
    expect(getByText('Hold to confirm')).toHaveAttribute('aria-hidden', 'true');
    own.remove();
  });

  // A screen reader activates with a click that has no pointer down and no key down.
  it('confirms on a second press within 3000 ms, and not after', () => {
    const { button, onConfirm } = setup();
    fireEvent.click(button, { detail: 0 });
    expect(button).toHaveAttribute('data-hold-hint');
    vi.advanceTimersByTime(3001);
    fireEvent.click(button, { detail: 0 });
    expect(onConfirm).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2999);
    fireEvent.click(button, { detail: 0 });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('moves the fill in four 250 ms steps under reduced motion, still over 1000 ms', () => {
    reduce(true);
    const { button, onConfirm } = setup();
    fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
    const seen = [];
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(249);
      seen.push(fill(button));
      vi.advanceTimersByTime(1);
      seen.push(fill(button));
    }
    expect(seen).toEqual([0, 0.25, 0.25, 0.5, 0.5, 0.75]);
    expect(onConfirm).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not hold while busy or disabled', () => {
    const { button, onConfirm, rerender } = setup();
    for (const state of [{ busy: true }, { disabled: true }]) {
      rerender(<Button hold variant="danger" onConfirm={onConfirm} {...state}>Delete workspace</Button>);
      fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.click(button, { detail: 0 });
      fireEvent.click(button, { detail: 0 });
      vi.advanceTimersByTime(1000);
      expect(button).not.toHaveAttribute('data-holding');
    }
    expect(onConfirm).not.toHaveBeenCalled();
    rerender(<Button hold variant="danger" onConfirm={onConfirm}>Delete workspace</Button>);
    fireEvent.keyDown(button, { key: 'Enter' });
    vi.advanceTimersByTime(1000);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('never submits its form', () => {
    const submit = vi.fn((e: Event) => e.preventDefault());
    const { getByRole } = render(<form onSubmit={e => submit(e.nativeEvent)}><Button hold type="submit">Delete workspace</Button></form>);
    fireEvent.click(getByRole('button'), { detail: 1 });
    expect(submit).not.toHaveBeenCalled();
  });

  // Enter in a field clicks the form's default button, so twice would confirm by the second way in.
  it('is never the default button of its form', () => {
    const { getByRole } = render(<form><input aria-label="Name" /><Button hold type="submit">Delete workspace</Button></form>);
    expect(getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('stops a running hold and a pending second press when it turns busy or disabled', () => {
    for (const state of [{ busy: true }, { disabled: true }]) {
      const { button, onConfirm, rerender, unmount } = setup();
      fireEvent.click(button, { detail: 0 });
      fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
      vi.advanceTimersByTime(500);
      rerender(<Button hold variant="danger" onConfirm={onConfirm} {...state}>Delete workspace</Button>);
      expect(button).not.toHaveAttribute('data-holding');
      expect(fill(button)).toBe(0);
      vi.advanceTimersByTime(1000);
      rerender(<Button hold variant="danger" onConfirm={onConfirm}>Delete workspace</Button>);
      fireEvent.click(button, { detail: 0 });
      vi.advanceTimersByTime(1000);
      expect(onConfirm).not.toHaveBeenCalled();
      unmount();
    }
  });

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
  expect(fireEvent.keyDown(link, { key: 'Enter' })).toBe(false);
  expect(fireEvent.keyUp(link, { key: 'Enter' })).toBe(false);
  expect(handler).not.toHaveBeenCalled();
  // Space never activates an anchor, so it is left alone. A focused busy link that
  // swallowed it would cost the reader the page scroll and block nothing; the busy
  // button test above covers the root where Space does activate.
  expect(fireEvent.keyDown(link, { key: ' ' })).toBe(true);
  expect(fireEvent.keyUp(link, { key: ' ' })).toBe(true);
  expect(handler).toHaveBeenCalledTimes(2);
  handler.mockClear();
  rerender(<Button href="#details" onClick={handler}>Details</Button>);
  expect(link).toHaveAttribute('href', '#details');
  fireEvent.click(link);
  expect(handler).toHaveBeenCalledTimes(1);
});

// The documented precedence, both halves of it.
// why: docs/components.md#react-button-links-and-leading-artwork
it('merges a caller className and keeps its own state attributes ahead of spread props', () => {
  const { getByRole } = render(<Button busy className="mine" type="submit"
    aria-busy={false} aria-disabled={false} data-btn-disabled="">Saving</Button>);
  const button = getByRole('button');
  expect(button).toHaveClass('ui-btn', 'ui-btn--secondary', 'mine');
  expect(button).toHaveAttribute('aria-busy', 'true');
  expect(button).toHaveAttribute('aria-disabled', 'true');
  expect(button).not.toHaveAttribute('data-btn-disabled');
  // type is the caller's: a form still needs its submit button.
  expect(button).toHaveAttribute('type', 'submit');
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
  // With no children and no icon there is nothing to mirror, so the control ships
  // nameless and axe fails it. An identifier like "Button" reads as a name to the
  // checker and says nothing to the person hearing it.
  // why: guidelines/microcopy.md#name-every-control
  rerender(<Button leading={<svg />} iconOnly />);
  const nameless = getByRole('button');
  expect(nameless).not.toHaveAttribute('aria-label');
  expect(nameless).not.toHaveAttribute('title');
  expect(nameless).toHaveAccessibleName('');
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
