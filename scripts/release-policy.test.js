// These tests exercise approval decisions; GitHub environment enforcement and
// npm OIDC configuration still need the owner-run deployment smoke test.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const module = await import('./release-policy.mjs').catch(() => ({}));
const decide = async (overrides = {}) => {
  assert.equal(typeof module.releasePolicy, 'function', 'release policy must exist');
  return module.releasePolicy({
    tag: 'v1.2.0', version: '1.2.0', sha: 'a'.repeat(40), onMain: true,
    getLatest: async () => '1.1.0',
    getRuns: async () => [{ id: 7, head_sha: 'a'.repeat(40), head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success' }],
    ...overrides,
  });
};

test('approves a main tag with successful exact-commit CI and a newer version', async () => {
  assert.equal((await decide()).automatic, true);
});
for (const [name, override] of [
  ['tag outside main', { onMain: false }],
  ['tag and manifest disagree', { tag: 'v1.3.0' }],
  ['not a version tag', { tag: 'main' }],
  ['equal latest', { getLatest: async () => '1.2.0' }],
  ['older than latest', { getLatest: async () => '2.0.0' }],
  ['missing latest', { getLatest: async () => null }],
  ['malformed registry result', { getLatest: async () => 'oops' }],
  ['registry outage', { getLatest: async () => { throw new Error('offline'); } }],
  ['CI outage', { getRuns: async () => { throw new Error('offline'); } }],
  ['no CI', { getRuns: async () => [] }],
  ...['failure', 'cancelled', 'skipped', 'neutral', 'timed_out'].map(conclusion => [conclusion, { getRuns: async () => [{ id: 7, head_sha: 'a'.repeat(40), head_branch: 'main', event: 'push', status: 'completed', conclusion }] }]),
  ['CI for different commit', { getRuns: async () => [{ id: 7, head_sha: 'b'.repeat(40), head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success' }] }],
  ['PR CI is not main CI', { getRuns: async () => [{ id: 7, head_sha: 'a'.repeat(40), head_branch: 'main', event: 'pull_request', status: 'completed', conclusion: 'success' }] }],
]) test(`requires a person for ${name}`, async () => {
  assert.equal((await decide(override)).automatic, false);
});
test('a newer pending or failed run cannot borrow an old green run', async () => {
  for (const status of ['in_progress', 'completed']) {
    assert.equal((await decide({ getRuns: async () => [
      { id: 1, head_sha: 'a'.repeat(40), head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success' },
      { id: 2, head_sha: 'a'.repeat(40), head_branch: 'main', event: 'push', status, conclusion: 'failure' },
    ] })).automatic, false);
  }
});
test('both CI and Security must pass', async () => {
  assert.equal((await decide({ getRuns: async workflow => workflow === 'security.yml' ? [] : [
    { id: 7, head_sha: 'a'.repeat(40), head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success' },
  ] })).automatic, false);
});

test('missing fallback reviewers cannot silently approve an exception', () => {
  for (const environment of [{}, { protection_rules: [] }, { protection_rules: [{ type: 'required_reviewers', reviewers: [] }] }]) {
    assert.throws(() => module.requireReviewEnvironment(environment), /required reviewers/);
  }
  assert.doesNotThrow(() => module.requireReviewEnvironment({ protection_rules: [
    { type: 'required_reviewers', reviewers: [{ type: 'User', reviewer: { login: 'reviewer' } }] },
  ] }));
});

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('resolves annotated tags, proves main ancestry, and rejects output injection', () => {
  assert.equal(typeof module.readRelease, 'function');
  const cwd = mkdtempSync(join(tmpdir(), 'release-policy-'));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    git('init', '-b', 'main');
    git('config', 'user.name', 'Test');
    git('config', 'user.email', 'test@apliteni.com');
    writeFileSync(join(cwd, 'package.json'), JSON.stringify({ name: '@apliteni/apliteni-ui', version: '1.2.0' }));
    git('add', '.'); git('commit', '-m', 'fixture');
    const sha = git('rev-parse', 'HEAD');
    git('update-ref', 'refs/remotes/origin/main', sha);
    git('tag', '-a', 'v1.2.0', '-m', 'annotated');
    assert.deepEqual(module.readRelease('v1.2.0', cwd), { sha, version: '1.2.0', onMain: true });
    git('switch', '-c', 'other');
    writeFileSync(join(cwd, 'package.json'), JSON.stringify({ name: '@apliteni/apliteni-ui', version: '1.3.0' }));
    git('add', '.'); git('commit', '-m', 'outside main'); git('tag', 'v1.3.0');
    assert.equal(module.readRelease('v1.3.0', cwd).onMain, false);
    writeFileSync(join(cwd, 'package.json'), JSON.stringify({ name: '@apliteni/apliteni-ui', version: '1.4.0\nautomatic=true' }));
    git('add', '.'); git('commit', '-m', 'bad manifest'); git('tag', 'v1.4.0');
    assert.throws(() => module.readRelease('v1.4.0', cwd), /semver/);
    assert.throws(() => module.readRelease('--upload-pack=bad', cwd), /version tag/);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});

// Evaluate the actual scheduling conditions. This covers approval denial and
// skipped review dependencies, without asserting YAML spelling as behavior.
test('workflow schedules build only after policy or human approval', () => {
  const workflow = readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');
  const expression = workflow.match(/  build:\n[\s\S]*?    if: >-\n([\s\S]*?)    runs-on:/)[1].trim().replace(/^\$\{\{\s*|\s*\}\}$/g, '');
  const evaluate = new Function('needs', 'cancelled', `return (${expression});`);
  for (const [automatic, policy, review, cancelled, expected] of [
    ['true', 'success', 'skipped', false, true],
    ['false', 'success', 'success', false, true],
    ['false', 'success', 'failure', false, false],
    ['false', 'success', 'skipped', false, false],
    ['true', 'failure', 'skipped', false, false],
    ['true', 'success', 'skipped', true, false],
  ]) assert.equal(evaluate({ policy: { result: policy, outputs: { automatic } }, review: { result: review } }, () => cancelled), expected);
});

test('CI waiting is bounded and failed or unavailable CI does not delay review', async () => {
  assert.equal(typeof module.waitForCI, 'function');
  let time = 0;
  const clock = { now: () => time, sleep: async ms => { time += ms; } };
  await module.waitForCI(async () => [], clock);
  assert.equal(time, 600_000);
  for (const getRuns of [
    async () => [{ id: 1, status: 'completed', conclusion: 'failure' }],
    async () => { throw new Error('offline'); },
    async () => [{ id: 1, status: 'completed', conclusion: 'success' }],
  ]) {
    time = 0;
    await module.waitForCI(getRuns, clock);
    assert.equal(time, 0);
  }
  time = 0;
  await module.waitForCI(async () => time < 30_000 ? [] : [{ id: 1, status: 'completed', conclusion: 'success' }], clock);
  assert.equal(time, 30_000);
});
