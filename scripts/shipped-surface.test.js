// Shipped-surface gate — a pull request that changes what the package publishes
// has to change the version too, and these tests are how that decision is
// exercised without a runner, two checkouts and four minutes of npm.
//
// The failure it exists for happened twice. The ./react subpath landed on main
// and stayed off npm. `footer()`, `success()`, `successCheck()` and
// `wireSuccess()` sat on main for weeks, exported from the entry point and
// unreachable by anyone who had actually installed the package. Both times the
// diff was reviewed, approved and merged, and nothing anywhere asked the one
// question that would have caught it: does this change what we publish, and if
// so, does it ship?
//
// Two things make that question harder than a path glob. `react/dist` is built
// and gitignored, so a React change never appears in a `git diff` of the
// published paths at all; and `react/src/**` is never published, so matching on
// "anything under react/" fires on a test file that ships nothing. So the
// subject here is the artefact — the file list npm would actually pack, and the
// contents of those files — and never the paths a commit touched.
//
// The one deliberate blind spot, and the reason it is deliberate: the `version`
// field of package.json is excluded from the comparison. package.json is inside
// the tarball, so a bump is itself a change to the shipped surface; counting it
// would mean the only fix for a red gate is a change that keeps it red. Every
// other field — `exports` and `files` especially, the two that decide what a
// consumer can reach — still counts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessShippedSurface, diffSurface, surfaceHash } from './shipped-surface.mjs';

/** A package.json whose only difference between cases is what a case varies. */
const manifest = (overrides = {}) =>
  JSON.stringify(
    {
      name: '@apliteni/apliteni-ui',
      version: '0.9.0',
      exports: { '.': './src/index.js' },
      files: ['src', '!src/**/*.test.js'],
      ...overrides,
    },
    null,
    2,
  );

/** The changelog array, in the shape site/changelog.mjs exports it. */
const RELEASES = [
  { v: '0.10.0', date: '2026-08-10', changes: [['added', 'A thing.']] },
  { v: '0.9.0', date: '2026-08-09', changes: [['fixed', 'Another thing.']] },
];

/** The arguments every case shares, minus the ones it is actually varying. */
const base = { baseVersion: '0.9.0', headVersion: '0.9.0', releases: RELEASES };

// ---------------------------------------------------------------------------
// surfaceHash — what counts as the same file
// ---------------------------------------------------------------------------

test('the same bytes hash the same and different bytes do not', () => {
  assert.equal(surfaceHash('src/index.js', 'export const a = 1;'),
    surfaceHash('src/index.js', 'export const a = 1;'));
  assert.notEqual(surfaceHash('src/index.js', 'export const a = 1;'),
    surfaceHash('src/index.js', 'export const a = 2;'));
});

test('a file is judged by its contents, not by where it sits', () => {
  // The path is an argument only so package.json can be treated specially. Two
  // different files with identical contents must hash alike, or a rename shows
  // up as a modification of something it has nothing to do with.
  assert.equal(surfaceHash('src/a.js', 'same'), surfaceHash('src/b.js', 'same'));
});

test('bumping the version alone leaves package.json’s fingerprint unchanged', () => {
  // This is the circularity trap. The bump that satisfies the gate is a change
  // to a file inside the tarball; if it counted, the gate could never go green.
  assert.equal(
    surfaceHash('package.json', manifest({ version: '0.9.0' })),
    surfaceHash('package.json', manifest({ version: '0.10.0' })),
  );
});

test('changing what package.json exports still counts, bump or no bump', () => {
  const before = surfaceHash('package.json', manifest());
  const afterExports = surfaceHash('package.json',
    manifest({ exports: { '.': './src/index.js', './motion': './src/motion.js' } }));
  const afterFiles = surfaceHash('package.json', manifest({ files: ['src', 'react/dist'] }));

  // `exports` and `files` are the two fields that decide what a consumer can
  // reach. Excluding the whole manifest rather than the one field would have
  // let both of the failures this gate exists for through untouched.
  assert.notEqual(before, afterExports);
  assert.notEqual(before, afterFiles);
});

test('a package.json that will not parse is hashed as raw bytes', () => {
  // Never silently equal. A manifest this script cannot read is a manifest
  // whose changes it cannot exclude, so it excludes nothing.
  assert.notEqual(surfaceHash('package.json', '{ not json'), surfaceHash('package.json', '{ also not json'));
  assert.equal(surfaceHash('package.json', '{ not json'), surfaceHash('package.json', '{ not json'));
});

test('a package.json with no version field is not a crash', () => {
  assert.equal(typeof surfaceHash('package.json', '{"name":"x"}'), 'string');
});

// ---------------------------------------------------------------------------
// diffSurface — added, removed, modified
// ---------------------------------------------------------------------------

test('an unchanged file list with unchanged contents is no change at all', () => {
  const diff = diffSurface({ 'a.js': 'h1', 'b.js': 'h2' }, { 'a.js': 'h1', 'b.js': 'h2' });

  assert.equal(diff.changed, false);
  assert.deepEqual(diff.added, []);
  assert.deepEqual(diff.removed, []);
  assert.deepEqual(diff.modified, []);
});

test('the three ways a surface can move are reported apart from each other', () => {
  const diff = diffSurface(
    { 'gone.js': 'h1', 'same.js': 'h2', 'edited.js': 'h3' },
    { 'same.js': 'h2', 'edited.js': 'h3-changed', 'new.js': 'h4' },
  );

  assert.equal(diff.changed, true);
  assert.deepEqual(diff.added, ['new.js']);
  assert.deepEqual(diff.removed, ['gone.js']);
  assert.deepEqual(diff.modified, ['edited.js']);
});

test('the lists come back sorted, so two runs of the same diff read alike', () => {
  const diff = diffSurface({}, { 'z.js': 'h', 'a.js': 'h', 'm.js': 'h' });

  assert.deepEqual(diff.added, ['a.js', 'm.js', 'z.js']);
});

// ---------------------------------------------------------------------------
// assessShippedSurface — the verdict
// ---------------------------------------------------------------------------

const files = { 'src/index.js': 'h1', 'package.json': 'hp' };

test('an identical tarball passes, whatever the version did', () => {
  const verdict = assessShippedSurface({ ...base, base: files, head: files });

  assert.equal(verdict.ok, true);
  assert.equal(verdict.reason, 'surface-unchanged');
});

test('a changed tarball with no version bump fails', () => {
  const verdict = assessShippedSurface({
    ...base,
    base: files,
    head: { ...files, 'src/index.js': 'h1-changed' },
  });

  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'unshipped-surface-change');
});

test('a changed tarball with a version bump passes', () => {
  const verdict = assessShippedSurface({
    ...base,
    headVersion: '0.10.0',
    base: files,
    head: { ...files, 'src/new.js': 'h9' },
  });

  assert.equal(verdict.ok, true);
  assert.equal(verdict.reason, 'released-by-bump');
});

test('the failure names every entry it would ship and every one it would not', () => {
  // The whole value of the gate is in this message. It fires on a pull request
  // written by somebody who has never read the issue behind it, so it has to
  // carry the finding, the consequence and the fix without a link.
  const verdict = assessShippedSurface({
    ...base,
    base: { 'src/index.js': 'h1', 'src/old.js': 'h2', 'react/dist/index.js': 'h3' },
    head: { 'src/index.js': 'h1-changed', 'react/dist/index.js': 'h3', 'src/new.js': 'h4' },
  });

  assert.deepEqual(verdict.added, ['src/new.js']);
  assert.deepEqual(verdict.removed, ['src/old.js']);
  assert.deepEqual(verdict.modified, ['src/index.js']);

  assert.match(verdict.report, /src\/new\.js/);
  assert.match(verdict.report, /src\/old\.js/);
  assert.match(verdict.report, /src\/index\.js/);
  // The version it is stuck at, and the two edits that clear the gate.
  assert.match(verdict.report, /0\.9\.0/);
  assert.match(verdict.report, /package\.json/);
  assert.match(verdict.report, /site\/changelog\.mjs/);
});

test('a react/dist entry says where it came from, because nobody edited it', () => {
  // The React case is the one where the message names a file the author has
  // never opened: they changed react/src/Modal.tsx and the gate reports
  // react/dist/index.js, which is gitignored build output. Without a line
  // connecting the two, the finding reads as being about a file that is not in
  // the diff — which is the same "what is this even telling me" that makes
  // people click past a red check.
  const withDist = assessShippedSurface({
    ...base,
    base: { 'react/dist/index.js': 'h1' },
    head: { 'react/dist/index.js': 'h2' },
  });
  const withoutDist = assessShippedSurface({
    ...base,
    base: { 'src/index.js': 'h1' },
    head: { 'src/index.js': 'h2' },
  });

  assert.match(withDist.report, /react\/src/);
  // And it stays out of the way of every other failure, which has nothing to
  // do with the React build.
  assert.doesNotMatch(withoutDist.report, /react\/src/);
});

test('a file that ships today and would stop is not filed under “added”', () => {
  // Added and removed read in opposite directions and the difference is the
  // difference between "new API" and "someone's import breaks".
  const verdict = assessShippedSurface({
    ...base,
    base: { 'src/gone.js': 'h1' },
    head: {},
  });

  assert.deepEqual(verdict.removed, ['src/gone.js']);
  assert.deepEqual(verdict.added, []);
  assert.match(verdict.report, /src\/gone\.js/);
});

// ---------------------------------------------------------------------------
// The changelog half of the same decision
// ---------------------------------------------------------------------------

test('a version bump with no changelog entry fails, and says which version', () => {
  // Without this the bump merges, tag-on-bump runs on main, and the release
  // fails after the version is already there — bumped, unreleased, and needing
  // a second pull request to fix. Same decision, made a few hours earlier.
  const verdict = assessShippedSurface({
    ...base,
    headVersion: '0.11.0',
    base: files,
    head: { ...files, 'src/new.js': 'h9' },
  });

  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'changelog-entry-missing');
  assert.match(verdict.report, /0\.11\.0/);
  assert.match(verdict.report, /site\/changelog\.mjs/);
});

test('a version bump is checked against the changelog even when nothing else moved', () => {
  // "Tarball identical, so pass" is the surface verdict, not the whole verdict.
  // A bump with an identical tarball still publishes a version, and a published
  // version with no entry is exactly the 0.8.0/0.8.1 hole.
  const verdict = assessShippedSurface({
    ...base,
    headVersion: '0.11.0',
    base: files,
    head: files,
  });

  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'changelog-entry-missing');
});

test('the two failures are titled apart from each other', () => {
  // The title is what lands on the Files-changed view, often as the only line
  // of this anybody reads. "Unreleased change to the published package" over a
  // missing changelog entry sends the reader to look for a surface change that
  // is not there.
  const unshipped = assessShippedSurface({
    ...base,
    base: files,
    head: { ...files, 'src/index.js': 'h1-changed' },
  });
  const undescribed = assessShippedSurface({
    ...base,
    headVersion: '0.11.0',
    base: files,
    head: files,
  });

  assert.match(unshipped.title, /publish/i);
  assert.match(undescribed.title, /changelog/i);
  assert.notEqual(unshipped.title, undescribed.title);
  // And a passing verdict claims no failure title at all.
  assert.equal(assessShippedSurface({ ...base, base: files, head: files }).title, '');
});

test('a version bump with an entry that says nothing is caught too', () => {
  const verdict = assessShippedSurface({
    ...base,
    headVersion: '0.12.0',
    releases: [{ v: '0.12.0', date: '2026-08-11', changes: [] }],
    base: files,
    head: files,
  });

  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'changelog-entry-missing');
});

test('a version bump with a changelog entry is the whole point and passes', () => {
  const verdict = assessShippedSurface({
    ...base,
    headVersion: '0.10.0',
    base: files,
    head: files,
  });

  assert.equal(verdict.ok, true);
});

test('a version going backwards is still a version change, and is still checked', () => {
  // Not a normal thing to do, but a revert of a bump is. It must not slip past
  // as "unchanged" and it must not demand a changelog entry for the version it
  // is going back to having.
  const verdict = assessShippedSurface({
    ...base,
    baseVersion: '0.10.0',
    headVersion: '0.9.0',
    base: files,
    head: files,
  });

  assert.equal(verdict.ok, true);
  assert.equal(verdict.versionChanged, true);
});

test('the passing verdicts say what they decided, not nothing', () => {
  // A gate that prints nothing when it passes is indistinguishable from a gate
  // that never ran — which is how a green tick ends up meaning less than it
  // looks like it means.
  for (const verdict of [
    assessShippedSurface({ ...base, base: files, head: files }),
    assessShippedSurface({ ...base, headVersion: '0.10.0', base: files, head: { ...files, 'x.js': 'h' } }),
  ]) {
    assert.ok(verdict.report.trim().length > 0);
  }
});

// ---------------------------------------------------------------------------
// Both halves at once, on the shape the CLI actually hands over
// ---------------------------------------------------------------------------

test('a bump and nothing else, hashed for real, is not a surface change', () => {
  // surfaceHash and assessShippedSurface are tested apart above; this is the
  // one case where their seam matters, because the bump arrives as a change to
  // a file the tarball contains.
  const before = { 'package.json': surfaceHash('package.json', manifest({ version: '0.9.0' })) };
  const after = { 'package.json': surfaceHash('package.json', manifest({ version: '0.10.0' })) };

  const verdict = assessShippedSurface({
    ...base,
    headVersion: '0.10.0',
    base: before,
    head: after,
  });

  assert.equal(verdict.ok, true);
  assert.deepEqual(verdict.modified, []);
});
