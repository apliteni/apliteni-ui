/** @type { import('@storybook/html-vite').StorybookConfig } */
const config = {
  stories: ['../stories/**/*.stories.@(js|mjs)'],
  // Storybook 10 folded the former "essentials" addons (controls, actions,
  // backgrounds, viewport, measure, outline, docs) into core, so only the
  // still-separate a11y addon is listed. The background/measure/outline tools
  // stay quiet: backgrounds is disabled via preview.js params and the manager
  // toolbar is trimmed in manager.js.
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  core: { disableTelemetry: true },
  docs: { autodocs: false },
  // Compose the React library's Storybook (port 6007) only during local dev.
  // In a static PRODUCTION build the ref would bake `http://localhost:6007`
  // into index.html, so every public visitor's browser tries to reach their
  // own localhost — which trips Chrome's "Local Network Access" prompt. Gate
  // it on configType so the deployed build (ui.apli.tech/storybook) is clean.
  refs: (_config, { configType }) =>
    configType === 'DEVELOPMENT'
      ? { react: { title: 'React components', url: 'http://localhost:6007' } }
      : {},
};
export default config;
