/* Rule: every link the vanilla Storybook published still opens a story (#429, PR 4).
 * The owner chose to keep the old links: the 80 ids the one Storybook still publishes
 * as they were, and a redirect for each old component id to the React story that
 * shows the same part. Both lists are frozen in .storybook/redirects.js.
 *
 * The stories are read the way Storybook indexes them: each React story file is
 * parsed by Storybook's own CSF reader, and its ids come out of that, not out of a
 * list kept here.
 *
 * Discover subjects from source and check the coverage count.
 * Weaken the rule and confirm that its test fails.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCsf } from 'storybook/internal/csf-tools';
import { KEPT, REDIRECTS, redirectedSearch } from '../.storybook/redirects.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The globs .storybook/main.js gives Storybook.
const files = ['react/src/**/*.stories.@(tsx|ts)', 'stories/**/*.stories.@(tsx|ts)']
  .flatMap(glob => globSync(glob.replace('@(tsx|ts)', '{tsx,ts}'), { cwd: root }));
const idsIn = (file) => loadCsf(readFileSync(path.join(root, file), 'utf8'), { fileName: file, makeTitle: t => t })
  .parse().stories.map(story => story.id);
const published = new Set(files.flatMap(idsIn));

const missingTargets = (redirects, ids) => Object.entries(redirects).filter(([, to]) => !ids.has(to)).map(([from, to]) => `${from} -> ${to}`);

test('the walk reads the story files Storybook indexes', () => {
  assert.ok(files.length >= 90, `only ${files.length} story files found`);
  assert.ok(published.size > 300, `only ${published.size} story ids found`);
});

test('every id the one Storybook keeps is still published', () => {
  assert.equal(KEPT.length, 80, 'foundations 21, guidelines 27, showcases 31 and the feature grid');
  assert.deepEqual(KEPT.filter(id => !published.has(id)), []);
});

test('every old component link lands on a story that exists', () => {
  assert.equal(Object.keys(REDIRECTS).length, 131, 'the 130 vanilla component ids, less the feature grid that is kept, and the 2 removed React Breadcrumbs ids');
  assert.deepEqual(['react-breadcrumbs--trail', 'react-breadcrumbs--with-icon'].map(id => REDIRECTS[id]),
    ['react-backlink--short', 'react-backlink--short'], 'the React Breadcrumbs stories went with the component (#736)');
  assert.deepEqual(missingTargets(REDIRECTS, published), []);
});

test('no redirect hides a story that is still published under its old id', () => {
  assert.deepEqual(Object.keys(REDIRECTS).filter(id => published.has(id)), []);
});

test('the check reports a redirect to a story that is gone', () => {
  assert.deepEqual(missingTargets({ 'components-x--y': 'react-gone--away' }, published), ['components-x--y -> react-gone--away']);
});

test('the address is rewritten in the manager and the preview, and left alone otherwise', () => {
  assert.equal(redirectedSearch('?path=/story/components-button--variants'), '?path=%2Fstory%2Freact-button--brand-icon');
  assert.equal(redirectedSearch('?path=/docs/components-table--empty&globals=theme:light'),
    '?path=%2Fdocs%2Freact-datatable-ledgers--empty&globals=theme%3Alight');
  assert.equal(redirectedSearch('?id=components-table--finance-data&viewMode=story'), '?id=react-datatable-ledgers--finance-data&viewMode=story');
  assert.equal(redirectedSearch('?path=/story/guidelines-spacing--spacing'), null);
  assert.equal(redirectedSearch(''), null);
});
