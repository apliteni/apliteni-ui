// DOM semantics and keyboard order; contrast is measured by the story contrast gate.
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { Breadcrumbs } from './Breadcrumbs';

it('links ancestors and renders the last item as current text even with an href', async () => {
  render(<Breadcrumbs items={[
    { label: 'Home', href: '#home', target: '_blank', icon: 'compass' },
    { label: 'Workspace' },
    { label: 'API keys', href: '#keys' },
  ]} />);
  expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('target', '_blank');
  const current = screen.getByText('API keys').parentElement;
  expect(current).toHaveAttribute('aria-current', 'page');
  expect(current?.tagName).toBe('SPAN');
  expect(document.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  await userEvent.setup().tab();
  expect(screen.getByRole('link', { name: 'Home' })).toHaveFocus();
});
it('handles empty and single-item trails and updates the current page', () => {
  const { rerender, container } = render(<Breadcrumbs items={[]} />);
  expect(screen.queryByRole('listitem')).toBeNull();
  rerender(<Breadcrumbs items={[{ label: 'Home', href: '#home' }]} />);
  expect(screen.queryByRole('link')).toBeNull();
  expect(container.querySelector('[aria-current]')).toHaveTextContent('Home');
  rerender(<Breadcrumbs items={[{ label: 'Home', href: '#home' }, { label: 'Settings' }]} />);
  expect(container.querySelectorAll('[aria-current]')).toHaveLength(1);
  expect(container.querySelector('[aria-current]')).toHaveTextContent('Settings');
});
it('forwards root attributes and ref and escapes labels', () => {
  const ref = createRef<HTMLElement>();
  render(<Breadcrumbs ref={ref} aria-label="Location" className="custom" id="trail" items={[{ label: '<b>Page</b>' }]} />);
  expect(ref.current).toBe(screen.getByRole('navigation', { name: 'Location' }));
  expect(ref.current).toHaveClass('ui-nav', 'ui-nav--crumbs', 'custom');
  expect(ref.current).toHaveAttribute('id', 'trail');
  expect(ref.current?.querySelector('b')).toBeNull();
});
it('has no axe violations', async () => {
  const { container } = render(<Breadcrumbs items={[{ label: 'Home', href: '#home', icon: 'compass' }, { label: 'Settings' }]} />);
  expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
});
it.each(['javascript:alert(1)', 'java\nscript:alert(1)', 'data:text/html,test', 'vbscript:test'])('rejects an executable ancestor destination: %s', href => {
  render(<Breadcrumbs items={[{ label: 'Home', href }, { label: 'Page' }]} />);
  expect(screen.getByRole('link')).toHaveAttribute('href', '#');
});
it('lets a router render the ancestor links and leaves the current crumb as text', () => {
  const seen: string[] = [];
  render(<Breadcrumbs renderLink={(item, props) => {
    seen.push(item.label);
    return <a {...props} data-router="on" href={`/app${props.href}`} />;
  }} items={[
    { label: 'Finance', href: '#finance' },
    { label: 'Payouts' },
    { label: 'PY-4821', href: '#py' },
  ]} />);
  expect(seen).toEqual(['Finance']);
  const link = screen.getByRole('link', { name: 'Finance' });
  expect(link).toHaveAttribute('href', '/app#finance');
  expect(link).toHaveAttribute('data-router', 'on');
  expect(link).toHaveClass('ui-nav__crumb');
  expect(screen.getByText('PY-4821').parentElement).toHaveAttribute('aria-current', 'page');
  expect(screen.queryByRole('link', { name: 'PY-4821' })).toBeNull();
});
