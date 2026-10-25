import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';
import { Button } from './primitives/Button';

afterEach(cleanup);

// The markup the vanilla emptyState() wrote for each case is stored as a snapshot,
// written in the commit where the two last matched (#429 removed the factory).

it.each(['first-run', 'no-matches', 'not-found', 'not-yet-built'] as const)('keeps the markup the vanilla empty state agreed on: %s', (variant) => {
  const { container } = render(<EmptyState variant={variant} />);
  expect(container.innerHTML).toMatchSnapshot();
});

it('keeps the agreed markup for custom copy and omits empty text', () => {
  const { container, rerender } = render(<EmptyState title="Nothing here" sub="Add a row." icon="folder" />);
  expect(container.innerHTML).toMatchSnapshot();
  rerender(<EmptyState title="" sub="" icon="" />);
  expect(container.innerHTML).toMatchSnapshot();
});

it('uses the illustration slot and hides its artwork', () => {
  const { container, queryByRole } = render(<EmptyState art={<svg role="img" aria-label="Folder" />} />);
  expect(container.querySelector('.ui-empty__art')).toHaveAttribute('aria-hidden', 'true');
  expect(container.querySelector('.ui-empty__icon')).toBeNull();
  expect(queryByRole('img')).toBeNull();
});

it('keeps React actions in the action row', () => {
  const onClick = vi.fn();
  const { container, getByRole } = render(<EmptyState actions={<>
    <Button variant="primary" onClick={onClick}>Create item</Button>
    <a className="ui-btn ui-btn--ghost" href="/help">Help</a>
  </>} />);
  expect(container.querySelector('.ui-empty__actions')?.children).toHaveLength(2);
  fireEvent.click(getByRole('button', { name: 'Create item' }));
  expect(onClick).toHaveBeenCalledOnce();
  expect(getByRole('button')).toHaveAttribute('type', 'button');
  expect(getByRole('link')).toHaveAttribute('href', '/help');
});

it('keeps caller text as text', () => {
  const { container, getByText } = render(<EmptyState title={'<img src=x>'} sub={'<script>bad()</script>'} />);
  expect(getByText('<img src=x>')).toBeVisible();
  expect(container.querySelector('img, script')).toBeNull();
});

// The snapshots cover structure; browser captures cover CSS and fonts.
it.each(['people', 'invoices', 'inbox'])('keeps the agreed markup for named artwork: %s', art => {
  const { container } = render(<EmptyState art={art} title="Nothing here" sub="Add an item." />);
  expect(container.innerHTML).toMatchSnapshot();
});

it('keeps the agreed markup for trusted SVG artwork', () => {
  const art = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="4"></circle></svg>';
  const { container } = render(<EmptyState art={art} title="Nothing here" sub="" />);
  expect(container.innerHTML).toMatchSnapshot();
});
