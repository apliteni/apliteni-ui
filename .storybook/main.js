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
  refs: {
    react: {
      title: 'React components',
      url: 'http://localhost:6007',
    },
  },
};
export default config;
