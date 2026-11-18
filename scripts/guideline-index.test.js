/* Rule: every guideline page has a row in guidelines/INDEX.md, and no row names
 * a page that does not exist.
 *
 * why: #771 — an agent that builds a screen reads the index to find the page
 * that covers the screen part it builds. An index that misses a page, or names
 * one that is gone, sends the agent to the wrong page or to none.
 *
 * The subject is discovered, never enumerated: the guideline pages are every
 * `.md` file in guidelines/ except INDEX.md itself, because the index is not a
 * guideline page. It lives under scripts/ because `npm test` only walks four
 * trees.
 *
 * Discover subjects from source and check the coverage count.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dir = path.join(root, 'guidelines');
const INDEX = 'INDEX.md';

/* The index names a page with a markdown link in its Page column. The other two
 * columns hold prose, so every `.md` link target in the file is a page row. */
export const indexedPages = (text) =>
  [...text.matchAll(/\]\(([\w-]+\.md)\)/g)].map((m) => m[1]);

/** What the index and the pages on disk disagree about. */
export const problems = (pages, indexed) => ({
  missing: pages.filter((p) => !indexed.includes(p)),
  unknown: indexed.filter((p) => !pages.includes(p)),
  repeated: indexed.filter((p, i) => indexed.indexOf(p) !== i),
});

const pages = readdirSync(dir)
  .filter((f) => f.endsWith('.md') && f !== INDEX)
  .sort();
const indexed = indexedPages(readFileSync(path.join(dir, INDEX), 'utf8'));

test('the index lists every guideline page and nothing else', () => {
  assert.ok(pages.length >= 23, `only ${pages.length} guideline pages found — the walk is not reading the collection`);

  const found = problems(pages, indexed);
  const lines = [
    ...found.missing.map((p) => `guidelines/${p} has no row in ${INDEX} — add one.`),
    ...found.unknown.map((p) => `${INDEX} names ${p}, and no such page exists — fix the row.`),
    ...found.repeated.map((p) => `${INDEX} names ${p} more than once — keep one row.`),
  ];
  assert.deepStrictEqual(lines, [], `the index and the pages on disk disagree:\n  ${lines.join('\n  ')}`);
});

/* The collection is green, so the check itself is exercised against indexes
 * that are not — a mutation that must fail. */
test('a missing page and a page that does not exist are both reported', () => {
  assert.deepStrictEqual(problems(['a-page.md', 'b-page.md'], ['a-page.md']),
    { missing: ['b-page.md'], unknown: [], repeated: [] });
  assert.deepStrictEqual(problems(['a-page.md'], ['a-page.md', 'gone.md']),
    { missing: [], unknown: ['gone.md'], repeated: [] });
  assert.deepStrictEqual(problems(['a-page.md'], ['a-page.md', 'a-page.md']),
    { missing: [], unknown: [], repeated: ['a-page.md'] });
});
