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

// Page tools end the title row, and the lede stands under the whole row (#736). jsdom lays
// nothing out, so the row is read from the markup and the stylesheet; measured at 390 and
// 1280 in Chromium.
it('puts page tools at the end of the title row and the lede under it', () => {
  render(<AppShell {...props} lede="Four reports." tools={<button type="button">Customize</button>} />);
  const main = screen.getByRole('main');
  const row = main.querySelector('.ui-app__title-row')!;
  expect([...row.children].map(el => el.tagName === 'H1' ? el.textContent : el.className)).toEqual(['Weekly report', 'ui-app__tools']);
  expect(within(row as HTMLElement).getByRole('button', { name: 'Customize' })).toBeInTheDocument();
  expect(row.nextElementSibling).toHaveClass('ui-app__sub');
  // The vanilla sheet holds the row, so /css consumers have it too, and the React sheet does not repeat it.
  const css = read('../../src/styles/layout.css');
  expect(css).toMatch(/\.ui-app__title-row \{ display: flex; align-items: center;/);
  expect(css).toMatch(/\.ui-app__tools \{ display: flex; flex: none;/);
  expect(read('./AppShell.css')).not.toMatch(/ui-app__title-row|ui-app__tools/);
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
// account and the band control stand in the sidebar and the drawer, and the theme is a
// submenu row of the account menu.
it('moves the account, theme switch and band control from the band to the sidebar (#732)', async () => {
  const control = <button type="button">Apliteni OÜ</button>;
  const bell = <button type="button">Notifications</button>;
  render(<AppShell {...props} bandControl={control} headControl={bell} />);
  const bar = document.querySelector('.ui-app__bar')!;
  expect([...bar.children].map(el => el.className.split(' ').find(c => c.startsWith('ui-')))).toEqual(
    ['ui-app__brand', 'ui-react-app__title', 'ui-app__search', 'ui-app__bar-gap', 'ui-btn']);
  expect(bar.lastElementChild).toBe(screen.getByRole('button', { name: 'Menu' }));
  expect(bar.querySelector('.ui-react-app__title')).toHaveTextContent('Weekly report');

  const rail = screen.getByRole('region', { name: 'Sidebar' });
  const parts = [...rail.children].map(el => el.className);
  expect(parts).toEqual(['ui-app__head', 'ui-react-app__control', expect.stringContaining('ui-nav'), 'ui-app__user']);
  // The head control stands in the head's fold row, before the fold (#732).
  const foldRow = rail.querySelector('.ui-app__head .ui-app__fold-row') as HTMLElement;
  expect(within(foldRow).getAllByRole('button').map(b => b.textContent || b.getAttribute('aria-label')))
    .toEqual(['Notifications', 'Collapse sidebar']);
  expect(within(rail).getByRole('button', { name: 'Apliteni OÜ' })).toBeInTheDocument();
  expect(within(rail).queryByRole('button', { name: /^Theme:/ })).toBeNull();
  const account = within(rail).getByRole('button', { name: 'Signed in as Demo User, demo@example.com' });
  fireEvent.click(account);
  expect(within(within(rail).getByRole('menu')).getAllByRole('menuitem').map(row => row.getAttribute('aria-label') ?? row.textContent))
    .toEqual([expect.stringMatching(/^Theme(Dark|Light|Auto)$/), 'Sign out']);
  fireEvent.click(account);

  // A folded rail keeps the account on the glyph column. The band control has no glyph
  // to keep, so it leaves the tab order with the rail's labels.
  expect(rail.querySelector('.ui-react-app__control')).not.toHaveAttribute('inert');
  fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
  expect(rail.querySelector('.ui-react-app__control')).toHaveAttribute('inert');

  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
  const drawer = screen.getByRole('dialog');
  expect(within(drawer).getByRole('button', { name: 'Apliteni OÜ' })).toBeInTheDocument();
  // The menu panel's head holds the head control, before its close button.
  const head = drawer.querySelector('.ui-drawer__header') as HTMLElement;
  expect(within(head).getAllByRole('button').map(b => b.textContent || b.getAttribute('aria-label')))
    .toEqual(['Notifications', expect.stringMatching(/close/i)]);
  const foot = drawer.querySelector('.ui-app__drawer')!;
  expect([...foot.children].map(el => el.className)).toEqual(['ui-app__user']);
  // The drawer opens on its first row, not on the band control above the rows.
  await waitFor(() => expect(within(drawer).getByRole('link', { name: 'Overview' })).toHaveFocus());

  fireEvent.click(within(foot as HTMLElement).getByRole('button', { name: 'Signed in as Demo User, demo@example.com' }));
  expect(within(foot as HTMLElement).getByRole('menuitem', { name: /^Theme/ })).toHaveAttribute('aria-haspopup', 'menu');

  // A finger works the drawer: its controls are 40px tap targets, as on the phone band.
  // Above the phone width, search stands in the band's centre. Source reads, because
  // jsdom applies no stylesheet; measured at 390 and 1280 in Chromium.
  const css = read('./AppShell.css');
  expect(css).toMatch(/\.ui-react-app__menu > \.ui-react-app__control \.toggle \{ width: 40px; height: 40px; \}/);
  expect(css).toMatch(/\.ui-app__drawer \.ui-app__user-panel \.ui-dropdown__item \{ min-height: 40px; \}/);
  const wide = css.match(/@media \(min-width: 721px\) \{([^]*?)\n\}/)![1];
  expect(wide).toMatch(/\.ui-app__bar:has\(> \.ui-react-app__title\) \.ui-app__search \{ margin-inline: auto; \}/);
});

// A product's rows stand above the Theme row, and a separator stands before Sign out (#736).
it('opens the account menu with the product rows first, and signs out', () => {
  const onSettings = vi.fn();
  render(<AppShell {...props} accountItems={[{ label: 'Account settings', icon: 'gear', onSelect: onSettings },
    { label: 'Support', icon: 'chat', href: '/support' }]} />);
  const account = screen.getByRole('button', { name: 'Signed in as Demo User, demo@example.com' });
  fireEvent.click(account);
  const rows = within(screen.getByRole('menu')).getAllByRole('menuitem');
  expect(rows.map(row => row.getAttribute('aria-label') ?? row.textContent))
    .toEqual(['Account settings', 'Support', expect.stringMatching(/^Theme/), 'Sign out']);
  expect(rows[3].previousElementSibling).toHaveClass('ui-dropdown__sep');
  expect(rows[1]).toHaveAttribute('href', '/support');
  fireEvent.click(rows[0]);
  expect(onSettings).toHaveBeenCalledOnce();
  expect(props.onSignOut).not.toHaveBeenCalled();
  fireEvent.click(account);
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

describe('account menu Theme submenu', () => {
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
  const open = (where: HTMLElement = document.body) => {
    fireEvent.click(within(where).getByRole('button', { name: 'Signed in as Demo User, demo@example.com' }));
    return within(where).getByRole('menuitem', { name: /^Theme/ });
  };
  const choices = () => screen.getByRole('menu', { name: 'Theme' });

  // Right and Enter open the submenu on its checked choice; Left and Escape close it
  // and hand focus back to the Theme row. The account menu stays open throughout.
  it('opens on Right and Enter, closes on Left and Escape, and returns focus to the Theme row', async () => {
    render(<AppShell {...props} />);
    const row = open();
    expect(row).toHaveAttribute('aria-expanded', 'false');
    expect(row.querySelector('.ui-dropdown__aside')).toHaveTextContent('Dark');
    fireEvent.keyDown(row, { key: 'ArrowRight' });
    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(within(choices()).getAllByRole('menuitemradio').map(r => [r.textContent, r.getAttribute('aria-checked')]))
      .toEqual([['Auto', 'false'], ['Light', 'false'], ['Dark', 'true']]);
    await waitFor(() => expect(within(choices()).getByRole('menuitemradio', { name: 'Auto' })).toHaveFocus());
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(screen.queryByRole('menu', { name: 'Theme' })).toBeNull();
    await waitFor(() => expect(row).toHaveFocus());
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(choices()).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: 'Theme' })).toBeNull();
    expect(row).toBeInTheDocument();
    await waitFor(() => expect(row).toHaveFocus());
  });

  // A pick writes data-theme-choice, moves the check and closes only the submenu.
  it('sets auto, light and dark from the submenu', () => {
    render(<AppShell {...props} />);
    const row = open();
    for (const [name, choice, shown] of [['Light', 'light', 'light'], ['Auto', 'auto', 'dark'], ['Dark', 'dark', 'dark']]) {
      fireEvent.click(row);
      fireEvent.click(within(choices()).getByRole('menuitemradio', { name }));
      expect(root).toHaveAttribute('data-theme-choice', choice);
      expect(root).toHaveAttribute('data-theme', shown);
      expect(localStorage.getItem('apliteni-strategy-theme')).toBe(choice);
      expect(row.querySelector('.ui-dropdown__aside')).toHaveTextContent(name);
      expect(screen.queryByRole('menu', { name: 'Theme' })).toBeNull();
      expect(row).toBeInTheDocument();
    }
    expect(props.onSignOut).not.toHaveBeenCalled();
  });

  // The rail's menu is clipped at the rail edge, so the flyout leaves it; the drawer
  // swaps its rows for the choices under a back row.
  it('flies out of the rail and replaces the drawer menu under a back row', async () => {
    render(<AppShell {...props} />);
    const rail = screen.getByRole('region', { name: 'Sidebar' });
    fireEvent.click(open(rail));
    expect(rail.contains(choices())).toBe(false);
    expect(choices().parentElement).toHaveClass('ui-dropdown__panel--portal', 'ui-dropdown__panel--sub', 'is-open');
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const foot = screen.getByRole('dialog').querySelector('.ui-app__drawer') as HTMLElement;
    const row = open(foot);
    fireEvent.click(row);
    const panel = foot.querySelector('.ui-app__user-panel')!;
    expect(panel).toHaveClass('is-sub');
    expect(panel.contains(choices())).toBe(true);
    const back = within(choices()).getByRole('menuitem', { name: 'Back from Theme' });
    fireEvent.click(back);
    expect(panel).not.toHaveClass('is-sub');
    await waitFor(() => expect(row).toHaveFocus());
  });

  it.each(['dark', 'light', 'auto'] as const)('draws one %s glyph in ThemeToggle and the account menu, the shared themeIcon', theme => {
    localStorage.setItem('apliteni-strategy-theme', theme);
    const shell = render(<AppShell {...props} />);
    const row = open(shell.container);
    const alone = render(<ThemeToggle />);
    const source = document.createElement('span');
    source.innerHTML = themeIcon(theme);
    expect(alone.container.querySelector('.ic')!.innerHTML).toBe(source.innerHTML);
    expect(row.querySelector('.ui-dropdown__ic')!.innerHTML).toBe(source.innerHTML);
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
