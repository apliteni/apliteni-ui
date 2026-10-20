import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const workflow = readFileSync(new URL('../.github/workflows/pii-issue-scan.yml', import.meta.url), 'utf8');
const script = workflow.split('          script: |\n')[1]
  .split('\n')
  .map(line => line.slice(12))
  .join('\n');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function run(eventName, payload) {
  const comments = [];
  const github = { rest: { issues: { createComment: async request => comments.push(request) } } };
  const context = {
    eventName,
    payload,
    repo: { owner: 'apliteni', repo: 'apliteni-ui' },
  };
  await new AsyncFunction('context', 'github', script)(context, github);
  return comments;
}

async function runWithCommentFailure(eventName, payload) {
  const warnings = [];
  const github = { rest: { issues: { createComment: async () => {
    throw new Error('Request failed with status 403');
  } } } };
  const core = { warning: message => warnings.push(message) };
  const context = {
    eventName,
    payload,
    repo: { owner: 'apliteni', repo: 'apliteni-ui' },
  };
  await new AsyncFunction('context', 'github', 'core', script)(context, github, core);
  return warnings;
}

test('issue comments scan the comment instead of the parent issue body', async () => {
  const comments = await run('issue_comment', {
    issue: { number: 646, body: `Parent body has ${['123e4567', 'e89b', '42d3', 'a456', '426614174000'].join('-')}.` },
    comment: { body: 'This is a clean review comment too.' },
  });

  assert.equal(comments.length, 0);
});

test('warning identifies the matched pattern and its location', async () => {
  const comments = await run('issue_comment', {
    issue: { number: 646, body: 'This parent body is clean.' },
    comment: { body: `Deploy at ${['api', 'example', 'lessly', 'run'].join('.')} now.` },
  });

  assert.equal(comments.length, 1);
  assert.match(comments[0].body, /Lessly host at line 1, column 15/);
});

test('pull request reviews scan the review body', async () => {
  const comments = await run('pull_request_review', {
    pull_request: { number: 660, body: 'This pull request body is clean.' },
    review: { body: `The review mentions ${['api', 'example', 'lessly', 'run'].join('.')}.` },
  });

  assert.equal(comments.length, 1);
  assert.equal(comments[0].issue_number, 660);
});

test('pull request review comments scan the comment body', async () => {
  const comments = await run('pull_request_review_comment', {
    pull_request: { number: 660, body: 'This pull request body is clean.' },
    comment: { body: `The review comment mentions ${['api', 'example', 'lessly', 'run'].join('.')}.` },
  });

  assert.equal(comments.length, 1);
  assert.equal(comments[0].issue_number, 660);
});

test('pattern matching is case insensitive for Lessly hosts and ttl.sh tags', async () => {
  const lesslyComments = await run('issues', {
    issue: { number: 660, body: `Use ${['API', 'LESSLY', 'RUN'].join('.')}.` },
  });
  const ttlComments = await run('issues', {
    issue: { number: 660, body: `Use ${['TTL', 'SH'].join('.')}/demo.` },
  });

  assert.equal(lesslyComments.length, 1);
  assert.equal(ttlComments.length, 1);
});

test('comment failures become warnings for review events', async () => {
  const warnings = await runWithCommentFailure('pull_request_review_comment', {
    pull_request: { number: 660, body: 'This pull request body is clean.' },
    comment: { body: `The review comment mentions ${['api', 'example', 'lessly', 'run'].join('.')}.` },
  });

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /read-only GITHUB_TOKEN/);
});

for (const [name, body] of [
  ['UUID v4', ['123e4567', 'e89b', '42d3', 'a456', '426614174000'].join('-')],
  ['ttl.sh image tag', ['ttl', 'sh'].join('.') + '/demo:1h'],
  ['Lessly host', ['api', 'example', 'lessly', 'run'].join('.')],
  ['deploy-token name', ['LESSLY', 'DEPLOY', 'TOKEN'].join('_') + '=demo'],
  ['private IP', [10, 20, 30, 40].join('.')],
]) {
  test(`detects the named ${name} pattern in an issue body`, async () => {
    const comments = await run('issues', {
      issue: { number: 646, body },
    });

    assert.equal(comments.length, 1);
    assert.match(comments[0].body, new RegExp(`${name} at line 1, column \\d+`));
  });
}

const attachmentUuid = ['0a1b2c3d', '4e5f', '4a6b', '8c7d', '9e0f1a2b3c4d'].join('-');
const attachmentUrl = `https://github.com/user-attachments/assets/${attachmentUuid}`;

test('a GitHub attachment URL alone gives no warning', async () => {
  const comments = await run('issues', {
    issue: { number: 617, body: `Screenshot:\n${attachmentUrl}\n` },
  });

  assert.equal(comments.length, 0);
});

test('a bare UUID next to an attachment URL still warns at its own line and column', async () => {
  const bare = ['123e4567', 'e89b', '42d3', 'a456', '426614174000'].join('-');
  const comments = await run('issues', {
    issue: { number: 617, body: `Shot ${attachmentUrl}\nid: ${bare}` },
  });

  assert.equal(comments.length, 1);
  assert.match(comments[0].body, /UUID v4 at line 2, column 5/);
});

test('a UUID in another URL still warns', async () => {
  const comments = await run('issues', {
    issue: { number: 617, body: `See https://example.com/assets/${attachmentUuid}` },
  });

  assert.equal(comments.length, 1);
  assert.match(comments[0].body, /UUID v4/);
});

test('an attachment URL pasted inside another URL still warns', async () => {
  const comments = await run('issues', {
    issue: { number: 617, body: `See https://example.com/?u=${attachmentUrl}` },
  });

  assert.equal(comments.length, 1);
});

test('a full 40-character commit hash gives no warning', async () => {
  const hash = 'bb52b750994b13968f0b0f05f5f29a4320ae8518';
  const comments = await run('issue_comment', {
    issue: { number: 617, body: 'clean' },
    comment: { body: `[tests] head ${hash}: pass` },
  });

  assert.equal(comments.length, 0);
});
