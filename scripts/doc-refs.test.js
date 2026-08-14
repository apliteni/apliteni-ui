/* Rule: every documentation reference in the tree lands on a heading that exists.
 *
 * why: docs/README.md#where-a-decision-gets-recorded
 *
 * Code cites documentation — `why:` lines in test and script headers, comments
 * beside a token, a sentence in a changelog entry. Those citations rot in two
 * ways and both read as though the reason still exists:
 *
 *   the file is renamed or deleted   the reader follows a path to nothing
 *   the heading is reworded          the reader lands at the top of a long
 *                                    page with no idea which part was meant
 *
 * A broken `why:` is worse than no `why:`, so this gate resolves every one of
 * them: the file has to exist, and an anchor has to be a heading in it.
 *
 * SUBJECTS ARE DISCOVERED, NEVER LISTED — see CONTRIBUTING.md, "A gate
 * discovers its subjects and never enumerates them". The subject set is every
 * file git tracks, scanned for anything shaped like a path to a markdown page.
 * A new citation joins this gate by being written; nothing is added here.
 *
 * It lives under scripts/ because `npm test` only walks src, stories, site and
 * scripts, so a test outside those four trees is never executed and passes by
 * never running.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

/* A citation is a path ending in `.md`, optionally with a `#anchor`. The lookbehind
 * keeps it from starting mid-token, and the `://` guard drops URLs — a link to
 * somebody else's README is not ours to resolve. */
const CITATION = /(?<![\w#-])((?:[\w.-]+\/)*[\w.-]+\.md)(?![\w])(#[\w-]+)?/g;
const URL_BEFORE = /:\/\/[^\s)'"`]*$/;

/* Not every string ending in `.md` is a citation. The gates in this repo build
 * synthetic repositories to test themselves, and the files they plant are named
 * the same way real ones are: `gitleaks-rules.check.mjs` has a fixture per rule
 * (`uuid.md`, `email.md`, `openai-legacy.md`), and `secret-scan-range.check.mjs`
 * writes a leak into `notes/deploy-target.md`. None of those exist on disk and
 * none of them should. A gate that reports them is noise, and a gate people mute
 * is not a gate.
 *
 * So a reference counts when it is written one of the three ways a citation is
 * actually written — a form test, never a list of filenames:
 *
 *   docs/specification.md      it names a page in the documentation tree
 *   CONTRIBUTING.md#the-rule   it carries an anchor, so it points inside a page
 *   [library.md](library.md)   it is a markdown link, so a reader can click it
 *
 * A path with none of the three is a string that happens to end in `.md`. The
 * cost of that line is real and worth stating: a bare, unlinked mention of a
 * root-level page goes unchecked. Give it an anchor or link it, and it does not. */
const isCitation = (cited, hash, before, after) => cited.startsWith('docs/')
  || Boolean(hash)
  || (before.endsWith('](') && after.startsWith(')'));

/* GitHub's heading slug: lowercase, drop anything that is not a word character,
 * space or hyphen, then one hyphen per remaining space. Backticks and commas
 * fall out here, which is why it is not a simple lowercase-and-replace.
 *
 * Runs of whitespace are NOT collapsed, and that is the part worth getting
 * right. Dropping the ampersand from "Issues & pull requests" leaves two spaces
 * behind, so GitHub's own anchor is `issues--pull-requests` with the double
 * hyphen. Collapsing would generate an anchor that looks right and is not. */
export const slug = (heading) => heading
  .trim()
  .toLowerCase()
  .replace(/[^\w\s-]/g, '')
  .replace(/\s/g, '-');

/* Only headings outside fenced code blocks are anchors. A `# comment` inside a
 * shell block is not one, and treating it as one would let a broken anchor pass. */
export const anchorsOf = (markdown) => {
  const found = new Set();
  let fenced = false;
  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (m) found.add(slug(m[2]));
  }
  return found;
};

// Text files git tracks. Binaries are skipped by extension rather than sniffed.
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|eot|pdf|zip|tgz|mp4|svg)$/i;
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
  .filter((f) => !BINARY.test(f))
  .filter((f) => f !== path.relative(root, fileURLToPath(import.meta.url)));

/* Resolve a cited path the way a reader would: relative to the file doing the
 * citing first, then from the repository root. `[library.md](library.md)` inside
 * docs/ and `docs/library.md` inside src/ are the same page. */
const resolve = (from, cited) => {
  const beside = path.resolve(root, path.dirname(from), cited);
  if (existsSync(beside) && statSync(beside).isFile()) return beside;
  const fromRoot = path.resolve(root, cited);
  if (existsSync(fromRoot) && statSync(fromRoot).isFile()) return fromRoot;
  return null;
};

export const problemsIn = (file, text, lookup = resolve) => {
  const problems = [];
  const lines = text.split('\n');

  lines.forEach((line, i) => {
    for (const m of line.matchAll(CITATION)) {
      const [, cited, hash] = m;
      const before = line.slice(0, m.index);
      if (URL_BEFORE.test(before)) continue;
      if (!isCitation(cited, hash, before, line.slice(m.index + m[0].length))) continue;

      const at = `${file}:${i + 1}`;
      const target = lookup(file, cited);
      if (!target) {
        problems.push(`${at}\n     cites ${cited}, and no such file exists`);
        continue;
      }
      if (!hash) continue;

      const anchor = hash.slice(1);
      const anchors = anchorsOf(readFileSync(target, 'utf8'));
      if (!anchors.has(anchor)) {
        const near = [...anchors].filter((a) => a.includes(anchor) || anchor.includes(a));
        problems.push(
          `${at}\n     cites ${cited}#${anchor}, and that file has no such heading\n`
          + `     ${near.length ? `did you mean: ${near.join(', ')}` : `headings are: ${[...anchors].join(', ')}`}`,
        );
      }
    }
  });

  return problems;
};

test('every documentation reference in the tree resolves', () => {
  const problems = tracked.flatMap((f) => problemsIn(f, readFileSync(path.join(root, f), 'utf8')));
  assert.deepStrictEqual(
    problems,
    [],
    `documentation references no longer land where they say:\n  ${problems.join('\n  ')}`,
  );
});

/* A green sweep over nothing is the failure mode this gate is most exposed to:
 * the regex stops matching, every file yields no citation, and the test passes
 * by checking nothing. Both halves are counted, because a path that resolves
 * says nothing about whether anchors are being checked at all. */
test('the sweep found citations to resolve, with anchors among them', () => {
  let paths = 0;
  let anchors = 0;
  for (const f of tracked) {
    for (const line of readFileSync(path.join(root, f), 'utf8').split('\n')) {
      for (const m of line.matchAll(CITATION)) {
        const before = line.slice(0, m.index);
        if (URL_BEFORE.test(before)) continue;
        if (!isCitation(m[1], m[2], before, line.slice(m.index + m[0].length))) continue;
        paths += 1;
        if (m[2]) anchors += 1;
      }
    }
  }
  assert.ok(paths > 20, `only ${paths} documentation references found — the scan is not reading the tree`);
  assert.ok(anchors > 10, `only ${anchors} of them carry an anchor — anchors are going unchecked`);
});

/* The tree is green, so the checks themselves are exercised against references
 * that are not — the mutation that kills the case, per CONTRIBUTING.md. Each
 * of these is a way a real citation has broken or could break. */
test('a reference that stops landing fails with a line a reader can act on', () => {
  const page = ['# Top heading', '', '## Where a decision gets recorded', '', '```', '# not a heading', '```'].join('\n');
  const lookup = (_from, cited) => (cited === 'docs/README.md' ? 'virtual' : null);
  const withPage = (file, text) => problemsIn(file, text, lookup)
    .map((p) => p.replace(/\n\s+headings are:.*/s, '').replace(/\n\s+did you mean:.*/s, ''));

  // readFileSync is real, so the anchor half is checked against anchorsOf directly.
  assert.deepStrictEqual(
    [...anchorsOf(page)],
    ['top-heading', 'where-a-decision-gets-recorded'],
    'a `#` inside a fenced block is not an anchor',
  );

  assert.deepStrictEqual(withPage('src/x.css', '/* why: docs/README.md */'), [],
    'a path that resolves and carries no anchor is fine');

  const gone = withPage('src/x.css', '/* why: docs/adr/0004-the-gates-discover-their-subjects.md */');
  assert.equal(gone.length, 1, `expected one problem, got ${gone.length}`);
  assert.match(gone[0], /^src\/x\.css:1\n {5}cites docs\/adr\/0004[\w-]+\.md, and no such file exists$/);

  assert.deepStrictEqual(withPage('a.js', '// see https://example.com/thing/README.md#x'), [],
    'a URL is not ours to resolve');

  assert.deepStrictEqual(withPage('a.js', 'const f = "notes.md";'), [],
    'a bare word ending in .md is a string, not a citation');

  assert.deepStrictEqual(withPage('a.js', "serve(['./src/foundations/colors.mdx'])"), [],
    'a .mdx path is not a .md path — the match has to end at a word boundary');

  assert.deepStrictEqual(withPage('a.mjs', "const LEAK_FILE = 'notes/deploy-target.md';"), [],
    'a fixture a gate plants in a synthetic repo is not a citation');

  assert.deepStrictEqual(withPage('a.md', 'see [notes](notes.md) for more'), [
    'a.md:1\n     cites notes.md, and no such file exists',
  ], 'the same bare word inside a markdown link is a citation');

  assert.deepStrictEqual(withPage('a.js', '// why: notes.md#a-heading'), [
    'a.js:1\n     cites notes.md, and no such file exists',
  ], 'and so is one carrying an anchor');

  const deep = withPage('src/x.css', '/* why: docs/nope.md */');
  assert.equal(deep.length, 1, 'a path with a directory in it is always a citation');
});

test('a slug matches what GitHub would generate', () => {
  assert.equal(slug('Issues & pull requests'), 'issues--pull-requests',
    'the dropped ampersand leaves two spaces, so GitHub emits two hyphens');
  assert.equal(slug('A `why:` is a pointer'), 'a-why-is-a-pointer');
  assert.equal(slug('  Where a decision gets recorded  '), 'where-a-decision-gets-recorded');
  assert.equal(slug('One gate per workspace, over one shared implementation'),
    'one-gate-per-workspace-over-one-shared-implementation');
});
