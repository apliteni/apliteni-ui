// Storybook chrome guard — the flags in .storybook/main.js that keep Storybook's
// own onboarding out of our workbench are asked of Storybook, not of the file.
//
// Storybook does not validate `main.js`. An unknown key is neither an error nor a
// warning: it is loaded, ignored, and the default stands. So `sidebarOnbordingChecklist`
// (one letter short) reads exactly like the real thing in a diff, in review, and in
// the file itself — and the widget it was meant to remove is still there. Asserting
// the file contains the string we wrote proves nothing about that, because the string
// we wrote is the thing under suspicion.
//
// This asks the two consumers instead, each the way it actually asks:
//
//  - `core.disableWhatsNewNotifications` is never merged through presets. The
//    what's-new handler re-reads the config file itself and evaluates
//    `.core?.disableWhatsNewNotifications === true` before it decides to show the
//    card, so that is the expression checked here.
//
//  - the onboarding flags ARE merged, and the merge is the part worth pinning.
//    Storybook's own common preset sets both to `true`; ours has to win. Resolving
//    `features` through the real preset chain is what the manager builder does
//    before serialising the result into `window.FEATURES`, which is where the
//    sidebar widget and the menu's Guide page read it from.
//
// Two onboarding flags, not one: Storybook gates the sidebar widget on
// `sidebarOnboardingChecklist` and the menu's Guide page on `menuOnboardingChecklist`.
// Turning off only the first leaves "Get started" one click away in the menu.
//
// If a Storybook upgrade renames a flag or moves the core preset, this fails loudly.
// That is the point: silence would mean the config had quietly stopped doing anything.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadMainConfig, loadAllPresets } from 'storybook/internal/common';

const require = createRequire(import.meta.url);
const configDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.storybook');
const commonPreset = require
  .resolve('storybook/package.json')
  .replace('package.json', 'dist/core-server/presets/common-preset.js');

test("Storybook reads our config as no what's-new notifications", async () => {
  const main = await loadMainConfig({ configDir, skipCache: true });
  assert.equal(main.core?.disableWhatsNewNotifications === true, true);
});

test("the resolved features beat Storybook's onboarding defaults", async () => {
  const presets = await loadAllPresets({
    configDir,
    corePresets: [commonPreset],
    overridePresets: [],
    packageJson: {},
  });
  const features = await presets.apply('features');

  assert.equal(features.sidebarOnboardingChecklist, false);
  assert.equal(features.menuOnboardingChecklist, false);
});
