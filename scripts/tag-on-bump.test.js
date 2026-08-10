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

// Anything can be told to fail, for a set number of calls or for ever, and to
// start doing it only after a few calls have gone through. \`after\` is what
// picks one \`gh run list\` out of the several the publish step makes: the
// in-flight search, the watermark read and the appear loop are the same command
// with different arguments, and only their order tells them apart.
function maybeFail(key) {
  const f = (state.failures || {})[key];
  if (!f) return;
  if (f.after) {
    f.after -= 1;
    save();
    return;
  }
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
  // The step reads a run three ways — its status, its url, its conclusion —
  // and \`runView\` above fails all of them alike. \`runViewConclusion\` picks out
  // the last one, so a test about the conclusion read does not have to count
  // how many times the follow loop happened to poll first.
  if (fieldsAsked().join(',') === 'conclusion') maybeFail('runViewConclusion');
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

if (cmd === 'release' && sub === 'create') {
  maybeFail('releaseCreate');
  if (state.release) {
    process.stderr.write('HTTP 422: Validation Failed (already_exists)\\n');
    process.exit(1);
  }
  state.release = true;
  save();
  process.exit(0);
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

/**
 * What a missing jq means — which is not the same thing in both places it can
 * happen.
 *
 * Every test below this line runs the publish step or the rollback step, and
 * both of them hand the workflow's own `--jq` programs to the real jq. Without
 * it they all skip, and `node --test` exits 0 having executed none of them:
 * two dozen tests and the whole of the publish step's coverage, gone without a
 * word. On a developer machine that is a reasonable trade — the rest of the
 * suite still runs. On CI it is the coverage quietly not existing, resting on
 * an assumption about the runner image that nothing checks. `ubuntu-latest` has
 * jq today; the point is that nothing would say so if it stopped.
 */
function jqRequirement({ hasJq, ci }) {
  if (hasJq) return 'run';
  return ci ? 'fail' : 'skip';
}

const HAS_JQ = spawnSync('sh', ['-c', 'command -v jq'], { encoding: 'utf8' }).status === 0;
const JQ = jqRequirement({ hasJq: HAS_JQ, ci: Boolean(process.env.CI) });
if (JQ === 'fail') {
  throw new Error(
    'jq is not installed and CI is set. The gh stub hands the workflow’s own --jq programs to the real jq, so ' +
      'without jq every publish-step and rollback test in this file skips itself and the suite still exits 0 — ' +
      'the publish step’s entire coverage, gone silently. Install jq on the runner rather than running without it.',
  );
}
const needsJq = JQ === 'run' ? {} : { skip: 'jq is not installed — the gh stub hands it the workflow’s own --jq programs' };

test('a CI run without jq is a failure, not two dozen silent skips', () => {
  assert.equal(jqRequirement({ hasJq: true, ci: true }), 'run');
  assert.equal(jqRequirement({ hasJq: true, ci: false }), 'run');
  assert.equal(
    jqRequirement({ hasJq: false, ci: true }),
    'fail',
    'skipping the publish step’s whole test suite on CI is the coverage silently not existing',
  );
  assert.equal(
    jqRequirement({ hasJq: false, ci: false }),
    'skip',
    'a developer without jq should still get the rest of the suite',
  );
});

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

/**
 * Execute the Release step's own `run:` body against the same stubbed `gh`.
 *
 * The step reads `release-notes.md` through `--notes-file`, so the scratch
 * directory it runs in gets one — the stub never opens it, but a real gh would,
 * and a harness that only works because nothing looks is a harness that stops
 * working the moment something does.
 *
 * @param {{release?: boolean, failures?: object}} world
 */
function runReleaseStep({ release = false, failures = {} } = {}) {
  const scratch = mkdtempSync(path.join(realpathSync(os.tmpdir()), 'apliteni-ui-release-'));
  try {
    const bin = path.join(scratch, 'bin');
    mkdirSync(bin);
    const statePath = path.join(scratch, 'gh-state.json');
    const ghLog = path.join(scratch, 'gh-log');
    const clockFile = path.join(scratch, 'clock');
    writeFileSync(ghLog, '');
    writeFileSync(clockFile, '0\n');
    writeFileSync(path.join(scratch, 'release-notes.md'), `## ${TAG}\n\nwhat changed\n`);
    writeFileSync(statePath, JSON.stringify({ runs: [], release, failures, warnings: {} }));
    executable(path.join(bin, 'gh'), GH_STUB);

    const run = spawnSync('bash', ['-c', step('Cut the Release').run], {
      cwd: scratch,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}${path.delimiter}${process.env.PATH}`,
        CLOCK_FILE: clockFile,
        GH_STUB_STATE: statePath,
        GH_STUB_LOG: ghLog,
        GH_TOKEN: 'stub',
        TAG,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    return {
      status: run.status,
      log: `${run.stdout ?? ''}${run.stderr ?? ''}`,
      calls: readFileSync(ghLog, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)),
      releaseNow: JSON.parse(readFileSync(statePath, 'utf8')).release,
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Did the step ask GitHub to cut a Release? */
const created = (result) => result.calls.filter((c) => c[0] === 'release' && c[1] === 'create');

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
  // Seventeen minutes of waiting on a run that needs one of four reviewers,
  // with `concurrency: tag-on-bump` queueing every push to main behind it, and
  // an approval that can be thirty days coming. So the runner is still not
  // held — that half of this test has not moved.
  //
  // What has moved is the verdict. A run held at its approval used to be red,
  // and 0.9.1's release proved what that costs: the publish was approved 35
  // minutes later and succeeded, the version is on npm, and the job that
  // started it is red for ever over a human who took longer than sixty seconds
  // to click. This job's responsibility is that a release is started and not
  // silently lost, and at this point it has discharged all of it — the tag, the
  // Release and the dispatch are correct and the publish is queued behind a
  // person. So it says where to go and click, names version-drift.yml as the
  // thing that notices if nobody ever does, and exits 0.
  const result = runPublishStep({ dispatch: { timeline: [{ at: 0, status: 'waiting' }] } });

  assert.equal(result.status, 0, result.log);
  assert.match(result.log, /::warning::/, 'a queued approval is a warning — not a notice, and not an error');
  assert.doesNotMatch(result.log, /::error::/, 'nothing here is broken, so nothing here is an error');
  assert.match(result.log, /approve/i, 'the reader has to be told what the run is waiting for');
  assert.match(result.log, /npm-publish/, '…and which environment they are approving');
  assert.match(result.log, /https:\/\/github\.test\/runs\/\d+/, '…and where to go and do it');
  assert.match(result.log, /is not on npm yet/, 'green must not be read as published');
  assert.match(result.log, /version-drift/, 'the backstop for an approval that never comes has to be named');
  assert.doesNotMatch(
    result.log,
    /re-run|run this job again|dispatch(ing)? again|push to main again/i,
    'telling a reader to start it over is how one release becomes two',
  );
  assert.ok(result.waited < 180, `held the runner for ${result.waited}s of virtual time`);
});

test('a run that is still building is reported as still building, not as an approval', needsJq, () => {
  // The other half of the guarantee the sticky-waiting flag used to break: what
  // the annotation says has to be read off the run's status now, not off a
  // memory of what it once was. A run that never reaches `waiting` and is still
  // going when the follow deadline expires is a run nobody can approve, and
  // sending its reader to click something is the exact confusion that replacing
  // `gh run watch` was meant to end, only backwards.
  const result = runPublishStep({
    dispatch: { timeline: [{ at: 0, status: 'queued' }, { at: 30, status: 'in_progress' }] },
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
  //
  // Asserted at the real number and not at a round one twice its size. The
  // sleeps here are exactly the appear wait plus the follow wait — 60s for this
  // run to become visible, then the full 600s deadline — so 660s is the answer
  // and anything else is a deadline that moved. `< 1200` let the follow
  // deadline be pushed to 1100s without a word, which is most of the job's
  // ceiling spent on one wait.
  const result = runPublishStep({
    dispatch: { appearAfter: 60, timeline: [{ at: 0, status: 'in_progress' }] },
  });

  assert.equal(result.status, 1, result.log);
  assert.ok(
    result.waited <= 700,
    `waited ${result.waited}s; the appear wait plus the follow deadline is 660s, and the room under timeout-minutes: 30 is budgeted on that`,
  );
});

test('a dispatch whose run never appears gives up at two minutes', needsJq, () => {
  // The appear deadline is the only thing standing between "GitHub accepted the
  // dispatch but the run is not in the API yet" and a job that polls until the
  // runner kills it. A killed job prints none of the annotations below, so the
  // reader gets a red tick and no sentence — which is the failure mode this
  // whole step was rewritten to remove, reached by the wait meant to avoid it.
  const result = runPublishStep({ dispatch: { creates: false } });

  assert.equal(result.status, 1, result.log);
  assert.match(result.log, /no matching run appeared within two minutes/);
  assert.ok(result.waited >= 120, `gave up after ${result.waited}s — a run can take most of two minutes to appear`);
  assert.ok(
    result.waited <= 150,
    `waited ${result.waited}s for a run to appear; the deadline says two minutes and timeout-minutes: 30 is budgeted on it`,
  );
});

test('a watermark that could not be read stops before dispatching, not after', needsJq, () => {
  // The newest run id is read *before* the dispatch, and it is the only thing
  // that tells the run this job started from every run that already existed.
  // A dispatch made without it is a dispatch whose run cannot be identified:
  // the appear loop takes the highest id it can see, and until the new run
  // reaches the API that is the one that failed thirty seconds ago. §5c then
  // reads `completed/failure` off a corpse and sends a human to fix a publish
  // that is still building.
  //
  // So a failed watermark read has to stop, and stop before anything has been
  // started. The lookup that fails here is the second `gh run list` — the
  // in-flight search above it succeeds, as it would.
  const result = runPublishStep({
    runs: [{ id: 100, createdAt: -30, timeline: [{ at: 0, status: 'completed', conclusion: 'failure' }] }],
    failures: { runList: { after: 1, times: 1, exit: 1, stderr: 'HTTP 500: internal error\nx-github-request-id: 42\n' } },
    dispatch: {
      appearAfter: 20,
      timeline: [{ at: 0, status: 'queued' }, { at: 60, status: 'completed', conclusion: 'success' }],
    },
  });

  assert.equal(result.status, 1, result.log);
  assert.equal(
    dispatched(result),
    false,
    'nothing may be dispatched when the run it starts could not be told apart from the runs that already exist',
  );
  assert.doesNotMatch(result.log, /Following run 100/, 'the run that failed a minute ago is not the run this job started');
  const annotation = result.lines.find((l) => l.startsWith('::error::'));
  assert.ok(annotation, `no ::error:: annotation in:\n${result.log}`);
  assert.match(annotation, /Nothing has been dispatched/);
  assert.match(annotation, /%0A/, 'gh said two lines and both have to survive into the annotation');
});

test('three failed lookups in a row while waiting for the run is the lookup failing, not patience', needsJq, () => {
  // The appear loop tolerates blips on purpose — that is what it is for — but
  // a token without actions:read, a malformed jq program and a rate limit all
  // fail every time, and reading those as patience burns the whole two minutes
  // and then reports that the run never appeared. Three in a row is not a blip,
  // and the difference matters to whoever reads the annotation: one says look
  // at the Actions tab, the other says fix your token.
  const result = runPublishStep({
    dispatch: { appearAfter: 40, timeline: [{ at: 0, status: 'completed', conclusion: 'success' }] },
    failures: { runList: { after: 2, exit: 1, stderr: 'HTTP 403: rate limit exceeded\nX-RateLimit-Reset: 1700000000\n' } },
  });

  assert.equal(result.status, 1, result.log);
  assert.match(result.log, /failed three times in a row/);
  assert.ok(result.waited <= 60, `waited ${result.waited}s before calling three consecutive failures what they are`);
});

test('two failed lookups in a row are the blip the appear loop exists to absorb', needsJq, () => {
  // The other side of the threshold. Tightening it to one turns every ordinary
  // 502 into a failed release.
  const result = runPublishStep({
    dispatch: { timeline: [{ at: 0, status: 'completed', conclusion: 'success' }] },
    failures: { runList: { after: 2, times: 2, exit: 1, stderr: 'HTTP 502: bad gateway\n' } },
  });

  assert.equal(result.status, 0, result.log);
  assert.match(result.log, /is on npm/);
});

test('three failed reads of the run in a row is the lookup failing, not the run being gone', needsJq, () => {
  // Same threshold, the other loop. Without it a `gh run view` that fails every
  // time spends the full ten-minute follow deadline and then reports the run as
  // "still unreadable" — which reads as a stuck publish rather than as a broken
  // lookup, and sends the reader to watch a run that may well have finished.
  const result = runPublishStep({
    runs: [{ id: 100, timeline: [{ at: 0, status: 'in_progress' }] }],
    failures: { runView: { exit: 1, stderr: 'HTTP 502: bad gateway\nx-github-request-id: 7\n' } },
  });

  assert.equal(result.status, 1, result.log);
  assert.match(result.log, /Reading release\.yml run 100 failed three times in a row/);
  assert.equal(dispatched(result), false);
  assert.ok(result.waited <= 120, `waited ${result.waited}s before calling three consecutive failures what they are`);
});

test('two failed reads of the run in a row are the blip the follow loop exists to absorb', needsJq, () => {
  const result = runPublishStep({
    runs: [
      { id: 100, timeline: [{ at: 0, status: 'in_progress' }, { at: 60, status: 'completed', conclusion: 'success' }] },
    ],
    failures: { runView: { times: 2, exit: 1, stderr: 'HTTP 502: bad gateway\n' } },
  });

  assert.equal(result.status, 0, result.log);
  assert.equal(dispatched(result), false);
  assert.match(result.log, /is on npm/);
});

test('a dispatch gh refuses is an error with a sentence, not a bare non-zero exit', needsJq, () => {
  // Every other call in this step goes through gh_capture and ends in an
  // ::error:: that says what happened. `gh workflow run` did not, so under
  // `set -euo pipefail` a refused dispatch — a revoked token, a workflow file
  // that lost its workflow_dispatch trigger, a 422 on the ref — ended the step
  // with gh's own stderr somewhere up the log and nothing at the bottom saying
  // that nothing was published.
  const result = runPublishStep({
    failures: {
      workflowRun: {
        exit: 1,
        stderr: 'HTTP 422: Workflow does not have workflow_dispatch trigger\nsee the docs for more\n',
      },
    },
  });

  assert.equal(result.status, 1, result.log);
  const annotation = result.lines.find((l) => l.startsWith('::error::'));
  assert.ok(annotation, `a refused dispatch is the one exit from this step with no sentence:\n${result.log}`);
  assert.match(annotation, /%0A/);
  assert.ok(
    annotation.includes('HTTP 422') && annotation.includes('see the docs for more'),
    `gh's reason did not survive into the annotation:\n${annotation}`,
  );
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

test('a registry that blips on the green path is asked again, not shrugged at', needsJq, () => {
  // The retries were on the branch that fails safe and missing from the branch
  // that goes green. `unpublished` got two and a half minutes of asking;
  // `unknown` — the answer that ends the job green having confirmed nothing —
  // got one attempt and a warning. One npm wobble was enough to make the whole
  // "believe the registry, not the run" check say nothing at all.
  const result = runPublishStep({
    dispatch: { timeline: [{ at: 0, status: 'completed', conclusion: 'success' }] },
    registryAnswers: ['unreachable', 'unreachable', 'published'],
  });

  assert.equal(result.status, 0, result.log);
  assert.equal(result.npmCalls, 3, 'an unknown has to be asked again — it is not an answer');
  assert.match(result.log, /is on npm/);
  assert.doesNotMatch(result.log, /could not reach the registry/, 'the registry was reached, on the third ask');
});

test('a registry unreachable for the whole wait is a warning, not a red run', needsJq, () => {
  // …and the other end of it: a registry this job cannot reach still is not a
  // release that did not happen, so the run's own answer stands and
  // version-drift.yml is the backstop. What changes is that it takes the whole
  // window to get there.
  const result = runPublishStep({
    dispatch: { timeline: [{ at: 0, status: 'completed', conclusion: 'success' }] },
    registryAnswers: ['unreachable'],
  });

  assert.equal(result.status, 0, result.log);
  assert.ok(result.npmCalls >= 6, `asked npm ${result.npmCalls} times, which is not the advertised patience`);
  assert.ok(result.waited >= 150, `gave up after ${result.waited}s of a two-and-a-half-minute budget`);
  assert.match(result.log, /::warning::/);
  assert.match(result.log, /version-drift/);
});

test('two failed reads of the conclusion in a row are absorbed like every other blip', needsJq, () => {
  // The conclusion read was a single ask with no tolerance — `|| echo ""` —
  // sitting twenty lines below two loops that deliberately absorb two
  // consecutive failures. One blip emptied `$conclusion`, which the next line
  // reads as "finished with no conclusion this job could read", and a publish
  // that succeeded reds the job that started it.
  const result = runPublishStep({
    dispatch: { timeline: [{ at: 0, status: 'completed', conclusion: 'success' }] },
    failures: { runViewConclusion: { times: 2, exit: 1, stderr: 'HTTP 502: bad gateway\n' } },
  });

  assert.equal(result.status, 0, result.log);
  assert.match(result.log, /is on npm/, 'the green path has to carry on to the registry check');
  assert.ok(result.npmCalls >= 1, 'the registry check is the point of getting here at all');
  assert.doesNotMatch(result.log, /::error::/);
});

test('three failed reads of the conclusion is the lookup failing, not a run without one', needsJq, () => {
  // The other side of the threshold, and the distinction the message has to
  // draw. "Finished with no conclusion this job could read" describes the run;
  // this is the lookup, and the run may well have published. Reporting the
  // first as the second sends a reader to debug a publish that worked.
  const result = runPublishStep({
    dispatch: { timeline: [{ at: 0, status: 'completed', conclusion: 'success' }] },
    failures: { runViewConclusion: { exit: 1, stderr: 'HTTP 403: rate limit exceeded\nX-RateLimit-Reset: 1700000000\n' } },
  });

  assert.equal(result.status, 1, result.log);
  const annotation = result.lines.find((l) => l.startsWith('::error::'));
  assert.ok(annotation, `no ::error:: annotation in:\n${result.log}`);
  assert.match(annotation, /conclusion of release\.yml run \d+ failed three times in a row/);
  assert.match(annotation, /the lookup failing rather than the run having no conclusion/);
  assert.doesNotMatch(
    annotation,
    /with no conclusion this job could read/,
    'that sentence is about the run, and this is the lookup — telling them apart is the whole fix',
  );
  assert.ok(
    annotation.includes('HTTP 403: rate limit exceeded'),
    `gh's reason did not reach the annotation:\n${annotation}`,
  );
  assert.match(annotation, /%0A/, 'gh said two lines and both have to survive into the annotation');
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

test('a Release lookup that failed is not a Release that has to be created', needsJq, () => {
  // `gh release view "$TAG" >/dev/null 2>&1 || gh release create …` is
  // character-for-character the conflation the rollback step one step below had
  // removed from it: `gh release view` exits 1 for a Release that is not there
  // and for a 502, a rate limit or a read timeout alike. So a blip fell through
  // to `create`, which then 422s on the Release that does exist — a red job over
  // a transient read, on a release that had nothing wrong with it.
  const result = runReleaseStep({
    release: true,
    failures: { releaseView: { exit: 1, stderr: 'HTTP 502: Bad gateway\nx-github-request-id: abc\n' } },
  });

  assert.equal(result.status, 1, `a lookup that failed has to fail the step, log:\n${result.log}`);
  assert.deepEqual(created(result), [], 'nothing may be created on a guess about what the lookup meant');
  const annotation = result.log.split('\n').find((l) => l.startsWith('::error::'));
  assert.ok(annotation, `no ::error:: annotation in:\n${result.log}`);
  assert.match(annotation, /cannot tell an absent Release from a lookup that failed/);
  assert.match(annotation, /[Nn]othing has been created/);
  assert.ok(annotation.includes('HTTP 502: Bad gateway'), `gh's reason did not reach the annotation:\n${annotation}`);
  assert.match(annotation, /%0A/, 'gh said two lines and both have to survive into the annotation');
});

test('a Release that genuinely is not there gets cut, with the tag verified', needsJq, () => {
  const result = runReleaseStep({ release: false });

  assert.equal(result.status, 0, result.log);
  assert.equal(created(result).length, 1, `expected exactly one create, got: ${JSON.stringify(result.calls)}`);
  assert.ok(
    created(result)[0].includes('--verify-tag'),
    `without --verify-tag gh invents a missing tag, and a lightweight one: ${JSON.stringify(created(result)[0])}`,
  );
  assert.equal(result.releaseNow, true);
});

test('a Release that is already cut is left alone, which is what makes a resumed release cheap', needsJq, () => {
  const result = runReleaseStep({ release: true });

  assert.equal(result.status, 0, result.log);
  assert.deepEqual(created(result), [], 'create is not safe to retry — that is the whole reason for the view');
});

test('a Release that cannot be deleted does not get its tag deleted out from under it', needsJq, () => {
  // `delete || git push :tag` read every delete failure as "there was no
  // Release". A 5xx then removed the tag and left the Release pointing at a ref
  // that no longer exists — and the next attempt's `gh release view` finds that
  // orphan, skips creating one, and keeps notes written for another commit.
  const result = runRollbackStep({ release: true, failures: { releaseDelete: { exit: 1, stderr: 'HTTP 502\n' } } });

  assert.notEqual(result.status, 0, `the step has to fail loudly, log:\n${result.log}`);
  assert.deepEqual(result.gitCalls, [], 'the tag must not be deleted when the Release could not be');
});

test('a Release lookup that failed is not a Release that is absent', needsJq, () => {
  // The conflation moved from `delete` to `view`; it did not go away.
  // `gh release view` exits 1 for a Release that is not there and for a 502, a
  // rate limit or a read timeout alike, and reading all of those as "there was
  // no Release" deletes the tag, leaves the Release behind, and exits 0.
  //
  // That is the orphan the comment above this step says it prevents, produced
  // by the code written to prevent it and reported green. The next run finds
  // the orphaned Release, skips `create` on it, and ships a Release whose notes
  // were written for a different commit — the thing the wedge test above says
  // must never happen.
  const result = runRollbackStep({
    release: true,
    failures: { releaseView: { exit: 1, stderr: 'HTTP 502: Bad gateway\nx-github-request-id: abc\n' } },
  });

  assert.notEqual(result.status, 0, `a lookup that failed has to fail the step, log:\n${result.log}`);
  assert.deepEqual(result.gitCalls, [], 'the tag must not be deleted on a guess about what the lookup meant');
  assert.equal(result.releaseLeft, true, 'and the Release has to still be there for the next run to finish');
  const annotation = result.log.split('\n').find((l) => l.startsWith('::error::'));
  assert.ok(annotation, `no ::error:: annotation in:\n${result.log}`);
  assert.match(annotation, /%0A/, 'gh said two lines and both have to survive into the annotation');
});

test('a tag with no Release behind it is simply removed', needsJq, () => {
  const result = runRollbackStep({ release: false });

  assert.equal(result.status, 0, result.log);
  assert.deepEqual(result.gitCalls, [`push origin :refs/tags/${TAG}`]);
});
