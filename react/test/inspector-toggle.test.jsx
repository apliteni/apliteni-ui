import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ThemeProvider, convert, themes } from 'storybook/theming';

let globals;
let updateGlobals;
let failRender;
vi.mock('storybook/manager-api', async (importOriginal) => ({
  ...await importOriginal(),
  useGlobals: () => {
    if (failRender) throw new Error('Cannot read globals');
    return [globals, updateGlobals];
  },
}));
const { renderInspectorToggle } = await import('../../.storybook/inspector-toggle.jsx');
const tool = () => (
  <ThemeProvider theme={convert(themes.dark)}>{renderInspectorToggle()}</ThemeProvider>
);

beforeEach(() => {
  globals = { inspect: 'off', theme: 'light', accent: 'ocean' };
  updateGlobals = vi.fn();
  failRender = false;
});

it('toggles only inspect and follows the confirmed global, including external changes', async () => {
  const user = userEvent.setup();
  const { rerender } = render(tool());
  const button = screen.getByRole('button', { name: 'Inspector', pressed: false });
  expect(button).toHaveTextContent('Inspector off');
  await user.click(button);
  expect(updateGlobals.mock.calls).toEqual([[{ inspect: 'on' }]]);
  expect(button).toHaveAttribute('aria-pressed', 'false');
  globals = { ...globals, inspect: 'on' };
  rerender(tool());
  expect(button).toHaveTextContent('Inspector on');
  expect(button).toHaveAttribute('aria-pressed', 'true');
  await user.click(button);
  expect(updateGlobals.mock.calls).toEqual([[{ inspect: 'on' }], [{ inspect: 'off' }]]);
  globals = { ...globals, inspect: 'off' };
  rerender(tool());
  expect(button).toHaveAttribute('aria-pressed', 'false');
});

it.each(['{Enter}', '[Space]'])('toggles with %s from the keyboard', async (key) => {
  const user = userEvent.setup();
  render(tool());
  await user.tab();
  expect(screen.getByRole('button')).toHaveFocus();
  await user.keyboard(key);
  expect(updateGlobals.mock.calls).toEqual([[{ inspect: 'on' }]]);
});

it.each([undefined, {}])('does not write before the preview supplies globals (%s)', async (state) => {
  globals = state;
  const user = userEvent.setup();
  render(tool());
  expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  await user.click(screen.getByRole('button'));
  expect(updateGlobals).not.toHaveBeenCalled();
});

it('contains a render failure within the tool', () => {
  failRender = true;
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(render(tool()).container).toBeEmptyDOMElement();
    expect(error).toHaveBeenCalled();
  } finally {
    error.mockRestore();
  }
});
