import { test } from 'node:test';
import assert from 'node:assert/strict';
import { componentChips, isBreakingRelease, release } from './changelog.mjs';

test('componentChips links a known component to its Storybook story', () => {
  const html = componentChips(['Table']);
  assert.match(html, /class="comp" href="\/storybook\/\?path=\/story\/components-table--finance-data"/);
  assert.match(html, />Table<\/a>/);
});

test('componentChips renders an unknown component as a plain, unlinked pill', () => {
  const html = componentChips(['Shell']);
  assert.match(html, /<span class="comp plain">Shell<\/span>/);
  assert.doesNotMatch(html, /<a /);
});

test('componentChips returns empty string when there are no components', () => {
  assert.equal(componentChips(), '');
  assert.equal(componentChips([]), '');
});

test('componentChips escapes HTML in component names', () => {
  const html = componentChips(['<x>']);
  assert.match(html, /&lt;x&gt;/);
  assert.doesNotMatch(html, /<x>/);
});

test('isBreakingRelease detects a breaking change', () => {
  assert.equal(isBreakingRelease({ changes: [['fixed', 'x'], ['breaking', 'y']] }), true);
  assert.equal(isBreakingRelease({ changes: [['fixed', 'x']] }), false);
});

test('release shows a Breaking header badge and tag when any change is breaking', () => {
  const html = release({ v: '9.9.9', date: '2026-01-01', changes: [['breaking', 'Renamed a prop.', ['Table']]] });
  assert.match(html, /ui-badge--breaking/);
  assert.match(html, /tag tag--breaking/);
  assert.match(html, />Breaking<\/span>/);
});

test('release omits the Breaking badge when nothing is breaking', () => {
  const html = release({ v: '9.9.9', date: '2026-01-01', changes: [['fixed', 'x']] });
  assert.doesNotMatch(html, /ui-badge--breaking/);
});
