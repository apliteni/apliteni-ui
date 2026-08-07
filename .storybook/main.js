import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The port `npm run storybook -w react` asks for — and the width of the window it
// can actually end up in.
//
// `storybook dev -p 6007` treats the port as a wish. getServerPort
// (storybook/dist/core-server/index.js:11654) hands it to detect-port, which
// searches `[port, port + 10)` and walks upward one port at a time until a listen
// succeeds. So a Storybook that asked for 6007 and found it taken is somewhere in
// 6007..6016 — and nowhere else, because once all ten are taken detect-port stops
// walking and returns a random ephemeral port instead (`port = 0`).
//
// That is why the ref probes exactly this window: narrower would miss a legitimate
// drift, wider would be dead code.
export const REACT_STORYBOOK_PORT = 6007;
export const REACT_STORYBOOK_PORT_SPAN = 10;

export function reactStorybookCandidateUrls() {
  return Array.from(
    { length: REACT_STORYBOOK_PORT_SPAN },
    (_, i) => `http://localhost:${REACT_STORYBOOK_PORT + i}`,
  );
}

// Every story file the React workspace has on disk, spelled the way Storybook
// reports it in index.json: `./src/Modal.stories.tsx`, relative to `react/`.
function reactStoryImportPaths() {
  const workspace = path.join(repoRoot, 'react');
  const src = path.join(workspace, 'src');
  if (!fs.existsSync(src)) return [];
  const walk = (dir, acc = []) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, acc);
      else if (/\.stories\.(tsx|ts)$/.test(entry.name)) acc.push('./' + path.relative(workspace, full));
    }
    return acc;
  };
  return walk(src);
}

/** Cap a list in a log line, so one stranger cannot flood the terminal. */
const briefly = (items, limit = 3) =>
  items.slice(0, limit).join(', ') + (items.length > limit ? `, and ${items.length - limit} more` : '');

/**
 * Ask one candidate to identify itself.
 * @returns `{url, ok}` when it is ours, `{url, absent}` when it answered but is a
 *   stranger, `{url, error}` when nothing usable answered.
 */
async function probeStorybook(url, expected) {
  try {
    const response = await fetch(`${url}/index.json`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const index = await response.json();
    const served = new Set(Object.values(index?.entries ?? index?.stories ?? {}).map((e) => e.importPath));
    const absent = expected.filter((p) => !served.has(p));
    return absent.length === 0 ? { url, ok: true } : { url, absent };
  } catch (error) {
    return { url, error: error.message };
  }
}

/**
 * Find the React workspace's own Storybook wherever it actually landed, and
 * compose that.
 *
 * A port is not an identity. Before #137 this ref was a bare `http://localhost:6007`,
 * so the sidebar showed — under our own heading "React components" — whichever
 * Storybook had claimed the port first. On one machine that was a different
 * product's component library, 244 stories of it, and nothing said so.
 *
 * Pinning the port with --exact-port would fix that by making our Storybook refuse
 * to start whenever the port is taken, which trades a wrong sidebar for no
 * workbench at all. So the ref follows instead: it probes every port Storybook's
 * port-finder could have drifted to (see REACT_STORYBOOK_PORT_SPAN) and composes
 * the first one that proves itself.
 *
 * The proof is the index Storybook serves: our workspace's story files are on disk
 * here, and its Storybook must list every one of them. A stranger's index will not.
 * When no candidate proves itself the ref is dropped and the reason is printed to
 * the terminal, because a missing section of the sidebar explains nothing on its own.
 *
 * Candidates are probed concurrently and the lowest-numbered winner is taken, so a
 * cold start costs one timeout rather than ten.
 *
 * @returns the `refs` entry, or `{}` with a line logged saying why not.
 */
export async function reactStorybookRef(urls = reactStorybookCandidateUrls(), { log = console.warn } = {}) {
  const candidates = typeof urls === 'string' ? [urls] : urls;
  const tried = briefly(candidates, candidates.length);
  // The sidebar is built once, so "start it and it will appear" would be a lie.
  const next =
    'Start it with `npm run storybook -w react`, then restart this Storybook — the sidebar is ' +
    'composed once while this Storybook boots, so one started afterwards is only picked up on restart.';
  const missing = (why) => {
    log(`React components are not in the sidebar: ${why} ${next}`);
    return {};
  };

  const expected = reactStoryImportPaths();
  if (expected.length === 0) {
    return missing('the React workspace has no story files on disk, so nothing could be recognised as ours.');
  }

  const results = await Promise.all(candidates.map((url) => probeStorybook(url, expected)));

  // Promise.all keeps input order, so this is the lowest-numbered candidate that passed.
  const ours = results.find((r) => r.ok);
  if (ours) return { react: { title: 'React components', url: ours.url } };

  const strangers = results.filter((r) => r.absent);
  if (strangers.length > 0) {
    return missing(
      `something answered on ${briefly(strangers.map((s) => s.url))}, but it is not the React ` +
      `workspace's Storybook — ${strangers[0].url} does not serve ${briefly(strangers[0].absent)}. ` +
      `Probed ${tried}.`,
    );
  }

  return missing(`nothing answered on ${tried}.`);
}

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
  // No telemetry, and no "what's new in Storybook" card — that one is Storybook's
  // own release marketing, and it lands on top of our sidebar.
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  docs: { autodocs: false },
  // The "Get started" checklist onboards people to Storybook, not to this kit.
  // Two flags because Storybook gates the sidebar widget and the menu's Guide
  // page separately — turning off only the first leaves it reachable.
  features: { sidebarOnboardingChecklist: false, menuOnboardingChecklist: false },
  // Compose the React library's Storybook only during local dev, and only after
  // it has identified itself — see reactStorybookRef above.
  // In a static PRODUCTION build the ref would bake `http://localhost:6007`
  // into index.html, so every public visitor's browser tries to reach their
  // own localhost — which trips Chrome's "Local Network Access" prompt. Gate
  // it on configType so the deployed build (ui.apli.tech/storybook) is clean;
  // the probe does not even run there.
  refs: (_config, { configType }) => (configType === 'DEVELOPMENT' ? reactStorybookRef() : {}),
};
export default config;
