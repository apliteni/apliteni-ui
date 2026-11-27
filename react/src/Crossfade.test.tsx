// The count cross-fade: a value present at load stays still, and a value that
// changes keeps the outgoing text until the incoming text has faded in.
import { cleanup, render } from '@testing-library/react';
import { afterEach } from 'vitest';
import { Crossfade } from './Crossfade';

function Amount({ amount }: { amount: number }) {
  return <>{amount}</>;
}

afterEach(cleanup);

it('renders the value without an outgoing layer on first render', () => {
  const { container } = render(<Crossfade value="14,941.27" />);
  expect(container.querySelector('.ui-crossfade__in')?.textContent).toBe('14,941.27');
  expect(container.querySelector('.ui-crossfade__out')).toBeNull();
});

it('keeps the outgoing value while the incoming value fades in', () => {
  const { container, rerender } = render(<Crossfade value="14,941.27" />);
  rerender(<Crossfade value="14,942.27" />);
  expect(container.querySelector('.ui-crossfade__in')?.textContent).toBe('14,942.27');
  const out = container.querySelector('.ui-crossfade__out');
  expect(out?.textContent).toBe('14,941.27');
  expect(out).toHaveAttribute('aria-hidden', 'true');
});

it('does not cross-fade when the value is unchanged', () => {
  const { container, rerender } = render(<Crossfade value="14,941.27" />);
  rerender(<Crossfade value="14,941.27" />);
  expect(container.querySelector('.ui-crossfade__out')).toBeNull();
});

it('updates props in place and keeps focus when a re-render passes a new node with the same text', () => {
  const { container, rerender } = render(<Crossfade value={<a href="/period-a">42</a>} />);
  const link = container.querySelector('a');
  link?.focus();
  expect(document.activeElement).toBe(link);
  rerender(<Crossfade value={<a href="/period-b">42</a>} />);
  expect(container.querySelector('.ui-crossfade__out')).toBeNull();
  expect(container.querySelector('a')).toBe(link);
  expect(document.activeElement).toBe(link);
  expect(link).toHaveAttribute('href', '/period-b');
  expect(link?.textContent).toBe('42');
});

it('fades a component value whose text only appears when rendered', () => {
  const { container, rerender } = render(<Crossfade value={<Amount amount={42} />} />);
  expect(container.querySelector('.ui-crossfade__in')?.textContent).toBe('42');
  rerender(<Crossfade value={<Amount amount={43} />} />);
  expect(container.querySelector('.ui-crossfade__in')?.textContent).toBe('43');
  expect(container.querySelector('.ui-crossfade__out')?.textContent).toBe('42');
});
