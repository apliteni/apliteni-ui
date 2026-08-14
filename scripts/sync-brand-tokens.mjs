#!/usr/bin/env node
/**
 * sync-brand-tokens — pull the Apliteni brand colour primitives from
 * apliteni/design-system into src/tokens/brand.generated.css.
 *
 * The downstream leg of the design-system -> apliteni-ui sync (RFC #42, Option
 * B). Only the `--color-apliteni-*` primitives are imported; semantic tokens
 * stay hand-authored, and the upstream's generic --radius/--space/--shadow/
 * --font tokens are deliberately dropped, being apliteni-ui's own.
 *
 * Usage:
 *   node scripts/sync-brand-tokens.mjs --from <path/to/tokens.css> [--sha <upstream-sha>]
 *   node scripts/sync-brand-tokens.mjs [--url https://style.apliteni.com/tokens.css] [--sha <sha>]
 *   node scripts/sync-brand-tokens.mjs --check   # fail if the generated file is stale
 */

import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/tokens/brand.generated.css');
const ASSET_DIR = resolve(__dirname, '../src/assets/brand.generated');
const DEFAULT_URL = 'https://style.apliteni.com/tokens.css';

// The umbrella brand marks the kit consumes (wordmark + seedling mark). The
// kit's own `prism` mark stays local — it's the identity of the kit, not the brand.
const BRAND_ASSETS = [
  ['apliteni-logo.svg', 'apliteni-logo.svg'],       // wordmark, light bg
  ['apliteni-logo-dark.svg', 'apliteni-logo-dark.svg'], // wordmark, dark bg
  ['apliteni-mark.svg', 'apliteni-mark.svg'],       // seedling mark
];

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const hasFlag = (name) => process.argv.includes(name);

async function loadSource() {
  const from = arg('--from');
  if (from) {
    return { css: await readFile(resolve(process.cwd(), from), 'utf8'), origin: `file:${from}` };
  }
  const url = arg('--url', DEFAULT_URL);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  return { css: await res.text(), origin: url };
}

/**
 * Keep the brand primitives: the `--color-apliteni-*` palette plus the motion
 * vocabulary (`--duration-*`, `--easing-*`). Deliberately drop the upstream's
 * generic `--radius/--space/--shadow/--font` — those are apliteni-ui's own.
 * The motion names don't collide with the kit's `--ease`/`--dur-*`.
 */
function extractBrandPrimitives(css) {
  return css
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^--(color-apliteni|duration|easing)-[\w-]+:/.test(l))
    .map((l) => '  ' + l);
}

function render(lines, { origin, sha }) {
  const src = sha ? `apliteni/design-system@${sha}` : origin;
  return `/* ============================================================================
 * apliteni-ui — BRAND PRIMITIVES (generated, do not edit)
 *
 * Synced from ${src}
 * via: npm run tokens:sync
 *
 * The Apliteni umbrella-brand primitives: colour ramps + motion vocabulary
 * (--duration-*, --easing-*). The upstream owns them; edit them there, not here.
 * Our semantic tokens (--bg, --surface, --accent, ...) live in tokens.css and may
 * reference these over time. Run \`npm run tokens:drift\` to see where they diverge.
 * ========================================================================== */
:root {
${lines.join('\n')}
}
`;
}

async function main() {
  const { css, origin } = await loadSource();
  const lines = extractBrandPrimitives(css);
  if (lines.length === 0) throw new Error('No --color-apliteni-* / motion tokens found in source.');
  const sha = arg('--sha');
  const next = render(lines, { origin, sha });

  if (hasFlag('--check')) {
    const current = await readFile(OUT, 'utf8').catch(() => '');
    // Compare declaration bodies, ignoring the provenance header (sha/url churn).
    const body = (s) => s.slice(s.indexOf(':root {'));
    if (body(current) !== body(next)) {
      console.error('✗ brand.generated.css is stale. Run: npm run tokens:sync');
      process.exit(1);
    }
    console.log(`✓ brand.generated.css is in sync (${lines.length} primitives).`);
    return;
  }

  await writeFile(OUT, next, 'utf8');
  console.log(`✓ Wrote ${lines.length} brand primitives -> src/tokens/brand.generated.css`);
  console.log(`  source: ${sha ? `sha ${sha}` : origin}`);

  // Optionally sync brand marks (wordmark + seedling mark) from a local checkout.
  // Emit both the raw .svg files and an index.js of inline strings — the JS
  // module imports cleanly in plain Node (the a11y test) AND in Vite (Storybook),
  // where a bare `.svg?raw` import would break under node --test.
  const assetsFrom = arg('--assets-from');
  if (assetsFrom) {
    await mkdir(ASSET_DIR, { recursive: true });
    const named = { 'apliteni-logo.svg': 'apliteniLogo', 'apliteni-logo-dark.svg': 'apliteniLogoDark', 'apliteni-mark.svg': 'apliteniMark' };
    const exports = [];
    for (const [src, dst] of BRAND_ASSETS) {
      const svg = await readFile(resolve(process.cwd(), assetsFrom, src), 'utf8');
      await writeFile(resolve(ASSET_DIR, dst), svg, 'utf8');
      exports.push(`export const ${named[dst]} = ${JSON.stringify(svg.trim())};`);
    }
    const header = '// BRAND MARKS (generated, do not edit) — synced from apliteni/design-system.\n' +
      '// The umbrella wordmark + seedling mark. The kit\'s own `prism` stays in brand.js.\n';
    await writeFile(resolve(ASSET_DIR, 'index.js'), header + exports.join('\n') + '\n', 'utf8');
    console.log(`✓ Synced ${BRAND_ASSETS.length} brand marks + index.js -> src/assets/brand.generated/`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
