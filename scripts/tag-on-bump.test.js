// Release automation — a failed publish must not become permanently green.
//
// The wedge this exists to prevent, in three runs:
//
//   1. A bump lands. The workflow tags, cuts the Release, dispatches the
//      publish, and the publish fails — or, far more ordinarily, sits waiting
//      for a reviewer to approve the npm-publish environment. The job is red.
//      Correct so far.
//   2. Any later push to main. The old plan step asked "does the tag exist?",
//      the tag was created in step 1 *before* the publish, so the answer was
//      yes — `release=false`, the publish step skipped itself on its own `if:`,
//      and the job exited 0.
//   3. From then on, green for ever. Nothing on npm, a healthy-looking
//      pipeline, and a re-run that could not retry because it reached the same
//      conclusion. Only a manual dispatch or version-drift.yml a day later
//      would notice.
//
// The fix is that the registry decides, not the tag. So what is tested here is
// the decision: the plan step's real `run:` body, executed against a real git
// remote with npm stubbed, and then the `if:` expressions of the steps that
// depend on it, evaluated the way Actions evaluates them. Asserting on the YAML
// alone would prove nothing — the strings under suspicion are the ones a grep
// would be looking for.
//
// The publish step gets the same treatment further down, for the same reason
// in reverse: it was the one part of this workflow no test executed, and four
// separate defects were living in it. `gh` is stubbed the way `npm` is — a
// script first on PATH — over a virtual clock, so a seventeen-minute wait costs
// a millisecond and the elapsed time is itself something a test can assert on.
// The stub hands the real `--jq` programs to the real jq, because those filters
// are where two of the four defects were.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflowPath = path.join(root, '.github/workflows/tag-on-bump.yml');
const workflow = readFileSync(workflowPath, 'utf8');

// ---------------------------------------------------------------------------
// Reading the job out of the YAML
// ---------------------------------------------------------------------------

/**
 * The `tag` job's steps, as {name, id, if, run}.
 *
 * Hand-rolled rather than a YAML library because the repo has no runtime
 * dependencies and this is not worth acquiring one for. It knows exactly the
 * shape this one file has and throws the moment that stops being true, so a
 * restructure fails loudly here rather than quietly matching nothing.
 */
function parseSteps(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^ {4}steps:\s*$/.test(l));
  assert.notEqual(start, -1, 'tag-on-bump.yml has no `    steps:` block — has the job changed shape?');

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
    if (/^\S/.test(line)) break;
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
      const kv = item[1].match(/^(\w+):\s*(.*)$/);
      if (kv) current[kv[1]] = kv[2];
      continue;
    }
    const key = line.match(/^ {8}(\w+):\s*(.*)$/);
    if (key && current) {
      if (key[2] === '|') block = { key: key[1], lines: [] };
      else if (key[2] !== '') current[key[1]] = key[2].replace(/^['"](.*)['"]$/s, '$1');
    }
  }
  flush();
  if (current) steps.push(current);
  return steps;
}

const steps = parseSteps(workflow);

function step(name) {
  const found = steps.find((s) => s.name === name);
  assert.ok(found, `tag-on-bump.yml has no step named "${name}" — steps are: ${steps.map((s) => s.name)}`);
  return found;
}

// ---------------------------------------------------------------------------
// Actions' `if:` semantics, restricted to the forms this job uses
// ---------------------------------------------------------------------------

/**
 * Evaluate one `if:` expression the way Actions would.
 *
 * The implicit `success()` is the whole point: the wedge was a step declining
 * to run because of its own `if:`, on a job that was otherwise fine. A step
 * with no `if:` runs while nothing has failed; one whose expression names
 * `always()` runs regardless.
 *
 * Only conjunctions are understood. `||` is refused out loud rather than
 * quietly mis-read: the comparison regex is happy to swallow a whole
 * disjunction into one string literal, so `a == 'x' || b == 'y'` would compare
 * `a` against `x' || b == 'y` and come back false for every input — a step that
 * always runs, tested as a step that never does. Nothing in the job uses `||`
 * today, which is exactly why this has to be a throw and not a comment.
 */
function evaluateIf(expr, { outputs = {}, outcomes = {}, jobFailed = false }) {
  if (expr === undefined) return !jobFailed;
  if (expr.includes('||')) {
    throw new Error(`this test cannot evaluate \`${expr}\` — it has a \`||\` in it. Teach it, do not weaken it`);
  }
  const terms = expr.split('&&').map((t) => t.trim());
  const unconditional = /\balways\(\)/.test(expr);
  const resolveRef = (ref) => {
    let m = ref.match(/^steps\.plan\.outputs\.([\w-]+)$/);
    if (m) return outputs[m[1]] ?? '';
    m = ref.match(/^steps\.([\w-]+)\.outcome$/);
    if (m) return outcomes[m[1]] ?? 'skipped';
    throw new Error(`this test cannot resolve \`${ref}\` — teach it, do not weaken it`);
  };
  const truth = terms.map((term) => {
    if (term === 'always()') return true;
    if (term === 'success()') return !jobFailed;
    const cmp = term.match(/^(.+?)\s*(==|!=)\s*'(.*)'$/);
    assert.ok(cmp, `this test cannot evaluate \`${term}\``);
    const value = resolveRef(cmp[1].trim());
    return cmp[2] === '==' ? value === cmp[3] : value !== cmp[3];
  });
  return (unconditional || !jobFailed) && truth.every(Boolean);
}

/** Would Actions run this step? */
function wouldRun(stepName, context) {
  return evaluateIf(step(stepName).if, context);
}

// ---------------------------------------------------------------------------
// Running the plan step for real
// ---------------------------------------------------------------------------

const VERSION = '0.10.0';
const TAG = `v${VERSION}`;

/** Where the real git lives, for the pass-through in the stub below. */
const REAL_GIT = execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim();

/**
 * An `npm` that answers a different thing each time it is called.
 *
 * `--json` puts npm's error object on stdout, which is what these bodies are.
 * The last answer repeats, so a one-element list is a constant npm.
 */
function writeNpmStub(binDir, scratch, answers) {
  const body = (answer) =>
    answer === 'unreachable'
      ? { exit: 1, out: JSON.stringify({ error: { code: 'ENOTFOUND', summary: 'getaddrinfo ENOTFOUND' } }) }
      : answer === 'published'
        ? { exit: 0, out: JSON.stringify(VERSION) }
        : { exit: 1, out: JSON.stringify({ error: { code: 'E404', summary: `No match found for version ${VERSION}` } }) };
  const counter = path.join(scratch, 'npm-calls');
  writeFileSync(counter, '0');
  const cases = answers
    .map((answer, i) => {
      const { exit, out } = body(answer);
      const label = i === answers.length - 1 ? '*' : String(i + 1);
      return `  ${label}) cat <<'NPMEOF'\n${out}\nNPMEOF\n  exit ${exit} ;;`;
    })
    .join('\n');
  writeFileSync(
    path.join(binDir, 'npm'),
    `#!/bin/sh\nn=$(cat '${counter}')\nn=$((n + 1))\necho "$n" > '${counter}'\ncase "$n" in\n${cases}\nesac\n`,
  );
  chmodSync(path.join(binDir, 'npm'), 0o755);
  return counter;
}

/**
 * Execute the plan step's own `run:` body.
 *
 * Real git and a real bare remote, because `git ls-remote --exit-code` against
 * a remote is the thing being relied on and a fake would only prove the fake
 * works. npm is the one stub: the answer it gives is the input to the decision,
 * and `published` is what selects it.
 *
 * `registryAnswers` overrides `published` when a run needs npm to change its
 * mind between calls. `breakPeelLookup` fails the second `git ls-remote` — the
 * one that reads which commit an existing tag points at — and nothing else.
 *
 * @param {{published?: boolean|'unreachable', registryAnswers?: string[],
 *          tagAt: 'this-commit'|'another-commit'|null, breakPeelLookup?: boolean}} world
 */
function runPlanStep({ published, registryAnswers, tagAt, breakPeelLookup = false }) {
  const scratch = mkdtempSync(path.join(realpathSync(os.tmpdir()), 'apliteni-ui-tagonbump-'));
  try {
    const remote = path.join(scratch, 'remote.git');
    const work = path.join(scratch, 'work');
    const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: 'pipe' });

    execFileSync('git', ['init', '--quiet', '--bare', '-b', 'main', remote]);
    execFileSync('git', ['init', '--quiet', '-b', 'main', work]);
    writeFileSync(
      path.join(work, 'package.json'),
      JSON.stringify({ name: '@apliteni/apliteni-ui', version: VERSION }, null, 2),
    );
    mkdirSync(path.join(work, 'scripts'));
    cpSync(path.join(root, 'scripts/registry-status.mjs'), path.join(work, 'scripts/registry-status.mjs'));
    git(work, 'add', '-A');
    git(work, '-c', 'user.email=t@t.t', '-c', 'user.name=T', 'commit', '--quiet', '-m', 'first');
    git(work, 'remote', 'add', 'origin', remote);
    git(work, 'push', '--quiet', 'origin', 'main');

    if (tagAt === 'another-commit') {
      // Somebody else's release of the same version: the tag is on an earlier
      // commit and this push is a later one.
      git(work, '-c', 'user.email=t@t.t', '-c', 'user.name=T', 'tag', '-a', TAG, '-m', 'other', 'HEAD');
      git(work, 'push', '--quiet', 'origin', `refs/tags/${TAG}`);
      writeFileSync(path.join(work, 'note.txt'), 'later\n');
      git(work, 'add', '-A');
      git(work, '-c', 'user.email=t@t.t', '-c', 'user.name=T', 'commit', '--quiet', '-m', 'second');
      git(work, 'push', '--quiet', 'origin', 'main');
    } else if (tagAt === 'this-commit') {
      git(work, '-c', 'user.email=t@t.t', '-c', 'user.name=T', 'tag', '-a', TAG, '-m', 'ours', 'HEAD');
      git(work, 'push', '--quiet', 'origin', `refs/tags/${TAG}`);
    }

    // The `npm` the copied registry-status.mjs will find.
    const bin = path.join(scratch, 'bin');
    mkdirSync(bin);
    const answers =
      registryAnswers ?? [published === 'unreachable' ? 'unreachable' : published ? 'published' : 'unpublished'];
    const npmCalls = writeNpmStub(bin, scratch, answers);

    // Retries are the behaviour under test, not the waiting. Nothing else in
    // this step sleeps.
    writeFileSync(path.join(bin, 'sleep'), '#!/bin/sh\nexit 0\n');
    chmodSync(path.join(bin, 'sleep'), 0o755);

    if (breakPeelLookup) {
      // Only the peeled-ref read fails: `git ls-remote origin refs/tags/v…
      // refs/tags/v…^{}`. Everything else is the real git, because the
      // three-way `--exit-code` answer above is the thing being relied on.
      writeFileSync(
        path.join(bin, 'git'),
        `#!/bin/sh\nfor a in "$@"; do\n  case "$a" in\n    *'^{}') echo 'fatal: could not read from remote repository' >&2; exit 128 ;;\n  esac\ndone\nexec ${REAL_GIT} "$@"\n`,
      );
      chmodSync(path.join(bin, 'git'), 0o755);
    }

    const outputFile = path.join(scratch, 'step-output');
    writeFileSync(outputFile, '');
    const run = spawnSync('bash', ['-c', step('Decide whether this push is a release').run], {
      cwd: work,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}${path.delimiter}${process.env.PATH}`,
        GITHUB_SHA: git(work, 'rev-parse', 'HEAD').trim(),
        GITHUB_OUTPUT: outputFile,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    return {
      status: run.status,
      log: `${run.stdout ?? ''}${run.stderr ?? ''}`,
      npmCalls: Number(readFileSync(npmCalls, 'utf8').trim()),
      outputs: Object.fromEntries(
        readFileSync(outputFile, 'utf8')
          .split('\n')
          .filter(Boolean)
          .map((l) => l.split(/=(.*)/s).slice(0, 2)),
      ),
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------

test('an unpublished version with no tag is a release, and gets one', () => {
  const plan = runPlanStep({ published: false, tagAt: null });

  assert.equal(plan.status, 0, plan.log);
  assert.equal(plan.outputs.release, 'true');
  assert.equal(plan.outputs.tag_exists, 'false');
  assert.equal(plan.outputs.tag, TAG);
  assert.equal(wouldRun('Tag the commit', plan), true);
  assert.equal(wouldRun('Publish it, and wait for the answer', plan), true);
});

test('a version whose publish never landed keeps trying, and keeps its tag', () => {
  // THE REGRESSION. Everything the first run left behind is here — the tag, and
  // by implication the Release — and the version is still not on npm. Deciding
  // from the tag made this `release=false` and skipped the publish, green, for
  // ever. Deciding from the registry makes it a release that is not finished.
  const plan = runPlanStep({ published: false, tagAt: 'this-commit' });

  assert.equal(plan.status, 0, plan.log);
  assert.equal(
    plan.outputs.release,
    'true',
    'an unpublished version is unreleased no matter what tags exist — this is the wedge',
  );
  assert.equal(plan.outputs.tag_exists, 'true');

  // The tag stays where it is. Re-tagging would move a released version's tag
  // onto whichever commit happened to retry.
  assert.equal(wouldRun('Tag the commit', plan), false);
  // …and because that step is skipped rather than successful, the rollback can
  // never delete a tag this run did not create.
  assert.equal(
    wouldRun('Undo the tag if the Release never got made', {
      ...plan,
      outcomes: { tag: 'skipped', release: 'failure' },
      jobFailed: true,
    }),
    false,
  );
  // The Release step is a `view || create`, so it fills in a missing Release
  // and no-ops on one that is already there.
  assert.equal(wouldRun('Cut the Release', plan), true);
  assert.equal(
    wouldRun('Publish it, and wait for the answer', plan),
    true,
    'the publish must be retried while the version is unpublished',
  );
});

test('a version that is on npm is terminal — the run touches nothing', () => {
  const plan = runPlanStep({ published: true, tagAt: 'this-commit' });

  assert.equal(plan.status, 0, plan.log);
  assert.equal(plan.outputs.release, 'false');
  for (const name of [
    'Write the release notes, or stop here',
    'Tag the commit',
    'Cut the Release',
    'Publish it, and wait for the answer',
  ]) {
    assert.equal(wouldRun(name, plan), false, `${name} should not run for a published version`);
  }
});

test('a registry that cannot be reached stops the job rather than guessing', () => {
  const plan = runPlanStep({ published: 'unreachable', tagAt: null });

  assert.equal(plan.status, 1, `expected the step to fail, log:\n${plan.log}`);
  assert.match(plan.log, /::error::/);
  assert.match(plan.log, /ENOTFOUND/, 'the reason has to reach the run log');
  // Neither reading. Not "unpublished" — that would re-dispatch a publish over
  // a released version. Not "published" — that would go green over an
  // unreleased one.
  assert.equal(plan.outputs.release, undefined);
  assert.equal(wouldRun('Publish it, and wait for the answer', { ...plan, jobFailed: true }), false);
  assert.equal(wouldRun('Tag the commit', { ...plan, jobFailed: true }), false);
});

test('a tag that belongs to somebody else’s pull request is named out loud', () => {
  // Two pull requests each bumped to 0.10.0, each green against its own base
  // (branch protection is `strict: false`). The other one tagged first, so
  // nothing in this push will ever be published under v0.10.0.
  const plan = runPlanStep({ published: true, tagAt: 'another-commit' });

  assert.equal(plan.status, 0, plan.log);
  assert.match(plan.log, /::warning::.*already exists and points at/);
  assert.match(plan.log, /Bump the version again/);
  assert.equal(plan.outputs.release, 'false');
});

test('the ordinary resumed release says nothing about foreign tags', () => {
  // The warning below fires when v0.10.0 points at somebody else's commit. Its
  // absence is the property with no test: make the condition unconditional and
  // every finished-the-release run tells the reader to bump the version again,
  // over a tag that is theirs and correct.
  const plan = runPlanStep({ published: false, tagAt: 'this-commit' });

  assert.equal(plan.status, 0, plan.log);
  assert.doesNotMatch(plan.log, /already exists and points at/);
  assert.doesNotMatch(plan.log, /Bump the version again/);
});

test('one npm blip does not fail a push that has nothing to do with a release', () => {
  // The plan step runs on every push to main, README included. Asking the
  // registry once and reding on `unknown` turns a five-second npm wobble into a
  // failed build of an unrelated change. The publish step already retries three
  // times; this is the same patience at the front.
  const plan = runPlanStep({ registryAnswers: ['unreachable', 'unreachable', 'unpublished'], tagAt: null });

  assert.equal(plan.status, 0, plan.log);
  assert.equal(plan.outputs.release, 'true');
  assert.equal(plan.npmCalls, 3, 'the registry has to be asked again, not once');
});

test('a registry that stays unreachable still stops the job', () => {
  const plan = runPlanStep({ published: 'unreachable', tagAt: null });

  assert.equal(plan.status, 1, `expected the step to fail, log:\n${plan.log}`);
  assert.ok(plan.npmCalls > 1, `expected more than one attempt, got ${plan.npmCalls}`);
});

test('a warning that cannot be printed is not a reason to fail the release', () => {
  // The `git ls-remote | awk` below exists to read which commit an existing tag
  // points at, and its only consumer is a `::warning::`. Under `set -euo
  // pipefail` a transient failure there reds the run — before anything has been
  // tagged, over a line nobody would have read.
  const plan = runPlanStep({ published: false, tagAt: 'this-commit', breakPeelLookup: true });

  assert.equal(plan.status, 0, `a failed warning lookup must not fail the step, log:\n${plan.log}`);
  assert.equal(plan.outputs.release, 'true');
  assert.equal(plan.outputs.tag_exists, 'true');
});

test('a tag whose Release never got made is cleaned up even though the job has failed', () => {
  // The other rollback assertion expects `false`, and got it whether or not
  // `always()` was there — the implicit `success()` answers false on a failed
  // job all by itself. Delete `always()` and nothing noticed. This is the case
  // that needs it: the Release step failed, so the job has failed, so every
  // ordinary `if:` is already false, and the tag would be left behind.
  assert.equal(
    wouldRun('Undo the tag if the Release never got made', {
      outputs: { release: 'true', tag_exists: 'false' },
      outcomes: { tag: 'success', release: 'failure' },
      jobFailed: true,
    }),
    true,
    'the rollback has to run on a failed job — that is the only time there is anything to roll back',
  );

  // …and a cancellation, which `failure()` would miss and `!cancelled()` would
  // exclude on purpose. Same shape: the job did not succeed, the tag is there.
  assert.equal(
    wouldRun('Undo the tag if the Release never got made', {
      outputs: { release: 'true', tag_exists: 'false' },
      outcomes: { tag: 'success', release: 'cancelled' },
      jobFailed: true,
    }),
    true,
  );
});

test('the if: evaluator refuses a disjunction instead of quietly reading it as false', () => {
  // Nothing in the job uses `||` yet. If something does, the comparison regex
  // would swallow the whole expression into one string literal and answer false
  // for every input, and a step that always runs would be tested as a step that
  // never does.
  assert.throws(
    () =>
      evaluateIf("steps.plan.outputs.release == 'true' || steps.plan.outputs.tag_exists == 'false'", {
        outputs: { release: 'true', tag_exists: 'false' },
      }),
    /\|\|/,
  );
});

test('a version that is not semver stops before anything is written', () => {
  const scratch = mkdtempSync(path.join(realpathSync(os.tmpdir()), 'apliteni-ui-semver-'));
  try {
    writeFileSync(
      path.join(scratch, 'package.json'),
      JSON.stringify({ name: '@apliteni/apliteni-ui', version: '0.10.0\ntag=vEVIL' }),
    );
    const outputFile = path.join(scratch, 'step-output');
    writeFileSync(outputFile, '');
    const run = spawnSync('bash', ['-c', step('Decide whether this push is a release').run], {
      cwd: scratch,
      encoding: 'utf8',
      env: { ...process.env, GITHUB_SHA: 'deadbeef', GITHUB_OUTPUT: outputFile },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    assert.equal(run.status, 1);
    assert.equal(readFileSync(outputFile, 'utf8'), '', 'nothing may be written before the version is trusted');
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Running the publish step for real
// ---------------------------------------------------------------------------
//
// Everything the publish step talks to is a script first on PATH: `gh`, and a
// `date`/`sleep` pair sharing one file that holds the current time. The clock
// is virtual because the step's whole job is waiting — a scenario that has to
// run out a ten-minute deadline finishes instantly, and "how long did it wait"
// becomes an assertion instead of an unmeasurable comment.

/** The stub's zero point, so run timestamps are readable in a failure message. */
const CLOCK_EPOCH = '2026-01-01T00:00:00Z';

/** `date`, over the virtual clock. Only the forms the step actually uses. */
const DATE_STUB = `#!/usr/bin/env node
'use strict';
const fs = require('fs');
const now = Number(fs.readFileSync(process.env.CLOCK_FILE, 'utf8').trim());
const BASE = Date.parse(${JSON.stringify(CLOCK_EPOCH)});
const argv = process.argv.slice(2);
if (argv.includes('+%s')) { process.stdout.write(String(now) + '\\n'); process.exit(0); }
let sec = now;
const at = argv.indexOf('-d');
if (at !== -1) {
  const m = /^(\\d+)\\s+minutes?\\s+ago$/.exec(argv[at + 1] || '');
  if (!m) { process.stderr.write('date stub: unsupported -d ' + argv[at + 1] + '\\n'); process.exit(1); }
  sec = now - Number(m[1]) * 60;
}
process.stdout.write(new Date(BASE + sec * 1000).toISOString().replace(/\\.\\d+Z$/, 'Z') + '\\n');
`;

/** `sleep`, which moves the virtual clock instead of the real one. */
const SLEEP_STUB = `#!/bin/sh
n=$(cat "$CLOCK_FILE")
echo $((n + ${'${1%%.*}'})) > "$CLOCK_FILE"
`;

/**
 * `gh`, driven by a JSON scenario.
 *
 * It answers the four calls the step makes — list runs, dispatch a workflow,
 * view a run, view/delete a Release — and hands every `--jq` program to the
 * real jq over the real field set gh would have returned, so a filter that is
 * wrong is wrong here too. Every invocation is logged, so "did it dispatch"
 * and "which run did it follow" are answerable.
 */
const GH_STUB = `#!/usr/bin/env node
'use strict';
const fs = require('fs');
const { spawnSync } = require('child_process');

const statePath = process.env.GH_STUB_STATE;
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const save = () => fs.writeFileSync(statePath, JSON.stringify(state));
const clock = () => Number(fs.readFileSync(process.env.CLOCK_FILE, 'utf8').trim());
const argv = process.argv.slice(2);
fs.appendFileSync(process.env.GH_STUB_LOG, JSON.stringify(argv) + '\\n');

const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const BASE = Date.parse(${JSON.stringify(CLOCK_EPOCH)});
const iso = (sec) => new Date(BASE + sec * 1000).toISOString().replace(/\\.\\d+Z$/, 'Z');

// Anything can be told to fail, for a set number of calls or for ever.
function maybeFail(key) {
  const f = (state.failures || {})[key];
  if (!f) return;
  if (f.times !== undefined) {
    if (f.times <= 0) return;
    f.times -= 1;
    save();
  }
  process.stderr.write(f.stderr === undefined ? 'gh: something went wrong\\n' : f.stderr);
  process.exit(f.exit === undefined ? 1 : f.exit);
}

// …and anything can be told to be chatty on stderr while succeeding. A version
// notice is the ordinary one.
function chatter(key) {
  const w = (state.warnings || {})[key];
  if (w) process.stderr.write(w);
}

function statusOf(run) {
  const t = clock();
  let entry = run.timeline[0];
  for (const e of run.timeline) if (e.at <= t) entry = e;
  return entry;
}

function render(value, jq) {
  const json = JSON.stringify(value);
  if (!jq) { process.stdout.write(json + '\\n'); return; }
  const res = spawnSync('jq', ['-r', jq], { input: json, encoding: 'utf8' });
  if (res.status !== 0) { process.stderr.write(res.stderr || 'jq failed\\n'); process.exit(1); }
  process.stdout.write(res.stdout);
}

const pick = (obj, fields) => Object.fromEntries(fields.map((f) => [f, obj[f]]));
const fieldsAsked = () => (flag('--json') || '').split(',').filter(Boolean);

const [cmd, sub] = argv;

if (cmd === 'run' && sub === 'list') {
  maybeFail('runList');
  chatter('runList');
  const t = clock();
  const event = flag('--event');
  const rows = state.runs
    .filter((r) => r.visibleAt <= t)
    .filter((r) => !event || r.event === event)
    .map((r) => {
      const s = statusOf(r);
      return {
        databaseId: r.id,
        createdAt: iso(r.createdAt),
        headBranch: r.tag,
        status: s.status,
        conclusion: s.conclusion === undefined ? null : s.conclusion,
        event: r.event,
        url: 'https://github.test/runs/' + r.id,
      };
    })
    .sort((a, b) => b.databaseId - a.databaseId);
  render(rows.map((r) => pick(r, fieldsAsked())), flag('--jq'));
  process.exit(0);
}

if (cmd === 'run' && sub === 'view') {
  maybeFail('runView');
  chatter('runView');
  const run = state.runs.find((r) => String(r.id) === String(argv[2]));
  if (!run) {
    process.stderr.write('could not find any workflow run with ID ' + argv[2] + '\\n');
    process.exit(1);
  }
  const s = statusOf(run);
  const full = {
    databaseId: run.id,
    status: s.status,
    conclusion: s.conclusion === undefined ? null : s.conclusion,
    url: 'https://github.test/runs/' + run.id,
  };
  render(pick(full, fieldsAsked()), flag('--jq'));
  process.exit(0);
}

if (cmd === 'workflow' && sub === 'run') {
  maybeFail('workflowRun');
  const t = clock();
  const spec = state.dispatch || {};
  if (spec.creates !== false) {
    const id = state.runs.reduce((max, r) => Math.max(max, r.id), 0) + 1;
    state.runs.push({
      id,
      tag: flag('--ref'),
      event: 'workflow_dispatch',
      createdAt: t,
      visibleAt: t + (spec.appearAfter || 0),
      timeline: (spec.timeline || [{ at: 0, status: 'completed', conclusion: 'success' }])
        .map((e) => ({ ...e, at: t + e.at })),
    });
    save();
  }
  process.exit(0);
}

if (cmd === 'release' && sub === 'view') {
  maybeFail('releaseView');
  if (state.release) process.exit(0);
  process.stderr.write('release not found\\n');
  process.exit(1);
}

if (cmd === 'release' && sub === 'delete') {
  maybeFail('releaseDelete');
  if (!state.release) {
    process.stderr.write('release not found\\n');
    process.exit(1);
  }
  state.release = false;
  save();
  process.exit(0);
}

process.stderr.write('gh stub: unknown command ' + argv.join(' ') + '\\n');
process.exit(64);
`;

/** A `git` that records what it was asked to do and does none of it. */
const GIT_STUB = `#!/bin/sh
printf '%s\\n' "$*" >> "$GIT_STUB_LOG"
exit 0
`;

const HAS_JQ = spawnSync('sh', ['-c', 'command -v jq'], { encoding: 'utf8' }).status === 0;
const needsJq = HAS_JQ ? {} : { skip: 'jq is not installed — the gh stub hands it the workflow’s own --jq programs' };

function executable(file, contents) {
  writeFileSync(file, contents);
  chmodSync(file, 0o755);
}

/**
 * Execute the publish step's own `run:` body against a stubbed world.
 *
 * @param {object} world
 * @param {Array} [world.runs]        release.yml runs that already exist
 * @param {object} [world.dispatch]   what `gh workflow run` creates
 * @param {object} [world.failures]   per-command failures
 * @param {object} [world.warnings]   per-command stderr chatter on success
 * @param {string[]} [world.registryAnswers] what npm says, call by call
 */
function runPublishStep(world) {
  const scratch = mkdtempSync(path.join(realpathSync(os.tmpdir()), 'apliteni-ui-publish-'));
  try {
    const bin = path.join(scratch, 'bin');
    const work = path.join(scratch, 'work');
    mkdirSync(bin);
    mkdirSync(path.join(work, 'scripts'), { recursive: true });
    writeFileSync(
      path.join(work, 'package.json'),
      JSON.stringify({ name: '@apliteni/apliteni-ui', version: VERSION }, null, 2),
    );
    cpSync(path.join(root, 'scripts/registry-status.mjs'), path.join(work, 'scripts/registry-status.mjs'));

    const clockFile = path.join(scratch, 'clock');
    const startedAt = 100_000;
    writeFileSync(clockFile, `${startedAt}\n`);
    const statePath = path.join(scratch, 'gh-state.json');
    const ghLog = path.join(scratch, 'gh-log');
    writeFileSync(ghLog, '');
    writeFileSync(
      statePath,
      JSON.stringify({
        runs: (world.runs ?? []).map((r) => ({
          visibleAt: startedAt,
          event: 'workflow_dispatch',
          tag: TAG,
          ...r,
          createdAt: startedAt + (r.createdAt ?? 0),
          timeline: r.timeline.map((e) => ({ ...e, at: startedAt + e.at })),
        })),
        dispatch: world.dispatch ?? {},
        failures: world.failures ?? {},
        warnings: world.warnings ?? {},
        release: true,
      }),
    );

    executable(path.join(bin, 'gh'), GH_STUB);
    executable(path.join(bin, 'date'), DATE_STUB);
    executable(path.join(bin, 'sleep'), SLEEP_STUB);
    const npmCalls = writeNpmStub(bin, scratch, world.registryAnswers ?? ['published']);

    const run = spawnSync('bash', ['-c', step('Publish it, and wait for the answer').run], {
      cwd: work,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}${path.delimiter}${process.env.PATH}`,
        CLOCK_FILE: clockFile,
        GH_STUB_STATE: statePath,
        GH_STUB_LOG: ghLog,
        GH_TOKEN: 'stub',
        TAG,
        VERSION,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const log = `${run.stdout ?? ''}${run.stderr ?? ''}`;
    return {
      status: run.status,
      log,
      lines: log.split('\n'),
      calls: readFileSync(ghLog, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)),
      waited: Number(readFileSync(clockFile, 'utf8').trim()) - startedAt,
      npmCalls: Number(readFileSync(npmCalls, 'utf8').trim()),
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Did the step ask GitHub to start a run? */
const dispatched = (result) => result.calls.some((c) => c[0] === 'workflow' && c[1] === 'run');

/** Execute the rollback step's `run:` body, with gh and git both stubbed. */
function runRollbackStep({ release = true, failures = {} } = {}) {
  const scratch = mkdtempSync(path.join(realpathSync(os.tmpdir()), 'apliteni-ui-rollback-'));
  try {
    const bin = path.join(scratch, 'bin');
    mkdirSync(bin);
    const statePath = path.join(scratch, 'gh-state.json');
    const ghLog = path.join(scratch, 'gh-log');
    const gitLog = path.join(scratch, 'git-log');
    const clockFile = path.join(scratch, 'clock');
    writeFileSync(ghLog, '');
    writeFileSync(gitLog, '');
    writeFileSync(clockFile, '0\n');
    writeFileSync(statePath, JSON.stringify({ runs: [], release, failures, warnings: {} }));
    executable(path.join(bin, 'gh'), GH_STUB);
    executable(path.join(bin, 'git'), GIT_STUB);

    const run = spawnSync('bash', ['-c', step('Undo the tag if the Release never got made').run], {
      cwd: scratch,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}${path.delimiter}${process.env.PATH}`,
        CLOCK_FILE: clockFile,
        GH_STUB_STATE: statePath,
        GH_STUB_LOG: ghLog,
        GIT_STUB_LOG: gitLog,
        GH_TOKEN: 'stub',
        TAG,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    return {
      status: run.status,
      log: `${run.stdout ?? ''}${run.stderr ?? ''}`,
      gitCalls: readFileSync(gitLog, 'utf8').split('\n').filter(Boolean),
      releaseLeft: JSON.parse(readFileSync(statePath, 'utf8')).release,
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------

test('a run already in flight is followed, not duplicated', needsJq, () => {
  const result = runPublishStep({
    runs: [{ id: 100, timeline: [{ at: 0, status: 'in_progress' }, { at: 30, status: 'completed', conclusion: 'success' }] }],
  });

  assert.equal(result.status, 0, result.log);
  assert.equal(dispatched(result), false, 'a second dispatch queues a second publish behind the same approval');
  assert.match(result.log, /already in flight \(run 100\)/);
});

test('a run held at a status this job has never heard of is still in flight', needsJq, () => {
  // The list of in-flight statuses used to be enumerated, and `action_required`
  // was not in it. Anything GitHub has not called `completed` is a run that has
  // not finished, and dispatching alongside it is the duplicate this avoids.
  const result = runPublishStep({
    runs: [{ id: 100, timeline: [{ at: 0, status: 'action_required' }, { at: 30, status: 'completed', conclusion: 'success' }] }],
  });

  assert.equal(result.status, 0, result.log);
  assert.equal(dispatched(result), false);
  assert.match(result.log, /already in flight \(run 100\)/);
});

test('the run that failed a minute ago is not the run this push just started', needsJq, () => {
  // MUST FIX. The dispatch lookup matched on "this tag, created since two
  // minutes ago" and nothing else, so a run that failed seconds before this job
  // began matched — while the freshly dispatched one had not reached the API
  // yet. The step then read `completed/failure` off a corpse and told a human to
  // fix the cause, with the real publish still building.
  const result = runPublishStep({
    runs: [{ id: 100, createdAt: -30, timeline: [{ at: 0, status: 'completed', conclusion: 'failure' }] }],
    dispatch: {
      appearAfter: 20,
      timeline: [{ at: 0, status: 'queued' }, { at: 60, status: 'in_progress' }, { at: 120, status: 'completed', conclusion: 'success' }],
    },
  });

  assert.equal(result.status, 0, result.log);
  assert.equal(dispatched(result), true, 'a finished run is not in flight, so this one has to be dispatched');
  assert.match(result.log, /Following run 101/);
  assert.doesNotMatch(result.log, /run 100/, 'the failed run must not be mistaken for the one just started');
});

test('a chatty gh is not a run id', needsJq, () => {
  // MUST FIX. `2>&1` folded gh's stderr into the value channel, so one version
  // notice became the run id: the step decided a run was already in flight,
  // skipped the dispatch, failed three lookups on the notice text and exited 1
  // — on every push, so the release never started at all.
  const notice = 'gh: A new release of gh is available: 2.62.0 → 2.63.0\n';
  const result = runPublishStep({
    warnings: { runList: notice, runView: notice },
    dispatch: { timeline: [{ at: 0, status: 'completed', conclusion: 'success' }] },
  });

  assert.equal(result.status, 0, result.log);
  assert.equal(dispatched(result), true, 'nothing was in flight — a warning is not a run');
  assert.match(result.log, /Following run 1\b/);
});

test('a publish nobody has approved says so and stops, rather than holding the runner', needsJq, () => {
  // MUST FIX. Seventeen minutes of waiting on a run that needs one of four
  // reviewers, with `concurrency: tag-on-bump` queueing every push to main
  // behind it, and an approval that can be thirty days coming. Poll briefly for
  // an approval that has already happened; past that, say who has to click what.
  const result = runPublishStep({ dispatch: { timeline: [{ at: 0, status: 'waiting' }] } });

  assert.equal(result.status, 1, result.log);
  assert.match(result.log, /approve/i);
  assert.ok(result.waited < 180, `held the runner for ${result.waited}s of virtual time`);
});

test('a run approved late is reported as what it is now, not as what it was', needsJq, () => {
  // MUST FIX. The waiting flag was sticky, so a run approved at minute one and
  // building ever since still printed "approve it at $url". The reader clicks
  // through and finds nothing to approve — which is the exact confusion that
  // replacing `gh run watch` was meant to end, only backwards.
  const result = runPublishStep({
    dispatch: { timeline: [{ at: 0, status: 'waiting' }, { at: 30, status: 'in_progress' }] },
  });

  assert.equal(result.status, 1, result.log);
  assert.match(result.log, /still in_progress/);
  assert.doesNotMatch(result.log, /approve/i);
});

test('every wait is well inside the job’s own ceiling', needsJq, () => {
  // `timeout-minutes: 30` has to be the backstop for a hung `gh`, not the thing
  // that stops an ordinary run: a job the runner kills prints none of the
  // annotations below it, which is the "red with no message" this rewrite
  // existed to remove. The longest path is a run that never finishes.
  const result = runPublishStep({
    dispatch: { appearAfter: 60, timeline: [{ at: 0, status: 'in_progress' }] },
  });

  assert.equal(result.status, 1, result.log);
  assert.ok(result.waited < 20 * 60, `waited ${result.waited}s, which leaves no room under timeout-minutes: 30`);
});

test('a lookup that keeps failing says so, with every line of what gh said', needsJq, () => {
  // A workflow command is one line. gh's errors are not, and interpolating one
  // raw truncates the annotation at the first newline — losing exactly the part
  // that says what went wrong.
  const result = runPublishStep({
    failures: { runList: { exit: 1, stderr: 'HTTP 403: rate limit\nX-RateLimit-Reset: 1700000000\ntry again later\n' } },
  });

  assert.equal(result.status, 1, result.log);
  const annotation = result.lines.find((l) => l.startsWith('::error::'));
  assert.ok(annotation, `no ::error:: annotation in:\n${result.log}`);
  assert.match(annotation, /%0A/);
  assert.ok(
    annotation.includes('HTTP 403: rate limit') && annotation.includes('try again later'),
    `the last line of gh's error did not survive into the annotation:\n${annotation}`,
  );
});

test('a version npm has not caught up with yet is waited for, not declared missing', needsJq, () => {
  const result = runPublishStep({
    dispatch: { timeline: [{ at: 0, status: 'completed', conclusion: 'success' }] },
    registryAnswers: ['unpublished', 'unpublished', 'published'],
  });

  assert.equal(result.status, 0, result.log);
  assert.equal(result.npmCalls, 3);
  assert.match(result.log, /is on npm/);
});

test('a successful run whose version never appears blames propagation before it blames the publish', needsJq, () => {
  // Twenty seconds against npm's read-after-write lag, and a message telling a
  // person to freeze releases over it. The lag can run to minutes; the freeze
  // is the expensive thing to be wrong about.
  const result = runPublishStep({
    dispatch: { timeline: [{ at: 0, status: 'completed', conclusion: 'success' }] },
    registryAnswers: ['unpublished'],
  });

  assert.equal(result.status, 1, result.log);
  assert.ok(result.waited >= 120, `only waited ${result.waited}s for the registry to catch up`);
  assert.match(result.log, /propagat|read-after-write|not yet readable/i);
  assert.doesNotMatch(result.log, /Do not bump past this version/);
});

test('a failed publish is reported as a failed publish', needsJq, () => {
  const result = runPublishStep({
    dispatch: { timeline: [{ at: 0, status: 'completed', conclusion: 'failure' }] },
  });

  assert.equal(result.status, 1, result.log);
  assert.match(result.log, /finished failure/);
  assert.match(result.log, /left alone/);
});

// ---------------------------------------------------------------------------

test('a Release that cannot be deleted does not get its tag deleted out from under it', needsJq, () => {
  // `delete || git push :tag` read every delete failure as "there was no
  // Release". A 5xx then removed the tag and left the Release pointing at a ref
  // that no longer exists — and the next attempt's `gh release view` finds that
  // orphan, skips creating one, and keeps notes written for another commit.
  const result = runRollbackStep({ release: true, failures: { releaseDelete: { exit: 1, stderr: 'HTTP 502\n' } } });

  assert.notEqual(result.status, 0, `the step has to fail loudly, log:\n${result.log}`);
  assert.deepEqual(result.gitCalls, [], 'the tag must not be deleted when the Release could not be');
});

test('a tag with no Release behind it is simply removed', needsJq, () => {
  const result = runRollbackStep({ release: false });

  assert.equal(result.status, 0, result.log);
  assert.deepEqual(result.gitCalls, [`push origin :refs/tags/${TAG}`]);
});
