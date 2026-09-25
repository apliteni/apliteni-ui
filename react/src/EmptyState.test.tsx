import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { emptyState } from '@apliteni/apliteni-ui';
import { EmptyState } from './EmptyState';
import { Button } from './primitives/Button';

afterEach(cleanup);

function vanilla(props?: Record<string, unknown>) {
  const host = document.createElement('div');
  host.innerHTML = emptyState(props);
  return host.innerHTML;
}

it.each([
  ['first-run', 'Nothing needs you yet', 'New items will appear here when they need your attention.', 'check'],
  ['no-matches', 'No results in this view', 'Try another search or clear your filters.', 'search'],
  ['not-found', "We can't find that page", 'Check the address or return to the home page.', 'folder'],
  ['not-yet-built', 'This ships later', 'This screen is not available yet. Check back later.', 'clock'],
] as const)('matches vanilla markup for %s', (variant, title, sub, icon) => {
  const { container } = render(<EmptyState variant={variant} />);
  const html = variant === 'not-found'
    ? container.innerHTML.replace('<h1 ', '<div ').replace('</h1>', '</div>')
    : container.innerHTML;
  expect(html).toBe(vanilla({ title, sub, icon }));
  if (variant === 'not-found') expect(container.querySelectorAll('h1')).toHaveLength(1);
});

it('matches vanilla custom copy and omits empty text', () => {
  const { container, rerender } = render(<EmptyState title="Nothing here" sub="Add a row." icon="folder" />);
  expect(container.innerHTML).toBe(vanilla({ title: 'Nothing here', sub: 'Add a row.', icon: 'folder' }));
  rerender(<EmptyState title="" sub="" icon="" />);
  expect(container.innerHTML).toBe(vanilla());
});

it('uses the vanilla illustration slot and hides its artwork', () => {
  const { container, queryByRole } = render(<EmptyState art={<svg role="img" aria-label="Folder" />} />);
  expect(container.querySelector('.ui-empty__art')).toHaveAttribute('aria-hidden', 'true');
  expect(container.querySelector('.ui-empty__icon')).toBeNull();
  expect(queryByRole('img')).toBeNull();
});

it('keeps React actions in the vanilla action row', () => {
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
