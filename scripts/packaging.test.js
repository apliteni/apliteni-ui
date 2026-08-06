// Packaging guard — the tarball must contain what `exports` promises.
//
// 0.7.2 shipped an `exports` map that looked complete and a `files` array that
// dropped every React file, and nobody noticed: an export entry is just a string
// in a JSON file, so reading it back proves nothing. These tests read the real
// pack list instead. `npm pack --dry-run` runs the whole pack pipeline — `prepack`
// included, so the React workspace is built here the same way it is on publish —
// and reports the exact files that would land in the tarball.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

const stdout = execFileSync('npm', ['pack', '--dry-run', '--json'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});
// `prepack` (the tsup build) writes its own progress to this stdout, so the JSON
// document starts at the first bare `[` line rather than at byte 0.
const lines = stdout.split('\n');
const packed = new Set(
  JSON.parse(lines.slice(lines.indexOf('[')).join('\n'))[0].files.map((f) => f.path),
);

/** Every './…' target in an exports entry (string, or a conditions object). */
function targets(entry) {
  if (typeof entry === 'string') return [entry];
  if (entry && typeof entry === 'object') return Object.values(entry).flatMap(targets);
  return [];
}

test('every exports target is in the tarball', () => {
  for (const [subpath, entry] of Object.entries(pkg.exports)) {
    for (const target of targets(entry)) {
      const file = target.replace(/^\.\//, '');
      assert.ok(
        packed.has(file),
        `exports["${subpath}"] points at ${target}, which is NOT in the tarball — ` +
          `add it to "files" (or fix the export). Packed: ${packed.size} files.`,
      );
    }
  }
});

test('the React workspace is not a second publishable package', () => {
  const workspace = JSON.parse(readFileSync(path.join(root, 'react', 'package.json'), 'utf8'));

  // One package, one version, one pin. The React components ship as the ./react
  // subpath of the kit; `react/` is only where their source lives.
  assert.equal(workspace.private, true, 'react/ must be private — it is never published');
  assert.notEqual(
    workspace.name,
    '@apliteni/apliteni-ui-react',
    'no second npm package name: React ships as @apliteni/apliteni-ui/react',
  );
  assert.equal(
    workspace.dependencies?.['@apliteni/apliteni-ui'],
    undefined,
    'the workspace is part of the kit — it cannot depend on the kit',
  );

  // `*` resolves to whatever is newest at install time, which walks straight
  // through a consumer's version pin and install cooldown.
  for (const block of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const [name, range] of Object.entries(workspace[block] ?? {})) {
      assert.notEqual(range, '*', `${block}.${name} must be a real range, never "*"`);
    }
  }
});

test('React is a peer of the kit, never a dependency', () => {
  assert.equal(pkg.dependencies, undefined, 'the kit ships no runtime dependencies');
  for (const name of ['react', 'react-dom']) {
    assert.ok(pkg.peerDependencies?.[name], `${name} must be declared as a peer`);
    assert.match(pkg.peerDependencies[name], />=\s*18/, `${name} peer range must accept 18+`);
    // Optional, because `.`, `./css` and the other subpaths are framework-agnostic:
    // a vanilla HTML consumer must not have React installed into its tree.
    assert.equal(
      pkg.peerDependenciesMeta?.[name]?.optional,
      true,
      `${name} must be an OPTIONAL peer — only the ./react subpath needs it`,
    );
  }
});

test('the React subpath ships built JS, types and CSS', () => {
  for (const file of ['react/dist/index.js', 'react/dist/index.d.ts', 'react/dist/index.css']) {
    assert.ok(packed.has(file), `${file} is missing from the tarball — consumers of ` +
      `@apliteni/apliteni-ui/react would get a package with no React in it.`);
  }
});
