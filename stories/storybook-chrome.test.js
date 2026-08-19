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
// why: CONTRIBUTING.md#a-rule-is-proven-by-the-mutation-that-kills-its-case

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadMainConfig, loadAllPresets } from 'storybook/internal/common';
import mainConfig, {
  REACT_STORYBOOK_PORT,
  REACT_STORYBOOK_PORT_SPAN,
  reactStorybookCandidateUrls,
  reactStorybookRef,
} from '../.storybook/main.js';

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

// Composition (#137). A PORT IS NOT AN IDENTITY: `storybook dev -p 6007` treats
// the port as a wish and moves to the next free one when it is taken, so whoever
// got there first ends up in our sidebar under "React components" — on this
// machine, 244 stories of a different product's library.
//
// So the ref FOLLOWS rather than pins. main.js probes the range Storybook's own
// port-finder can hand out and composes the first port that proves it is the
// React workspace's Storybook: its index.json must list every story file the
// workspace has on disk, and a stranger's index does not.
//
// These tests drive that probe against real HTTP servers on ephemeral ports.

const repoRoot = path.resolve(configDir, '..');

// A throwaway Storybook-shaped server. `entries` is the index.json payload.
async function serveIndex(entries) {
  const server = http.createServer((req, res) => {
    if (req.url.split('?')[0] !== '/index.json') { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ v: 5, entries }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

// The story files the React workspace has on disk, spelled the way Storybook
// reports them in index.json — importPath is relative to the workspace root it
// was started in.
function reactStoryImportPaths() {
  const workspace = path.join(repoRoot, 'react');
  const walk = (dir, acc = []) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, acc);
      else if (/\.stories\.(tsx|ts)$/.test(e.name)) acc.push('./' + path.relative(workspace, full));
    }
    return acc;
  };
  return walk(path.join(workspace, 'src'));
}

const asEntries = (importPaths) =>
  Object.fromEntries(importPaths.map((p, i) => [
    `s${i}--playground`,
    { id: `s${i}--playground`, type: 'story', title: 'X', name: 'Playground', importPath: p },
  ]));

test('a static build composes nothing (the #112 gate still holds)', async () => {
  assert.deepEqual(await mainConfig.refs(undefined, { configType: 'PRODUCTION' }), {});
});

const storybookScript = (workspaceDir) =>
  JSON.parse(fs.readFileSync(path.join(repoRoot, workspaceDir, 'package.json'), 'utf8')).scripts.storybook;

// Neither script may pin its port. --exact-port makes Storybook exit 255 rather than
// start when the port is taken, and on a developer's machine ports 6006/6007 are
// routinely held by another project's Storybook. The ref follows the drift instead.
for (const [label, dir] of [['root', '.'], ['React workspace', 'react']]) {
  test(`the ${label} storybook script lets Storybook find a free port`, () => {
    assert.doesNotMatch(
      storybookScript(dir),
      /--exact-port\b/,
      `${label}: --exact-port turns a busy port into "Exiting because --exact-port was provided" (exit 255). ` +
      'The workbench must still start; the ref proves identity instead of pinning the port.',
    );
  });
}

test('the probe starts at the port the React workspace asks for', () => {
  const asked = storybookScript('react').match(/(?:-p|--port)[ =](\d+)/)?.[1];
  assert.equal(
    Number(asked),
    REACT_STORYBOOK_PORT,
    'main.js probes from a different port than react/package.json asks for',
  );
});

// storybook/dist/core-server/index.js:11654 `getServerPort` delegates to detect-port,
// which searches [port, port + 10) walking upward one port at a time. Probing that
// exact window is the whole reachable set: a narrower range misses a legitimate
// drift, and a wider one is dead code, because once all ten are taken detect-port
// gives up on the range and returns a random ephemeral port instead.
test("the candidate range is exactly the window Storybook's port-finder can land in", () => {
  const urls = reactStorybookCandidateUrls();
  assert.equal(urls.length, REACT_STORYBOOK_PORT_SPAN);
  assert.equal(REACT_STORYBOOK_PORT_SPAN, 10, "detect-port's window is port + 10");
  assert.deepEqual(
    urls,
    Array.from({ length: 10 }, (_, i) => `http://localhost:${REACT_STORYBOOK_PORT + i}`),
  );
});

// The case that matters, and the one pinning the port could not serve at all:
// a stranger holds 6007, our Storybook drifted upward, and the sidebar still fills.
test('our Storybook is composed from wherever it drifted to, past a stranger on the base port', async () => {
  const stranger = await serveIndex(asEntries(['./src/foundations/colors-primitives.mdx']));
  const ours = await serveIndex(asEntries(reactStoryImportPaths()));
  const said = [];
  try {
    assert.deepEqual(
      await reactStorybookRef([stranger.url, ours.url], { log: (m) => said.push(m) }),
      { react: { title: 'React components', url: ours.url } },
      'the probe stopped at the stranger instead of walking on to our Storybook',
    );
    assert.deepEqual(said, []);
  } finally {
    stranger.close();
    ours.close();
  }
});

test('when several candidates are ours, the earliest port wins', async () => {
  const paths = reactStoryImportPaths();
  const first = await serveIndex(asEntries(paths));
  const second = await serveIndex(asEntries(paths));
  try {
    assert.deepEqual(await reactStorybookRef([first.url, second.url], { log: () => {} }), {
      react: { title: 'React components', url: first.url },
    });
  } finally {
    first.close();
    second.close();
  }
});

test('when no candidate is ours, the message names the range and says a restart is what picks it up', async () => {
  const stranger = await serveIndex(asEntries(['./src/Gizmo.stories.tsx']));
  const said = [];
  try {
    assert.deepEqual(await reactStorybookRef([stranger.url], { log: (m) => said.push(m) }), {});
    assert.equal(said.length, 1);
    assert.ok(said[0].includes(stranger.url), `should name the port it tried; got: ${said[0]}`);
    assert.match(said[0], /restart/i, 'a Storybook started later is only picked up on restart — say so');
  } finally {
    stranger.close();
  }
});

test('nothing listening composes nothing, and says why', async () => {
  const dead = await serveIndex({});
  const { url } = dead;
  dead.close();
  await new Promise((r) => setTimeout(r, 50));

  const said = [];
  assert.deepEqual(await reactStorybookRef(url, { log: (m) => said.push(m) }), {});
  assert.equal(said.length, 1);
  assert.match(said[0], /React components/);
  assert.ok(said[0].includes(url), `the message should name the URL it tried; got: ${said[0]}`);
});

test("a stranger's Storybook on the port is not composed", async () => {
  const stranger = await serveIndex(asEntries(['./src/foundations/colors.mdx', './src/Gizmo.stories.tsx']));
  const said = [];
  try {
    assert.deepEqual(await reactStorybookRef(stranger.url, { log: (m) => said.push(m) }), {});
    assert.equal(said.length, 1);
    assert.match(said[0], /not the React workspace/i);
  } finally {
    stranger.close();
  }
});

test("the React workspace's own Storybook is composed", async () => {
  const paths = reactStoryImportPaths();
  assert.notEqual(paths.length, 0, 'no react story files on disk — the identity check would have nothing to match');

  const ours = await serveIndex(asEntries([...paths, './src/SomethingNew.stories.tsx']));
  const said = [];
  try {
    assert.deepEqual(await reactStorybookRef(ours.url, { log: (m) => said.push(m) }), {
      react: { title: 'React components', url: ours.url },
    });
    assert.deepEqual(said, []);
  } finally {
    ours.close();
  }
});
