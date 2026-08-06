// Packaging guard — every subpath a consumer can import must resolve, ship and
// yield something.
//
// 0.7.2 shipped an `exports` map that looked complete and a `files` array that
// dropped every React file, and nobody noticed: an export entry is just a string
// in a JSON file, so reading it back proves nothing. The first version of this
// guard read the real pack list, which caught that — but it compared paths as
// strings and never resolved a specifier, so it still passed while
// `exports["./react"]` was unreachable from `require()` and while the bundle
// behind it was zero bytes. So the assertions below are, in order: the file is
// in the tarball, it is not empty, both resolvers can find it, and the JS
// entries actually export names.
//
// `npm pack --dry-run` runs the whole pack pipeline — `prepare` included, so the
// React workspace is built here the same way it is on publish — and reports the
// exact files that would land in the tarball.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const require = createRequire(import.meta.url);

const stdout = execFileSync('npm', ['pack', '--dry-run', '--json'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});
// `prepare` (the tsup build) writes its own progress to this stdout, so the JSON
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

const rel = (target) => target.replace(/^\.\//, '');

/**
 * Packed files matching a wildcard target such as `./guidelines/*.md`. One `*`
 * in a target stands for one `*` in the subpath, so the captured segment is what
 * turns `./guidelines/*` into an importable specifier.
 */
function wildcardMatches(target) {
  const pattern = rel(target)
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('(.+)');
  const re = new RegExp(`^${pattern}$`);
  return [...packed].map((file) => re.exec(file)).filter(Boolean);
}

/** Concrete `@apliteni/apliteni-ui/…` specifiers, wildcard subpaths expanded. */
function specifiers(subpath, entry) {
  const spec = subpath.replace(/^\./, pkg.name);
  if (!subpath.includes('*')) return [spec];
  // A wildcard subpath has nothing to resolve until it is filled in, so fill it
  // in from the tarball. No match is a real failure — but it has to say *that*,
  // not "./guidelines/* is not in the tarball", which is never true of a pattern.
  return targets(entry).flatMap((target) => {
    const matches = wildcardMatches(target);
    assert.ok(
      matches.length > 0,
      `exports["${subpath}"] -> ${target} is a wildcard that matches no packed ` +
        `file. Add the files to "files", or drop the export. Packed: ${packed.size} files.`,
    );
    return matches.map((m) => spec.replace('*', m[1]));
  });
}

test('every exports target is in the tarball, and is not empty', () => {
  for (const [subpath, entry] of Object.entries(pkg.exports)) {
    for (const target of targets(entry)) {
      const files = target.includes('*')
        ? wildcardMatches(target).map((m) => m[0])
        : [rel(target)];

      if (target.includes('*')) {
        assert.ok(
          files.length > 0,
          `exports["${subpath}"] -> ${target} is a wildcard that matches no packed file.`,
        );
      } else {
        assert.ok(
          packed.has(files[0]),
          `exports["${subpath}"] points at ${target}, which is NOT in the tarball — ` +
            `add it to "files" (or fix the export). Packed: ${packed.size} files.`,
        );
      }

      for (const file of files) {
        assert.ok(
          statSync(path.join(root, file)).size > 0,
          `exports["${subpath}"] points at ${file}, which is 0 bytes — a listed ` +
            `file is not a working one.`,
        );
      }
    }
  }
});

test('every exports subpath resolves, for import AND for require', () => {
  // Self-reference: inside the package, '@apliteni/apliteni-ui/x' goes through
  // the same `exports` map a consumer's resolver walks, conditions and all. An
  // entry that lists only `import` — as ./react did — resolves here and throws
  // ERR_PACKAGE_PATH_NOT_EXPORTED there, which is exactly the bug this catches.
  for (const [subpath, entry] of Object.entries(pkg.exports)) {
    for (const spec of specifiers(subpath, entry)) {
      assert.doesNotThrow(
        () => import.meta.resolve(spec),
        `import("${spec}") does not resolve — check exports["${subpath}"].`,
      );
      assert.doesNotThrow(
        () => require.resolve(spec),
        `require("${spec}") does not resolve — exports["${subpath}"] needs a ` +
          `"default" condition (last), or every require-condition resolver ` +
          `(Node, CJS bundlers, TypeScript --module node16) is locked out.`,
      );
    }
  }
});

test('every JS entry point exports something', async () => {
  // The counter-example is a barrel emptied to `export {}`: the file is packed,
  // both resolvers find it and nothing works. CSS is checked by size above —
  // Node cannot import a stylesheet.
  for (const [subpath, entry] of Object.entries(pkg.exports)) {
    const isJs = targets(entry).some((t) => t.endsWith('.js'));
    if (!isJs) continue;
    for (const spec of specifiers(subpath, entry)) {
      const mod = await import(spec);
      const names = Object.keys(mod).filter((n) => n !== 'default');
      assert.ok(
        names.length > 0 || 'default' in mod,
        `import("${spec}") yields an empty module — exports["${subpath}"] ` +
          `resolves to a file that exports nothing.`,
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

test('installing the kit never pulls React into a consumer tree', () => {
  // The kit used to declare react and react-dom as optional peers. npm records an
  // optional peer in the lockfile as `devOptional`, which put React in the set the
  // production audit walks — and that audit is a required check on main, so any
  // react-dom advisory turned every PR red over a package that ships no React. The
  // peers are gone; what has to stay true is the property underneath them. React
  // must never appear on the runtime side of the manifest, in any form npm would
  // install, and the shipped bundle must import it rather than inline a copy.
  const runtimeBlocks = [
    'dependencies',
    'optionalDependencies',
    'peerDependencies',
    'bundleDependencies',
    'bundledDependencies',
  ];
  for (const block of runtimeBlocks) {
    const declared = pkg[block];
    if (declared === undefined) continue;
    const names = Array.isArray(declared) ? declared : Object.keys(declared);
    for (const name of ['react', 'react-dom', 'scheduler']) {
      assert.ok(
        !names.includes(name),
        `"${block}" lists ${name}. React is the consumer's to install — declaring it ` +
          `here puts it back in the production audit set, and that audit gates main.`,
      );
    }
  }
  assert.equal(pkg.dependencies, undefined, 'the kit ships no runtime dependencies');

  // A bundled copy would be the same problem wearing a different hat: React inside
  // our tarball, on a version we chose, unauditable and duplicated in the consumer's
  // tree. tsup keeps it external, so the built entry imports the bare specifier.
  const bundle = readFileSync(path.join(root, 'react', 'dist', 'index.js'), 'utf8');
  for (const name of ['react', 'react-dom']) {
    assert.match(
      bundle,
      new RegExp(`from\\s*["']${name}["']`),
      `react/dist/index.js does not import "${name}" as a bare specifier — React ` +
        'looks bundled rather than external. Check `external` in react/tsup.config.ts.',
    );
  }
});

test('the README tells consumers of ./react to install React themselves', () => {
  // With the peers gone, nothing machine-readable tells a consumer that
  // @apliteni/apliteni-ui/react needs React — react/package.json is not published,
  // so the README is the only signal that ships. It has to keep saying it.
  assert.ok(packed.has('README.md'), 'README.md must be in the tarball');
  const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.match(
    readme,
    /npm install [^\n]*\breact\b[^\n]*\breact-dom\b/,
    'README.md must show the install line that includes react and react-dom — it is ' +
      'the only place a consumer of the ./react subpath learns it needs them.',
  );
});

test('the React bundle is marked as a client module', () => {
  // tsup emits one module for every component, so a Next.js Server Component
  // that imports the stateless Badge still loads the module holding useState.
  // The directive has to be the FIRST thing in the file — after an import it is
  // just a stray expression and the App Router build fails.
  const bundle = readFileSync(path.join(root, 'react', 'dist', 'index.js'), 'utf8');
  assert.match(
    bundle.split('\n')[0],
    /^(['"])use client\1;?$/,
    'react/dist/index.js must start with the "use client" directive — see the tsup banner',
  );
});

test('the React subpath ships built JS, types and CSS', () => {
  for (const file of ['react/dist/index.js', 'react/dist/index.d.ts', 'react/dist/index.css']) {
    assert.ok(packed.has(file), `${file} is missing from the tarball — consumers of ` +
      `@apliteni/apliteni-ui/react would get a package with no React in it.`);
  }
  // Types that declare nothing are the .d.ts equivalent of an empty bundle.
  const dts = readFileSync(path.join(root, 'react', 'dist', 'index.d.ts'), 'utf8');
  assert.match(dts, /\bexport\b/, 'react/dist/index.d.ts declares no exports');
});
