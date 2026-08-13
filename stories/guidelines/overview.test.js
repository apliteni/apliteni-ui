/* Rule: the Overview lists every guideline page, and every link it builds is a
 * story id Storybook actually publishes.
 *
 * An index that misses a page is worse than no index — the reader believes they
 * have seen the collection. So this gate never enumerates the pages: it
 * discovers them, the way ADR 0004 asks a gate to. A sixth content module that
 * publishes RULES fails this test until stories/guidelines/_overview.js lists
 * it.
 *
 * The links are the other half. A story's URL id comes from its EXPORT NAME,
 * not its title: 'Guidelines/The full state set' is story `state-set`, and an
 * href built from the title alone is a 404 on two of the five pages.
 * _overview.js reproduces Storybook's id rule rather than importing it, so the
 * page bundles no Storybook internals — which is only safe if something holds
 * the reproduction to the original. That is what this file does, twice:
 *
 *   1. by deriving every id again through Storybook's own `toId` and
 *      `storyNameFromExport`, which is the code that names the stories, and
 *   2. against storybook-static/index.json, the ids the last build published.
 *
 * The second runs only when that build exists. It is a gitignored artefact, so
 * a fresh clone and any CI job that tests before it builds would otherwise fail
 * on nothing; the first check needs no build and carries the gate on its own.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toId, storyNameFromExport } from 'storybook/internal/csf';

import { PAGES, storyId } from './_overview.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const files = readdirSync(here).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js')).sort();

/** Every content module beside this test that publishes RULES — a guideline page. */
const contentPages = [];
for (const file of files) {
  const mod = await import(path.join(here, file));
  if (Array.isArray(mod.RULES)) contentPages.push({ file, mod });
}

/** Every story module beside this test that publishes a story under Guidelines/. */
const storyPages = [];
for (const file of files.filter((f) => f.endsWith('.stories.js'))) {
  const mod = await import(path.join(here, file));
  if (!String(mod.default?.title || '').startsWith('Guidelines/')) continue;
  const exportName = Object.keys(mod).find((k) => k !== 'default');
  storyPages.push({ file, mod, exportName, id: toId(mod.default.title, storyNameFromExport(exportName)) });
}

// The index does not list itself, and nothing else in this directory is exempt.
const INDEX_ID = storyPages.find((p) => p.file === 'Overview.stories.js')?.id;

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
    if (typeof mod.BLURB !== 'string' || mod.BLURB.trim() === '') {
      problems.push(`stories/guidelines/${file} → BLURB is what the index says the page covers, `
        + `so it must be a non-empty string — got ${JSON.stringify(mod.BLURB)}.`);
    }
  }

  for (const title of listed.keys()) {
    problems.push(`the Overview lists "${title}", and no content module in stories/guidelines/ `
      + 'publishes RULES under that title — the row links somewhere nobody maintains.');
  }

  assert.deepStrictEqual(problems, [], `the Overview index and the pages on disk disagree:\n  ${problems.join('\n  ')}`);
});

test("the index links carry the ids Storybook's own id rule produces", () => {
  const expected = storyPages.filter((p) => p.id !== INDEX_ID);
  assert.ok(expected.length > 0, 'no guideline story was discovered — this gate is checking nothing');

  const problems = [];

  for (const page of PAGES) {
    const match = expected.find((s) => s.id === page.id);
    if (!match) {
      problems.push(`the Overview links "${page.title}" to story ${page.id}, and no story module `
        + 'in stories/guidelines/ carries that id — Storybook names a story after its EXPORT '
        + "name, not its title, so the link is a 404. See storyId() in _overview.js.");
      continue;
    }
    assert.equal(page.href, `./?path=/story/${page.id}`, `${page.title}: href and id disagree`);
  }

  for (const story of expected) {
    if (!PAGES.some((p) => p.id === story.id)) {
      problems.push(`stories/guidelines/${story.file} publishes story ${story.id}, and no row in `
        + 'the Overview links to it.');
    }
  }

  assert.deepStrictEqual(problems, [], `the index links and the stories disagree:\n  ${problems.join('\n  ')}`);
});

// The reproduction is only worth keeping if it agrees with the original on the
// awkward names, which is what put it here: `StateSet` is "State Set" before it
// is `state-set`, and a naive sanitize of the export name gives `stateset`.
test('the id rule the page reproduces is the id rule Storybook applies', () => {
  for (const { file, mod, exportName, id } of storyPages) {
    assert.equal(storyId(mod), id,
      `stories/guidelines/${file}: storyId() in _overview.js derives a different id from `
      + `Storybook's toId(${JSON.stringify(mod.default.title)}, `
      + `storyNameFromExport(${JSON.stringify(exportName)}))`);
  }
});

// Every hand-typed pointer at the collection, checked against the ids above.
// Three files link the Overview by id — the two READMEs and the landing page —
// and a story id is exactly the kind of string that is right when it is written
// and wrong a rename later.
test('the pointers into the collection name a story that exists', () => {
  const ids = new Set(storyPages.map((p) => p.id));
  const problems = [];
  let found = 0;

  for (const file of ['README.md', 'docs/README.md', 'site/index.html']) {
    const text = readFileSync(path.join(root, file), 'utf8');
    for (const m of text.matchAll(/\/storybook\/\?path=\/story\/(guidelines-[a-z0-9-]+)/g)) {
      found += 1;
      if (!ids.has(m[1])) {
        problems.push(`${file} links story ${m[1]}, and no story module in stories/guidelines/ `
          + `carries that id. Known ids: ${[...ids].join(', ')}`);
      }
    }
  }

  assert.ok(found > 0, 'nothing outside Storybook links the guidelines — the collection is unreachable');
  assert.deepStrictEqual(problems, [], `a pointer at the guidelines is a 404:\n  ${problems.join('\n  ')}`);
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
