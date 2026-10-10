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

it('keeps the section active under a back link and inks both counts alike', () => {
  const { rerender } = render(<AppShell {...props} back={{ href: '/reports', label: 'Back to Reports' }} />);
  const rail = within(screen.getByRole('navigation', { name: 'Sections' }));
  const bar = within(screen.getByRole('navigation', { name: 'Sections on mobile' }));
  for (const nav of [rail, bar]) {
    const row = nav.getByRole('link', { name: 'Reports 3' });
    // guidelines/going-back.md, section-lit: the weekly report sits under the list,
    // so the list's row stays active without claiming to be the page on screen.
    expect(row).toHaveAttribute('aria-current', 'true');
    // Both navs hand the count the same classes, so `.is-active .is-neutral` re-inks
    // it once. Without is-neutral the bar's count kept --text against the rail's --strong.
    expect(within(row).getByText('3')).toHaveClass('ui-nav__badge', 'is-neutral');
  }
  // And the back link is what decides it: without one the same row is the page.
  // shell.js decides the same way, from the same back link.
  rerender(<AppShell {...props} />);
  expect(within(screen.getByRole('navigation', { name: 'Sections' }))
    .getByRole('link', { name: 'Reports 3' })).toHaveAttribute('aria-current', 'page');
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

// A list of one destination is a list pointing at the page already on screen. The
// rule holds at every width: no rail list, no fold to close it, and no bottom bar
// — whose 96px of a phone the clearance is keyed on in AppShell.css.
it('draws no section navigation for a single section, at any width', () => {
  const one = [{ href: '/changes', label: 'Changes', icon: 'doc' }];
  const { rerender } = render(<AppShell {...props} sections={one} pathname="/changes" />);
  for (const name of ['Sections', 'Sections on mobile']) {
    expect(screen.queryByRole('navigation', { name })).toBeNull();
  }
  expect(document.querySelector('.ui-react-app__bottom')).toBeNull();
  expect(screen.queryByRole('link', { name: 'Changes' })).toBeNull();
  expect(document.querySelector('[aria-current]')).toBeNull();
  expect(screen.queryByRole('button', { name: /sidebar$/i })).toBeNull();
  // What the shell keeps: its brand, and the section as a palette entry.
  expect(screen.getByRole('link', { name: props.word ?? 'apliteni-ui' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Search or run a command/ }));
  expect(within(screen.getByRole('dialog')).getByText('Changes')).toBeInTheDocument();

  // Two destinations are a choice, and every part comes back.
  rerender(<AppShell {...props} sections={[...one, { href: '/costs', label: 'Costs', icon: 'chart' }]} pathname="/changes" />);
  for (const name of ['Sections', 'Sections on mobile']) {
    expect(within(screen.getByRole('navigation', { name })).getByRole('link', { name: 'Changes' }))
      .toHaveAttribute('aria-current', 'page');
  }
  expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument();
});

// One section under a child page is somewhere to go: the row is the page's parent, so
// the list comes back and marks it "true" rather than "page".
// why: guidelines/going-back.md#keep-the-section-active
it('keeps a single section when it is the parent of the page on screen', () => {
  const one = [{ href: '/invoices', label: 'Invoices', icon: 'doc' }];
  render(<AppShell {...props} sections={one} pathname="/invoices" back={{ href: '/invoices', label: 'Invoices' }} />);
  for (const name of ['Sections', 'Sections on mobile']) {
    expect(within(screen.getByRole('navigation', { name })).getByRole('link', { name: 'Invoices' }))
      .toHaveAttribute('aria-current', 'true');
  }
  expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument();
});
