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
// The publish step's own internals — attaching to a run already in flight
// rather than dispatching a second one, telling "waiting for approval" apart
// from "the publish broke" — are not exercised here. They need a `gh` the size
// of this file, and they only matter at all once the decision below sends the
// job into them.
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
 * Would Actions run this step?
 *
 * The implicit `success()` is the whole point: the wedge was a step declining
 * to run because of its own `if:`, on a job that was otherwise fine. A step
 * with no `if:` runs while nothing has failed; one whose expression names
 * `always()` runs regardless.
 */
function wouldRun(stepName, { outputs, outcomes = {}, jobFailed = false }) {
  const expr = step(stepName).if;
  if (expr === undefined) return !jobFailed;
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

// ---------------------------------------------------------------------------
// Running the plan step for real
// ---------------------------------------------------------------------------

const VERSION = '0.10.0';
const TAG = `v${VERSION}`;

/**
 * Execute the plan step's own `run:` body.
 *
 * Real git and a real bare remote, because `git ls-remote --exit-code` against
 * a remote is the thing being relied on and a fake would only prove the fake
 * works. npm is the one stub: the answer it gives is the input to the decision,
 * and `published` is what selects it.
 *
 * @param {{published: boolean|'unreachable', tagAt: 'this-commit'|'another-commit'|null}} world
 */
function runPlanStep({ published, tagAt }) {
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

    // The `npm` the copied registry-status.mjs will find. `--json` puts npm's
    // error object on stdout, which is what these bodies are.
    const bin = path.join(scratch, 'bin');
    mkdirSync(bin);
    const body =
      published === 'unreachable'
        ? { exit: 1, out: JSON.stringify({ error: { code: 'ENOTFOUND', summary: 'getaddrinfo ENOTFOUND' } }) }
        : published
          ? { exit: 0, out: JSON.stringify(VERSION) }
          : { exit: 1, out: JSON.stringify({ error: { code: 'E404', summary: `No match found for version ${VERSION}` } }) };
    writeFileSync(path.join(bin, 'npm'), `#!/bin/sh\ncat <<'EOF'\n${body.out}\nEOF\nexit ${body.exit}\n`);
    chmodSync(path.join(bin, 'npm'), 0o755);

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
