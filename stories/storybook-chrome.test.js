// Storybook chrome guard — the flags in .storybook/main.js are asked of
// Storybook, not of the file.
//
// Storybook does not validate `main.js`: an unknown key is loaded, ignored, and the
// default stands, so `sidebarOnbordingChecklist` — one letter short — reads exactly like
// the real thing. Asserting the file contains the string we wrote proves nothing.
//
// So each consumer is asked the way it actually asks: the what's-new handler
// re-reads the config file and evaluates `.core?.disableWhatsNewNotifications
// === true`, while BOTH onboarding flags — the sidebar widget alone leaves "Get
// started" one click away in the menu — resolve through the real preset chain,
// which is what the manager builder serialises into `window.FEATURES`.
//
// Weaken the rule and confirm that its test fails.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadMainConfig, loadAllPresets } from 'storybook/internal/common';
import mainConfig from '../.storybook/main.js';

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

// The toolbar rule in manager-head.html hangs off an attribute Storybook puts on
// the preview toolbar. Which attribute that is belongs to Storybook, not to us —
// #133 was exactly this: we wrote `data-test-id`, Storybook renders `data-testid`,
// and the rule matched nothing for as long as it existed. Nobody noticed, because
// a rule that matches nothing looks identical to a rule that works when you only
// read the CSS.
//
// Grepping our own file for the string we wrote would re-run that mistake. So the
// attribute name is READ OUT of our selector and then looked for in the manager
// bundle Storybook actually ships — `"<attr>": "sb-preview-toolbar"`, the prop
// spread onto the toolbar's <section>. If a Storybook upgrade renames the
// attribute or the test id, the string is gone from the bundle and this fails.
const managerHead = fs.readFileSync(path.join(configDir, 'manager-head.html'), 'utf8');
const managerRuntime = require
  .resolve('storybook/package.json')
  .replace('package.json', 'dist/manager/runtime.js');

test('our toolbar selector uses the attribute Storybook actually renders', () => {
  const attrs = [...managerHead.matchAll(/\[([a-zA-Z-]+)="sb-preview-toolbar"\]/g)].map((m) => m[1]);
  assert.notEqual(attrs.length, 0, 'manager-head.html no longer targets the preview toolbar at all');

  const runtime = fs.readFileSync(managerRuntime, 'utf8');
  assert.ok(
    runtime.includes('"sb-preview-toolbar"'),
    `Storybook's manager bundle no longer contains the id "sb-preview-toolbar" (${managerRuntime})`,
  );

  for (const attr of new Set(attrs)) {
    assert.ok(
      runtime.includes(`"${attr}": "sb-preview-toolbar"`),
      `manager-head.html targets [${attr}="sb-preview-toolbar"], but Storybook's manager bundle never sets that attribute`,
    );
  }
});

// Composition (#137, #112). The one Storybook (#429, PR 4) holds the React stories
// itself, so it composes no other Storybook: no localhost ref in development, where
// a stranger's Storybook once answered on the port, and none in a static build, where
// every public visitor's browser would try to reach their own localhost.
test('the one Storybook composes no other Storybook, in development or in a build', async () => {
  assert.equal(mainConfig.refs, undefined, '.storybook/main.js must not declare refs');
  const main = await loadMainConfig({ configDir, skipCache: true });
  assert.equal(main.refs, undefined);
});

test('the one Storybook reads the React story files, and no vanilla one', () => {
  assert.equal(mainConfig.framework.name, '@storybook/react-vite');
  assert.deepEqual(mainConfig.stories, ['../react/src/**/*.stories.@(tsx|ts)', '../stories/**/*.stories.@(tsx|ts)']);
});

const repoRoot = path.resolve(configDir, '..');
const storybookScript = (workspaceDir) =>
  JSON.parse(fs.readFileSync(path.join(repoRoot, workspaceDir, 'package.json'), 'utf8')).scripts.storybook;

// Neither script may pin its port. --exact-port makes Storybook exit 255 rather than
// start when the port is taken, and on a developer's machine ports 6006/6007 are
// routinely held by another project's Storybook.
for (const [label, dir] of [['root', '.'], ['React workspace', 'react']]) {
  test(`the ${label} storybook script lets Storybook find a free port`, () => {
    assert.doesNotMatch(
      storybookScript(dir),
      /--exact-port\b/,
      `${label}: --exact-port turns a busy port into "Exiting because --exact-port was provided" (exit 255).`,
    );
  });
}
