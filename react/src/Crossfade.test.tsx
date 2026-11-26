// The count cross-fade: a value present at load stays still, and a value that
// changes keeps the outgoing text until the incoming text has faded in.
import { cleanup, render } from '@testing-library/react';
import { afterEach } from 'vitest';
import { Crossfade } from './Crossfade';

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
