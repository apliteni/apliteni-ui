import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Pill } from './Pill';

// DOM behavior only; Storybook captures cover shared CSS and layout.
it('renders metadata as text without an interactive role', () => {
  render(<Pill>{'<img src=x>'}</Pill>);
  const pill = screen.getByText('<img src=x>');
  expect(pill.tagName).toBe('SPAN');
  expect(pill).not.toHaveAttribute('role');
  expect(pill).not.toHaveAttribute('tabindex');
  expect(pill.querySelector('img')).toBeNull();
});

it('updates status and children without replacing the element', () => {
  const { rerender } = render(<Pill>Product units</Pill>);
  const pill = screen.getByText('Product units');
  expect(pill).toHaveClass('ui-pill', { exact: true });
  rerender(<Pill variant="live">Live</Pill>);
  expect(screen.getByText('Live')).toBe(pill);
  expect(pill).toHaveClass('ui-pill--live');
  rerender(<Pill variant="soon">Coming soon</Pill>);
  expect(pill).toHaveClass('ui-pill--soon');
  expect(pill).not.toHaveClass('ui-pill--live');
});

it('forwards the ref, native attributes, custom classes and React children', () => {
  const ref = createRef<HTMLSpanElement>();
  render(<Pill ref={ref} className="metadata" title="Unit count" id="units"><b>2</b> agents</Pill>);
  expect(ref.current).toBe(screen.getByTitle('Unit count'));
  expect(ref.current).toHaveClass('ui-pill', 'metadata');
  expect(ref.current).toHaveAttribute('id', 'units');
  expect(ref.current?.querySelector('b')).toHaveTextContent('2');
});
