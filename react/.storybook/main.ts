import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import { kitAlias } from '../kit-alias';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(tsx|ts)'],
  // Storybook 10 folded the "essentials" addons into core; only a11y stays separate.
  addons: ['@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  core: { disableTelemetry: true },
  // The kit's own source, not a node_modules copy — see kit-alias.ts.
  viteFinal: (viteConfig) => mergeConfig(viteConfig, { resolve: { alias: kitAlias } }),
};
export default config;
