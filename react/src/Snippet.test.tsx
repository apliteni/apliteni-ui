import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import axe from 'axe-core';
import { Snippet } from './Snippet';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

function clipboard(writeText = vi.fn().mockResolvedValue(undefined)) {
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  return writeText;
}

// jsdom checks behavior and semantics; browser evidence covers layout and contrast.
for (const reveal of [false, true]) {
  it(`keeps selectable plain text (reveal=${reveal})`, () => {
    const { container } = render(<Snippet reveal={reveal} label="Terminal" code="npm install example" copyLabel="Copy command" />);
    expect(container.firstChild).toHaveClass('ui-snippet');
    expect(container.firstChild).toHaveClass(reveal ? 'ui-snippet--reveal' : 'ui-snippet');
    expect(container.querySelector('pre')).toHaveTextContent('npm install example');
    expect(screen.getByRole('button', { name: 'Copy command' })).toHaveAttribute('type', 'button');
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
  expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
});

it('copies raw text and announces success briefly without hiding the value', async () => {
  vi.useFakeTimers();
  const write = clipboard();
  const code = '<b>example</b> & "value"\nsecond line';
  const { container } = render(<Snippet code={code} reveal />);
  expect(container.querySelector('pre')?.textContent).toBe(code);
  expect(container.querySelector('pre b')).toBeNull();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy' })); });
  expect(write).toHaveBeenCalledWith(code);
  const button = screen.getByRole('button', { name: 'Copied' });
  expect(button).toHaveAttribute('aria-live', 'polite');
  expect(button.querySelector('svg')).not.toBeNull();
  act(() => { vi.advanceTimersByTime(1400); });
  expect(screen.getByRole('button', { name: 'Copy' })).toBe(button);
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
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy' })); });
  expect(screen.getByRole('button', { name: 'Copy failed' })).toHaveAttribute('aria-live', 'polite');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy failed' })); });
  expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  expect(write).toHaveBeenCalledTimes(2);
});

it('does not claim success when the clipboard is unavailable', async () => {
  vi.stubGlobal('navigator', {});
  render(<Snippet code="Select this manually" />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy' })); });
  expect(screen.getByRole('button', { name: 'Copy failed' })).toBeInTheDocument();
  expect(screen.getByText('Select this manually')).toBeInTheDocument();
});

it('ignores a pending write after the value changes', async () => {
  let resolve!: () => void;
  clipboard(vi.fn(() => new Promise<void>(done => { resolve = done; })));
  const { rerender } = render(<Snippet code="old" />);
  fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
  rerender(<Snippet code="new" />);
  await act(async () => { resolve(); });
  expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
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
