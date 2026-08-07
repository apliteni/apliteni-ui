/**
 * The manager toolbar's Dark ⇄ Light toggle (.storybook/theme-toggle.jsx).
 *
 * This lives in the React workspace because it is the only place in the repo with
 * a DOM test runner: the root `npm test` is node:test over `src`, `stories`,
 * `site` and `scripts`, and it never boots Storybook. `build-storybook` is no
 * safety net either — the builder wraps manager entries in try/catch, so a broken
 * toolbar tool still produces a green build.
 *
 * The only seam the tests drive is `useGlobals()`, the tool's single source of
 * state. The Button, the icons and the error boundary are the real ones.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, convert, themes } from 'storybook/theming';
import { MoonIcon, SunIcon } from '@storybook/icons';

let globals;         // what useGlobals() hands back as the manager's globals
let updateGlobals;   // the spy standing in for the api's updateGlobals
let failRender;      // when true, useGlobals throws — i.e. the tool throws mid-render

vi.mock('storybook/manager-api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useGlobals: () => {
      if (failRender) throw new Error('useGlobals blew up');
      return [globals, updateGlobals];
    },
  };
});

const { ThemeToggle, renderThemeToggle } = await import('../../.storybook/theme-toggle.jsx');

// The Button pulls its colours off the emotion theme the manager provides, so the
// tests provide one too. Without it the Button throws — which is exactly the kind
// of render-time failure the boundary below exists for.
const mount = (node) =>
  render(<ThemeProvider theme={convert(themes.dark)}>{node}</ThemeProvider>);

const mountToggle = (state) => {
  globals = state;
  return mount(<ThemeToggle />);
};

// The glyph to compare against comes from @storybook/icons itself, so the
// assertion is "this is the moon", not "this is a path I once copied".
const glyphOf = (Icon) => {
  const { container, unmount } = render(<Icon />);
  const markup = container.querySelector('svg').innerHTML;
  unmount();
  return markup;
};

const glyphIn = (button) => button.querySelector('svg').innerHTML;

beforeEach(() => {
  globals = { theme: 'dark' };
  updateGlobals = vi.fn();
  failRender = false;
});

describe('what it shows', () => {
  it('shows the moon and the word Dark while the theme global is dark', () => {
    mountToggle({ theme: 'dark' });
    const button = screen.getByRole('button', { name: 'Theme: Dark. Switch to light.' });

    expect(button).toHaveTextContent('Dark');
    expect(glyphIn(button)).toBe(glyphOf(MoonIcon));
  });

  it('shows the sun and the word Light while the theme global is light', () => {
    mountToggle({ theme: 'light' });
    const button = screen.getByRole('button', { name: 'Theme: Light. Switch to dark.' });

    expect(button).toHaveTextContent('Light');
    expect(glyphIn(button)).toBe(glyphOf(SunIcon));
  });

  it.each([
    ['dark', 'Dark'],
    ['light', 'Light'],
  ])('has a non-empty accessible name containing the visible word (%s)', (theme, word) => {
    mountToggle({ theme });
    const name = screen.getByRole('button').getAttribute('aria-label');

    // WCAG 2.5.3: the control has visible text, so its name has to contain it.
    expect(name).toBeTruthy();
    expect(name).toContain(word);
  });

  it('carries no ARIA on/off state — dark and light are peers, not a switch', () => {
    mountToggle({ theme: 'dark' });
    const button = screen.getByRole('button');

    expect(button).not.toHaveAttribute('aria-pressed');
    expect(button).not.toHaveAttribute('role', 'switch');
  });
});

describe('what a click does', () => {
  it('asks for light exactly once when clicked in dark', async () => {
    const user = userEvent.setup();
    mountToggle({ theme: 'dark' });

    await user.click(screen.getByRole('button'));

    expect(updateGlobals).toHaveBeenCalledTimes(1);
    expect(updateGlobals).toHaveBeenCalledWith({ theme: 'light' });
  });

  it('asks for dark exactly once when clicked in light', async () => {
    const user = userEvent.setup();
    mountToggle({ theme: 'light' });

    await user.click(screen.getByRole('button'));

    expect(updateGlobals).toHaveBeenCalledTimes(1);
    expect(updateGlobals).toHaveBeenCalledWith({ theme: 'dark' });
  });

  it('repeats the same value on a second click while the global has not moved yet', async () => {
    const user = userEvent.setup();
    mountToggle({ theme: 'dark' });
    const button = screen.getByRole('button');

    // updateGlobals is fire-and-forget across the iframe boundary: the global only
    // changes when GLOBALS_UPDATED comes back. An impatient double click must not
    // flip the request back to dark on the way.
    await user.click(button);
    await user.click(button);

    expect(updateGlobals).toHaveBeenCalledTimes(2);
    expect(updateGlobals.mock.calls).toEqual([[{ theme: 'light' }], [{ theme: 'light' }]]);
  });

  it.each([['Enter', '{Enter}'], ['Space', '[Space]']])(
    'fires from the keyboard with %s',
    async (_name, key) => {
      const user = userEvent.setup();
      mountToggle({ theme: 'dark' });

      await user.tab();
      expect(screen.getByRole('button')).toHaveFocus();
      await user.keyboard(key);

      expect(updateGlobals).toHaveBeenCalledTimes(1);
      expect(updateGlobals).toHaveBeenCalledWith({ theme: 'light' });
    },
  );
});

describe('before the preview has answered', () => {
  it.each([
    ['globals without a theme key', {}],
    ['no globals at all', undefined],
  ])('is disabled and writes nothing when there is %s', async (_name, state) => {
    const user = userEvent.setup();
    mountToggle(state);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('aria-disabled', 'true');

    await user.click(button);

    expect(updateGlobals).not.toHaveBeenCalled();
  });

  it('is not disabled once the theme global has arrived', () => {
    mountToggle({ theme: 'dark' });

    expect(screen.getByRole('button')).not.toHaveAttribute('aria-disabled');
  });
});

describe('the error boundary', () => {
  let consoleError;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('renders nothing instead of taking the workbench down when the tool throws', () => {
    failRender = true;

    // No throw escaping this call is the whole point: above a tool there is only
    // the boundary around the entire Layout, so an escaping throw white-screens
    // the sidebar and the preview too.
    const { container } = mount(renderThemeToggle());

    expect(container).toBeEmptyDOMElement();
    expect(consoleError).toHaveBeenCalled();
  });

  it('renders the toggle normally when nothing throws', () => {
    globals = { theme: 'light' };

    mount(renderThemeToggle());

    expect(screen.getByRole('button')).toHaveTextContent('Light');
  });
});
