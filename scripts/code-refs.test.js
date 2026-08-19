/* Rule: every file:line a comment or a story cites still says what the prose claims.
 *
 * why: CONTRIBUTING.md#a-prose-citation-carries-an-anchor
 * why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them
 *
 * The subject set is every file git tracks, so a new citation joins by being
 * written; it lives under scripts/ because `npm test` walks only four trees.
 */

/* why: CONTRIBUTING.md#a-gate-carries-a-ledger-of-what-it-does-not-reach
 *
 * WHAT THIS GATE DOES NOT REACH:
 *   - A citation with no anchor AND no directory — `nav.css:113` on its own. It
 *     is indistinguishable from a fixture, a log line or a stack frame, so it is
 *     not read as a citation at all.
 *   - A citation into a dependency, whose line numbers move on an upgrade this
 *     repo does not pin here. It is counted, never resolved.
 *   - Whether the anchor is the RIGHT thing to have quoted. A citation that
 *     lands on its line and describes it wrongly reads as green.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

/* A citation is a path ending in an extension, a colon, a line, and optionally a
 * second line for a range. The lookbehind keeps it from starting mid-token and
 * from matching the tail of a longer path. */
const CITATION = /(?<![\w#/.-])((?:[\w.-]+\/)*[\w.-]+\.[a-z]+):(\d+)(?:-(\d+))?(?![\w.-])/g;

/* A guideline `kit` entry writes its citation as the value of a `ref:` key and
 * carries its anchor in a sibling `pattern:`, out of reach of anything adjacent.
 * `stories/guidelines/refs.test.js` resolves those, so this gate stands off them
 * rather than double-gating 86 references. The handover is not taken on trust:
 * the count is asserted against what the guideline pages actually declare, so a
 * `ref:` written where that walk cannot see it makes the two disagree.
 *
 * A `kit` entry is a JavaScript object literal, so the handover is only made for
 * a citation written in one. The same shape quoted in a markdown table is
 * documentation of the form rather than an instance of it — `docs/guidelines.md`
 * carries one — and the sibling `pattern:` is a perfectly good anchor, so it is
 * resolved here instead of being waved through. */
const REF_KEYED_BEFORE = /\bref:\s*['"]$/;
const REF_KEYED_AFTER = /^['"]/;
const IS_MODULE = /\.(js|mjs|cjs|jsx|ts|tsx)$/;

/* A commit SHA in front makes the citation historical — it is a claim about a
 * tree that is not this one, and this gate has no business resolving it. */
const SHA_BEFORE = /\b[0-9a-f]{7,40}:$/;

/* The anchor sits immediately after the citation, and there are three ways to
 * write one — a prose page, a structured entry, and copy a reader sees rendered.
 * Each captures the anchor text in group 1, and the first that matches wins.
 *
 *   prose       …/callout.css:137 `.ui-toast--solid .ui-toast__action`
 *   structured  { ref: '…/button.css:68', pattern: '.ui-btn--danger:hover' }
 *   rendered    ${code('…/nav.css:81')} ${code('.ui-nav__item.is-danger:hover')}
 *
 * The rendered form exists because a literal backtick in story copy would land
 * on the page; the anchor is the next one-argument helper call instead, and it
 * renders as the thing it names. Which helper is that story's business. */
const ANCHORS = [
  /^[\s)\]},;:.—–-]*(?:\*|\/\/|#)?[\s([\\]*`([^`\n]+)`/,
  /^['"]\s*,\s*pattern:\s*['"]([^'"\n]+)['"]/,
  /^['"]\)\}[^\S\n]*\$\{\w+\(['"]([^'"\n]+)['"]\)/,
];

const anchorAfter = (after) => {
  for (const form of ANCHORS) {
    const m = form.exec(after);
    /* Prose wraps, so a comment-continuation marker and ONE newline may sit
     * between citation and anchor. Two lines away, the next backticked span in
     * the file belongs to somebody else's sentence. An anchor holds no newline
     * of its own, so counting the whole match counts only what came before it. */
    if (!m || m[0].split('\n').length > 2) continue;
    /* A comment inside a template literal escapes its backticks, and that
     * backslash is the source's rather than the anchor's. */
    return m[1].replace(/\\$/, '');
  }
  return null;
};

/* Everything git tracks at the top level. A citation whose first segment is not
 * one of these points outside the repo — into node_modules, or into a package's
 * own build output — and is not ours to resolve. Read rather than listed, so a
 * new top-level directory needs nothing added here. */
export const rootNames = (files) => new Set(files.map((f) => f.split('/')[0]));

/* Where each citation sits and what it is. `line` is the line of the CITING
 * file, so a problem can be opened straight from the failure text. */
export const scan = (text, page = '') => {
  const found = [];
  for (const m of text.matchAll(CITATION)) {
    const [raw, file, from, to] = m;
    const before = text.slice(0, m.index);
    const after = text.slice(m.index + raw.length);
    const anchor = anchorAfter(after);
    found.push({
      raw,
      file,
      from: Number(from),
      to: to === undefined ? Number(from) : Number(to),
      ranged: to !== undefined,
      anchor,
      historical: SHA_BEFORE.test(before),
      delegated: IS_MODULE.test(page)
        && REF_KEYED_BEFORE.test(before)
        && REF_KEYED_AFTER.test(after),
      rooted: file.includes('/'),
      line: before.split('\n').length,
    });
  }
  return found;
};

/* One failure line a reader can act on without opening this file. */
const fail = (page, c, said) => `${page}:${c.line} → ${c.raw}\n     ${said}`;

/* The verdict on one citing file. `read` returns the cited file's text, or null
 * if there is no such file; `roots` is what the repo has at its top level.
 * Both are passed in so the rules below can be exercised without a filesystem. */
export const problemsIn = (page, text, read, roots) => {
  const problems = [];
  const counted = { checked: 0, historical: 0, external: 0, unrooted: 0, delegated: 0 };

  for (const c of scan(text, page)) {
    /* A `<sha>:` prefix, in front of any of the rest of this. */
    if (c.historical) { counted.historical += 1; continue; }

    /* A guideline `kit` entry — resolved by refs.test.js, counted here. */
    if (c.delegated) { counted.delegated += 1; continue; }

    /* No directory. Anchored, it is a citation missing its path — rule 1, and
     * the gate never guesses which directory was meant. Unanchored, it is not
     * being read as a citation at all; the header says why. */
    if (!c.rooted) {
      if (c.anchor) {
        problems.push(fail(page, c, 'cite a path from the repo root'
          + ` — "${c.file}" alone leaves the gate guessing a directory`));
      } else {
        counted.unrooted += 1;
      }
      continue;
    }

    /* Outside the repo: a dependency's own tree. Counted, never resolved. */
    if (!roots.has(c.file.split('/')[0])) { counted.external += 1; continue; }

    if (!c.anchor) {
      problems.push(fail(page, c, 'has no anchor — follow the citation with a'
        + ' backticked snippet that appears on that line, so a line that moves'
        + ' cannot take the sentence with it'));
      continue;
    }

    if (c.ranged && c.to < c.from) {
      problems.push(fail(page, c, `a range ends before it starts (${c.from}-${c.to})`));
      continue;
    }

    const cited = read(c.file);
    if (cited === null) {
      problems.push(fail(page, c, `no such file: ${c.file}`));
      continue;
    }

    const lines = cited.split('\n');
    if (c.from < 1 || c.to > lines.length) {
      problems.push(fail(page, c,
        `${c.ranged ? `lines ${c.from}-${c.to} run` : `line ${c.from} is`} past the end`
        + ` of ${c.file} (${lines.length} lines)`));
      continue;
    }

    counted.checked += 1;
    const span = lines.slice(c.from - 1, c.to);
    if (span.some((l) => l.includes(c.anchor))) continue;

    const at = lines.findIndex((l) => l.includes(c.anchor)) + 1;
    problems.push(fail(page, c,
      `expected ${c.ranged ? `lines ${c.from}-${c.to}` : `line ${c.from}`}`
      + ` of ${c.file} to contain ${JSON.stringify(c.anchor)}\n`
      + `     ${c.ranged ? `line ${c.from} is` : 'it is'}: ${span[0].trim() || '(blank)'}\n`
      + `     ${at ? `that text is on line ${at} — update the citation` : 'that text is nowhere in the file'}`));
  }

  return { problems, counted };
};

/* ---- the sweep ---------------------------------------------------------- */

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const roots = rootNames(tracked);

/* Text only. A citation cannot be written in a file nobody can read as prose,
 * and decoding a PNG as utf8 to search it for colons is a waste of a build. */
const READABLE = /\.(js|mjs|cjs|jsx|ts|tsx|css|md|html|json|yml|yaml|sh)$/;

const readFrom = (rel) => {
  const abs = path.join(root, rel);
  if (!existsSync(abs) || !statSync(abs).isFile()) return null;
  return readFileSync(abs, 'utf8');
};

const tally = { checked: 0, historical: 0, external: 0, unrooted: 0, delegated: 0 };

for (const page of tracked.filter((f) => READABLE.test(f))) {
  const text = readFrom(page);
  if (text === null) continue;
  if (!CITATION.test(text)) { CITATION.lastIndex = 0; continue; }
  CITATION.lastIndex = 0;

  test(`prose citations resolve: ${page}`, () => {
    const { problems, counted } = problemsIn(page, text, readFrom, roots);
    for (const k of Object.keys(tally)) tally[k] += counted[k];
    assert.deepStrictEqual(problems, [],
      `a citation no longer lands on the code it describes:\n  ${problems.join('\n  ')}`);
  });
}

/* why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them
 * A file that stops carrying a citation leaves the count, so coverage cannot
 * quietly shrink to zero and stay green. */
test('the sweep resolved a citation in more than one file', () => {
  assert.ok(tally.checked >= 15,
    `only ${tally.checked} citations were resolved — the sweep is reaching almost nothing`);
});

/* The one handover this gate makes, checked rather than trusted. Every citation
 * it stood off as a guideline `kit` entry has to be a citation refs.test.js
 * actually walks; a `ref:` written anywhere that walk cannot reach would leave
 * the reference gated by nobody, which is the hole this whole file closes. */
test('every citation delegated to refs.test.js is one that gate really walks', async () => {
  const dir = path.join(root, 'stories/guidelines');
  let declared = 0;
  for (const page of readdirSync(dir).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'))) {
    const mod = await import(path.join(dir, page));
    for (const rule of mod.RULES || []) declared += (rule.kit || []).length;
  }
  assert.equal(tally.delegated, declared,
    `${tally.delegated} citations were stood off as guideline \`kit\` entries, but the`
    + ` guideline pages declare ${declared} — the difference is gated by nothing`);
});

/* ---- the rules, exercised against pages that are not in the tree ---------- *
 *
 * Every fixture below cites `fixture/…`, which git tracks nothing under. The
 * sweep above therefore reads these as citations into somebody else's tree and
 * leaves them alone, while the checks here hand `problemsIn` a root set that
 * does contain it — so the rules are tested without planting a citation the
 * gate would have to be told to ignore.
 */
const FIXTURE_ROOTS = new Set(['fixture']);
const nothing = () => null;

/* The tree as it stood at f222104~1, and the two lines that commit deleted. */
const CALLOUT_WAS = ['a', 'b', '.ui-toast--solid .ui-toast__action { color: var(--toast-ink); }'];
const CALLOUT_NOW = ['a', '.ui-toast--solid .ui-toast__action { color: var(--toast-ink); }', ''];
const readAs = (lines) => (rel) => (rel === 'fixture/callout.css' ? lines.join('\n') : null);

const check = (text, read = nothing, page = 'fixture/page.js') =>
  problemsIn(page, text, read, FIXTURE_ROOTS);
const problemsOf = (...args) => check(...args).problems;

test('a citation whose line has moved fails, and says where the line went', () => {
  const cite = '// see fixture/callout.css:3 `.ui-toast--solid .ui-toast__action`';

  assert.deepStrictEqual(problemsOf(cite, readAs(CALLOUT_WAS)), [],
    'the citation was right before the lines above it were deleted');

  const [drift] = problemsOf(cite, readAs(CALLOUT_NOW));
  assert.match(drift, /expected line 3 of fixture\/callout\.css to contain/,
    'the same citation after the deletion has to fail');
  assert.match(drift, /it is: \(blank\)/, 'and say what is actually on the line');
  assert.match(drift, /that text is on line 2 — update the citation/,
    'and where the rule went, so the fix does not need a search');
});

test('a wrong-but-valid line fails — which file-and-line-exists could not catch', () => {
  /* The shape of all three drifts in #235: every wrong line was a real line. */
  const lines = ['top: 50%;', '.ui-toast--solid .ui-toast__action { color: red; }'];
  const read = () => lines.join('\n');

  assert.deepStrictEqual(
    problemsOf('// fixture/a.css:2 `.ui-toast--solid .ui-toast__action`', read), [],
    'the right line passes');
  assert.equal(problemsOf('// fixture/a.css:1 `.ui-toast--solid .ui-toast__action`', read).length, 1,
    'line 1 exists, is not blank, and is not what the sentence is about');
});

test('a line past the end of the file fails, and names the length', () => {
  const [past] = problemsOf('// fixture/base.css:130 `.ui-focusable:focus-visible,`',
    () => Array(124).fill('x').join('\n'));
  assert.match(past, /line 130 is past the end of fixture\/base\.css \(124 lines\)/);
});

test('a citation with no anchor fails, whatever it points at', () => {
  const [bare] = problemsOf('// fixture/a.css:1', () => 'anything');
  assert.match(bare, /has no anchor/,
    'a line number on its own is the form that rotted for a year');
});

test('a bare filename is an error, and is never resolved against a guessed directory', () => {
  /* Built by hand so the literal never reads as a citation in this very file. */
  const anchored = ['nav.css:113', '`background: var(--surface-3);`'].join(' ');
  const [guess] = problemsOf(`// ${anchored}`);
  assert.match(guess, /cite a path from the repo root/);
  assert.match(guess, /"nav\.css" alone leaves the gate guessing a directory/);

  const { problems, counted } = check('// nav.css:113 gives the counter its own surface');
  assert.deepStrictEqual(problems, [],
    'unanchored and unrooted is a string, not a citation — the header says why');
  assert.equal(counted.unrooted, 1, 'and it is counted rather than lost');
});

test('a `<sha>:` prefix makes the citation historical, and it is left alone', () => {
  const { problems, counted } = check('// gone at f222104:fixture/callout.css:145 `whatever`');
  assert.deepStrictEqual(problems, [], 'a claim about another tree is not ours to resolve');
  assert.equal(counted.historical, 1);
});

test('a citation into a dependency is counted, never resolved', () => {
  const { problems, counted } = check(
    '// storybook/dist/core-server/index.js:11654 `getServerPort` delegates to detect-port');
  assert.deepStrictEqual(problems, [],
    'the line belongs to a version this repo does not pin here');
  assert.equal(counted.external, 1);
});

test('a range passes on any line inside it and fails on one outside', () => {
  const read = () => ['one', 'two', 'three', 'four'].join('\n');
  assert.deepStrictEqual(problemsOf('// fixture/a.css:2-4 `three`', read), [],
    'the anchor may sit anywhere in the range');
  assert.equal(problemsOf('// fixture/a.css:2-4 `one`', read).length, 1,
    'and nowhere outside it');
  assert.match(problemsOf('// fixture/a.css:4-2 `x`', read)[0], /ends before it starts/);
});

test('a file that is not there fails as a missing file, not a missing line', () => {
  assert.match(problemsOf('// fixture/gone.css:1 `x`')[0], /no such file: fixture\/gone\.css/);
});

test('the anchor may wrap one line with the comment, and no further', () => {
  const read = () => 'the anchor text';
  assert.deepStrictEqual(problemsOf('// fixture/a.css:1\n// `the anchor text`', read), [],
    'prose wraps, and a citation at the end of a line still owns the next backticks');
  assert.match(problemsOf('// fixture/a.css:1\n//\n// `the anchor text`', read)[0], /has no anchor/,
    'two lines away, the next backticked span is somebody else\'s sentence');
});

test('a `ref:` in a module is handed to refs.test.js; the same shape in prose is resolved here', () => {
  /* Assembled rather than written out, for the reason the other fixtures are:
   * spelled in full it would be a `ref:` the sweep above counts as a real one,
   * and the delegation tally would answer for a citation nobody cites. */
  const key = "ref: '";
  const entry = `{ ${key}fixture/a.css:1', pattern: '.ui-btn--danger:hover' }`;
  const read = () => '.ui-btn--danger:hover {';

  const { problems, counted } = check(`kit: [${entry}]`, read, 'fixture/page.js');
  assert.deepStrictEqual(problems, [], 'a guideline kit entry is not this gate\'s to check');
  assert.equal(counted.delegated, 1, 'but it is counted, and the count is asserted above');

  const doc = check(`| \`kit\` | optional | \`[${entry}]\` |`, read, 'fixture/page.md');
  assert.deepStrictEqual(doc.problems, [], 'in a markdown page the sibling pattern is the anchor');
  assert.equal(doc.counted.checked, 1, 'and it is really resolved, not waved through');
  assert.equal(check(`| \`[${entry.replace(':1', ':9')}]\` |`, read, 'fixture/page.md').problems.length, 1,
    'so a documented example that stops landing fails too');
});

test('a rendered citation is anchored by the code span after it', () => {
  const read = () => '.ui-nav__item.is-danger:hover { color: var(--pink); }';
  const shown = "`${code('fixture/nav.css:1')} ${code('.ui-nav__item.is-danger:hover')}`";
  assert.deepStrictEqual(problemsOf(shown, read), [],
    'a story shows the selector rather than a backtick a reader would see');
  assert.equal(problemsOf("`${code('fixture/nav.css:1')}`", read).length, 1,
    'and a rendered citation with nothing after it is still unanchored');
});

test('the failure text opens at the citing line, not at the cited one', () => {
  const [where] = problemsOf('\n\n// fixture/a.css:1 `nope`', () => 'yes');
  assert.match(where, /^fixture\/page\.js:3 → fixture\/a\.css:1\n {5}/);
});
