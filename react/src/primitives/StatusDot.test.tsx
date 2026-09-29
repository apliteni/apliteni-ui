import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { StatusDot } from './StatusDot';

// jsdom checks semantics, not pulse animation, contrast, or screen-reader output.
it('hides a decorative dot beside its visible status text', () => {
  const { container } = render(<span><StatusDot live /> API online</span>);
  expect(container.querySelector('.ui-dot')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.queryByRole('img')).toBeNull();
  expect(screen.getByText('API online')).toBeVisible();
});

it('names a meaningful dot and updates its state in place', () => {
  const { rerender } = render(<StatusDot live aria-label="API online" />);
  const dot = screen.getByRole('img', { name: 'API online' });
  expect(dot).toHaveClass('ui-dot', 'is-live');
  expect(dot).not.toHaveAttribute('aria-hidden');
  rerender(<StatusDot aria-label="API idle" />);
  expect(screen.getByRole('img', { name: 'API idle' })).toBe(dot);
  expect(dot).not.toHaveClass('is-live');
  expect(dot).not.toHaveAttribute('tabindex');
});

it('accepts an external label and forwards its ref, attributes and classes', () => {
  const ref = createRef<HTMLSpanElement>();
  render(<><span id="status">Idle</span><StatusDot ref={ref} aria-labelledby="status" className="connection" title="Connection" /></>);
  expect(ref.current).toBe(screen.getByRole('img', { name: 'Idle' }));
  expect(ref.current).toHaveClass('ui-dot', 'connection');
  expect(ref.current).toHaveAttribute('title', 'Connection');
});

it('treats an empty label as decorative', () => {
  const { container } = render(<StatusDot aria-label="  " />);
  expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  expect(screen.queryByRole('img')).toBeNull();
});

it('has no axe violations in decorative and labelled compositions', async () => {
  const { container } = render(<main><span><StatusDot live /> API online</span><StatusDot aria-label="Idle" /></main>);
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations).toEqual([]);
});
