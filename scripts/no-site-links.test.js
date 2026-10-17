/* Rule: no page under guidelines/ or docs/ links to the deployed site.
 *
 * why: AGENTS.md#documentation
 *
 * A guideline page is also Storybook's own text, and a docs page is read on GitHub.
 * A link to the deployed site goes stale with the deploy, so a page names the
 * repository's file or leaves the link out.
 *
 * Subjects are the markdown files git tracks under the two trees, so a new page joins
 * by being written. It lives under scripts/ because `npm test` only walks four trees.
 * Limit: it reads the host name in any case, so prose that names the site also fails.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = /\bui\.apli\.tech\b/i;

export const siteLinks = (name, text) => text.split('\n')
  .map((line, i) => (SITE.test(line) ? `${name}:${i + 1}` : null))
  .filter(Boolean);

const pages = execFileSync('git', ['ls-files', '-z', '--', 'guidelines', 'docs'], { cwd: root, encoding: 'utf8' })
  .split('\0').filter((f) => f.endsWith('.md'));

test('no guideline or doc page links to the deployed site', () => {
  const found = pages.flatMap((f) => siteLinks(f, readFileSync(path.join(root, f), 'utf8')));
  assert.deepEqual(found, [], `link the repository's file instead, or drop the link:\n${found.join('\n')}`);
});

test('the sweep found guideline and doc pages to read', () => {
  assert.ok(pages.filter((f) => f.startsWith('guidelines/')).length >= 20, 'guidelines/ pages');
  assert.ok(pages.filter((f) => f.startsWith('docs/')).length >= 3, 'docs/ pages');
});

test('a planted link is reported with its file and line', () => {
  const planted = 'Intro.\nSee [Rule](https://ui.apli.tech/storybook/?path=/story/x).\n';
  assert.deepEqual(siteLinks('a guideline page', planted), ['a guideline page:2']);
  assert.deepEqual(siteLinks('a docs page', 'See [Rule](https://example.com).\n'), []);
});
