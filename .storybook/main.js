/** @type { import('@storybook/html-vite').StorybookConfig } */
const config = {
  stories: ['../stories/**/*.stories.@(js|mjs)'],
  addons: [
    {
      // Trim the toolbar to what the kit needs (Theme + Accent live in preview.js
      // globalTypes). Drop the background / grid / measure / outline / viewport tools.
      name: '@storybook/addon-essentials',
      options: { backgrounds: false, measure: false, outline: false, viewport: false },
    },
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  core: { disableTelemetry: true },
  docs: { autodocs: false },
};
export default config;
