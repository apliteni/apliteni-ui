/* Rule: the word-budget tool measures every guideline page, and rejects a page
 * that is over budget, one that grew, and a recorded figure that has gone stale.
 *
 * why: docs/guidelines.md#show-less-tell
 *
 * The subject here is the TOOL, never the collection. #576 asked for the budget
 * deliberately outside CI: the number is read off how today's pages happen to
 * read, and a build that goes red because a page gained a clause is a build
 * people learn to ignore. So this gate proves the measurement reaches every
 * page and that each verdict rejects what it claims to, and says nothing about
 * whether the pages pass. `npm run check:words` is what judges them, and its
 * exit code is the CLI half at the foot of this file, which states its limit.
 *
 * Discover subjects from source and check the coverage count.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { WORDS_PER_RULE, RECORDED, measure, measureCollection, problemsIn, ruleWords } from './word-budget.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const pages = path.resolve(here, '../guidelines');

const page = (...rules) => ['# A page', '', ...rules.flatMap((r) => [
  `## ${r.title}`, '', `<!-- rule: ${r.id} -->`, '', `**Rule:** ${r.instruction}`,
  ...(r.why ? ['', `**Why:** ${r.why}`] : []), '',
])].join('\n');

const filler = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

/* The same page with an introduction between its title and its first rule: what
 * docs/guidelines.md leaves no room for, and what nothing counted before #585. */
const withIntro = (n, ...rules) => {
  const [title, ...rest] = page(...rules).split('\n');
  return [title, '', filler(n), ...rest].join('\n');
};

test('the measurement reaches every guideline page', () => {
  const files = readdirSync(pages).filter((f) => f.endsWith('.md'));
  const measured = measureCollection(pages);

  assert.deepStrictEqual(measured.map((m) => m.page).sort(), files.sort(),
    'the walk reads the guidelines directory, so every page is a subject by existing');
  assert.ok(files.length >= 23, `only ${files.length} pages found — the walk is not reading the collection`);

  /* A green sweep over nothing is what this gate is most exposed to: the parser
   * stops yielding fields, every page measures zero and the budget passes by
   * measuring nothing. Both halves are counted. */
  const withRules = measured.filter((m) => m.rules > 0);
  const totalRules = withRules.reduce((a, m) => a + m.rules, 0);
  assert.ok(withRules.length >= 22, `only ${withRules.length} pages yielded a rule`);
  assert.ok(totalRules >= 100, `only ${totalRules} rules found across the collection`);
  assert.deepStrictEqual(withRules.filter((m) => m.words === 0), [],
    'a page with rules and no words means the fields are not being read');
});

test('a recorded figure names a page that exists', () => {
  const files = new Set(readdirSync(pages).filter((f) => f.endsWith('.md')));
  const missing = Object.keys(RECORDED).filter((p) => !files.has(p));
  assert.deepStrictEqual(missing, [], 'a recorded page was renamed or deleted and its line was left behind');
});

test('a rule is measured by its title and every field it fills', () => {
  assert.equal(ruleWords({ imperative: 'Name the state', instruction: 'Do the thing' }), 6);
  assert.equal(ruleWords({ imperative: 'A', instruction: 'b', why: 'c', except: 'd', doCaption: 'e', dontCaption: 'f' }), 6,
    'every field a rule may carry is counted');
  assert.equal(ruleWords({ imperative: 'A', instruction: 'b', unmet: { issue: 1, note: 'c d' } }), 4,
    'a Gap note is prose on the page');
  assert.equal(ruleWords({ imperative: 'Use — the `emptyState()` helper' }), 4,
    'a lone dash is not a word and code in backticks is one');
  assert.equal(ruleWords({ imperative: 'A' }), 1, 'an absent field adds nothing');
});

test('an introduction is prose on the page and spends the rules budget', () => {
  const one = measure('x.md', withIntro(20, { title: 'T', id: 'a', instruction: filler(10) }));
  assert.deepStrictEqual([one.rules, one.intro, one.words, one.budget], [1, 20, 31, 60],
    "the page total is its introduction plus its rules, against the rules' budget");

  /* The page the documentation leaves no room for: a title, an introduction and
   * no rules. No rules is no allowance, so every word of it is over budget. */
  const none = measure('overview.md', withIntro(1000));
  assert.deepStrictEqual([none.rules, none.intro, none.words, none.budget], [0, 1000, 1000, 0]);
  assert.deepStrictEqual(problemsIn([none], {}), [
    'overview.md: 1000 words, 1000 over its budget of 0 (0 rules at 60) — cut it',
  ], 'an introduction on a page with no rules is reported, and names the page');

  // And on a page that has rules, a long introduction spends the room they bought.
  const long = measure('x.md', withIntro(200, { title: 'T', id: 'a', instruction: filler(10) }));
  assert.deepStrictEqual(problemsIn([long], {}), [
    'x.md: 211 words, 151 over its budget of 60 (1 rule at 60) — cut it',
  ]);

  /* The title above the introduction is still a name, so a page carrying
   * neither measures nothing and is allowed nothing. A fixture, not the
   * collection's own title-only page: what the shipped pages measure is
   * `npm run check:words`'s verdict and no test's. */
  const titleOnly = measure('x.md', withIntro(0));
  assert.deepStrictEqual([titleOnly.rules, titleOnly.intro, titleOnly.words, titleOnly.budget], [0, 0, 0, 0],
    'a page with no rules gets no allowance, so an introduction added to it is caught');
  assert.deepStrictEqual(problemsIn([titleOnly], {}), [],
    'a title-only page is not prose and is not reported');
});

/* The collection is green, so the verdicts are exercised against pages that are
 * not — a mutation that must fail. Each is a way a page has drifted or could. */
test('a page over budget fails and names itself', () => {
  const over = measure('x.md', page({ title: 'T', id: 'a', instruction: filler(80) }));
  assert.deepStrictEqual([over.rules, over.words, over.budget], [1, 81, 60]);

  assert.deepStrictEqual(problemsIn([over], {}), [
    'x.md: 81 words, 21 over its budget of 60 (1 rule at 60) — cut it',
  ]);

  const under = measure('x.md', page({ title: 'T', id: 'a', instruction: filler(40) }));
  assert.deepStrictEqual(problemsIn([under], {}), [], 'a page within its budget is not reported');

  // The budget is a rate, so a second rule buys its own allowance.
  const two = measure('x.md', page(
    { title: 'T', id: 'a', instruction: filler(40) },
    { title: 'T', id: 'b', instruction: filler(40) },
  ));
  assert.equal(two.budget, 120);
  assert.deepStrictEqual(problemsIn([two], {}), []);
});

test('a page held at a recorded figure may be cut, not added to', () => {
  const grown = measure('x.md', page({ title: 'T', id: 'a', instruction: filler(80) }));
  assert.deepStrictEqual(problemsIn([grown], { 'x.md': 75 }), [
    'x.md: 81 words, 6 more than the 75 recorded — a page over budget may not grow; cut it back',
  ]);

  assert.deepStrictEqual(problemsIn([grown], { 'x.md': 81 }), [],
    'a page sitting at its recorded figure is accepted');

  assert.deepStrictEqual(problemsIn([grown], { 'x.md': 90 }), [
    'x.md: 81 words, down from the 90 recorded — record 81 in scripts/word-budget.mjs so it cannot grow back',
  ], 'a cut has to be recorded, or the page can grow back into room nobody granted it');
});

test('a recorded figure that has gone stale fails', () => {
  const within = measure('x.md', page({ title: 'T', id: 'a', instruction: filler(40) }));
  assert.deepStrictEqual(problemsIn([within], { 'x.md': 41 }), [
    'x.md: 41 words, within its budget of 60 — delete its line from RECORDED in scripts/word-budget.mjs',
  ]);

  assert.deepStrictEqual(problemsIn([], { 'gone.md': 100 }), [
    'gone.md: recorded at 100 words and no such page exists — delete its line from RECORDED in scripts/word-budget.mjs',
  ]);
});

test('the budget is a round figure a reviewer can move in one place', () => {
  assert.equal(typeof WORDS_PER_RULE, 'number');
  assert.ok(WORDS_PER_RULE >= 40 && WORDS_PER_RULE <= 120,
    'a budget outside this range is not a number read off these pages');
  const measured = measure('x.md', page({ title: 'T', id: 'a', instruction: filler(40) }), 30);
  assert.equal(measured.budget, 30, 'the rate is an argument, so the check can be run at another number');
});

/* -- The CLI half -----------------------------------------------------------
 *
 * The verdicts above are the measurement; this is the exit code the command
 * answers with, which no source test can read. It is OFF unless the variable is
 * set, because the budget is out of CI (#576) and nothing in CI runs this
 * command — so the exit code is reported by hand in the pull request, and that
 * is this gate's largest limit. The fixture is a collection of its own in a
 * temporary directory: this half never reads the pages the repository ships.
 *
 *   WORD_BUDGET_CLI=1 node --test scripts/word-budget.test.js
 */

const RUN = process.env.WORD_BUDGET_CLI === '1';

test('CLI mutation: a page with a long introduction exits 1 and names itself',
  { skip: !RUN && 'set WORD_BUDGET_CLI=1' }, () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'word-budget-'));
    try {
      writeFileSync(path.join(dir, 'kept.md'), page({ title: 'T', id: 'a', instruction: filler(40) }));
      writeFileSync(path.join(dir, 'introduced.md'), withIntro(1000, { title: 'T', id: 'a', instruction: filler(10) }));

      const run = spawnSync(process.execPath, [path.join(here, 'word-budget.mjs'), dir], { encoding: 'utf8' });

      assert.equal(run.status, 1,
        `the CLI exited ${run.status} over a page carrying a 1,000-word introduction\n${run.stdout}${run.stderr}`);
      assert.match(run.stdout, /^ {2}introduced\.md: 1011 words, 951 over its budget of 60 \(1 rule at 60\) — cut it$/m,
        'the failure has to name the page, or a reader cannot act on it');
      assert.doesNotMatch(run.stdout, /kept\.md:.*(over|more than|within|no such)/,
        'the page inside its budget was reported too, so the CLI is failing the collection and not the page');
      assert.match(run.stdout, /^introduced\.md +1 +1000 +1011 +60 +11 over by 951$/m,
        'the measurement prints the introduction, so a count can be read back to the prose it came off');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
