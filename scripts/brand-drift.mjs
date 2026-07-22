#!/usr/bin/env node
/**
 * brand-drift — report where apliteni-ui's semantic tokens diverge from the
 * synced Apliteni brand primitives.
 *
 * Informational only (exit 0). Under RFC #42 Q1/Option 1 the purple deck theme
 * is a deliberate product choice, so drift is expected — this just makes it
 * visible so reconciliation is a conscious decision, never a silent accident.
 *
 * Usage: node scripts/brand-drift.mjs
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS = resolve(__dirname, '../src/tokens/tokens.css');
const BRAND = resolve(__dirname, '../src/tokens/brand.generated.css');

/** Parse `--name: value;` decls into a last-wins map (dark theme = default). */
function parseVars(css) {
  const map = new Map();
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    map.set(m[1], m[2].trim().replace(/\s*\/\*.*$/, '').trim());
  }
  return map;
}

/** Resolve one level of var() against the brand map, and normalise hex case. */
function resolve1(val, brand) {
  const ref = val.match(/^var\((--[\w-]+)\)$/);
  if (ref && brand.has(ref[1])) return brand.get(ref[1]).toLowerCase();
  return val.toLowerCase();
}

// Curated correspondences: our semantic token -> the brand primitive it tracks.
const MAP = [
  ['--accent',        '--color-apliteni-primary-violet', 'Primary action / links'],
  ['--accent-strong', '--color-apliteni-violet-1',       'Filled button bg'],
  ['--green',         '--color-apliteni-supporting-green','Success / live'],
  ['--pink',          '--color-apliteni-supporting-pink', 'Accent pink'],
  ['--amber',         '--color-apliteni-supporting-yellow','Warning'],
  ['--strong',        '--color-apliteni-primary-white',   'Headings (dark theme)'],
];

const run = async () => {
  // Scope to base + dark theme (the default). Drop everything from the light
  // block onward so last-wins parsing reflects the dark palette we report.
  let tokensCss = await readFile(TOKENS, 'utf8');
  const lightAt = tokensCss.indexOf('[data-theme="light"]');
  if (lightAt !== -1) tokensCss = tokensCss.slice(0, lightAt);

  const tokens = parseVars(tokensCss);
  const brand = parseVars(await readFile(BRAND, 'utf8'));

  let drift = 0;
  const rows = [];
  for (const [sem, prim, note] of MAP) {
    const ours = (tokens.get(sem) || '—').toLowerCase();
    const theirs = brand.has(prim) ? resolve1(brand.get(prim), brand) : '(absent)';
    const match = ours === theirs;
    if (!match) drift++;
    rows.push({ sem, ours, prim, theirs, match, note });
  }

  const pad = (s, n) => String(s).padEnd(n);
  console.log('\nBrand drift — apliteni-ui semantic vs design-system primitives');
  console.log('(Option 1: drift is expected; this is a visibility report)\n');
  console.log(pad('SEMANTIC', 16) + pad('OURS', 11) + pad('BRAND', 11) + pad('', 6) + 'ROLE');
  console.log('-'.repeat(74));
  for (const r of rows) {
    const flag = r.match ? 'match' : 'DRIFT';
    console.log(pad(r.sem, 16) + pad(r.ours, 11) + pad(r.theirs, 11) + pad(flag, 6) + r.note);
  }
  // Kit-only accents the brand has no equivalent for.
  console.log('-'.repeat(74));
  console.log(pad('--cyan', 16) + pad((tokens.get('--cyan') || '—').toLowerCase(), 11) +
    pad('(none)', 11) + pad('ui-only', 6) + 'Deck link/flag — no brand equivalent');
  console.log(`\n${drift}/${MAP.length} mapped tokens drift from brand. ` +
    'Reconcile upstream or in tokens.css when intentional.\n');
};

run().catch((err) => { console.error(err.message); process.exit(1); });
