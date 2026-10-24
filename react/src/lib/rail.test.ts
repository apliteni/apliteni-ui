import { afterEach, expect, it } from 'vitest';
import { RAIL_COOKIE, railCollapsed, storeRailCollapsed } from './rail';
import { paletteHotkey } from './palette-hotkey';

afterEach(() => { document.cookie = `${RAIL_COOKIE}=; Max-Age=0; Path=/`; });

it('reads the fold choice from a Cookie header', () => {
  expect(railCollapsed(`theme=dark; ${RAIL_COOKIE}=collapsed; lang=en`)).toBe(true);
  expect(railCollapsed(`${RAIL_COOKIE}=expanded`)).toBe(false);
  expect(railCollapsed('theme=dark')).toBeNull();
  expect(railCollapsed('')).toBeNull();
  // A value the kit never writes is not a choice.
  expect(railCollapsed(`${RAIL_COOKIE}=sideways`)).toBeNull();
});

it('stores the fold choice where the next page reads it', () => {
  storeRailCollapsed(true);
  expect(railCollapsed()).toBe(true);
  storeRailCollapsed(false);
  expect(railCollapsed()).toBe(false);
});

it('names the palette key the reader has', () => {
  expect(paletteHotkey('MacIntel')).toBe('⌘K');
  expect(paletteHotkey('iPhone')).toBe('⌘K');
  expect(paletteHotkey('Win32')).toBe('Ctrl K');
  // An empty platform is not this machine's: the answer must not depend on where the test runs.
  expect(paletteHotkey('')).toBe('Ctrl K');
});
