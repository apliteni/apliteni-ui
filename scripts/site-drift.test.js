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
