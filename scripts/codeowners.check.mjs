#!/usr/bin/env node
/**
 * codeowners.check — prove every file that DEFINES a gate has a named owner in
 * .github/CODEOWNERS, and keep proving it for gate files that do not exist yet.
 *
 * The Security workflow reads the .gitleaks.toml and the check scripts carried
 * by the pull request under review. So a diff that weakens them is graded by
 * the weakened gate, and the only thing left standing between that diff and
 * main is a human reading it. CODEOWNERS is where this repo records who that
 * is — a record nothing keeps true, which is what this file is for.
 *
 * WHAT THE SWEEP COVERS, exactly: every `*.ya?ml` directly in
 * .github/workflows, every `*.check.mjs` anywhere under scripts/ at any depth,
 * .gitleaks.toml and .pre-commit-config.yaml when they exist, and this record
 * itself. The first two are globs, so a workflow or a check script added
 * tomorrow — nested or not — is covered by an existing rule or this goes red,
 * the argument ADR 0004 makes for the icon gates. The other three are NAMED
 * here, so a config renamed leaves the sweep quietly one subject smaller;
 * "derived, never listed" was too strong a claim to make for them.
 *
 * WHAT IT DOES NOT COVER, and this is a scope boundary rather than an
 * oversight. scripts/*.test.js — packaging.test.js among them, the
 * publish-safety guard the Published-artifact check leans on — the plain
 * scripts/*.mjs the required `build` check runs through `npm test`, and
 * package.json, which decides what `npm test` runs, are swept by nothing here
 * and owned by nothing in the record. A diff weakening one of those summons
 * no named reviewer. #196 scoped this record to .github/, the scanner config,
 * the pre-commit config and the check scripts, and the wider question is filed
 * on its own. Widening means widening the sweep and CODEOWNERS together.
 *
 * CODEOWNERS is LAST-MATCH-WINS. A later pattern replaces an earlier one's
 * owners, and a later pattern with NO owner unsets them, leaving the path
 * unowned. A check that greps for a path, or stops at the first matching line,
 * calls that record healthy. This resolves the same way GitHub does, over
 * gitignore-style patterns: a leading `/` anchors to the repo root, so does a
 * `/` anywhere in the middle, a trailing `/` matches a directory and everything
 * under it, a bare name matches at any depth, a double star spans any number of
 * directories INCLUDING none, and a pattern whose last segment carries a
 * wildcard names files rather than a directory to descend into.
 *
 * Usage: node scripts/codeowners.check.mjs [path-to-CODEOWNERS]
 *        node scripts/codeowners.check.mjs --covered [path] < paths-on-stdin
 *
 * The path argument exists so the check can be pointed at a deliberately broken
 * record and shown failing, the same seam scripts/gitleaks-rules.check.mjs
 * opens on its config. `--covered` filters the paths on stdin down to the ones
 * this record owns, and is how the workflow's warning step decides whether a
 * pull request touches the gate's definition without keeping a second copy of
 * the list.
 *
 * EXIT CODES, the same contract as its siblings in this directory:
 *   0 — every gate-defining file is covered by a rule with a named owner.
 *   1 — the record is wrong: a gap, a shadowed rule, an owner it cannot read.
 *   2 — this check could not reach a verdict. "Cannot tell" is not "passed".
 *
 * why: docs/adr/0004-the-gates-discover-their-subjects.md
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const args = process.argv.slice(2);
const COVERED_MODE = args[0] === '--covered';
const RECORD_REL = join('.github', 'CODEOWNERS');
const RECORD = resolve((COVERED_MODE ? args[1] : args[0]) ?? join(ROOT, RECORD_REL));

/** "Cannot tell." */
function stop(message) {
  console.error(message);
  process.exit(2);
}

/** "The record is wrong." A verdict was reached; it is a bad one. */
function refuse(lines) {
  for (const l of lines) console.error(l);
  process.exit(1);
}

// ── The subjects ───────────────────────────────────────────────────────────

/**
 * Every file whose contents decide what a gate does, swept out of the tree.
 *
 * The two globs are the growing halves, and each is asserted non-empty: a
 * directory that has moved or been renamed would otherwise shrink this set to
 * nothing and take the run green over a repo it never looked at. The two single
 * files are included only when present — a config that has been deleted has
 * nothing to own — while the record itself is always a subject, because a
 * record that does not name itself can be replaced without review.
 *
 * The scripts sweep RECURSES and the workflows sweep does not, and the
 * asymmetry is the semantics of each directory rather than an inconsistency.
 * GitHub only runs workflows that sit directly in .github/workflows, so a
 * nested .yml there defines no gate. A check script runs from wherever it is
 * imported or invoked, so scripts/lib/whatever.check.mjs is as load-bearing as
 * its siblings one level up — and the record's `/scripts/*.check.mjs` does not
 * span a separator, which MATCHER_CASES pins. A non-recursive sweep therefore
 * hid such a file from BOTH halves at once: not swept, so not asked about; not
 * owned, so nobody named. Recursing makes it swept and still unowned, which is
 * a red naming the file — the point being that whoever adds it has to name an
 * owner rather than inherit silence.
 */
function gateFiles() {
  const sweep = (dir, keep, recursive = false) => {
    if (!existsSync(join(ROOT, dir)))
      stop(`codeowners.check: ${dir}/ is missing, so this check swept a tree it does not know.`);
    const walk = (rel) =>
      readdirSync(join(ROOT, rel), { withFileTypes: true }).flatMap((e) => {
        if (e.isDirectory()) return recursive ? walk(`${rel}/${e.name}`) : [];
        return keep(e.name) ? [`${rel}/${e.name}`] : [];
      });
    const found = walk(dir);
    if (found.length === 0) stop(`codeowners.check: ${dir}/ matched no files, so this run would assert nothing.`);
    return found;
  };

  return [
    ...sweep('.github/workflows', (f) => /\.ya?ml$/.test(f)),
    ...sweep('scripts', (f) => f.endsWith('.check.mjs'), true),
    ...['.gitleaks.toml', '.pre-commit-config.yaml'].filter((f) => existsSync(join(ROOT, f))),
    '.github/CODEOWNERS',
  ].sort();
}

// ── The record ─────────────────────────────────────────────────────────────

// An owner is a user, a team, or an email address. Anything else is refused
// rather than skipped: a typo'd handle owns nothing, and silently ignoring the
// token would leave the line looking owned.
const USER_OR_TEAM = /^@[A-Za-z\d](?:[A-Za-z\d]|-(?=[A-Za-z\d])){0,38}(?:\/[A-Za-z\d._-]+)?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Rules in file order — order is the semantics, so it is never sorted. */
function parseRecord(text, where) {
  const rules = [];
  const bad = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/#.*$/, '').trim();
    if (line === '') return;
    const [pattern, ...owners] = line.split(/\s+/);
    // Sections (`[Docs]`, `^[Docs]`) change who is required and how many are.
    // This does not model them, and reading one as an ordinary pattern would
    // report ownership that is not there.
    if (/^\^?\[/.test(pattern)) {
      bad.push(`${where}:${i + 1}: section syntax (${pattern}) — this check does not model sections.`);
      return;
    }
    for (const o of owners) {
      if (!USER_OR_TEAM.test(o) && !EMAIL.test(o)) bad.push(`${where}:${i + 1}: "${o}" is not a user, team or email.`);
    }
    rules.push({ line: i + 1, pattern, owners });
  });
  return { rules, bad };
}

// ── gitignore-style matching ───────────────────────────────────────────────

/**
 * How many `**` a pattern may contain before this check refuses to compile it.
 *
 * Every `**` in one segment becomes another `.*`, and a regex that is nothing
 * but `.*` repeated backtracks exponentially against a non-match: `/` followed
 * by six `**` took 3.1 seconds here, eight took over twenty. Nothing is made
 * green by that — the job holds a read-only token and a hang never passes a
 * gate — but a required check that hangs is worse than one that says why it
 * stopped, so an absurd pattern takes the exit-2 "cannot tell" path instead.
 * Three is far above anything CODEOWNERS is written with; the record uses none.
 */
const MAX_DOUBLE_STARS = 3;

/** One segment of a pattern as a regex fragment. `*` and `?` stay inside it. */
function segment(seg) {
  let out = '';
  for (let i = 0; i < seg.length; i++) {
    if (seg[i] === '*' && seg[i + 1] === '*') {
      out += '.*';
      i++;
    } else if (seg[i] === '*') out += '[^/]*';
    else if (seg[i] === '?') out += '[^/]';
    else out += seg[i].replace(/[.+^${}()|[\]\\]/, '\\$&');
  }
  return out;
}

// One CODEOWNERS pattern as a regex over a repo-relative path, plus whether it
// names a directory and whether its last segment names a file SHAPE.
//
// Compiled segment by segment, because a double star is a SEGMENT and not a
// character run: gitignore documents `a/**/b` as matching `a/b`, so the double
// star and ONE separator are optional together. Compiling it to a bare `.*`
// sitting between two literal separators made `scripts/**/*.mjs` miss
// `scripts/x.mjs`, and `**/foo.txt` miss `foo.txt`. That direction is safe for
// the coverage assertion — it demands a rule that already exists — but wrong in
// `--covered`, where it lets a pull request edit a gate file with no warning.
//
// (Written as line comments, not a doc block: the patterns this argument is
// about all contain `*/`, which would close one.)
function compile(pattern) {
  let p = pattern;
  const dirOnly = p.endsWith('/');
  p = p.replace(/\/+$/, '');
  // gitignore: a separator at the start OR in the middle anchors the pattern to
  // the root. Only a pattern with no separator left floats to any depth.
  const anchored = p.startsWith('/') || p.includes('/');
  if (p.startsWith('/')) p = p.slice(1);

  const doubles = (p.match(/\*\*/g) ?? []).length;
  if (doubles > MAX_DOUBLE_STARS) {
    stop(
      `codeowners.check: the pattern "${pattern}" contains ${doubles} "**" sequences, over the limit of ` +
        `${MAX_DOUBLE_STARS}.\nA pattern like that compiles to a stack of ".*" that takes seconds to minutes ` +
        'to decide,\nso this check refuses it rather than hanging. Rewrite the pattern.',
    );
  }

  const segs = p.split('/');
  let body = '';
  for (let i = 0; i < segs.length; i++) {
    const last = i === segs.length - 1;
    if (segs[i] === '**') {
      // Trailing `**` is everything below. In the middle it swallows its own
      // separator, so zero intervening directories still matches.
      body += last ? '.*' : '(?:.*/)?';
      continue;
    }
    body += segment(segs[i]) + (last ? '' : '/');
  }
  // A last segment carrying a wildcard describes a FILE, not a directory that
  // could have things under it. See covers().
  const fileShaped = /[*?]/.test(segs[segs.length - 1]);
  return { re: new RegExp(`${anchored ? '^' : '^(?:.*/)?'}${body}$`), dirOnly, fileShaped };
}

/**
 * Does this pattern cover this path? A pattern that matches a DIRECTORY covers
 * everything beneath it, so every ancestor of the path is a candidate — and for
 * a pattern written with a trailing `/`, only the ancestors are.
 *
 * The exception is a pattern whose LAST segment carries a wildcard and which is
 * not written as a directory: `docs/*` names a file shape, and GitHub's own
 * CODEOWNERS documentation says it does NOT own further-nested files. Walking
 * the ancestors for it matched the DIRECTORY docs/build-app and cascaded to
 * everything inside — the unsafe direction, a record that reads complete while
 * GitHub summons nobody. Today's record cannot reach that only because no
 * directory in this repo is named `*.check.mjs`. A wildcard pattern written
 * WITH a trailing slash still cascades: there the slash is the author saying
 * "directory", which is exactly what dirOnly means.
 */
function covers(pattern, path) {
  const { re, dirOnly, fileShaped } = compile(pattern);
  const parts = path.split('/');
  const start = parts.length - (dirOnly ? 1 : 0);
  const floor = fileShaped && !dirOnly ? start : 1;
  for (let i = start; i >= floor && i > 0; i--) {
    if (re.test(parts.slice(0, i).join('/'))) return true;
  }
  return false;
}

/** The rule GitHub would apply: the LAST one that matches, or none. */
function ruleFor(rules, path) {
  let winner = null;
  for (const r of rules) if (covers(r.pattern, path)) winner = r;
  return winner;
}

// ── The matcher's own cases ────────────────────────────────────────────────
//
// Hand-rolled matching is the part of this file that can be wrong while every
// assertion above it stays green, so it is asserted on every run. The last two
// rows are the semantics this check exists for: later wins, and a later line
// with no owner leaves the path unowned.

const MATCHER_CASES = [
  ['/.github/', '.github/workflows/ci.yml', true, 'a trailing slash covers everything beneath'],
  ['/.github/', 'docs/.github/notes.md', false, 'a leading slash anchors to the repo root'],
  ['/scripts/*.check.mjs', 'scripts/codeowners.check.mjs', true, 'a single * matches within one segment'],
  ['/scripts/*.check.mjs', 'scripts/lib/nested.check.mjs', false, 'a single * does not span a separator'],
  ['/scripts/**/*.mjs', 'scripts/lib/nested.mjs', true, '** does span separators'],
  ['/scripts/**/*.mjs', 'scripts/x.mjs', true, 'and spans NOTHING too — gitignore: a/**/b matches a/b'],
  ['**/foo.txt', 'foo.txt', true, 'the same at the front: a leading ** matches at the root'],
  ['docs/*', 'docs/troubleshooting.md', true, 'a wildcard tail owns the files directly under it'],
  ['docs/*', 'docs/build-app/troubleshooting.md', false, 'and NOT further-nested ones — GitHub documents this'],
  ['CODEOWNERS', '.github/CODEOWNERS', true, 'a bare name matches at any depth'],
  ['/CODEOWNERS', '.github/CODEOWNERS', false, 'anchored, the same name does not'],
  ['/.gitleaks.toml', '.gitleaks.toml', true, 'an anchored file matches itself'],
  ['/.gitleaks.toml', 'docs/.gitleaks.toml', false, 'and nothing else that shares its name'],
];

const RESOLUTION_CASES = [
  {
    why: 'the last matching rule wins, not the first',
    rules: [
      { pattern: '/.github/', owners: ['@first'] },
      { pattern: '/.github/workflows/', owners: ['@second'] },
    ],
    path: '.github/workflows/security.yml',
    expect: '@second',
  },
  {
    why: 'a later line with no owner UNSETS an earlier one',
    rules: [{ pattern: '/.github/', owners: ['@first'] }, { pattern: '/.github/workflows/', owners: [] }],
    path: '.github/workflows/security.yml',
    expect: null,
  },
];

function selfTest() {
  const failures = [];
  for (const [pattern, path, expect, why] of MATCHER_CASES) {
    const got = covers(pattern, path);
    if (got !== expect) failures.push(`  ${pattern} vs ${path}: expected ${expect}, got ${got} — ${why}`);
  }
  for (const c of RESOLUTION_CASES) {
    const got = ruleFor(c.rules, c.path);
    const owner = got?.owners[0] ?? null;
    if (owner !== c.expect) failures.push(`  ${c.path}: expected owner ${c.expect}, got ${owner} — ${c.why}`);
  }
  if (failures.length > 0) {
    stop(
      [
        'codeowners.check: the pattern matcher is wrong, so its verdict on the real record means nothing.',
        ...failures,
      ].join('\n'),
    );
  }
}

// ── Modes ──────────────────────────────────────────────────────────────────

/**
 * Print the paths on stdin that this record owns.
 *
 * The workflow's warning step feeds it a pull request's changed files. Since
 * the record names the gate's definition and nothing else, "owned" is the same
 * question as "is this a gate file", and it answers it for a DELETED file too,
 * which a sweep of the tree cannot.
 */
function coveredMode(rules) {
  const paths = readFileSync(0, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  for (const p of paths) {
    const rule = ruleFor(rules, p);
    if (rule && rule.owners.length > 0) console.log(p);
  }
}

function assertCoverage(rules, where) {
  const subjects = gateFiles();
  const problems = [];
  for (const path of subjects) {
    const rule = ruleFor(rules, path);
    if (!rule) {
      problems.push(`  ${path}\n      no rule in ${where} covers it — nobody is named to review a change to it.`);
    } else if (rule.owners.length === 0) {
      problems.push(
        `  ${path}\n      the last rule that matches it — "${rule.pattern}" on line ${rule.line} — names no owner,` +
          ' so it UNSETS whatever an earlier line gave. Last match wins.',
      );
    }
  }
  if (problems.length > 0) {
    refuse([
      `codeowners: ${problems.length} of ${subjects.length} gate-defining files are unowned`,
      `record: ${where}`,
      ...problems.map((p) => `  ✗${p.slice(1)}`),
      '',
      'These files decide what the security gates do, and the gates read them out of the pull',
      'request that changes them. Add a rule naming an owner, or move the file out of the sweep.',
    ]);
  }
  console.log(`codeowners: all ${subjects.length} gate-defining files are owned (record: ${where})`);
}

function main() {
  selfTest();
  const where = RECORD.startsWith(`${ROOT}/`) ? RECORD.slice(ROOT.length + 1) : RECORD;
  if (!existsSync(RECORD)) {
    refuse([
      `codeowners: there is no ${where}.`,
      'Every file that defines a security gate is therefore unowned, and a pull request that',
      'weakens one is reviewed by whoever happens to look. Add the record.',
    ]);
  }
  const { rules, bad } = parseRecord(readFileSync(RECORD, 'utf8'), where);
  if (bad.length > 0) refuse(['codeowners: this record has lines that cannot be read as ownership', ...bad]);
  if (rules.length === 0) refuse([`codeowners: ${where} exists but declares no rules, so it owns nothing.`]);
  if (COVERED_MODE) coveredMode(rules);
  else assertCoverage(rules, where);
}

try {
  main();
} catch (err) {
  stop(`codeowners.check: ${err?.stack ?? err}`);
}
