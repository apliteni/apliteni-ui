/**
 * Registration of the theme and Inspector toggles in `.storybook/manager.js`.
 *
 * This imports the real manager entry and lets it run against a fake `addons`, so
 * what is checked is the code Storybook executes, not a grep for a string. It
 * matters because the builder wraps manager entries in try/catch: a registration
 * that throws, or one that never happens, leaves the toolbar quietly missing a
 * control and the build green.
 */
import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SET_GLOBALS, GLOBALS_UPDATED } from 'storybook/internal/core-events';

const calls = [];                 // every addons call, in the order it happened
const channel = { on: vi.fn() };  // what the theme-sync addon subscribes on

const addons = {
  setConfig: vi.fn(() => calls.push('setConfig')),
  register: vi.fn((id, callback) => {
    calls.push(`register:${id}`);
    callback({ getChannel: () => channel });
  }),
  add: vi.fn((id) => calls.push(`add:${id}`)),
};

// Only `addons` is faked. `types` stays real, so `type: types.TOOL` is asserted
// against Storybook's own value rather than one this test made up.
vi.mock('storybook/manager-api', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, addons };
});

beforeAll(async () => {
  await import('../../.storybook/manager.js');
});

describe.each([
  ['apliteni/theme-toggle', 'Theme'],
  ['apliteni/inspector-toggle', 'Inspector'],
])('%s', (TOOL_ID, title) => {
  it('is registered as a toolbar tool with a render function', () => {
    expect(addons.register).toHaveBeenCalledWith(TOOL_ID, expect.any(Function));
    expect(addons.add).toHaveBeenCalledTimes(2);

    const [id, config] = addons.add.mock.calls.find(([id]) => id === TOOL_ID);
    expect(id).toBe(TOOL_ID);
    expect(config.type).toBe('tool');
    expect(config.title).toBe(title);
    expect(typeof config.render).toBe('function');
    expect(React.isValidElement(config.render())).toBe(true);
  });

  it('matches the story view only, which is what puts it beside the other global tools', () => {
    const { match } = addons.add.mock.calls.find(([id]) => id === TOOL_ID)[1];

    expect(match({ viewMode: 'story', tabId: undefined })).toBeTruthy();
    expect(match({ viewMode: 'story', tabId: 'addon-someTab' })).toBeFalsy();
  });

  it('registers after the chrome theme is configured, not before', () => {
    // setConfig paints the sidebar and toolbar. Registering the tool after it
    // means a failure in the tool cannot hold up the first paint.
    expect(calls.indexOf('setConfig')).toBeGreaterThanOrEqual(0);
    expect(calls.indexOf(`add:${TOOL_ID}`)).toBeGreaterThan(calls.indexOf('setConfig'));
    expect(calls.indexOf(`register:${TOOL_ID}`)).toBeGreaterThan(calls.indexOf('setConfig'));
  });
});

describe('the theme-sync addon it feeds', () => {
  it('still listens for the globals events the toggle writes through', () => {
    expect(addons.register).toHaveBeenCalledWith('apliteni/theme-sync', expect.any(Function));

    const events = channel.on.mock.calls.map(([event]) => event);
    expect(events).toContain(SET_GLOBALS);
    expect(events).toContain(GLOBALS_UPDATED);
  });
});
