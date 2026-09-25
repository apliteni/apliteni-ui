import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseTag, registryLatest } from './release-tag.mjs';

for (const [name, version, latest, tag] of [
  ['higher patch', '0.41.1', '0.41.0', 'latest'],
  ['higher minor', '0.41.0', '0.40.9', 'latest'],
  ['higher major', '1.0.0', '0.99.99', 'latest'],
  ['numeric comparison', '0.10.0', '0.9.0', 'latest'],
  ['equal', '0.41.1', '0.41.1', 'backport'],
  ['lower', '0.40.0', '0.41.1', 'backport'],
  ['prerelease below stable', '1.0.0-rc.1', '1.0.0', 'backport'],
  ['stable above prerelease', '1.0.0', '1.0.0-rc.1', 'latest'],
  ['higher prerelease core', '2.0.0-alpha', '1.0.0', 'latest'],
  ['numeric prerelease', '1.0.0-rc.10', '1.0.0-rc.2', 'latest'],
  ['numeric before text', '1.0.0-1', '1.0.0-alpha', 'backport'],
  ['longer prerelease', '1.0.0-alpha.1', '1.0.0-alpha', 'latest'],
  ['lexical prerelease', '1.0.0-beta', '1.0.0-alpha', 'latest'],
  ['build metadata ignored', '1.0.0+new', '1.0.0+old', 'backport'],
  ['no latest', '0.1.0', null, 'latest'],
]) {
  test(name, () => assert.equal(chooseTag(version, latest), tag));
}

test('malformed versions fail closed', () => {
  for (const bad of ['garbage', '1.2', '01.2.3', '1.2.3-01', '1.2.3-', '']) {
    assert.throws(() => chooseTag(bad, null), /Invalid semver/);
    assert.throws(() => chooseTag('1.2.3', bad), /Invalid semver/);
  }
});

test('registry response supplies latest or confirms its absence', () => {
  assert.equal(registryLatest({ status: 0, stdout: '"0.40.1"\n' }), '0.40.1');
  assert.equal(registryLatest({ status: 0, stdout: '' }), null);
  assert.equal(registryLatest({ status: 1, stdout: '{"error":{"code":"E404"}}' }), null);
});

test('registry failures and unexpected output never count as no latest', () => {
  for (const result of [
    { status: 1, stdout: '{"error":{"code":"E503"}}' },
    { status: 1, stdout: '' },
    { status: 0, stdout: '{}' },
    { status: 0, stdout: 'null' },
    { status: 0, stdout: 'oops' },
    { status: null, error: new Error('timeout'), stdout: '' },
  ]) assert.throws(() => registryLatest(result));
});
