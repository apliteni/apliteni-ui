// Entry-reachability guard — the kit ships every component module, and nothing
// used to check that a consumer can reach them.
//
//   src/components/*.js — the modules. `files` in package.json is ["src", …], so
//                         every one of them lands in the published tarball.
//   src/index.js        — the `.` export. This is the ONLY thing a consumer who
//                         writes `import { … } from '@apliteni/apliteni-ui'` can
//                         see. The package has no `./components/*` subpath, so a
//                         module the entry never re-exports is unreachable.
//
// Shipping a file and publishing a factory are two different things, and the gap
// between them is silent in both directions:
//
//   in the tarball, not in index.js  → the consumer gets bytes they cannot
//                                      import. footer() and success() sat here
//                                      through 0.8.1 — fully built, fully
//                                      shipped, reachable by nobody.
//   in index.js, not on disk         → the entry throws ERR_MODULE_NOT_FOUND on
//                                      import, so the whole kit fails to load.
//
// It went unnoticed because the kit's own stories deep-import the module path
// rather than the entry (stories/components/Footer.stories.js:1 and friends do
// `from '../../src/components/footer.js'`), so Storybook rendered both
// components perfectly while the published surface was missing them. The stories
// answer "does this render?", which is a different question from "can anyone
// import this?".
//
// This is the same class as the stylesheet drift gated in
// scripts/stylesheet-manifest.test.js — two hand-maintained lists of the same
// thing, and nothing making them agree. So, as there: both sides are read from
// the files themselves. A hard-coded list of expected exports here would just be
// a third thing to drift.
//
// docs/library.md states the contract this file enforces: "The public JS surface
// is whatever src/index.js re-exports — add a factory there to publish it."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const components = path.join(src, 'components');
const entryFile = path.join(src, 'index.js');

/* Component modules that are deliberately NOT part of the public surface —
 * a shared private helper, an implementation detail some other module owns.
 * Each entry needs a reason, and the last test in this file fails if an entry
 * stops naming a live, genuinely-unreachable module, so a rename cannot leave
 * a lie behind.
 *
 * It is empty on purpose. Every module under src/components/ today is a
 * component factory meant for consumers; nothing there is internal-only. The
 * closest thing to a private helper is `esc`, and it lives in
 * src/components/index.js, which is public and re-exported. Note the corollary:
 * while this list is empty the staleness test below has nothing to check. The
 * gate's real floor is the anti-vacuity test, not this list. */
const NOT_PUBLIC = [
  // { module: 'components/example.js', why: 'why a consumer must not reach it' },
];

const EXEMPT = new Set(NOT_PUBLIC.map((e) => e.module));

/** Every non-test .js module under src/components/, relative to src/. */
function componentModules() {
  return readdirSync(components)
    .filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'))
    .sort()
    .map((f) => `components/${f}`);
}

/**
 * Every module specifier `src/index.js` re-exports from, as paths relative to
 * src/. Only `export … from '…'` counts: a bare `import` pulls a module in for
 * this file's own use and publishes none of its names, which is exactly the
 * distinction the bug turned on (footer.js imports `esc` from components/index.js
 * and was still unreachable).
 */
const REEXPORT = /^\s*export\s+(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s*from\s*['"]\.\/([^'"]+)['"]/gm;

function reexportsOf(file) {
  return [...readFileSync(file, 'utf8').matchAll(REEXPORT)].map((m) => m[1]);
}

/**
 * Everything reachable from src/index.js by following re-export edges, walked
 * transitively — a module re-exported by a module the entry re-exports is just
 * as public as one the entry names directly.
 */
function reachableFromEntry() {
  const seen = new Set();
  const walk = (rel) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    const abs = path.join(src, rel);
    if (!existsSync(abs)) return;
    for (const spec of reexportsOf(abs)) {
      walk(path.normalize(path.join(path.dirname(rel), spec)));
    }
  };
  for (const spec of reexportsOf(entryFile)) walk(path.normalize(spec));
  return seen;
}

const modules = componentModules();
const entryReexports = reexportsOf(entryFile);
const reachable = reachableFromEntry();

test('the reachability scan is reading two non-empty lists', () => {
  // Without this, every comparison below is a comparison of two empty sets, and
  // a broken regex (or a scan pointed at the wrong directory) reads as a pass
  // no matter what src/index.js says. The floor is on the directory scan — the
  // one input a syntax change cannot silently empty — and the re-export parse
  // is anchored to it by the assertion that follows.
  assert.ok(
    modules.length >= 8,
    `only ${modules.length} component modules found under ${components} — the scan is ` +
      `looking in the wrong place, and every assertion in this file is vacuous.`,
  );
  assert.ok(
    entryReexports.length > 0,
    'parsed no `export … from` out of src/index.js — the parser in this test is broken, ' +
      'not the kit.',
  );
  assert.ok(
    reachable.size >= entryReexports.length,
    `the transitive walk reached ${reachable.size} modules from ${entryReexports.length} ` +
      `direct re-exports — it is dropping edges, so "unreachable" here means nothing.`,
  );
  // At least one component module must come out reachable, or "reachable" is a
  // label this file never actually applies to anything.
  assert.ok(
    modules.some((rel) => reachable.has(rel)),
    'not one module under src/components/ came out reachable from src/index.js — the two ' +
      'sides are being compared in different path shapes, not measured.',
  );
});

test('every component module is reachable from the package entry', () => {
  const unreachable = modules.filter((rel) => !reachable.has(rel) && !EXEMPT.has(rel));

  assert.deepEqual(
    unreachable,
    [],
    `src/${unreachable.join(', src/')} ships in the tarball (package.json files: ["src", …]) ` +
      `and src/index.js never re-exports it. The package declares no ./components/* subpath, ` +
      `so nobody who installs @apliteni/apliteni-ui can import those factories by any ` +
      `specifier at all — the code is dead weight in every consumer's node_modules. Add ` +
      `\`export * from './${unreachable[0] ?? 'components/x.js'}';\` to src/index.js, or list ` +
      `it in NOT_PUBLIC above with a reason a consumer must not reach it.`,
  );
});

test('every module src/index.js re-exports exists on disk', () => {
  // The other direction. A rename or a delete that misses src/index.js does not
  // ship a smaller surface — it makes `import '@apliteni/apliteni-ui'` throw
  // ERR_MODULE_NOT_FOUND, and the entire kit stops loading for every consumer.
  const missing = entryReexports.filter((rel) => !existsSync(path.join(src, rel)));

  assert.deepEqual(
    missing,
    [],
    `src/index.js re-exports ${missing.join(', ')}, which does not exist under src/. The ` +
      `package entry cannot resolve, so every consumer's import of the kit throws ` +
      `ERR_MODULE_NOT_FOUND.`,
  );
});

test('the entry actually re-exports the names those modules define', async () => {
  // Naming the module in src/index.js is necessary but not sufficient: with
  // `export *`, a name defined by two modules is ambiguous and ESM drops it from
  // the entry namespace silently. This is the only assertion here that asks the
  // module system rather than the source text, so it also covers a module made
  // reachable by a mechanism the regex above cannot see.
  const entry = await import(pathToFileURL(entryFile).href);
  const missing = [];
  for (const rel of modules) {
    if (!reachable.has(rel) || EXEMPT.has(rel)) continue;
    const mod = await import(pathToFileURL(path.join(src, rel)).href);
    for (const name of Object.keys(mod)) {
      if (!(name in entry)) missing.push(`${name} (src/${rel})`);
    }
  }

  assert.deepEqual(
    missing,
    [],
    `src/index.js names the module, but these exports never reach the entry namespace:\n  ` +
      `${missing.join('\n  ')}\nTwo re-exported modules almost certainly define the same ` +
      `name, and ESM resolves an ambiguous star-export by dropping the name entirely. ` +
      `Rename one, or re-export it explicitly.`,
  );
});

test('every NOT_PUBLIC entry still names a live, unreachable module', () => {
  const stale = NOT_PUBLIC.filter(
    (e) => !modules.includes(e.module) || reachable.has(e.module),
  ).map((e) => `${e.module} — exempt because ${e.why}`);

  assert.deepEqual(
    stale,
    [],
    'NOT_PUBLIC names a module that no longer exists, or one that src/index.js now ' +
      `re-exports anyway — the list is lying about the kit:\n  ${stale.join('\n  ')}`,
  );
});
