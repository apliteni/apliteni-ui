import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { appShell, avatarHue, paletteHotkey, themeIcon, themeToggle } from '@apliteni/apliteni-ui';
import { AppShell } from './AppShell';
import { ThemeToggle } from './ThemeToggle';

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

it('draws the rail mark as the Avatar part with the first and last initials, like the vanilla rail', () => {
  const account = { name: 'Mary Ann Lee', email: 'mary@example.com' };
  render(<AppShell {...props} account={account} />);
  const mark = document.querySelector('.ui-app__av > .ui-avatar') as HTMLElement;
  expect(mark.textContent).toBe('ML');
  expect(mark.classList.contains(`ui-avatar--h${avatarHue('mary@example.com')}`)).toBe(true);
  const vanilla = new DOMParser().parseFromString(appShell({ account }), 'text/html').querySelector('.ui-app__av > .ui-avatar') as HTMLElement;
  expect(vanilla.textContent).toBe(mark.textContent);
  expect(vanilla.className).toBe(mark.className);
});

it('uses the same initials and missing-name rule as the vanilla shell', () => {
  for (const [name, expected] of [['Anne-Marie', 'A'], ['Mary Ann Lee', 'ML'], ['', '']]) {
    const account = { name, email: 'guest@example.com' };
    const { unmount } = render(<AppShell {...props} account={account} />);
    const mark = document.querySelector('.ui-app__av > .ui-avatar') as HTMLElement;
    const vanilla = new DOMParser().parseFromString(appShell({ account }), 'text/html').querySelector('.ui-app__av > .ui-avatar') as HTMLElement;
    if (expected) {
      expect(mark.textContent).toBe(expected);
      expect(vanilla.textContent).toBe(expected);
    } else {
      expect(mark.classList.contains('ui-avatar--anon')).toBe(true);
      expect(vanilla.classList.contains('ui-avatar--anon')).toBe(true);
    }
    unmount();
  }
});

it('keeps the section active under a back link and inks both counts alike', () => {
  const { rerender } = render(<AppShell {...props} back={{ href: '/reports', label: 'Back to Reports' }} />);
  const rail = within(screen.getByRole('navigation', { name: 'Sections' }));
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
  const bar = within(screen.getByRole('navigation', { name: 'Menu sections' }));
  for (const nav of [rail, bar]) {
    const row = nav.getByRole('link', { name: 'Reports 3' });
    // guidelines/going-back.md, section-lit: the weekly report sits under the list,
    // so the list's row stays active without claiming to be the page on screen.
    expect(row).toHaveAttribute('aria-current', 'true');
    // Both navs hand the count the same classes, so `.is-active .is-neutral` re-inks it once.
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

it('draws a short word for the phone band without changing the trigger\'s name', () => {
  render(<AppShell {...props} />);
  const trigger = screen.getByRole('button', { name: /Search or run/ });
  // aria-hidden, so the short word is not part of the name the assertion above read.
  const short = trigger.querySelector('.ui-app__search-short');
  expect(short).toHaveTextContent('Search');
  expect(short).toHaveAttribute('aria-hidden', 'true');
  expect(trigger.querySelector('.ui-app__search-txt')).toHaveTextContent('Search or run a command…');
  // The whole name, anchored: the label, the kit's hotkey for this platform, nothing
  // else. The separator is the engine's, so it is matched and not written — jsdom joins
  // the spans with nothing, and Chromium puts a space there because the label span is a
  // blockified flex item. Measured in Chromium on #486, the same at 1280px and 390px.
  expect(trigger).toHaveAccessibleName(
    expect.stringMatching(new RegExp(`^Search or run a command… ?${paletteHotkey()}$`)));
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

it('keeps the rail account at its foot and removes repeated menu identity and rail counts', () => {
  const onSignOut = vi.fn();
  render(<AppShell {...props} onSignOut={onSignOut} layout="rail" word="Demo" />);
  const rail = within(screen.getByRole('region', { name: 'Sidebar' }));
  expect(rail.getByRole('link', { name: 'Demo' })).toBeInTheDocument();
  expect(rail.getByRole('link', { name: 'Reports' })).toHaveAttribute('aria-current', 'page');
  expect(rail.queryByText('3')).toBeNull();
  expect(document.querySelector('.ui-app__bar:not(.ui-app__bar--phone)')).toBeNull();
  expect(rail.getByText('Demo User')).toBeInTheDocument();
  expect(rail.getByText('demo@example.com')).toBeInTheDocument();
  fireEvent.click(rail.getByRole('button', { name: 'Signed in as Demo User, demo@example.com' }));
  const menu = screen.getByRole('menu');
  expect(within(menu).queryByText('Demo User')).toBeNull();
  expect(within(menu).queryByText('demo@example.com')).toBeNull();
  fireEvent.click(within(menu).getByRole('menuitem', { name: 'Sign out' }));
  expect(onSignOut).toHaveBeenCalledOnce();
});

it('opens every section in a left drawer from the menu button', () => {
  const { rerender } = render(<AppShell {...props} />);
  const button = screen.getByRole('button', { name: 'Menu' });
  expect(button).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(button);
  const drawer = within(screen.getByRole('dialog'));
  expect(button).toHaveAttribute('aria-expanded', 'true');
  for (const item of sections) {
    expect(drawer.getByRole('link', { name: new RegExp(`^${item.label}`) })).toBeInTheDocument();
  }
  expect(drawer.getByRole('link', { name: 'Reports 3' })).toHaveAttribute('aria-current', 'page');
  rerender(<AppShell {...props} pathname="/help" />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('closes the drawer on a row press and on Escape, and returns focus to the button', async () => {
  render(<AppShell {...props} renderLink={(item, link) => <a {...link} onClick={(e) => { e.preventDefault(); link.onClick?.(e); }} />} />);
  const button = screen.getByRole('button', { name: 'Menu' });
  fireEvent.click(button);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Help' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  button.focus();
  fireEvent.click(button);
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await waitFor(() => expect(button).toHaveFocus());
});

it('leaves shortcuts in editable fields alone', () => {
  render(<AppShell {...props}><input aria-label="Notes" /></AppShell>);
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Notes' }), { key: 'k', ctrlKey: true });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

describe('band theme switch', () => {
  const root = document.documentElement;
  let media: EventTarget & { matches: boolean };
  beforeEach(() => {
    localStorage.clear();
    root.removeAttribute('data-theme'); root.removeAttribute('data-theme-choice');
    media = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal('matchMedia', () => media);
    localStorage.setItem('apliteni-strategy-theme', 'dark');
  });
  afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

  it('cycles dark, light and auto, and writes data-theme-choice', () => {
    render(<AppShell {...props} />);
    const button = () => screen.getByRole('button', { name: /^Theme:/ });
    expect(button()).toHaveAccessibleName('Theme: Dark. Switch to light.');
    expect(root).toHaveAttribute('data-theme-choice', 'dark');
    fireEvent.click(button());
    expect(button()).toHaveAccessibleName('Theme: Light. Switch to auto.');
    expect(root).toHaveAttribute('data-theme-choice', 'light');
    expect(root).toHaveAttribute('data-theme', 'light');
    fireEvent.click(button());
    expect(button()).toHaveAccessibleName('Theme: Auto. Switch to dark.');
    expect(root).toHaveAttribute('data-theme-choice', 'auto');
    fireEvent.click(button());
    expect(root).toHaveAttribute('data-theme-choice', 'dark');
  });

  it.each(['dark', 'light', 'auto'] as const)('draws one %s glyph in vanilla themeToggle(), ThemeToggle and the band', theme => {
    localStorage.setItem('apliteni-strategy-theme', theme);
    const vanilla = document.createElement('div');
    vanilla.innerHTML = themeToggle(theme);
    const glyph = (el: ParentNode) => el.querySelector('.ic')!.innerHTML;
    const band = render(<AppShell {...props} />);
    const bandButton = band.container.querySelector('.toggle')!;
    const alone = render(<ThemeToggle />);
    expect(glyph(alone.container)).toBe(glyph(vanilla));
    expect(glyph(bandButton)).toBe(glyph(vanilla));
    const source = document.createElement('span');
    source.innerHTML = themeIcon(theme);
    expect(glyph(vanilla)).toBe(source.innerHTML);
  });

  it('follows the system live in auto', async () => {
    localStorage.setItem('apliteni-strategy-theme', 'auto');
    render(<AppShell {...props} />);
    expect(root).toHaveAttribute('data-theme', 'dark');
    act(() => { media.matches = true; media.dispatchEvent(new Event('change')); });
    await waitFor(() => expect(root).toHaveAttribute('data-theme', 'light'));
    expect(root).toHaveAttribute('data-theme-choice', 'auto');
  });
});

// A list of one destination is a list pointing at the page already on screen. The
// rule holds at every width: no rail list, no fold to close it, and no menu button.
it('draws no section navigation for a single section, at any width', () => {
  const one = [{ href: '/changes', label: 'Changes', icon: 'doc' }];
  const { rerender } = render(<AppShell {...props} sections={one} pathname="/changes" />);
  expect(screen.queryByRole('navigation', { name: 'Sections' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Changes' })).toBeNull();
  expect(document.querySelector('[aria-current]')).toBeNull();
  expect(screen.queryByRole('button', { name: /sidebar$/i })).toBeNull();
  // What the shell keeps: its brand, and the section as a palette entry.
  expect(screen.getByRole('link', { name: props.word ?? 'apliteni-ui' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Search or run a command/ }));
  expect(within(screen.getByRole('dialog')).getByText('Changes')).toBeInTheDocument();

  // Two destinations are a choice, and every part comes back.
  rerender(<AppShell {...props} sections={[...one, { href: '/costs', label: 'Costs', icon: 'chart' }]} pathname="/changes" />);
  expect(within(screen.getByRole('navigation', { name: 'Sections' })).getByRole('link', { name: 'Changes' }))
    .toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument();
});

// One section under a child page is somewhere to go: the row is the page's parent, so
// the list comes back and marks it "true" rather than "page".
// why: guidelines/going-back.md#keep-the-section-active
it('keeps a single section when it is the parent of the page on screen', () => {
  const one = [{ href: '/invoices', label: 'Invoices', icon: 'doc' }];
  render(<AppShell {...props} sections={one} pathname="/invoices" back={{ href: '/invoices', label: 'Invoices' }} />);
  expect(within(screen.getByRole('navigation', { name: 'Sections' })).getByRole('link', { name: 'Invoices' }))
    .toHaveAttribute('aria-current', 'true');
  expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument();
});
