// DOM semantics and keyboard order; browser evidence covers shared CSS and layout.
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { NavTabs } from './NavTabs';

const items = [
  { id: 'summary', label: 'Summary', href: '#overview', target: '_blank' },
  { id: 'exports', label: 'Exports', disabled: true },
  { id: 'payouts', label: 'Payouts', badge: 0 },
];
it('uses a labelled navigation landmark and native links, with no panel roles', () => {
  render(<NavTabs items={items} active="payouts" />);
  expect(screen.getByRole('navigation', { name: 'Tabs' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Payouts\s*0/ })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Summary' })).toHaveAttribute('href', '#overview');
  expect(screen.getByRole('link', { name: 'Summary' })).toHaveAttribute('target', '_blank');
  expect(screen.queryByRole('tablist')).toBeNull();
  expect(screen.queryByRole('tabpanel')).toBeNull();
});
it('keeps disabled items out of keyboard navigation and updates current state from props', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<NavTabs items={items} active="exports" />);
  expect(screen.getByText('Exports').parentElement).toHaveAttribute('aria-disabled', 'true');
  expect(document.querySelector('[aria-current]')).toBeNull();
  await user.tab();
  expect(screen.getByRole('link', { name: 'Summary' })).toHaveFocus();
  await user.tab();
  const link = screen.getByRole('link', { name: /Payouts\s*0/ });
  expect(link).toHaveFocus();
  expect(link).toHaveAttribute('href', '#payouts');
  await user.keyboard('{ArrowLeft}');
  expect(link).toHaveFocus();
  rerender(<NavTabs items={items} active="summary" variant="pill" />);
  expect(screen.getByRole('link', { name: 'Summary' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('navigation')).toHaveClass('is-pill');
});
it('forwards the ref, native attributes and added class; renders badge text safely', () => {
  const ref = createRef<HTMLElement>();
  render(<NavTabs ref={ref} id="views" className="custom" aria-label="Views" items={[
    { id: 'one', label: '<b>One</b>', badge: { text: '<i>2</i>', tone: 'danger' } },
    { id: 'two', label: 'Two', badge: '' },
  ]} />);
  expect(ref.current).toBe(screen.getByRole('navigation', { name: 'Views' }));
  expect(ref.current).toHaveClass('ui-nav', 'ui-nav--tabs', 'is-underline', 'custom');
  expect(ref.current).toHaveAttribute('id', 'views');
  expect(ref.current?.querySelectorAll('.ui-nav__badge')).toHaveLength(1);
  expect(ref.current?.querySelector('b, i')).toBeNull();
});
it.each(['underline', 'pill'] as const)('has no axe violations in %s navigation', async variant => {
  const { container } = render(<NavTabs items={items} active="payouts" variant={variant} />);
  expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
});
it.each(['javascript:alert(1)', 'java\nscript:alert(1)', 'data:text/html,test', 'vbscript:test'])('rejects an executable destination: %s', href => {
  render(<NavTabs items={[{ id: 'one', label: 'One', href }]} />);
  expect(screen.getByRole('link')).toHaveAttribute('href', '#');
});
it('reveals a newly current link within the row without moving keyboard focus', () => {
  const { rerender } = render(<NavTabs items={items} active="summary" />);
  const nav = screen.getByRole('navigation');
  const current = screen.getByRole('link', { name: /Payouts\s*0/ });
  Object.defineProperties(nav, { clientWidth: { value: 310 }, scrollWidth: { value: 600 } });
  nav.getBoundingClientRect = () => ({ left: 40, right: 350 }) as DOMRect;
  current.getBoundingClientRect = () => ({ left: 360, right: 450 }) as DOMRect;
  const first = screen.getByRole('link', { name: 'Summary' });
  first.focus();
  rerender(<NavTabs items={items} active="payouts" />);
  expect(nav.scrollLeft).toBe(100);
  expect(first).toHaveFocus();
});
it('drops a null badge the way the vanilla factory does', () => {
  // `counts.pending ?? null` is what a JavaScript caller hands over, and
  // `typeof null` is 'object' — reading `.text` off it took the subtree down.
  render(<NavTabs items={[{ id: 'one', label: 'One', badge: null }]} active="one" />);
  expect(screen.getByRole('link', { name: 'One' })).toBeInTheDocument();
  expect(document.querySelectorAll('.ui-nav__badge')).toHaveLength(0);
});
it('lets a router render the link, with the kit classes and current state intact', () => {
  const seen: string[] = [];
  render(<NavTabs items={items} active="payouts" renderLink={(item, props) => {
    seen.push(item.id);
    return <a {...props} data-router="on" href={`/app${props.href}`} />;
  }} />);
  expect(seen).toEqual(['summary', 'payouts']);
  const current = screen.getByRole('link', { name: /Payouts\s*0/ });
  expect(current).toHaveAttribute('href', '/app#payouts');
  expect(current).toHaveAttribute('data-router', 'on');
  expect(current).toHaveClass('ui-nav__tab', 'is-active');
  expect(current).toHaveAttribute('aria-current', 'page');
  expect(screen.getByText('Exports').parentElement).toHaveAttribute('aria-disabled', 'true');
});
it('keeps the reader\'s scroll position when a parent re-renders with the same tabs', () => {
  // An inline `items={[…]}` is a new array every render. Depending on that
  // array made every unrelated parent render snap the row back.
  const { rerender } = render(<NavTabs items={[...items]} active="payouts" />);
  const nav = screen.getByRole('navigation');
  const current = screen.getByRole('link', { name: /Payouts\s*0/ });
  Object.defineProperties(nav, { clientWidth: { value: 310 }, scrollWidth: { value: 600 } });
  nav.getBoundingClientRect = () => ({ left: 40, right: 350 }) as DOMRect;
  current.getBoundingClientRect = () => ({ left: 360, right: 450 }) as DOMRect;
  nav.scrollLeft = 40;
  rerender(<NavTabs items={[...items]} active="payouts" />);
  expect(nav.scrollLeft).toBe(40);
  rerender(<NavTabs items={[...items, { id: 'ledger', label: 'Ledger' }]} active="payouts" />);
  expect(nav.scrollLeft).toBe(140);
});
