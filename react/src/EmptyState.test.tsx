import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { emptyState } from '@apliteni/apliteni-ui';
import { EmptyState } from './EmptyState';

afterEach(cleanup);

it.each([
  ['first-run', 'Nothing needs you yet', 2],
  ['no-matches', 'No results in this view', 2],
  ['not-found', "We can't find that page", 1],
  ['not-yet-built', 'This ships later', 2],
] as const)('provides the %s case', (variant, title, level) => {
  const { getByRole, container } = render(<EmptyState variant={variant} />);
  expect(getByRole('heading', { name: title, level })).toBeVisible();
  expect(container.querySelector('.ui-empty__sub')?.textContent).toBeTruthy();
  expect(container.querySelector('.ui-empty__icon')).toHaveAttribute('aria-hidden', 'true');
  expect(container.querySelector('.ui-empty__actions')).toBeNull();
});

it('defaults to first run and lets callers describe their own data', () => {
  const { getByRole, getByText, container } = render(
    <EmptyState title="No invoices yet" sub="Invoices you create appear here." level={3} className="example" />,
  );
  expect(getByRole('heading', { level: 3, name: 'No invoices yet' })).toBeVisible();
  expect(getByText('Invoices you create appear here.')).toBeVisible();
  expect(container.firstChild).toHaveClass('ui-empty', 'example');
});

it('reuses the vanilla layout classes with a tile modifier', () => {
  const { container } = render(<EmptyState title="Nothing here" sub="Add a row." icon="folder" />);
  const vanilla = document.createElement('div');
  vanilla.innerHTML = emptyState({ title: 'Nothing here', sub: 'Add a row.', icon: 'folder' });
  for (const element of vanilla.querySelectorAll('[class]')) {
    for (const cls of element.classList) expect(container.querySelector(`.${cls}`)).not.toBeNull();
  }
});

it('hides a custom illustration and replaces the icon tile', () => {
  const { container, queryByRole } = render(<EmptyState illustration={<svg role="img" aria-label="Folder" />} />);
  expect(container.querySelector('.ui-empty__art')).toHaveAttribute('aria-hidden', 'true');
  expect(container.querySelector('.ui-empty__icon')).toBeNull();
  expect(queryByRole('img')).toBeNull();
});

it('renders working primary and ghost buttons without submitting a form', () => {
  const onClick = vi.fn();
  const { getByRole } = render(<EmptyState primaryAction={{ label: 'Create invoice', onClick }} secondaryAction={{ label: 'Help', onClick }} />);
  const primary = getByRole('button', { name: 'Create invoice' });
  expect(primary).toHaveClass('ui-btn--primary');
  expect(primary).toHaveAttribute('type', 'button');
  expect(getByRole('button', { name: 'Help' })).toHaveClass('ui-btn--ghost');
  fireEvent.click(primary);
  expect(onClick).toHaveBeenCalledOnce();
});

it('renders navigation actions as links and supports a secondary action alone', () => {
  const { getByRole, queryByRole } = render(<EmptyState variant="not-found" secondaryAction={{ label: 'Go home', href: '/' }} />);
  expect(getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
  expect(getByRole('link')).toHaveClass('ui-btn', 'ui-btn--ghost');
  expect(queryByRole('button')).toBeNull();
});

it('keeps caller text as text', () => {
  const { container, getByText } = render(<EmptyState title={'<img src=x>'} sub={'<script>bad()</script>'} />);
  expect(getByText('<img src=x>')).toBeVisible();
  expect(container.querySelector('img, script')).toBeNull();
});
