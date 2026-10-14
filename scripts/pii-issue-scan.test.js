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
