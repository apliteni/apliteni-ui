import '@testing-library/jest-dom/vitest';

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
