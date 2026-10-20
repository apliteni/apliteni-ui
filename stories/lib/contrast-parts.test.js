// Guards the deal of the contrast walk over its part files. The entry check reads the files on
// disk, so it sees the parts that exist to run, not a part a runner skips by filter. The rejection
// tests prove each guard fails on a missing part, a repeated part and a story left out of the deal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dealProblems, dealStories, HOME_FILES, LIMITS, PART_WEIGHTS, PARTS, partProblems, shareOf,
} from './contrast-parts.js';
import { catalogueIds, storyFiles } from './contrast.js';

const stories = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const real = Object.fromEntries(readdirSync(stories)
  .filter((f) => /^contrast-(light|dark)(-\d+)?\.test\.js$/.test(f))
  .map((f) => [f, readFileSync(path.join(stories, f), 'utf8')]));

test('every theme has one entry point per part and each runs a distinct part', () => {
  assert.deepEqual(partProblems(real), []);
  assert.equal(Object.keys(real).length, 2 * PARTS);
});

test('a missing part entry point is rejected', () => {
  const { 'contrast-dark-3.test.js': _gone, ...rest } = real;
  assert.deepEqual(partProblems(rest), [
    'part entry point contrast-dark-3.test.js is missing', 'no entry point runs dark part 2']);
});

test('a repeated part is rejected', () => {
  const dup = { ...real, 'contrast-light-3.test.js': real['contrast-light-2.test.js'] };
  assert.deepEqual(partProblems(dup), [
    'light part 1 runs in more than one file: contrast-light-2.test.js, contrast-light-3.test.js',
    'no entry point runs light part 2']);
});

test('an entry point that walks the other theme or an unknown part is rejected', () => {
  const wrong = { ...real, 'contrast-dark-2.test.js': real['contrast-light-2.test.js'] };
  assert.ok(partProblems(wrong).includes('contrast-dark-2.test.js walks the light theme'));
  const extra = { ...real, 'contrast-dark-3.test.js': real['contrast-dark-3.test.js'].replace(', 2)', ', 7)') };
  assert.ok(partProblems(extra).includes('an entry point runs dark 7, but there are 3 parts'));
  assert.ok(partProblems({ ...real, 'contrast-dark.test.js': '' })
    .includes('contrast-dark.test.js must call walkPart once, and calls it 0 times'));
});

test('the deal puts every story of the catalogue in exactly one part', async () => {
  const ids = await catalogueIds();
  const dealt = dealStories(ids);
  assert.deepEqual(dealProblems(ids, dealt), []);
  assert.equal(dealt.flat().length, ids.length);
  assert.ok(ids.length > 150, `only ${ids.length} stories in the catalogue`);
  assert.deepEqual(dealStories(ids), dealt, 'the deal must not change between two calls');
  assert.deepEqual(dealStories([...ids].reverse()), dealt, 'the deal must not depend on discovery order');
  const home = new Set(HOME_FILES);
  for (const id of dealt[0]) assert.ok(home.has(id.slice(0, id.indexOf(':'))), `${id} is in part 0 but not a home file`);
  for (const part of dealt.slice(1)) {
    for (const id of part) assert.ok(!home.has(id.slice(0, id.indexOf(':'))), `${id} is a home story outside part 0`);
  }
});

test('the deal rejects a story in no part, a story in two parts and a home file that renders nothing', () => {
  const ids = ['a/One.stories.js:A', 'a/One.stories.js:B', 'b/Two.stories.js:A', 'c/Home.stories.js:A'];
  const home = ['c/Home.stories.js'];
  const dealt = dealStories(ids, 3, home);
  assert.deepEqual(dealProblems(ids, dealt, home), []);
  const lost = [dealt[0], dealt[1].slice(1), dealt[2]];
  assert.deepEqual(dealProblems(ids, lost, home), [`${dealt[1][0]} is in no part`]);
  const twice = [dealt[0], dealt[1], [...dealt[2], dealt[1][0]]];
  assert.deepEqual(dealProblems(ids, twice, home), [`${dealt[1][0]} is in parts 1, 2`]);
  assert.deepEqual(
    dealProblems(ids.slice(0, 3), dealStories(ids.slice(0, 3), 3, home), home),
    ['part 0 has no story', 'home file c/Home.stories.js renders no story']);
});

test('every home file is a story file the catalogue ships', () => {
  for (const f of HOME_FILES) assert.ok(storyFiles.includes(f), `${f} is gone from the catalogue`);
});

test('the parts\' limits add up to the whole walk\'s', () => {
  assert.equal(PART_WEIGHTS.length, PARTS);
  const shares = PART_WEIGHTS.map((_, p) => shareOf(p));
  assert.ok(Math.abs(shares.reduce((n, s) => n + s, 0) - 1) < 1e-9, 'the shares must add up to one');
  for (const [name, limit] of Object.entries(LIMITS).filter(([k]) => k !== 'missMax')) {
    const sum = shares.reduce((n, s) => n + limit * s, 0);
    assert.ok(Math.abs(sum - limit) < 1e-6, `${name}: the parts' limits add to ${sum}, not ${limit}`);
  }
});
