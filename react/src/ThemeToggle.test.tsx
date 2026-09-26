// JSDOM checks state and keyboard behavior; browser captures cover appearance.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { ThemeToggle, THEME_INIT_SCRIPT } from './ThemeToggle';

const key = 'apliteni-strategy-theme';
let media: EventTarget & { matches: boolean; addEventListener: EventTarget['addEventListener'] };
beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-theme-choice');
  media = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal('matchMedia', () => media);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });

it.each(['dark', 'light'])('uses the stored %s choice over OS preference', theme => {
  localStorage.setItem(key, theme);
  media.matches = theme !== 'light';
  render(<ThemeToggle />);
  expect(document.documentElement).toHaveAttribute('data-theme', theme);
  expect(screen.getByRole('button')).toHaveAccessibleName(`Theme: ${theme === 'light' ? 'Light. Switch to auto.' : 'Dark. Switch to light.'}`);
});
it.each([false, true])('follows OS preference without saving it (%s)', light => {
  media.matches = light;
  render(<ThemeToggle />);
  expect(document.documentElement).toHaveAttribute('data-theme', light ? 'light' : 'dark');
  expect(localStorage.getItem(key)).toBeNull();
});
it('ignores invalid stored choices', () => {
  localStorage.setItem(key, 'invalid'); media.matches = true;
  render(<ThemeToggle />);
  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
});
it('updates both controls, visible labels and persistence after keyboard presses', async () => {
  const user = userEvent.setup();
  localStorage.setItem(key, 'dark');
  render(<><ThemeToggle /><ThemeToggle labelled /></>);
  const [button] = screen.getAllByRole('button');
  expect(button).not.toHaveAttribute('aria-pressed');
  expect(button).toHaveAttribute('type', 'button');
  button.focus(); await user.keyboard('{Enter}');
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Theme: Light. Switch to auto.' })).toHaveLength(2));
  expect(screen.getByText('Light theme')).toBeVisible();
  expect(localStorage.getItem(key)).toBe('light');
  await user.keyboard(' ');
  await waitFor(() => expect(button).toHaveAccessibleName('Theme: Auto. Switch to dark.'));
  expect(localStorage.getItem(key)).toBe('auto');
  await user.keyboard('{Enter}');
  await waitFor(() => expect(button).toHaveAccessibleName('Theme: Dark. Switch to light.'));
  expect(localStorage.getItem(key)).toBe('dark');
});
it('tracks OS changes until the reader chooses a theme', async () => {
  render(<ThemeToggle />);
  act(() => { media.matches = true; media.dispatchEvent(new Event('change')); });
  await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'light'));
  fireEvent.click(screen.getByRole('button'));
  act(() => { media.dispatchEvent(new Event('change')); });
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
});
it('keeps working when storage is blocked', async () => {
  document.documentElement.setAttribute('data-theme-choice', 'dark');
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  render(<ThemeToggle />);
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(screen.getByRole('button')).toHaveAccessibleName('Theme: Light. Switch to auto.'));
});
it('syncs a choice from another tab and falls back when it is cleared', async () => {
  render(<ThemeToggle />);
  localStorage.setItem(key, 'light');
  act(() => window.dispatchEvent(new StorageEvent('storage', { key })));
  await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'light'));
  localStorage.clear();
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: null })));
  await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'dark'));
});
it.each(['dark', 'light', 'auto', null, 'invalid'])('initializes the document before hydration (%s)', stored => {
  if (stored) localStorage.setItem(key, stored);
  media.matches = true;
  window.eval(THEME_INIT_SCRIPT);
  expect(document.documentElement).toHaveAttribute('data-theme', stored === 'dark' ? 'dark' : 'light');
});
it('renders safely on the server', () => {
  expect(renderToString(<ThemeToggle />)).toContain('Theme: Auto. Switch to dark.');
});
it('has no axe violations before or after switching', async () => {
  const { default: axe } = await import('axe-core');
  localStorage.setItem(key, 'dark');
  const { container } = render(<ThemeToggle labelled />);
  const options = { rules: { 'color-contrast': { enabled: false } } };
  expect((await axe.run(container, options)).violations).toEqual([]);
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(screen.getByRole('button')).toHaveAccessibleName('Theme: Light. Switch to auto.'));
  expect((await axe.run(container, options)).violations).toEqual([]);
});
it('retains an unsaved choice when another control mounts', async () => {
  document.documentElement.setAttribute('data-theme-choice', 'dark');
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  const { rerender } = render(<ThemeToggle />);
  fireEvent.click(screen.getByRole('button'));
  rerender(<><ThemeToggle /><ThemeToggle labelled /></>);
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Theme: Light. Switch to auto.' })).toHaveLength(2));
});

it.each([false, true])('saved auto follows OS and live changes (%s)', light => {
  localStorage.setItem(key, 'auto');
  media.matches = light;
  render(<ThemeToggle labelled />);
  expect(screen.getByRole('button')).toHaveAccessibleName('Theme: Auto. Switch to dark.');
  expect(screen.getByText('Auto theme')).toBeVisible();
  expect(document.documentElement).toHaveAttribute('data-theme', light ? 'light' : 'dark');
  act(() => { media.matches = !light; media.dispatchEvent(new Event('change')); });
  expect(document.documentElement).toHaveAttribute('data-theme', light ? 'dark' : 'light');
  expect(localStorage.getItem(key)).toBe('auto');
});

it('keeps vanilla and React choices synchronized in both directions', async () => {
  const { themeToggle, wireTopbar } = await import('../../src/components/topbar.js');
  const vanilla = document.createElement('div');
  vanilla.innerHTML = themeToggle('auto');
  document.body.append(vanilla);
  wireTopbar(vanilla);
  const { container, unmount } = render(<ThemeToggle />);
  try {
    const reactButton = container.querySelector('button')!;
    const vanillaButton = vanilla.querySelector('button')!;
    fireEvent.click(reactButton);
    await waitFor(() => expect(vanillaButton).toHaveAccessibleName('Theme: Dark. Switch to light.'));
    fireEvent.click(vanillaButton);
    await waitFor(() => expect(reactButton).toHaveAccessibleName('Theme: Light. Switch to auto.'));
    localStorage.setItem(key, 'auto');
    act(() => window.dispatchEvent(new StorageEvent('storage', { key })));
    await waitFor(() => expect(vanillaButton).toHaveAccessibleName('Theme: Auto. Switch to dark.'));
    expect(reactButton).toHaveAccessibleName('Theme: Auto. Switch to dark.');
    act(() => { media.matches = true; media.dispatchEvent(new Event('change')); });
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem(key)).toBe('auto');
  } finally { unmount(); vanilla.remove(); }
});

it('retains auto across mounts and OS changes when only storage writes fail', async () => {
  localStorage.setItem(key, 'light');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  const { rerender } = render(<ThemeToggle />);
  fireEvent.click(screen.getByRole('button'));
  rerender(<><ThemeToggle /><ThemeToggle labelled /></>);
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Theme: Auto. Switch to dark.' })).toHaveLength(2));
  act(() => { media.matches = true; media.dispatchEvent(new Event('change')); });
  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  act(() => { media.matches = false; media.dispatchEvent(new Event('change')); });
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(screen.getByText('Auto theme')).toBeVisible();
});
