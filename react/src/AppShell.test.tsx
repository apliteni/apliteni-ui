import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { avatarHue, paletteHotkey, themeIcon } from '@apliteni/apliteni-ui';
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
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
afterEach(() => { cleanup(); document.cookie = 'apliteni-ui-rail=; Max-Age=0; path=/'; });

it('places breadcrumbs before the page title', () => {
  render(<AppShell {...props} layout="rail" crumbs={[{ label: 'Finance', href: '/' }, { label: 'Payouts' }]} />);
  const main = screen.getByRole('main');
  expect(main.firstElementChild).toBe(screen.getByRole('navigation', { name: 'Breadcrumb' }));
  expect(within(main).getByRole('link', { name: 'Finance' })).toHaveAttribute('href', '/');
  expect(within(main).getByText('Payouts').closest('.ui-nav__crumb')).toHaveAttribute('aria-current', 'page');
});

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

const VANILLA_RAIL_MARK = 'ui-avatar ui-avatar--32 ui-avatar--h7';

it('draws the rail mark as the Avatar part with the first and last initials, as the vanilla rail did', () => {
  const account = { name: 'Mary Ann Lee', email: 'mary@example.com' };
  render(<AppShell {...props} account={account} />);
  const mark = document.querySelector('.ui-app__av > .ui-avatar') as HTMLElement;
  expect(mark.textContent).toBe('ML');
  expect(mark.classList.contains(`ui-avatar--h${avatarHue('mary@example.com')}`)).toBe(true);
  // The class the vanilla rail wrote for this person, held after #429 removed it.
  expect(mark.className).toBe(VANILLA_RAIL_MARK);
});

it('uses the initials and missing-name rule the vanilla shell used', () => {
  for (const [name, expected] of [['Anne-Marie', 'A'], ['Mary Ann Lee', 'ML'], ['', '']]) {
    const account = { name, email: 'guest@example.com' };
    const { unmount } = render(<AppShell {...props} account={account} />);
    const mark = document.querySelector('.ui-app__av > .ui-avatar') as HTMLElement;
    if (expected) expect(mark.textContent).toBe(expected);
    else expect(mark.classList.contains('ui-avatar--anon')).toBe(true);
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

it('keeps the trigger\'s name when the phone band shows only its glyph', () => {
  render(<AppShell {...props} />);
  const trigger = screen.getByRole('button', { name: /Search or run/ });
  // No short word is drawn (#729); layout.css clips the sentence and the key cap below 560px.
  expect(trigger.querySelector('.ui-app__search-short')).toBeNull();
  expect(trigger.querySelector('.ui-app__search-txt')).toHaveTextContent('Search or run a command…');
  // The whole name, anchored: the label, the kit's hotkey for this platform, nothing
  // else. The separator is the engine's, so it is matched and not written — jsdom joins
  // the spans with nothing, and Chromium puts a space there because the label span is a
  // blockified flex item. Measured in Chromium on #486, the same at 1280px and 390px.
  expect(trigger).toHaveAccessibleName(
    expect.stringMatching(new RegExp(`^Search or run a command… ?${paletteHotkey()}$`)));
  cleanup();

  render(<AppShell {...props} searchLabel="Find anything" />);
  expect(screen.getByRole('button', { name: /Find anything/ })).toHaveAccessibleName(expect.stringContaining('Find anything'));
});

it('draws the phone band\'s controls as bare 40px glyphs and the title on one line', () => {
  // A source read: jsdom resolves no @media, so the widths are measured in Chromium on
  // #732 (300 and 390 fit with no sideways scroll, every control is 40px square).
  const css = read('./AppShell.css');
  const phone = css.match(/@media \(max-width: 560px\) \{([^]*?)\n\}/)?.[1] ?? '';
  expect(phone).toMatch(/\.ui-app__search,[^{]*\{[^}]*width: 40px;[^}]*height: 40px;[^}]*border: 0; border-radius: var\(--radius-md\); background: transparent;/);
  expect(phone).toMatch(/\.ui-app__search-ic \{ display: flex; \}/);
  // No gap, so no room across: tap-zone.css's coarse-pointer layer stays on its own 40px
  // control. Measured with elementFromPoint at 300 and 390 on #729; jsdom has no layout.
  expect(phone).toMatch(/\.ui-react-app \.ui-app__bar \{ --tap-clear-x: 0px; \}/);
  const narrow = [...css.matchAll(/@media \(max-width: 720px\) \{([^]*?)\n\}/g)].map(m => m[1]).join('');
  expect(narrow).toMatch(/\.ui-react-app__title \{[^}]*min-width: 0;[^}]*text-overflow: ellipsis; white-space: nowrap;/);
});

// The band holds the mark, the page title, search and Menu, and nothing else. The
// account, the theme switch and the band control stand in the sidebar and the drawer.
it('moves the account, theme switch and band control from the band to the sidebar (#732)', async () => {
  const control = <button type="button">Apliteni OÜ</button>;
  render(<AppShell {...props} bandControl={control} />);
  const bar = document.querySelector('.ui-app__bar')!;
  expect([...bar.children].map(el => el.className.split(' ').find(c => c.startsWith('ui-')))).toEqual(
    ['ui-app__brand', 'ui-react-app__title', 'ui-app__search', 'ui-app__bar-gap', 'ui-btn']);
  expect(bar.lastElementChild).toBe(screen.getByRole('button', { name: 'Menu' }));
  expect(bar.querySelector('.ui-react-app__title')).toHaveTextContent('Weekly report');

  const rail = screen.getByRole('region', { name: 'Sidebar' });
  const parts = [...rail.children].map(el => el.className);
  expect(parts).toEqual(['ui-app__head', 'ui-react-app__control', expect.stringContaining('ui-nav'), 'ui-react-app__theme', 'ui-app__user']);
  expect(within(rail.querySelector('.ui-app__head') as HTMLElement).getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument();
  expect(within(rail).getByRole('button', { name: 'Apliteni OÜ' })).toBeInTheDocument();
  expect(within(rail).getByRole('button', { name: /^Theme:/ })).toBeInTheDocument();
  expect(within(rail).getByRole('button', { name: 'Signed in as Demo User, demo@example.com' })).toBeInTheDocument();

  // A folded rail keeps the switch and the account on the glyph column. The band control
  // has no glyph to keep, so it leaves the tab order with the rail's labels.
  expect(rail.querySelector('.ui-react-app__control')).not.toHaveAttribute('inert');
  fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
  expect(rail.querySelector('.ui-react-app__control')).toHaveAttribute('inert');

  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
  const drawer = screen.getByRole('dialog');
  expect(within(drawer).getByRole('button', { name: 'Apliteni OÜ' })).toBeInTheDocument();
  const foot = drawer.querySelector('.ui-app__drawer')!;
  expect([...foot.children].map(el => el.className)).toEqual(['ui-react-app__theme', 'ui-app__user']);
  // The drawer opens on its first row, not on the band control above the rows.
  await waitFor(() => expect(within(drawer).getByRole('link', { name: 'Overview' })).toHaveFocus());

  // A finger works the drawer: its controls are 40px tap targets, as on the phone band.
  // A source read, because jsdom applies no stylesheet; measured at 390 in Chromium.
  const css = read('./AppShell.css');
  expect(css).toMatch(/\.ui-react-app__menu > \.ui-react-app__control \.toggle,\s*\.ui-app__drawer > \.ui-react-app__theme \.toggle \{ width: 40px; height: 40px; \}/);
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

describe('sidebar theme switch', () => {
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

  it.each(['dark', 'light', 'auto'] as const)('draws one %s glyph in ThemeToggle and the sidebar, the shared themeIcon', theme => {
    localStorage.setItem('apliteni-strategy-theme', theme);
    const glyph = (el: ParentNode) => el.querySelector('.ic')!.innerHTML;
    const shell = render(<AppShell {...props} />);
    const shellButton = shell.container.querySelector('.toggle')!;
    const alone = render(<ThemeToggle />);
    const source = document.createElement('span');
    source.innerHTML = themeIcon(theme);
    expect(glyph(alone.container)).toBe(source.innerHTML);
    expect(glyph(shellButton)).toBe(source.innerHTML);
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
