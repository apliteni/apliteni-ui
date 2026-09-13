/* Rule: every `__label` a workspace's shipped source names has a rule in the CSS
 * that workspace ships. `.ui-back__label` was named with no rule from 0.29.0.
 * why: #303
 *
 * What it does not reach:
 * - a class that is not a `__label`: `ui-nav__tab-label`, `ui-nav__crumb-label`,
 *   `ui-footer__col` and `ui-pager__jump-of` are named with no rule today.
 * - a `__label` a consumer writes from the documentation — `.ui-tip__label` has
 *   a rule and no source naming it. This runs named → styled, never the reverse.
 * - what the rule says: `.ui-x__label {}` passes.
 * - emission: a `querySelector` for a class counts as naming it.
 * - story and test files, styled in their own page's <style> block.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blankStrings, kitSheetNames, stripComments } from '../../scripts/lib/icon-cascade.js';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(src, '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

/** Source with `//` and block comments blanked, so a class a comment mentions is not a site. */
const decomment = (js) => stripComments(js).replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/** Every `…__label` a file names, with the files that name it. */
const namedIn = (files) => {
  const found = new Map();
  for (const rel of files) {
    for (const m of decomment(read(rel)).matchAll(/[\w-]+__label(?![\w-])/g)) {
      if (!found.has(m[0])) found.set(m[0], new Set());
      found.get(m[0]).add(rel);
    }
  }
  return found;
};

/**
 * The class names that appear in a SELECTOR in these sheets. Comments and string
 * contents go first — a class inside `content: "…"` is text, not a rule — and
 * only the prelude of each block is read, so a declaration cannot present itself
 * as one. `:not(…)` is dropped: a rule that excludes a class does not style it.
 */
const styledIn = (sheets) => {
  const names = new Set();
  for (const rel of sheets) {
    const css = blankStrings(stripComments(read(rel)));
    for (const block of css.matchAll(/([^{}]*)\{/g)) {
      const prelude = block[1].replace(/:not\([^()]*\)/g, ' ');
      for (const m of prelude.matchAll(/\.([\w-]+)/g)) names.add(m[1]);
    }
  }
  return names;
};

const files = (dir, keep) => readdirSync(path.join(root, dir), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory()
    ? files(`${dir}/${e.name}`, keep)
    : (keep(e.name) ? [`${dir}/${e.name}`] : [])));

/* The two workspaces: the source a consumer's markup comes out of, and the CSS
 * that ships with it. One gate each, because a shared count cancels.
 * why: CONTRIBUTING.md#one-gate-per-workspace-over-one-shared-implementation */
const WORKSPACES = [
  {
    name: 'the kit',
    source: files('src/components', (f) => f.endsWith('.js') && !f.endsWith('.test.js')),
    sheets: kitSheetNames(src).map((rel) => `src/${rel}`),
    floor: 5,
  },
  {
    name: 'React',
    source: files('react/src', (f) => /\.tsx?$/.test(f) && !/\.(test|stories)\.tsx?$/.test(f)),
    // The React workspace is a consumer of the kit's CSS as well as the author of
    // its own — `react/src/index.ts` is published beside `./css`, and its stories
    // load both. So a rule in either sheet is a rule this workspace ships.
    sheets: [...kitSheetNames(src).map((rel) => `src/${rel}`),
      ...files('react/src', (f) => f.endsWith('.css'))],
    floor: 2,
  },
];

for (const ws of WORKSPACES) {
  const named = namedIn(ws.source);
  const styled = styledIn(ws.sheets);

  test(`${ws.name}: the sweep is reading source and finding labels in it`, () => {
    // Without this, "every subject has a rule" is a claim about an empty set, and a
    // renamed directory or a regex that stops matching reads as a pass.
    // why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them
    assert.ok(
      named.size >= ws.floor,
      `found ${named.size} __label classes in ${ws.name}'s source, under a floor of ${ws.floor} — `
        + 'the sweep is looking in the wrong place, and the assertion below is vacuous.',
    );
    assert.ok(
      styled.size >= 100,
      `read ${styled.size} class names out of ${ws.name}'s ${ws.sheets.length} sheets — the `
        + 'selector scan is broken, so every subject would report as unstyled.',
    );
  });

  test(`${ws.name}: every __label its source names has a rule in the CSS it ships`, () => {
    const unstyled = [...named].filter(([cls]) => !styled.has(cls));
    assert.deepEqual(
      unstyled.map(([cls, from]) => `${cls} (named by ${[...from].join(', ')})`),
      [],
      `${ws.name} puts this class into its markup and no stylesheet it ships has a rule for it, so `
        + 'the words it carries take whatever the host page gives them, and no overflow of their '
        + "own. Write the rule in that component's sheet.",
    );
  });
}
