/* Rule: every `__label` the kit's factories put into markup has a rule in the
 * kit's CSS. `.ui-back__label` shipped without one from 0.29.0. why: #303
 *
 * What it does not reach:
 * - a class that is not a `__label`: `ui-nav__tab-label`, `ui-nav__crumb-label`,
 *   `ui-footer__col` and `ui-pager__jump-of` are emitted with no rule today.
 * - a `__label` a consumer writes by hand — `.ui-tip__label` has a rule and no
 *   factory. This runs emitted → styled, never the other way.
 * - what the rule says: `.ui-x__label {}` passes.
 * - story and test files, styled in their own page's <style> block.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kitSheetNames, stripComments } from '../../scripts/lib/icon-cascade.js';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(src, '..');

/** Shipped source of both workspaces: the files a consumer's markup comes out of. */
const shippedSource = () => [
  ...readdirSync(path.join(src, 'components'))
    .filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'))
    .map((f) => `src/components/${f}`),
  ...walkReact('react/src'),
];

const walkReact = (rel) => readdirSync(path.join(root, rel), { withFileTypes: true }).flatMap((e) => {
  if (e.isDirectory()) return walkReact(`${rel}/${e.name}`);
  const skip = /\.(test|stories)\.tsx?$/.test(e.name) || !/\.tsx?$/.test(e.name);
  return skip ? [] : [`${rel}/${e.name}`];
});

/** Every `…__label` class written into markup, with the files that write it. */
const emitted = () => {
  const found = new Map();
  for (const rel of shippedSource()) {
    for (const m of readFileSync(path.join(root, rel), 'utf8').matchAll(/[\w-]+__label(?![\w-])/g)) {
      if (!found.has(m[0])) found.set(m[0], new Set());
      found.get(m[0]).add(rel);
    }
  }
  return found;
};

/** Every stylesheet that ships: the kit's manifest, plus the React workspace's own. */
const sheets = () => [
  ...kitSheetNames(src).map((rel) => `src/${rel}`),
  ...readdirSync(path.join(root, 'react/src')).filter((f) => f.endsWith('.css')).map((f) => `react/src/${f}`),
];

const SUBJECTS = emitted();
const CSS = sheets().map((rel) => stripComments(readFileSync(path.join(root, rel), 'utf8'))).join('\n');

test('the sweep is reading both workspaces and finding labels in several of them', () => {
  // Without this, "every subject has a rule" is a claim about an empty set, and a
  // renamed directory or a regex that stops matching reads as a pass.
  // why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them
  assert.ok(
    SUBJECTS.size >= 6,
    `found ${SUBJECTS.size} __label classes in the shipped source — the sweep is looking in the `
      + 'wrong place, and every assertion below is vacuous.',
  );
  const files = new Set([...SUBJECTS.values()].flatMap((s) => [...s]));
  assert.ok(files.size >= 5, `only ${files.size} files contribute a subject: ${[...files].join(', ')}`);
  assert.ok(
    [...files].some((f) => f.startsWith('react/')),
    'no React file contributes a subject — the second workspace is not being read.',
  );
  assert.ok(CSS.length > 10000, `read ${CSS.length} characters of CSS — the manifest is not being resolved.`);
});

test('every __label the kit emits has a rule in the kit CSS', () => {
  const unstyled = [...SUBJECTS].filter(([cls]) => !new RegExp(`\\.${cls}(?![\\w-])`).test(CSS));
  assert.deepEqual(
    unstyled.map(([cls, from]) => `${cls} (emitted by ${[...from].join(', ')})`),
    [],
    'a component puts this class into its markup and no stylesheet in either workspace has a rule '
      + 'for it, so the words it carries take whatever the host page gives them and no overflow of '
      + "their own. Write the rule in that component's sheet.",
  );
});
