// Packaging guard — every subpath a consumer can import must ship, resolve and yield
// something, proven from a scratch install outside the repository rather than from the
// working tree, which is the only vantage point where the published resolution semantics
// apply. What it checks, why the install is what makes it honest, and what to do when you
// add an export: CONTRIBUTING.md, "Packaging guard".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packedFilePaths } from './shipped-surface.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

// Outside the repository, and gone again afterwards — including when an assertion
// below throws, because `exit` fires on the way out of a failed run too.
const scratch = mkdtempSync(path.join(realpathSync(os.tmpdir()), 'apliteni-ui-packaging-'));
process.on('exit', () => rmSync(scratch, { recursive: true, force: true }));

/**
 * A child command whose failure has to be readable. Setup that dies silently is
 * the defect this guard exists to replace, so every non-zero exit is re-thrown
 * with both streams attached.
 */
function run(command, args, cwd) {
  try {
    return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    throw new Error(
      `packaging guard setup failed: \`${command} ${args.join(' ')}\` in ${cwd}\n` +
        `--- stdout ---\n${error.stdout ?? ''}\n--- stderr ---\n${error.stderr ?? ''}`,
      { cause: error },
    );
  }
}

// ---------------------------------------------------------------------------
// 1. Pack. `npm pack` runs the whole pack pipeline — `prepare` included, so the
//    React workspace is built here the same way it is on publish — and reports
//    the exact files that land in the tarball.
// ---------------------------------------------------------------------------
const packStdout = run('npm', ['pack', '--json', '--pack-destination', scratch], root);
// `prepare` (the tsup build) writes its own progress to this stdout, so the JSON
// document starts at the first bare `[` line rather than at byte 0. Shared with
// scripts/shipped-surface.mjs rather than written out twice — see the note on
// packedFilePaths for the third copy, which lives in security.yml and cannot
// import anything.
const packed = new Set(packedFilePaths(packStdout, root));

const tarballs = readdirSync(scratch).filter((f) => f.endsWith('.tgz'));
if (tarballs.length !== 1) {
  throw new Error(
    `packaging guard setup failed: expected exactly one tarball in ${scratch}, found ` +
      `${tarballs.length} (${tarballs.join(', ') || 'none'}).`,
  );
}
const tarball = path.join(scratch, tarballs[0]);

// ---------------------------------------------------------------------------
// 2. Install the tarball into a consumer that lives outside the repository.
// ---------------------------------------------------------------------------
const consumer = path.join(scratch, 'consumer');
mkdirSync(consumer);
writeFileSync(
  path.join(consumer, 'package.json'),
  `${JSON.stringify(
    { name: 'apliteni-ui-packaging-consumer', private: true, version: '0.0.0', type: 'module' },
    null,
    2,
  )}\n`,
);
// `--offline` is deliberate: the kit declares no runtime dependencies, so a
// correct tarball installs with no registry access at all. If that ever stops
// being true the install fails here, loudly, instead of quietly going online.
run(
  'npm',
  ['install', tarball, '--no-audit', '--no-fund', '--no-package-lock', '--ignore-scripts', '--offline'],
  consumer,
);

const consumerModules = path.join(consumer, 'node_modules');
const installed = path.join(consumerModules, pkg.name);
if (!existsSync(path.join(installed, 'package.json'))) {
  throw new Error(
    `packaging guard setup failed: ${tarball} installed but ${installed}/package.json is ` +
      `missing — there is no installed package to check.`,
  );
}
const installedPkg = JSON.parse(readFileSync(path.join(installed, 'package.json'), 'utf8'));
// Snapshot the tree the kit alone produced, before anything else is linked in.
const treeFromKitAlone = readdirSync(consumerModules).filter((name) => !name.startsWith('.'));

// ---------------------------------------------------------------------------
// 3. Give the consumer React, the way a consumer of ./react has to. Linked from
//    the repo's own install rather than downloaded, so the guard stays offline
//    and pinned to the version the workspace already builds against.
// ---------------------------------------------------------------------------
function installedClosure(names) {
  const seen = new Set();
  const queue = [...names];
  while (queue.length > 0) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    const manifest = path.join(root, 'node_modules', name, 'package.json');
    if (!existsSync(manifest)) {
      throw new Error(
        `packaging guard setup failed: ${name} is not installed at ${path.dirname(manifest)}. ` +
          `Run \`npm ci\` first — the guard links the repo's own React into the scratch ` +
          `consumer rather than downloading one.`,
      );
    }
    seen.add(name);
    queue.push(...Object.keys(JSON.parse(readFileSync(manifest, 'utf8')).dependencies ?? {}));
  }
  return seen;
}
for (const name of installedClosure(['react', 'react-dom'])) {
  const link = path.join(consumerModules, name);
  if (existsSync(link)) continue;
  mkdirSync(path.dirname(link), { recursive: true });
  symlinkSync(path.join(root, 'node_modules', name), link, 'dir');
}

// ---------------------------------------------------------------------------
// 4. Work out every specifier a consumer can write, then probe them all from
//    inside the consumer, in one child process.
// ---------------------------------------------------------------------------

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

const probeSpecs = Object.entries(pkg.exports).flatMap(([subpath, entry]) =>
  specifiers(subpath, entry).map((spec) => ({
    subpath,
    spec,
    js: targets(entry).some((t) => t.endsWith('.js')),
  })),
);

writeFileSync(path.join(consumer, 'probe-input.json'), JSON.stringify(probeSpecs));
writeFileSync(
  path.join(consumer, 'probe.mjs'),
  `// Written by scripts/packaging.test.js. Runs as a consumer module: every
// resolution below walks the installed package's exports map exactly as a
// consumer's would, conditions and all.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const specs = JSON.parse(readFileSync(new URL('./probe-input.json', import.meta.url), 'utf8'));
const describe = (error) => \`\${error.code ?? error.name}: \${error.message}\`;
const results = [];

for (const { spec, js } of specs) {
  const result = { spec };
  try {
    result.importResolved = import.meta.resolve(spec);
  } catch (error) {
    result.importResolveError = describe(error);
  }
  try {
    result.requireResolved = require.resolve(spec);
  } catch (error) {
    result.requireResolveError = describe(error);
  }
  if (js) {
    try {
      result.names = Object.keys(await import(spec));
    } catch (error) {
      result.importError = describe(error);
    }
  }
  results.push(result);
}

writeFileSync(new URL('./probe-output.json', import.meta.url), JSON.stringify(results));
`,
);
run(process.execPath, [path.join(consumer, 'probe.mjs')], consumer);

const probeOutput = path.join(consumer, 'probe-output.json');
if (!existsSync(probeOutput)) {
  throw new Error(
    `packaging guard setup failed: the consumer probe produced no ${probeOutput} — nothing ` +
      `was actually resolved or imported.`,
  );
}
const probe = new Map(
  JSON.parse(readFileSync(probeOutput, 'utf8')).map((result) => [result.spec, result]),
);

const installedReal = realpathSync(installed);
/** True when a resolved path is inside the installed copy rather than some ambient one. */
function insideInstalled(target) {
  const resolved = realpathSync(target.startsWith('file:') ? fileURLToPath(target) : target);
  return resolved === installedReal || resolved.startsWith(installedReal + path.sep);
}

// ---------------------------------------------------------------------------
// Assertions.
// ---------------------------------------------------------------------------

test('the guard checked a freshly installed copy of the kit, not the working tree', () => {
  // Without this, a setup that silently checked nothing would look like a pass.
  assert.equal(installedPkg.name, pkg.name, `${installed} is not the kit`);
  assert.equal(
    installedPkg.version,
    pkg.version,
    `the installed copy is ${installedPkg.version}, the working tree is ${pkg.version}`,
  );
  assert.ok(probeSpecs.length > 0, 'no exports subpaths were probed — the guard checked nothing');
  for (const { spec } of probeSpecs) {
    assert.ok(probe.has(spec), `the consumer probe returned no result for ${spec}`);
  }
});

test('every exports target is in the tarball, and is not empty once installed', () => {
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
        const onDisk = path.join(installed, file);
        assert.ok(
          existsSync(onDisk),
          `exports["${subpath}"] points at ${file}, which is missing from the INSTALLED ` +
            `package at ${installed} — being listed in "files" is not the same as shipping.`,
        );
        assert.ok(
          statSync(onDisk).size > 0,
          `exports["${subpath}"] points at ${file}, which is 0 bytes once installed — a ` +
            `listed file is not a working one.`,
        );
      }
    }
  }
});

test('every exports subpath resolves for an installed consumer, for import AND for require', () => {
  // From a consumer, '@apliteni/apliteni-ui/x' goes through the installed
  // `exports` map, conditions and all. An entry that lists only `import` — as
  // ./react did — throws ERR_PACKAGE_PATH_NOT_EXPORTED for require(), which is
  // exactly the bug this catches.
  for (const { subpath, spec } of probeSpecs) {
    const result = probe.get(spec);
    assert.equal(
      result.importResolveError,
      undefined,
      `import("${spec}") does not resolve from an installed consumer — check ` +
        `exports["${subpath}"]. ${result.importResolveError}`,
    );
    assert.equal(
      result.requireResolveError,
      undefined,
      `require("${spec}") does not resolve from an installed consumer — ` +
        `exports["${subpath}"] needs a "default" condition (last), or every ` +
        `require-condition resolver (Node, CJS bundlers, TypeScript --module node16) is ` +
        `locked out. ${result.requireResolveError}`,
    );
    for (const [kind, resolved] of [
      ['import', result.importResolved],
      ['require', result.requireResolved],
    ]) {
      assert.ok(
        insideInstalled(resolved),
        `${kind}("${spec}") resolved to ${resolved}, which is outside the installed ` +
          `package at ${installed} — the guard would be reading an ambient copy instead ` +
          `of what a consumer gets.`,
      );
    }
  }
});

test('every JS entry point exports something when imported by an installed consumer', async () => {
  // Two counter-examples at once: a barrel emptied to `export {}` (the file is
  // packed, both resolvers find it, and nothing works), and a bare specifier
  // inside the bundle that only resolves in the repo. CSS is checked by size
  // above — Node cannot import a stylesheet.
  for (const { subpath, spec, js } of probeSpecs) {
    if (!js) continue;
    const result = probe.get(spec);
    assert.equal(
      result.importError,
      undefined,
      `import("${spec}") threw inside an installed consumer — exports["${subpath}"] ` +
        `is broken for everyone who is not this repository. ${result.importError}`,
    );
    const named = result.names.filter((name) => name !== 'default');
    assert.ok(
      named.length > 0 || result.names.includes('default'),
      `import("${spec}") yields an empty module — exports["${subpath}"] resolves to a ` +
        `file that exports nothing.`,
    );
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
    const declared = installedPkg[block];
    if (declared === undefined) continue;
    const names = Array.isArray(declared) ? declared : Object.keys(declared);
    for (const name of ['react', 'react-dom', 'scheduler']) {
      assert.ok(
        !names.includes(name),
        `the published manifest's "${block}" lists ${name}. React is the consumer's to ` +
          `install — declaring it here puts it back in the production audit set, and that ` +
          `audit gates main.`,
      );
    }
  }
  assert.equal(installedPkg.dependencies, undefined, 'the kit ships no runtime dependencies');

  // Not just the manifest — the tree npm actually built from it, before this
  // guard linked React in for the import probe.
  for (const name of ['react', 'react-dom', 'scheduler']) {
    assert.ok(
      !treeFromKitAlone.includes(name),
      `installing the kit on its own put ${name} into the consumer's node_modules ` +
        `(${treeFromKitAlone.join(', ')}). Nothing in the manifest may drag React in.`,
    );
  }

  // A bundled copy would be the same problem wearing a different hat: React inside
  // our tarball, on a version we chose, unauditable and duplicated in the consumer's
  // tree. tsup keeps it external, so the built entry imports the bare specifier.
  const bundle = readFileSync(path.join(installed, 'react', 'dist', 'index.js'), 'utf8');
  for (const name of ['react', 'react-dom']) {
    assert.match(
      bundle,
      new RegExp(`from\\s*["']${name}["']`),
      `the installed react/dist/index.js does not import "${name}" as a bare specifier — ` +
        'React looks bundled rather than external. Check `external` in react/tsup.config.ts.',
    );
  }
});

test('the README tells consumers of ./react to install React themselves', () => {
  // With the peers gone, nothing machine-readable tells a consumer that
  // @apliteni/apliteni-ui/react needs React — react/package.json is not published,
  // so the README is the only signal that ships. It has to keep saying it, in the
  // copy that actually reaches them.
  assert.ok(packed.has('README.md'), 'README.md must be in the tarball');
  const readme = readFileSync(path.join(installed, 'README.md'), 'utf8');
  assert.match(
    readme,
    /npm install [^\n]*\breact\b[^\n]*\breact-dom\b/,
    'the installed README.md must show the install line that includes react and react-dom — ' +
      'it is the only place a consumer of the ./react subpath learns it needs them.',
  );
});

test('the React bundle is marked as a client module', () => {
  // tsup emits one module for every component, so a Next.js Server Component
  // that imports the stateless Badge still loads the module holding useState.
  // The directive has to be the FIRST thing in the file — after an import it is
  // just a stray expression and the App Router build fails.
  const bundle = readFileSync(path.join(installed, 'react', 'dist', 'index.js'), 'utf8');
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
    assert.ok(
      existsSync(path.join(installed, file)),
      `${file} is missing from the installed package at ${installed}.`,
    );
  }
  // Types that declare nothing are the .d.ts equivalent of an empty bundle.
  const dts = readFileSync(path.join(installed, 'react', 'dist', 'index.d.ts'), 'utf8');
  assert.match(dts, /\bexport\b/, 'react/dist/index.d.ts declares no exports');
});
