#!/usr/bin/env node
/**
 * sync-brand-tokens — pull the Apliteni brand colour primitives from
 * apliteni/design-system into src/tokens/brand.generated.css.
 *
 * This is the downstream leg of the design-system -> apliteni-ui sync (RFC #42,
 * Option B). The upstream owns the brand palette; we import only the
 * `--color-apliteni-*` primitives — the violet + supporting ramps this kit
 * lacks. Semantic tokens (--bg, --surface, --accent) stay hand-authored in
 * tokens.css: the purple deck theme is a deliberate product choice (RFC Q1,
 * Option 1). Nothing here overrides the dark-theme feel; the file only ADDS
 * namespaced primitives that our own tokens may reference over time.
 *
 * Source of truth for the shape: design-system/dist/tokens.css (Style Dictionary).
 * We deliberately drop the upstream's generic --radius/--space/--shadow/--font
 * tokens — those are apliteni-ui's own and must not be clobbered.
 *
 * Usage:
 *   node scripts/sync-brand-tokens.mjs --from <path/to/tokens.css> [--sha <upstream-sha>]
 *   node scripts/sync-brand-tokens.mjs [--url https://style.apliteni.com/tokens.css] [--sha <sha>]
 *   node scripts/sync-brand-tokens.mjs --check   # fail if the generated file is stale
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/tokens/brand.generated.css');
const DEFAULT_URL = 'https://style.apliteni.com/tokens.css';

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

/** Keep only the `--color-apliteni-*` declarations — the brand primitives. */
function extractBrandColors(css) {
  return css
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^--color-apliteni-[\w-]+:/.test(l))
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
 * These are the Apliteni umbrella-brand colour primitives (violet + supporting
 * ramps). The upstream owns them; edit them there, not here. Our semantic
 * tokens (--bg, --surface, --accent, ...) live in tokens.css and may reference
 * these over time. Run \`npm run tokens:drift\` to see where they diverge.
 * ========================================================================== */
:root {
${lines.join('\n')}
}
`;
}

async function main() {
  const { css, origin } = await loadSource();
  const lines = extractBrandColors(css);
  if (lines.length === 0) throw new Error('No --color-apliteni-* tokens found in source.');
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
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
