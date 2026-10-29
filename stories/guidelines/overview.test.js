/* Rule: the Overview lists every guideline page, and every link it builds is a
 * story id Storybook actually publishes. See AGENTS.md#the-guidelines-collection.
 *
 * An index that misses a page is worse than no index — the reader believes they
 * have seen the collection. So this gate never enumerates the pages: it
 * discovers them, the way the discovery rule asks a gate to.
 *
 * The ids the index links are held against the React stories by
 * react/src/guidelines.test.tsx, which reads the .stories.tsx modules and
 * Storybook's own id rule. This node gate holds the content half.
 *
 * Discover subjects from source and check the coverage count.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { PAGES, LINKS } from './_overview.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const files = readdirSync(here).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js')).sort();

/** Every content module beside this test that publishes RULES — a guideline page. */
const contentPages = [];
for (const file of files) {
  const mod = await import(path.join(here, file));
  if (Array.isArray(mod.RULES)) contentPages.push({ file, mod });
}

test('the pages discovered on disk are the pages the Overview lists', () => {
  assert.ok(contentPages.length > 0, 'no content module publishes RULES — this gate is checking nothing');

  const listed = new Map(PAGES.map((p) => [p.title, p]));
  const problems = [];

  for (const { file, mod } of contentPages) {
    const page = listed.get(mod.TITLE);
    if (!page) {
      problems.push(`stories/guidelines/${file} publishes ${mod.RULES.length} rules under `
        + `"${mod.TITLE}", and the Overview does not list it. A reader of the index would `
        + 'never learn the page exists — add the module to ENTRIES in '
        + 'stories/guidelines/_overview.js.');
      continue;
    }
    listed.delete(mod.TITLE);
  }

  for (const title of listed.keys()) {
    problems.push(`the Overview lists "${title}", and no content module in stories/guidelines/ `
      + 'publishes RULES under that title — the row links somewhere nobody maintains.');
  }

  assert.deepStrictEqual(problems, [], `the Overview index and the pages on disk disagree:\n  ${problems.join('\n  ')}`);
});

// The files that link the Overview by id — a story id is the kind of string that
// is right when it is written and wrong a rename later. The Overview's own id is
// `guidelines-overview--overview`, which the React Overview story publishes.
test('the pointers into the collection name the Overview story', () => {
  const found = [];
  for (const file of ['README.md', 'docs/README.md', 'site/index.html']) {
    const text = readFileSync(path.join(root, file), 'utf8');
    for (const m of text.matchAll(/\/\?path=\/story\/(guidelines-overview--overview)/g)) {
      found.push(`${file} → ${m[1]}`);
    }
  }
  assert.ok(found.length > 0, 'nothing outside Storybook links the guidelines — the collection is unreachable');
});

// The ids the last static build actually published. Gitignored, so absent in a
// fresh clone and in any job that tests before it builds — checked when it is
// there, and never a reason to fail when it is not.
test('the built Storybook publishes the ids the index links', { skip: !existsSync(path.join(root, 'storybook-static/index.json')) && 'no storybook-static/index.json — run npm run build-storybook' }, () => {
  const built = JSON.parse(readFileSync(path.join(root, 'storybook-static/index.json'), 'utf8'));
  const problems = PAGES
    .filter((p) => !built.entries[p.id])
    .map((p) => `the Overview links "${p.title}" to story ${p.id}, and the build in `
      + 'storybook-static/ published no such story. If the page was renamed, rebuild with '
      + '`npm run build-storybook` and look again.');

  assert.deepStrictEqual(problems, [], `an index link is missing from the built Storybook:\n  ${problems.join('\n  ')}`);
});

import { parseGuideline } from './_markdown.js';
import { INTRO } from './_overview.js';

test('the packaged Overview links every Markdown page and Storybook reads that index', () => {
  const directory = path.join(root, 'guidelines');
  const index = parseGuideline(readFileSync(path.join(directory, 'overview.md'), 'utf8'));
  assert.equal(INTRO, index.blurb);
  assert.equal(index.blurb, '');
  assert.deepEqual(LINKS.map(link => link.title), PAGES.map(page => page.title));
  assert.deepEqual(LINKS.map(link => link.href), PAGES.map(page => page.href));
  const rules = PAGES.reduce((count, page) => count + page.rules.length, 0);
  assert.equal(rules, 143);
  assert.equal(INTRO, '');
  // Two, and both are named. Dashboards and reports asks every report for an export
  // and the Stock screener has none (#555). Account and settings prescribes a modal
  // carrying its own navigation, which the vanilla kit cannot draw at all and React's
  // Modal cannot carry (#553). This list empties as each lands.
  const gaps = PAGES.flatMap(page => page.gaps);
  assert.deepEqual(gaps.map(rule => `${rule.id} #${rule.unmet.issue}`), ['report-offers #555', 'modal #553'],
    'update the Overview when a rule becomes unmet or its gap closes');
});
