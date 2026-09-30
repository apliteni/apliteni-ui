import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { AppShell } from './AppShell';

const sections = [
  { href: '/', label: 'Overview', icon: 'home' },
  { href: '/reports', label: 'Reports', icon: 'chart', count: 3 },
  { href: '/reports/saved', label: 'Saved', icon: 'folder' },
  { href: '/settings', label: 'Settings', icon: 'gear' },
  { href: '/help', label: 'Help', icon: 'mail' },
];
const props = { sections, pathname: '/reports/weekly', title: 'Weekly report', account: { name: 'Demo User', email: 'demo@example.com' }, onSignOut: vi.fn() };
afterEach(() => { cleanup(); document.cookie = 'apliteni-ui-rail=; Max-Age=0; path=/'; });

it('uses the longest matching route, keeps counts in link names, and forwards router props', () => {
  const { rerender } = render(<AppShell {...props} renderLink={(item, link) => <a {...link} data-router={item.href} />} />);
  const rail = within(screen.getByRole('navigation', { name: 'Sections' }));
  expect(rail.getByRole('link', { name: 'Reports 3' })).toHaveAttribute('aria-current', 'page');
  expect(rail.getByRole('link', { name: 'Reports 3' })).toHaveAttribute('data-router', '/reports');
  rerender(<AppShell {...props} pathname="/reports/saved/1" />);
  expect(rail.getByRole('link', { name: 'Saved' })).toHaveAttribute('aria-current', 'page');
  expect(rail.getByRole('link', { name: 'Reports 3' })).not.toHaveAttribute('aria-current');
  rerender(<AppShell {...props} pathname="/reports-other" />);
  expect(document.querySelector('[aria-current]')).toBeNull();
});

it('persists the fold and restores it on remount', () => {
  const { unmount } = render(<AppShell {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
  expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');
  expect(document.cookie).toContain('apliteni-ui-rail=collapsed');
  unmount();
  render(<AppShell {...props} />);
  expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');
});

it('opens search with its button and shortcut, dismisses with Escape', () => {
  render(<AppShell {...props} />);
  fireEvent.click(screen.getByRole('button', { name: /Search or run/ }));
  expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
  expect(screen.getByRole('combobox')).toHaveFocus();
});

it('draws a short word for the phone band without changing the trigger\'s name', () => {
  render(<AppShell {...props} />);
  const trigger = screen.getByRole('button', { name: /Search or run/ });
  // aria-hidden, so the short word is not part of the name the assertion above read.
  const short = trigger.querySelector('.ui-app__search-short');
  expect(short).toHaveTextContent('Search');
  expect(short).toHaveAttribute('aria-hidden', 'true');
  expect(trigger.querySelector('.ui-app__search-txt')).toHaveTextContent('Search or run a command…');
  // Which word is drawn is layout.css's 560px block; JSDOM resolves no @media, so
  // stories/apps/shell-states.test.js reads that swap through the real cascade.
  cleanup();

  render(<AppShell {...props} searchLabel="Find anything" searchShortLabel="Find" />);
  const named = screen.getByRole('button', { name: /Find anything/ });
  expect(named.querySelector('.ui-app__search-short')).toHaveTextContent('Find');
  expect(named).toHaveAccessibleName(expect.stringContaining('Find anything'));
});

it('opens the account menu and signs out', () => {
  render(<AppShell {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Signed in as Demo User, demo@example.com' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
  expect(props.onSignOut).toHaveBeenCalledOnce();
});

it('closes More when the route changes', () => {
  const { rerender } = render(<AppShell {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'More' }));
  expect(screen.getByRole('dialog', { name: 'More sections' })).toBeInTheDocument();
  expect(within(screen.getByRole('dialog')).getByRole('link', { name: 'Help' })).toBeInTheDocument();
  rerender(<AppShell {...props} pathname="/help" />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('leaves shortcuts in editable fields alone and updates the theme', () => {
  render(<AppShell {...props}><input aria-label="Notes" /></AppShell>);
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Notes' }), { key: 'k', ctrlKey: true });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const theme = document.documentElement.getAttribute('data-theme');
  fireEvent.click(screen.getByRole('button', { name: /Theme:/ }));
  expect(document.documentElement.getAttribute('data-theme')).toBe(theme === 'light' ? 'dark' : 'light');
});
