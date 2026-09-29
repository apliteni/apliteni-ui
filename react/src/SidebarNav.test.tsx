// DOM tests cover names, state and composition; browser evidence covers CSS and layout.
import { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';
import { SidebarNav, type SidebarNavItem } from './SidebarNav';

afterEach(cleanup);
const items: SidebarNavItem[] = [
  { id: 'home', label: 'Home', icon: 'chart' },
  { id: 'payouts', label: 'Payouts', items: [{ id: 'pending', label: 'Pending', badge: 0 }, { id: 'history', label: 'History' }] },
  { id: 'settings', label: 'Settings', disabled: true },
];

it('labels sections and exposes the current page and counts at either width', () => {
  const { rerender } = render(<SidebarNav sections={[{ label: 'Finance', items }]} active="pending" />);
  expect(screen.getByRole('list', { name: 'Finance' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Pending 0' })).toHaveAttribute('aria-current', 'page');
  rerender(<SidebarNav sections={[{ label: 'Finance', items }]} active="pending" collapsed />);
  expect(screen.getByRole('link', { name: 'Pending 0' })).toHaveAttribute('title', 'Pending 0');
  expect(screen.getByRole('button', { name: 'Payouts' })).toHaveAttribute('aria-expanded', 'true');
});

it('toggles its controlled list using Enter and Space while collapsed', async () => {
  const user = userEvent.setup();
  render(<SidebarNav items={items} collapsed />);
  const toggle = screen.getByRole('button', { name: 'Payouts' });
  const list = document.getElementById(toggle.getAttribute('aria-controls')!)!;
  expect(list).not.toBeVisible();
  toggle.focus();
  await user.keyboard('{Enter}');
  expect(list).toBeVisible();
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await user.keyboard(' ');
  expect(list).not.toBeVisible();
  expect(toggle).toHaveFocus();
});

it('opens ancestors of a current page and keeps explicit user disclosure choices', () => {
  const tree = [{ id: 'outer', label: 'Outer', items }];
  const { rerender } = render(<SidebarNav items={tree} />);
  rerender(<SidebarNav items={tree} active="pending" />);
  expect(screen.getByRole('link', { name: 'Pending 0' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Payouts' }));
  rerender(<SidebarNav items={tree} active="history" />);
  expect(screen.getByRole('button', { name: 'Payouts' })).toHaveAttribute('aria-expanded', 'false');
});

it('honors a closed default even when the group contains the current page', () => {
  render(<SidebarNav items={[{ ...items[1], defaultOpen: false }]} active="pending" />);
  expect(screen.getByRole('button', { name: 'Payouts' })).toHaveAttribute('aria-expanded', 'false');
});

it('renders disabled rows without destinations, tab stops or router calls', () => {
  const renderLink = vi.fn((_item, props) => <a {...props} />);
  render(<SidebarNav items={[items[2]]} renderLink={renderLink} />);
  expect(screen.getByRole('link', { name: 'Settings' })).not.toHaveAttribute('href');
  expect(screen.getByRole('link', { name: 'Settings' })).not.toHaveAttribute('tabindex');
  expect(screen.getByText('Settings')).toHaveClass('ui-nav__label');
  expect(screen.getByText('Settings').parentElement).toHaveAttribute('aria-disabled', 'true');
  expect(renderLink).not.toHaveBeenCalled();
});

it('passes link semantics and children to a router and distinguishes an active section', () => {
  render(<SidebarNav items={items} active="home" activeIs="section"
    renderLink={(item, props) => <a {...props} data-route={item.id} />} />);
  expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'true');
  expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('data-route', 'home');
});

it('supports footer and artwork slots, danger rows, refs and nav attributes', () => {
  const ref = createRef<HTMLElement>();
  render(<SidebarNav ref={ref} aria-label="Workspace" id="workspace" className="custom"
    items={[{ id: 'logout', label: 'Sign out', danger: true, leading: <svg aria-hidden="true" /> }]}
    footer={<a href="#help">Help</a>} />);
  expect(ref.current).toBe(screen.getByRole('navigation', { name: 'Workspace' }));
  expect(ref.current).toHaveClass('custom', 'ui-nav', 'ui-nav--side');
  expect(screen.getByRole('link', { name: 'Sign out' })).toHaveClass('is-danger');
  expect(screen.getByRole('link', { name: 'Help' }).parentElement).toHaveClass('ui-nav__foot');
});

it('gives separate instances unique disclosure and caption IDs', () => {
  const sections = [{ label: 'Finance', items }];
  const { container } = render(<><SidebarNav sections={sections} /><SidebarNav sections={sections} /></>);
  const ids = [...container.querySelectorAll('[id]')].map(node => node.id);
  expect(new Set(ids).size).toBe(ids.length);
});

it('clears entrance state if the browser never sends animationend', () => {
  vi.useFakeTimers();
  try {
    render(<SidebarNav items={items} />);
    const toggle = screen.getByRole('button', { name: 'Payouts' });
    fireEvent.click(toggle);
    const list = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(list).toHaveClass('is-entering');
    act(() => vi.advanceTimersByTime(1000));
    expect(list).not.toHaveClass('is-entering');
  } finally { vi.useRealTimers(); }
});
