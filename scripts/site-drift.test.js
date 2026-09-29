import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessSite } from './site-drift.mjs';

const facts = {
  expectedVersion: '0.34.2',
  expectedReleases: ['0.34.2', '0.34.1', '0.34.0'],
  topbarHtml: '<span class="ver">v0.34.2</span>',
  changelogHtml: '<span class="rel__v">v0.34.2</span><span class="rel__v">v0.34.1</span><span class="rel__v">v0.34.0</span>',
};

test('matching badge and changelog are in sync', () => {
  const verdict = assessSite(facts);
  assert.equal(verdict.drift, false);
  assert.equal(verdict.reason, 'in-sync');
});

test('a stale badge is drift', () => {
  const verdict = assessSite({ ...facts, topbarHtml: '<span class="ver">v0.23.3</span>' });
  assert.equal(verdict.drift, true);
  assert.equal(verdict.reason, 'version-mismatch');
});

test('a missing or reordered release is drift', () => {
  const verdict = assessSite({
    ...facts,
    changelogHtml: '<span class="rel__v">v0.34.2</span><span class="rel__v">v0.34.0</span>',
  });
  assert.equal(verdict.drift, true);
  assert.equal(verdict.reason, 'changelog-mismatch');
});

test('an unreadable page is unknown rather than drift', () => {
  const verdict = assessSite({ ...facts, topbarHtml: '', changelogHtml: '' });
  assert.equal(verdict.drift, false);
  assert.equal(verdict.reason, 'site-unreadable');
});

// These tests cover plain server-rendered version spans, not browser layout or uptime.
test('responsive and reordered class tokens still expose the badge', () => {
  for (const className of ['ver hide-sm', 'hide-sm ver']) {
    assert.equal(assessSite({ ...facts, topbarHtml: `<span class='${className}'> v0.50.0 </span>` }).reason, 'version-mismatch');
  }
  assert.equal(assessSite({ ...facts, topbarHtml: '<span class="version">v0.34.2</span>' }).reason, 'site-unreadable');
});

test('the current site chrome exposes the badge', async () => {
  const { topbar } = await import('../site/chrome.mjs');
  assert.equal(assessSite({ ...facts, topbarHtml: topbar('').replaceAll('{{VERSION}}', 'v0.34.2') }).reason, 'in-sync');
});

test('equal-length reordered and duplicate release sequences are drift', () => {
  for (const versions of [['0.34.2', '0.34.0', '0.34.1'], ['0.34.2', '0.34.1', '0.34.1']]) {
    const changelogHtml = versions.map(v => `<span class="rel__v">v${v}</span>`).join('');
    assert.equal(assessSite({ ...facts, changelogHtml }).reason, 'changelog-mismatch');
  }
});

// Execute the workflow's actual issue step with a fake API; no GitHub writes occur.
import { readFileSync } from 'node:fs';
const workflow = readFileSync(new URL('../.github/workflows/site-drift.yml', import.meta.url), 'utf8');
const script = workflow.split('          script: |\n')[1].split('\n').map(line => line.slice(12)).join('\n');
const runIssueStep = new (Object.getPrototypeOf(async function () {}).constructor)('require', 'github', 'context', 'core', script);

async function notify(verdict, existing = [], labelError) {
  const calls = [];
  const issues = Object.fromEntries(['createLabel', 'listForRepo', 'create', 'update'].map(method => [method, async args => {
    calls.push({ method, args });
    if (method === 'createLabel' && labelError) throw labelError;
    return { data: method === 'listForRepo' ? existing : { number: 123 } };
  }]));
  const messages = [];
  const core = Object.fromEntries(['info', 'warning', 'notice'].map(level => [level, message => messages.push({ level, message })]));
  await runIssueStep(() => ({ readFileSync: () => JSON.stringify(verdict) }), { rest: { issues } }, { repo: { owner: 'example', repo: 'demo' } }, core);
  return { calls, messages };
}

test('workflow compares main, serializes runs, and has no deploy step', () => {
  assert.match(workflow, /ref: main/);
  assert.match(workflow, /group: site-drift\n  cancel-in-progress: false/);
  assert.match(workflow, /run: node scripts\/site-drift.mjs > site-drift.json/);
  assert.doesNotMatch(workflow, /contents: write|deploy:/);
});

test('drift creates one issue with readable evidence', async () => {
  const { calls } = await notify({ drift: true, summary: 'badge differs' });
  assert.deepEqual(calls.map(c => c.method), ['createLabel', 'listForRepo', 'create']);
  assert.deepEqual(calls[2].args.labels, ['site-drift']);
  assert.match(calls[2].args.body, /\n\n/);
  assert.match(calls[2].args.body, /badge differs/);
});

test('repeated drift updates the existing issue without a new issue or comment', async () => {
  const { calls } = await notify({ drift: true, summary: 'new evidence' }, [{ number: 123 }], { status: 422 });
  assert.deepEqual(calls.map(c => c.method), ['createLabel', 'listForRepo', 'update']);
  assert.equal(calls[2].args.issue_number, 123);
  assert.match(calls[2].args.body, /new evidence/);
});

test('unknown verdicts warn without filing; in-sync stays quiet', async () => {
  for (const reason of ['site-unreadable', 'site-unreachable', 'in-sync']) {
    const { calls, messages } = await notify({ drift: false, reason, summary: reason });
    assert.equal(calls.length, 0);
    assert.equal(messages.some(m => m.level === 'warning'), reason !== 'in-sync');
  }
});

test('API errors fail the workflow instead of hiding a missing issue', async () => {
  await assert.rejects(notify({ drift: true }, [], new Error('API unavailable')), /API unavailable/);
});
