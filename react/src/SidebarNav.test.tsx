// DOM tests cover names, state and composition; browser evidence covers CSS and layout.
import { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';
import { ENTRANCE_FALLBACK_MS } from '@apliteni/apliteni-ui/motion';
import { SidebarNav, type SidebarNavItem, type SidebarNavLeaf, type SidebarNavSection } from './SidebarNav';

afterEach(cleanup);
const items: SidebarNavItem[] = [
  { id: 'home', label: 'Home', icon: 'chart' },
  { id: 'payouts', label: 'Payouts', items: [{ id: 'pending', label: 'Pending', badge: 0 }, { id: 'history', label: 'History' }] },
  { id: 'settings', label: 'Settings', disabled: true },
];

const rows = [items[0], items[2]] as SidebarNavLeaf[];

it('labels sections, and exposes the current page and counts at either width', () => {
  render(<SidebarNav sections={[{ label: 'Finance', items: rows }]} active="home" />);
  expect(screen.getByRole('list', { name: 'Finance' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  cleanup();
  const { rerender } = render(<SidebarNav items={items} active="pending" />);
  expect(screen.getByRole('link', { name: 'Pending 0' })).toHaveAttribute('aria-current', 'page');
  // The visible text is in the name, so speech input finds the row by what it shows (WCAG
  // 2.5.3). jsdom has no layout, so this reads the text nodes, as axe's
  // label-content-name-mismatch does, but not whether the browser draws each one.
  const counted = screen.getByRole('link', { name: 'Pending 0' });
  expect(counted.getAttribute('aria-label')).toContain(counted.textContent);
  // The parent of the current sub-item is current too (#843).
  expect(screen.getByRole('button', { name: 'Payouts' })).toHaveClass('is-current');
  rerender(<SidebarNav items={items} active="pending" collapsed />);
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

it('opens the group holding the current page and keeps a close while the page stays', () => {
  const { rerender } = render(<SidebarNav items={items} />);
  rerender(<SidebarNav items={items} active="pending" />);
  expect(screen.getByRole('link', { name: 'Pending 0' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Payouts' }));
  rerender(<SidebarNav items={items} active="pending" />);
  expect(screen.getByRole('button', { name: 'Payouts' })).toHaveAttribute('aria-expanded', 'false');
});

it('nests one level deep, where sidebarNav() caps it', () => {
  // sideGroup() maps its children through sideLeaf(), which has no group branch, so
  // a vanilla grandchild never reaches the DOM. The cast is the point of the test:
  // the type forbids this shape, and a JavaScript caller can still pass it.
  const deep = [{
    id: 'payouts', label: 'Payouts', defaultOpen: true,
    items: [{ id: 'pending', label: 'Pending', items: [{ id: 'daily', label: 'Daily' }] }],
  }] as unknown as SidebarNavItem[];
  render(<SidebarNav items={deep} />);
  expect(screen.getAllByRole('button')).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'Pending' })).toHaveClass('ui-nav__item--sub');
  expect(screen.queryByText('Daily')).not.toBeInTheDocument();
});

// The active sub-item stays visible (#843): a closed default stays closed only while the
// current page is elsewhere, and a page arriving in a closed group opens it again.
it('shows the current sub-item over a closed default and over an earlier close', () => {
  const group = [{ ...items[1], defaultOpen: false }, items[0]];
  const { rerender } = render(<SidebarNav items={group} active="pending" />);
  const toggle = screen.getByRole('button', { name: 'Payouts' });
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  rerender(<SidebarNav items={group} active="home" />);
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(toggle);
  fireEvent.click(toggle);
  rerender(<SidebarNav items={group} active="history" />);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('link', { name: 'History' })).toBeVisible();
  // A close holds while the page stays put, and a move to another of its rows opens it.
  fireEvent.click(toggle);
  rerender(<SidebarNav items={group} active="history" />);
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  rerender(<SidebarNav items={group} active="pending" />);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('link', { name: 'Pending 0' })).toBeVisible();
});

it('turns an executable link scheme into a dead link', () => {
  render(<SidebarNav items={[{ id: 'x', label: 'Bad', icon: 'home', href: 'javascript:alert(1)' }, { id: 'y', label: 'Good', icon: 'home', href: '/payouts' }]} />);
  expect(screen.getByRole('link', { name: 'Bad' })).toHaveAttribute('href', '#');
  expect(screen.getByRole('link', { name: 'Good' })).toHaveAttribute('href', '/payouts');
});

// A sidebar takes group labels or sub-items, never both (#843). The type refuses the mix
// (SidebarNav.types.tsx); a JavaScript caller gets this warning, and the rows still draw.
it('warns when one sidebar mixes group labels and sub-items', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    render(<SidebarNav sections={[{ label: 'Finance', items: rows }]} />);
    render(<SidebarNav items={items} />);
    expect(warn).not.toHaveBeenCalled();
    const mixed = [{ label: 'Finance', items: rows }, { items }] as SidebarNavSection[] as never;
    render(<SidebarNav sections={mixed} />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/group labels or sub-items, never both/);
    expect(screen.getAllByRole('button', { name: 'Payouts' })).toHaveLength(2);
  } finally { warn.mockRestore(); }
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
  const sections = [{ label: 'Finance', items: rows }];
  const { container } = render(<><SidebarNav sections={sections} /><SidebarNav sections={sections} />
    <SidebarNav items={items} /><SidebarNav items={items} /></>);
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
    act(() => vi.advanceTimersByTime(ENTRANCE_FALLBACK_MS));
    expect(list).not.toHaveClass('is-entering');
  } finally { vi.useRealTimers(); }
});
