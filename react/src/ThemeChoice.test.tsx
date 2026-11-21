// JSDOM checks the group, the stored choice and the keyboard. It paints nothing, so the
// pictures' look is measured in a browser and recorded in the pull request.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeChoice } from './ThemeChoice';

const key = 'apliteni-strategy-theme';
beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-theme-choice');
  vi.stubGlobal('matchMedia', () => Object.assign(new EventTarget(), { matches: false }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

it('is one named group of three themes, with the stored one chosen', () => {
  localStorage.setItem(key, 'light');
  render(<ThemeChoice />);
  const group = screen.getByRole('radiogroup', { name: 'Theme' });
  const radios = screen.getAllByRole('radio');
  expect(radios.map(radio => radio.closest('label')!.textContent)).toEqual(['System', 'Light', 'Dark']);
  expect(group).toContainElement(radios[0]);
  expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
});

it('applies and stores a choice at once, by pointer and by arrow key', async () => {
  const user = userEvent.setup();
  render(<ThemeChoice label="Colour theme" />);
  expect(screen.getByRole('radiogroup', { name: 'Colour theme' })).toBeInTheDocument();
  await user.click(screen.getByText('Light'));
  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  expect(localStorage.getItem(key)).toBe('light');
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'Dark' })).toHaveFocus();
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(localStorage.getItem(key)).toBe('dark');
});

// System is half light and half dark. Each scene takes its theme from the theme blocks,
// so a scene class that leaves a theme block draws the page's own theme instead.
it('draws each picture from the theme it names', () => {
  const { container } = render(<ThemeChoice />);
  const scenes = [...container.querySelectorAll('.ui-theme-choice__pic')]
    .map(pic => [...pic.children].map(scene => scene.className.replace('ui-theme-choice__scene ui-theme-choice__scene--', '')));
  expect(scenes).toEqual([['light', 'dark'], ['light'], ['dark']]);
  const sheet = readFileSync(path.resolve(process.cwd(), process.cwd().endsWith('react') ? '..' : '.', 'src/tokens/tokens.css'), 'utf8');
  expect(sheet).toMatch(/:root,\s*\.ui-theme-choice__scene--dark,\s*:root\[data-theme="dark"\] \{/);
  expect(sheet).toMatch(/\.ui-theme-choice__scene--light,\s*\.ui-card__page,\s*:root\[data-theme="light"\] \{/);
});
