import { mergeConfig } from 'vite';
import { kitAlias } from '../react/kit-alias.ts';

// The one Storybook (#429, PR 4): the React component catalogue and the foundation,
// guideline and showcase pages, built with React and deployed to ui.apli.tech/storybook.
// The vanilla story files were removed with the vanilla kit in PR 5b.

/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: ['../react/src/**/*.stories.@(tsx|ts)', '../stories/**/*.stories.@(tsx|ts)'],
  // The one image the stories draw is a demo company logo, and it has to be a
  // real URL: `safeUrl` (src/html.js) refuses a `data:` src, so an inlined logo
  // reaches the page as `src=""` and the browser draws the story's own document
  // as a broken image — #583. This root is what makes `demo-assets/...` resolve
  // in `storybook dev` and in the built Storybook alike. Stories reference it
  // relatively, because site/build.mjs folds this build into public/storybook/,
  // where a root-absolute `/demo-assets/...` would point above the Storybook.
  staticDirs: [{ from: '../stories/assets', to: '/demo-assets' }],
  // Storybook 10 folded the former "essentials" addons into core, so only the
  // still-separate a11y addon is listed. The manager toolbar is trimmed in manager.js.
  addons: ['@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  // No telemetry, and no "what's new in Storybook" card — that one is Storybook's
  // own release marketing, and it lands on top of our sidebar.
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  docs: { autodocs: false },
  // The "Get started" checklist onboards people to Storybook, not to this kit.
  // Two flags because Storybook gates the sidebar widget and the menu's Guide
  // page separately — turning off only the first leaves it reachable.
  features: { sidebarOnboardingChecklist: false, menuOnboardingChecklist: false },
  // The kit's own source, not a node_modules copy — see react/kit-alias.ts.
  viteFinal: (viteConfig) => mergeConfig(viteConfig, { resolve: { alias: kitAlias } }),
};
export default config;
