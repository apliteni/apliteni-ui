import React from 'react';
import { useGlobals } from 'storybook/manager-api';
import { Button } from 'storybook/internal/components';
import { MoonIcon, SunIcon } from '@storybook/icons';

// Addon id, tool id and the title shown in the toolbar's overflow menu.
export const THEME_TOOL_ID = 'apliteni/theme-toggle';
export const THEME_TOOL_TITLE = 'Theme';

// Toolbar tools mount as React components, and the nearest error boundary above
// them wraps the entire Layout — so a render-time throw in here takes the whole
// workbench down, sidebar and preview with it, in the deployed build as much as
// locally. Rendering nothing instead costs the theme control and nothing else;
// `?globals=theme:light` still switches the theme from the URL.
class ToolBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error(`[${THEME_TOOL_ID}] tool render failed`, error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// The name carries both the state and what the click does, which is why there is
// no aria-pressed and no role="switch": dark and light are peers, not on and off,
// and an ARIA state on top of this name would announce the theme twice. The
// visible word is part of the name, as WCAG 2.5.3 requires.
const nameFor = (theme) =>
  theme === 'light' ? 'Theme: Light. Switch to dark.' : 'Theme: Dark. Switch to light.';

/**
 * One-click Dark ⇄ Light control for the manager toolbar.
 *
 * The `theme` global is the only state. Reading it through `useGlobals()` is what
 * makes the button follow the canvas — including a flip that came from the URL or
 * from another tool — and writing it through `updateGlobals()` is what feeds the
 * `apliteni/theme-sync` addon that re-themes the manager chrome.
 */
export const ThemeToggle = () => {
  const [globals, updateGlobals] = useGlobals();

  // `theme` is absent from globals until SET_GLOBALS comes back from the preview.
  // For those first frames there is nothing to flip, so the control sits inert
  // rather than guessing a value and writing the guess back.
  const ready = Boolean(globals) && 'theme' in globals;
  const theme = globals && globals.theme === 'light' ? 'light' : 'dark';
  const other = theme === 'light' ? 'dark' : 'light';

  // The icon shows where you are, not where the click takes you: moon = in dark.
  const Icon = theme === 'light' ? SunIcon : MoonIcon;

  // `updateGlobals` is fire-and-forget across the iframe boundary — the manager
  // store only changes when GLOBALS_UPDATED comes back, so the label lags its own
  // click by a frame. Optimistic local state would fix the lag by letting the
  // button disagree with the canvas, so there is none: a second click before the
  // global moves just re-sends the same value.
  const flip = () => {
    if (!ready) return;
    updateGlobals({ theme: other });
  };

  return (
    <Button
      variant="ghost"
      disabled={!ready}
      ariaLabel={nameFor(theme)}
      onClick={flip}
    >
      <Icon aria-hidden="true" />
      {theme === 'light' ? 'Light' : 'Dark'}
    </Button>
  );
};

// What `addons.add` gets as its `render`. The boundary lives here, not around the
// registration, because the throw we are guarding against happens at render time.
export const renderThemeToggle = () => (
  <ToolBoundary>
    <ThemeToggle />
  </ToolBoundary>
);
