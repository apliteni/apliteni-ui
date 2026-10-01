import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import axe from 'axe-core';
import { snippet } from '@apliteni/apliteni-ui';
import { Snippet } from './Snippet';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

function clipboard(writeText = vi.fn().mockResolvedValue(undefined)) {
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  return writeText;
}

// jsdom checks behavior and semantics; browser evidence covers layout and contrast.

// The #429 series exists so React emits the vanilla markup, so compare against
// the factory instead of restating class names: a restatement passes a component
// that always adds ui-snippet--reveal, and says nothing about the bar or the copy
// button. Not a new parity test — this one predates the PR that dropped it, and
// now covers `copy` as well.
for (const reveal of [false, true]) for (const copy of [false, true]) {
  it(`keeps the factory classes and selectable text (reveal=${reveal}, copy=${copy})`, () => {
    const props = { reveal, copy, label: 'Terminal', code: 'npm install example', copyLabel: 'Copy command' };
    const vanilla = document.createElement('div');
    vanilla.innerHTML = snippet(props);
    const { container } = render(<Snippet {...props} />);
    const classes = (root: Element) => Array.from(root.querySelectorAll('[class]'), el => el.getAttribute('class'));
    expect(classes(container)).toEqual(classes(vanilla));
    expect(classes(container)).toContain('ui-snippet__bar');
    expect(container.querySelector('pre')).toHaveTextContent(props.code);
    if (copy) expect(screen.getByRole('button', { name: props.copyLabel })).toHaveAttribute('type', 'button');
    else expect(container.querySelector('button')).toBeNull();
  });
}

it('renders token children and copies the original code, not the rendered text', async () => {
  const write = clipboard();
  const code = 'original <text> & "quotes"\nsecond line';
  const { container } = render(<Snippet code={code}>
    <span className="k">curl</span>{' '}<span className="f">-s</span>{' '}
    <span className="u">https://example.com</span>{' '}
    <span className="s">{'"<value>"'}</span>{'\n'}<span className="c"># comment</span>
  </Snippet>);
  expect(container.querySelectorAll('pre span')).toHaveLength(5);
  expect(container.querySelector('pre value')).toBeNull();
  await act(async () => { fireEvent.click(screen.getByRole('button')); });
  expect(write).toHaveBeenCalledWith(code);
});

it('treats string children as text and preserves empty display content', () => {
  const { container, rerender } = render(<Snippet code="original">{'<b>text</b>'}</Snippet>);
  expect(container.querySelector('pre')?.textContent).toBe('<b>text</b>');
  expect(container.querySelector('pre b')).toBeNull();
  rerender(<Snippet code="original">{''}</Snippet>);
  expect(container.querySelector('pre')?.textContent).toBe('');
});

it('omits the copy control and tab stop while keeping highlighted content accessible', async () => {
  const user = userEvent.setup();
  const { container } = render(<><Snippet copy={false} code="curl"><span className="k">curl</span></Snippet><button>Next</button></>);
  expect(container.querySelector('.ui-snippet button')).toBeNull();
  expect(container.querySelector('pre')?.textContent).toBe('curl');
  await user.tab();
  expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
  expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
});

it('discards a pending copy when copying is turned off', async () => {
  let resolve!: () => void;
  clipboard(vi.fn(() => new Promise<void>(done => { resolve = done; })));
  const { rerender } = render(<Snippet code="example" />);
  fireEvent.click(screen.getByRole('button'));
  rerender(<Snippet code="example" copy={false} />);
  await act(async () => { resolve(); });
  rerender(<Snippet code="example" />);
  expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
});

// The bar is narrow and `copy` is on the icon-only closed list in
// src/assets/icons.js, so the resting button is the glyph alone. Everything a
// reader needs then comes from the name and the tooltip. #474
it('is icon-only at rest, named and tooltipped by copyLabel', () => {
  const { container } = render(<Snippet code="npm install example" copyLabel="Copy command" />);
  const button = screen.getByRole('button', { name: 'Copy command' });
  expect(button).toHaveAttribute('title', 'Copy command');
  expect(button).toHaveTextContent('');
  expect(button.querySelector('svg')).not.toBeNull();
  expect(container.querySelector('.ui-snippet__copy')).toBe(button);
});

it('lets the confirmation name the button instead of the resting label', async () => {
  vi.useFakeTimers();
  clipboard();
  render(<Snippet code="npm install example" copyLabel="Copy command" />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy command' })); });
  // aria-label would otherwise win over the text and announce the resting name.
  const copied = screen.getByRole('button', { name: 'Copied' });
  expect(copied).not.toHaveAttribute('aria-label');
  expect(copied).toHaveAttribute('title', 'Copy command');
  act(() => { vi.advanceTimersByTime(1400); });
  expect(screen.getByRole('button', { name: 'Copy command' })).toHaveTextContent('');
});

it('copies raw text and announces success briefly without hiding the value', async () => {
  vi.useFakeTimers();
  const write = clipboard();
  const code = '<b>example</b> & "value"\nsecond line';
  const { container } = render(<Snippet code={code} reveal />);
  expect(container.querySelector('pre')?.textContent).toBe(code);
  expect(container.querySelector('pre b')).toBeNull();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy code' })); });
  expect(write).toHaveBeenCalledWith(code);
  const button = screen.getByRole('button', { name: 'Copied' });
  expect(button).toHaveAttribute('aria-live', 'polite');
  expect(button.querySelector('svg')).not.toBeNull();
  act(() => { vi.advanceTimersByTime(1400); });
  expect(screen.getByRole('button', { name: 'Copy code' })).toBe(button);
  expect(container.querySelector('pre')?.textContent).toBe(code);
});

it('supports keyboard copying without submitting its form', async () => {
  const user = userEvent.setup();
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const submit = vi.fn(event => event.preventDefault());
  render(<form onSubmit={submit}><Snippet code="example" /></form>);
  await user.tab();
  await user.keyboard('{Enter}');
  expect(write).toHaveBeenCalledWith('example');
  expect(submit).not.toHaveBeenCalled();
});

it('reports a rejected write and allows retry', async () => {
  const write = clipboard(vi.fn().mockRejectedValueOnce(new Error('Denied')).mockResolvedValue(undefined));
  render(<Snippet code="example" />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy code' })); });
  expect(screen.getByRole('button', { name: 'Copy failed' })).toHaveAttribute('aria-live', 'polite');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy failed' })); });
  expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  expect(write).toHaveBeenCalledTimes(2);
});

it('does not claim success when the clipboard is unavailable', async () => {
  vi.stubGlobal('navigator', {});
  render(<Snippet code="Select this manually" />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy code' })); });
  expect(screen.getByRole('button', { name: 'Copy failed' })).toBeInTheDocument();
  expect(screen.getByText('Select this manually')).toBeInTheDocument();
});

it('ignores a pending write after the value changes', async () => {
  let resolve!: () => void;
  clipboard(vi.fn(() => new Promise<void>(done => { resolve = done; })));
  const { rerender } = render(<Snippet code="old" />);
  fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
  rerender(<Snippet code="new" />);
  await act(async () => { resolve(); });
  expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
});

it('clears the feedback timer on unmount', async () => {
  vi.useFakeTimers();
  clipboard();
  const { unmount } = render(<Snippet code="example" />);
  await act(async () => { fireEvent.click(screen.getByRole('button')); });
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it('has no axe violations in resting and copied states', async () => {
  clipboard();
  const { container } = render(<Snippet reveal label="Example secret" code="example-only" />);
  const options = { rules: { 'color-contrast': { enabled: false } } };
  expect((await axe.run(container, options)).violations).toEqual([]);
  await act(async () => { fireEvent.click(screen.getByRole('button')); });
  expect((await axe.run(container, options)).violations).toEqual([]);
});
