import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import { kitAlias } from '../kit-alias';

const config: StorybookConfig = {
  // The foundation, guideline and showcase pages move here from the vanilla Storybook
  // under their old titles, so their ids and links stay the same (#429, PR 4).
  stories: ['../src/**/*.stories.@(tsx|ts)', '../../stories/**/*.stories.@(tsx|ts)'],
  // Storybook 10 folded the "essentials" addons into core; only a11y stays separate.
  addons: ['@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  core: { disableTelemetry: true },
  // The kit's own source, not a node_modules copy — see kit-alias.ts.
  viteFinal: (viteConfig) => mergeConfig(viteConfig, { resolve: { alias: kitAlias } }),
};
export default config;
