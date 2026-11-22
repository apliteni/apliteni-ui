// JSDOM checks the group, the stored choice and the keyboard. It paints nothing, so the
// pictures' look is measured in a browser and recorded in the pull request.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeChoice } from './ThemeChoice';
// @ts-expect-error -- shared, independently tested JS module.
import { leafRules } from '../../stories/lib/motion-css.js';

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

// An outline means focus, so the chosen card is a fill, an ink and a weight, and focus
// is the kit's band alone. JSDOM paints nothing, so this reads the sheet outside forced
// colours. A browser showed each state in the pull request.
it('marks the chosen card with a fill and keeps the edge for focus', () => {
  type Rule = { selector: string; at: string[]; decls: { prop: string; value: string }[] };
  const rules = (leafRules(readFileSync(path.resolve(__dirname, 'ThemeChoice.css'), 'utf8')) as Rule[]).filter(rule => !rule.at.length);
  const decls = (test: (selector: string) => boolean) => rules.filter(rule => test(rule.selector))
    .flatMap(rule => rule.decls.map(({ prop, value }) => `${prop}: ${value}`));
  const edges = (list: string[]) => list.filter(decl => /^(border|outline|box-shadow)/.test(decl));
  const chosen = decls(selector => /:checked/.test(selector) && !/:not\(/.test(selector));
  expect(chosen).toEqual(expect.arrayContaining(['background: var(--surface-3)', 'color: var(--strong)', 'font-weight: var(--weight-semibold)']));
  expect(edges(chosen)).toEqual([]);
  const hover = decls(selector => /:hover/.test(selector));
  expect(hover).toContain('background: color-mix(in srgb, var(--surface-3) 50%, transparent)');
  expect(edges(hover)).toEqual([]);
  expect(decls(selector => /:focus-visible/.test(selector))).toEqual(['outline: var(--ring)', 'outline-offset: var(--ring-offset)']);
});
