import '@testing-library/jest-dom/vitest';

// React 19.3.1 logs a warning on every `act` call until this global is set.
// The focus-ring gate walks every story, so thousands of these warnings slow it
// toward its 5s timeout. @testing-library/react wraps updates in `act`, so the
// environment is configured and this flag is the documented contract.
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

// jsdom ships no ResizeObserver, and a component that measures its own box to decide
// whether it is scrollable — the kit's answer to a tab stop that leads nowhere — throws
// on mount without one. The stub observes nothing: jsdom has no layout, so the first
// synchronous read is the only measurement there is.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
