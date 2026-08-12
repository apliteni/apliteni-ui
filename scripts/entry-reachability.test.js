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
 * One entry today. Every other module under src/components/ is a component
 * factory meant for consumers, and the only other private helper is `esc`,
 * which lives in src/components/index.js and rides along on a public module.
 * Note the corollary: a short list gives the staleness test below little to
 * check, so the gate's real floor is the anti-vacuity test, not this list. */
const NOT_PUBLIC = [
  {
    module: 'components/overlay.js',
    why: 'it holds the scrim and focus-trap internals drawer.js and confirm.js share, and '
      + 'publishing focusablesIn/mark/trapTab would commit the package to keeping '
      + 'helpers those two rewrite between themselves.',
  },
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

/* ---------------------------------------------------------------------------
 * The other kind of unreachable: a factory a consumer can import but cannot
 * find. Reaching a name and knowing it exists are the same problem one step
 * apart, and the catalog in docs/library.md drifted exactly the way src/index.js
 * did — dropdown(), drawer(), nav(), footer() and success() were all published
 * and none of them were written down. Two hand-maintained lists again.
 *
 * Only inline code spans count. A word search over the prose is not sound: the
 * catalog says "select a passage" about the feedback widget, which would read as
 * coverage for select(), a form control it says nothing about. Fenced blocks are
 * stripped for the same reason — a directory listing is not documentation.
 *
 * What this does NOT prove: that the row says anything useful, or that a name is
 * documented in its own right. A short name that doubles as another factory's
 * option reads as covered from that signature alone — delete the `footer()` row
 * and `footer` still appears inside `drawer({ …, footer, … })`. Thirteen of the
 * seventy exports sit in that position today. So this is a floor: a factory added
 * with no row anywhere is always caught, which is the drift that actually happens.
 * ------------------------------------------------------------------------- */
const docFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'library.md');

/* Names the entry publishes that docs/library.md deliberately does not describe.
 * Empty: every export is in the catalog, the theming section or the note under
 * it. An entry here needs a reason a consumer is better off not knowing. */
const NOT_DOCUMENTED = [
  // { name: 'example', why: 'why a consumer should not be told about it' },
];

/** Identifiers inside `backticks`, fenced blocks removed. */
function documentedNames(md) {
  const prose = md.replace(/^```[\s\S]*?^```/gm, '');
  const names = new Set();
  for (const [, span] of prose.matchAll(/`([^`\n]+)`/g)) {
    for (const tok of span.split(/[^\w$]+/)) {
      if (/^[A-Za-z_$][\w$]*$/.test(tok)) names.add(tok);
    }
  }
  return names;
}

test('the docs scan reads code spans, not prose', async () => {
  // Vacuity runs one way here: if the extraction over-matches, every name looks
  // documented and the assertion below can never fail. So prove it under-matches
  // — a word that only ever appears in prose must not come out of it.
  const md = readFileSync(docFile, 'utf8');
  const documented = documentedNames(md);
  const entry = await import(pathToFileURL(entryFile).href);

  assert.ok(
    documented.size >= 30,
    `only ${documented.size} identifiers came out of ${docFile} — the code-span parse is ` +
      'broken, and "documented" below is a label nothing has to earn.',
  );
  assert.ok(
    Object.keys(entry).length >= 40,
    `the entry namespace has ${Object.keys(entry).length} names — too few to be the kit, ` +
      'so the coverage check is comparing against almost nothing.',
  );
  const canary = 'orthogonal';
  assert.ok(
    md.includes(canary),
    `this test uses "${canary}" as a prose-only canary and docs/library.md no longer ` +
      'contains it. Pick another word that appears in the prose and never in backticks.',
  );
  assert.ok(
    !documented.has(canary),
    `"${canary}" appears in docs/library.md only as prose, and the scan picked it up ` +
      'anyway — it is reading the whole file, not the code spans, so every export would ' +
      'come out documented no matter what the catalog says.',
  );
});

test('every name the entry publishes is written down in docs/library.md', async () => {
  const documented = documentedNames(readFileSync(docFile, 'utf8'));
  const entry = await import(pathToFileURL(entryFile).href);
  const exempt = new Set(NOT_DOCUMENTED.map((e) => e.name));

  const undocumented = Object.keys(entry)
    .filter((name) => !documented.has(name) && !exempt.has(name))
    .sort();

  assert.deepEqual(
    undocumented,
    [],
    `${undocumented.join(', ')} — published from src/index.js and named nowhere in ` +
      'docs/library.md. A consumer can import it and has no way to learn it exists, which ' +
      'is the reachability bug one step further out. Add a catalog row in ' +
      'docs/library.md, or list it in NOT_DOCUMENTED above with a reason.',
  );
});

test('every NOT_DOCUMENTED entry still names a live, undocumented export', async () => {
  const documented = documentedNames(readFileSync(docFile, 'utf8'));
  const entry = await import(pathToFileURL(entryFile).href);

  const stale = NOT_DOCUMENTED.filter(
    (e) => !(e.name in entry) || documented.has(e.name),
  ).map((e) => `${e.name} — exempt because ${e.why}`);

  assert.deepEqual(
    stale,
    [],
    'NOT_DOCUMENTED names an export the entry no longer publishes, or one docs/library.md ' +
      `now covers anyway — the list is lying about the kit:\n  ${stale.join('\n  ')}`,
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
