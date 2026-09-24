import React from 'react';
import { useGlobals } from 'storybook/manager-api';
import { Button } from 'storybook/internal/components';
import { SearchIcon } from '@storybook/icons';

export const INSPECTOR_TOOL_ID = 'apliteni/inspector-toggle';
export const INSPECTOR_TOOL_TITLE = 'Inspector';

// Keep a failed tool render from taking down the manager layout.
class ToolBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error(`[${INSPECTOR_TOOL_ID}] tool render failed`, error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export const InspectorToggle = () => {
  const [globals, updateGlobals] = useGlobals();
  const ready = Boolean(globals) && 'inspect' in globals;
  const on = globals?.inspect === 'on';

  // aria-pressed fits on/off states; unlike dark/light, they are not two equal choices.
  return (
    <Button
      variant="ghost"
      disabled={!ready}
      ariaLabel="Inspector"
      aria-pressed={on}
      onClick={() => {
        if (ready) updateGlobals({ inspect: on ? 'off' : 'on' });
      }}
    >
      <SearchIcon aria-hidden="true" />
      Inspector <span aria-hidden="true">{on ? 'on' : 'off'}</span>
    </Button>
  );
};

export const renderInspectorToggle = () => (
  <ToolBoundary>
    <InspectorToggle />
  </ToolBoundary>
);
