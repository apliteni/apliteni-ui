// The theme a `theme` global draws. `auto` is System: a page can choose it, so the global
// keeps it, and every place that paints resolves it with the browser's setting.
export const drawnTheme = (theme) => {
  if (theme === 'light' || theme === 'dark') return theme;
  if (theme !== 'auto') return 'dark';
  return globalThis.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};
