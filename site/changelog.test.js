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

import { parseContributors } from './changelog.mjs';

const AUTHORS_FIXTURE = { 'artur.sabirov@apliteni.com': { handle: 'asabirov', name: 'Artur Sabirov' } };

test('parseContributors dedupes by email and resolves a known handle', () => {
  const log = 'Artur Sabirov\tartur.sabirov@apliteni.com\nArtur Sabirov\tartur.sabirov@apliteni.com';
  const people = parseContributors(log, AUTHORS_FIXTURE);
  assert.equal(people.length, 1);
  assert.equal(people[0].handle, 'asabirov');
  assert.equal(people[0].url, 'https://github.com/asabirov');
  assert.equal(people[0].avatar, 'https://github.com/asabirov.png?size=48');
});

test('parseContributors drops bot accounts', () => {
  const log = 'dependabot[bot]\t49699333+dependabot[bot]@users.noreply.github.com';
  assert.deepEqual(parseContributors(log, AUTHORS_FIXTURE), []);
});

test('parseContributors falls back to initials for unknown authors', () => {
  const [p] = parseContributors('Jane Doe\tjane@example.com', AUTHORS_FIXTURE);
  assert.equal(p.handle, null);
  assert.equal(p.url, null);
  assert.equal(p.avatar, null);
  assert.equal(p.initials, 'JD');
  assert.equal(p.name, 'Jane Doe');
});

test('parseContributors orders by commit count desc', () => {
  const log = ['Jane Doe\tjane@example.com',
               'Artur Sabirov\tartur.sabirov@apliteni.com',
               'Artur Sabirov\tartur.sabirov@apliteni.com'].join('\n');
  const people = parseContributors(log, AUTHORS_FIXTURE);
  assert.equal(people[0].handle, 'asabirov');
  assert.equal(people[1].name, 'Jane Doe');
});

test('parseContributors returns empty array for empty input', () => {
  assert.deepEqual(parseContributors('', AUTHORS_FIXTURE), []);
});

test('parseContributors tiebreak orders by the displayed (canonical) name', () => {
  const authors = { 'z@example.com': { handle: 'zh', name: 'Zach Zimmerman' } };
  const log = 'Aaron Xray\tz@example.com\nBob Yankee\tbob@example.com';
  const people = parseContributors(log, authors);
  assert.equal(people[0].name, 'Bob Yankee');   // tie at 1 commit; B before Z by displayed name
  assert.equal(people[1].name, 'Zach Zimmerman');
});
