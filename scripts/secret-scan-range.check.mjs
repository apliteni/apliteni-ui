#!/usr/bin/env node
/**
 * secret-scan-range.check — prove the Security workflow's secret scan walks the
 * history it means to walk: a pull request's own commits on a pull request, the
 * whole clone on a push to main.
 *
 * How much history a scan covers is invisible from its result. `gitleaks detect
 * --source .` walks EVERY ref in the clone, so a leak on one unmerged branch
 * turned the check red on every other open pull request at once (issue #186) —
 * and the opposite mistake, a range that quietly covers nothing, looks exactly
 * like a clean repository. Neither is visible in a green tick. So this file
 * lifts the scan step's real `run:` body out of .github/workflows/security.yml
 * and EXECUTES it against synthetic repositories where the right answer is
 * known: a leak planted on a branch nobody is reviewing, and a leak planted in
 * the commits under review.
 *
 * That the body can be executed at all is a property of how it is written: it
 * reads every value from the environment (GITHUB_EVENT_NAME, PR_BASE_SHA,
 * PR_HEAD_SHA, PR_HEAD_REF) and never from a `${{ }}` expression. That is a
 * security rule first — this repo is public and takes fork pull requests, and a
 * branch name pasted into a shell script by the expression evaluator is a
 * command-injection hole — and it is what makes the body testable second. The
 * check asserts the rule below, so the two cannot drift apart.
 *
 * The YAML parser here is hand-rolled and throws the moment the file's shape
 * changes, in the style of parseSteps() in scripts/tag-on-bump.test.js. A parser
 * that shrugs and matches nothing would take this check green over a workflow it
 * never read.
 *
 * NOT named *.test.js on purpose, for the same reason as
 * scripts/gitleaks-rules.check.mjs: `npm test` globs scripts/**\/*.test.js and
 * runs on machines with no gitleaks. This needs the pinned binary and belongs to
 * the security workflow, which downloads it.
 *
 * Usage: node scripts/secret-scan-range.check.mjs [path-to-workflow.yml]
 *        GITLEAKS_BIN=./gitleaks node scripts/secret-scan-range.check.mjs
 *
 * The argument exists so the check can be pointed at an older or deliberately
 * mutated workflow to prove it still fails there. Default is this repo's own.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const WORKFLOW = resolve(process.argv[2] ?? join(ROOT, '.github', 'workflows', 'security.yml'));
const CONFIG = join(ROOT, '.gitleaks.toml');
const STEP = 'Scan for secrets';

// `./gitleaks` is the workflow's default and is relative to the workspace root,
// but every scenario runs with its cwd inside a synthetic repository, so it has
// to be resolved here. Unset means the binary is on PATH, which is how it is
// installed on a developer machine.
const GITLEAKS = process.env.GITLEAKS_BIN ? resolve(process.env.GITLEAKS_BIN) : 'gitleaks';

// ┌─ READ THIS BEFORE EDITING THE PAYLOAD ──────────────────────────────────┐
// │ The planted secret is ASSEMBLED, never written out. A literal private   │
// │ IP in this file is a real finding: this repo's own gitleaks scan reads  │
// │ scripts/, and the workflow's internal-terms denylist greps tracked      │
// │ files for the same shape without excluding scripts/. Written out, this  │
// │ file would refuse every commit in the repo, for everyone, until it was  │
// │ put back. gitleaks-rules.check.mjs holds the same warning over its own  │
// │ fixtures — the trick there is a template literal, here it is a join.    │
// └─────────────────────────────────────────────────────────────────────────┘
//
// An RFC1918 address, caught by the `pii-private-ip` rule in .gitleaks.toml. A
// token shape would do as well, but tokens carry entropy floors and character
// classes that can drop a fabricated payload for reasons that have nothing to
// do with which commits were walked. This rule sets no entropy floor, so a
// missed finding here means the range was wrong and nothing else.
const PAYLOAD = [10, 11, 12, 13].join('.');
const LEAK_FILE = 'notes/deploy-target.md';
const leakText = ['The staging box we were told never to write down:', '', `    ${PAYLOAD}`, ''].join('\n');

function fail(message) {
  console.error(message);
  process.exit(1);
}

/**
 * The steps of the `secrets:` job, as the file actually spells them.
 *
 * Throws on anything it does not recognise. The alternative — a regex that
 * returns nothing when the YAML moves — would report "no leaks" over a body it
 * never found, which is the exact failure this whole file exists to catch.
 */
function parseSteps(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^ {4}steps:\s*$/.test(l));
  if (start === -1) {
    throw new Error(`${WORKFLOW} has no \`    steps:\` block — has the job changed shape?`);
  }

  const steps = [];
  let current = null;
  let block = null;
  const flush = () => {
    if (block && current) current[block.key] = block.lines.map((l) => l.slice(10)).join('\n');
    block = null;
  };

  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*$/.test(line)) {
      if (block) block.lines.push('');
      continue;
    }
    // Any key indented four spaces or less ends the block: a sibling job
    // (`  audit:`) or one of its keys (`    name:`). Comments are not keys.
    if (/^ {0,4}[\w-]/.test(line)) break;
    if (block) {
      if (line.match(/^ */)[0].length >= 10) {
        block.lines.push(line);
        continue;
      }
      flush();
    }
    const item = line.match(/^ {6}- (.*)$/);
    if (item) {
      if (current) steps.push(current);
      current = {};
      const kv = item[1].match(/^(\w[\w-]*):\s*(.*)$/);
      if (kv) current[kv[1]] = kv[2];
      continue;
    }
    const key = line.match(/^ {8}([\w-]+):\s*(.*)$/);
    if (key && current) {
      if (key[2] === '|') block = { key: key[1], lines: [] };
      else if (key[2] !== '') current[key[1]] = key[2].replace(/^['"](.*)['"]$/s, '$1');
    }
  }
  flush();
  if (current) steps.push(current);
  return steps;
}

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed in ${cwd}: ${r.stderr || r.stdout}`);
  }
  return r.stdout.trim();
}

function commit(dir, path, contents, message) {
  const full = join(dir, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, contents);
  git(dir, 'add', '--', path);
  git(dir, 'commit', '-q', '-m', message);
  return git(dir, 'rev-parse', 'HEAD');
}

/**
 * A repository with one clean commit on `main` and two branches off it: `other`
 * (a branch nobody in the scenario is reviewing) and `feature` (the one under
 * review). `leakOn` says which of the two carries the planted secret.
 *
 * The config is copied in rather than committed, so the file that defines the
 * rules is not itself part of the history being scanned.
 */
function buildRepo(dir, { leakOn, head }) {
  mkdirSync(dir, { recursive: true });
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 'checks@apliteni.test');
  git(dir, 'config', 'user.name', 'secret-scan-range check');
  git(dir, 'config', 'commit.gpgsign', 'false');
  copyFileSync(CONFIG, join(dir, '.gitleaks.toml'));

  const main = commit(dir, 'README.md', '# fixture\n', 'the branch point');

  const shas = { main };
  for (const branch of ['other', 'feature']) {
    git(dir, 'checkout', '-q', '-b', branch, main);
    shas[branch] =
      branch === leakOn
        ? commit(dir, LEAK_FILE, leakText, `work on ${branch}`)
        : commit(dir, `${branch}.md`, `nothing to see on ${branch}\n`, `work on ${branch}`);
  }
  git(dir, 'checkout', '-q', head);
  shas.leak = shas[leakOn];
  shas.leakShort = git(dir, 'rev-parse', '--short', shas.leak);
  return shas;
}

/** Run the extracted body the way the runner would, with only `env:` for input. */
function runBody(body, dir, env) {
  const child = {
    ...process.env,
    GITLEAKS_BIN: GITLEAKS,
    // The scenario owns these four completely. Inherited values would otherwise
    // decide the answer when this check runs inside Actions, where
    // GITHUB_EVENT_NAME is already `pull_request`.
    GITHUB_EVENT_NAME: '',
    PR_BASE_SHA: '',
    PR_HEAD_SHA: '',
    PR_HEAD_REF: '',
    ...env,
  };
  const r = spawnSync('bash', ['-c', body], { cwd: dir, encoding: 'utf8', env: child });
  if (r.error) throw r.error;
  return { status: r.status, output: `${r.stdout}${r.stderr}` };
}

/**
 * The four things the scan has to get right. `expect` is the exit status the
 * body must produce; `contains` are substrings its output must carry, built
 * from the fixture's own shas so an assertion cannot pass on a coincidence.
 */
const SCENARIOS = [
  {
    name: 'a pull request is not reddened by a leak on someone else’s branch',
    why: 'issue #186 — the whole-clone walk failed every open PR at once',
    repo: { leakOn: 'other', head: 'feature' },
    env: (s) => ({
      GITHUB_EVENT_NAME: 'pull_request',
      PR_BASE_SHA: s.main,
      PR_HEAD_SHA: s.feature,
      PR_HEAD_REF: 'feature',
    }),
    expect: 0,
    contains: (s) => [`${s.main}..${s.feature}`],
  },
  {
    name: 'a pull request that carries the leak in its own commits fails',
    why: 'the narrowing must not narrow away the thing the gate is for',
    repo: { leakOn: 'feature', head: 'feature' },
    env: (s) => ({
      GITHUB_EVENT_NAME: 'pull_request',
      PR_BASE_SHA: s.main,
      PR_HEAD_SHA: s.feature,
      PR_HEAD_REF: 'feature',
    }),
    expect: 1,
    contains: (s) => ['pii-private-ip', LEAK_FILE, s.leakShort, 'feature'],
  },
  {
    name: 'a push to main still fails on a leak sitting on an unmerged branch',
    why: 'main keeps the whole-clone walk — it is the backstop',
    repo: { leakOn: 'other', head: 'main' },
    env: () => ({ GITHUB_EVENT_NAME: 'push' }),
    expect: 1,
    // The branch is not given to a push run, so the body has to ask git which
    // ref holds the commit. `other` is the answer, and it is never in its env.
    contains: (s) => ['pii-private-ip', s.leakShort, 'other'],
  },
  {
    name: 'a pull request whose base is missing falls back to the whole clone, loudly',
    why: 'scanning more than intended is acceptable; scanning less silently is the bug',
    repo: { leakOn: 'other', head: 'feature' },
    env: (s) => ({
      GITHUB_EVENT_NAME: 'pull_request',
      PR_BASE_SHA: '0'.repeat(40), // a sha no checkout can resolve
      PR_HEAD_SHA: s.feature,
      PR_HEAD_REF: 'feature',
    }),
    expect: 1,
    // `other`, not `feature`: once the scan has widened past the pull request's
    // own commits, the head ref is no longer the answer to which branch a
    // finding is on, and naming it there would send the reader to a clean branch.
    contains: (s) => ['falling back to scanning the whole clone', 'pii-private-ip', s.leakShort, 'other'],
  },
];

function main() {
  const workflow = readFileSync(WORKFLOW, 'utf8');
  const steps = parseSteps(workflow);
  const scan = steps.find((s) => s.name === STEP);
  if (!scan) {
    throw new Error(
      `${WORKFLOW} has no step named "${STEP}" — steps are: ${steps.map((s) => s.name ?? s.uses).join(', ')}`,
    );
  }
  if (typeof scan.run !== 'string' || scan.run.trim() === '') {
    throw new Error(`the "${STEP}" step has no \`run: |\` body — this check has nothing to execute`);
  }
  if (scan.run.includes('${{')) {
    fail(
      `secret-scan-range.check: the "${STEP}" body interpolates a \${{ }} expression. This repo is public and\n` +
        '  accepts fork pull requests: a branch name reaches that body as attacker-controlled text, and an\n' +
        '  expression is pasted in before bash parses the script. Pass the value through the step\'s `env:`\n' +
        '  block and quote it in the script instead.',
    );
  }

  const tmp = mkdtempSync(join(tmpdir(), 'secret-scan-range-'));
  const failures = [];
  try {
    for (const [i, sc] of SCENARIOS.entries()) {
      const dir = join(tmp, `case-${i}`);
      const shas = buildRepo(dir, sc.repo);
      const { status, output } = runBody(scan.run, dir, sc.env(shas));

      if (status !== sc.expect) {
        const verb = sc.expect === 0 ? 'PASS' : 'FAIL';
        failures.push(
          `${sc.name}\n      expected the scan to ${verb} (exit ${sc.expect}), got exit ${status} — ${sc.why}\n` +
            output.replace(/^/gm, '      | '),
        );
        continue;
      }
      const missing = sc.contains(shas).filter((s) => !output.includes(s));
      if (missing.length > 0) {
        failures.push(
          `${sc.name}\n      exit ${status} is right, but the output never mentions ${missing.join(', ')} — ${sc.why}\n` +
            output.replace(/^/gm, '      | '),
        );
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  const where = `workflow: ${WORKFLOW}`;
  if (failures.length > 0) {
    console.error(`secret scan range: ${failures.length} of ${SCENARIOS.length} scenarios failed`);
    console.error(where);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`secret scan range: all ${SCENARIOS.length} scenarios pass (${where})`);
}

try {
  main();
} catch (err) {
  fail(`secret-scan-range.check: ${err?.stack ?? err}`);
}
