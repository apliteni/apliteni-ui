// Release-notes gate — the changelog entry is the release, and its absence has
// to stop the release rather than be noticed two versions later.
//
// 0.8.0 and 0.8.1 both shipped with no entry on ui.apli.tech/changelog. Nobody
// spotted it at 0.8.0, so nobody spotted it at 0.8.1 either; the page simply
// skipped from 0.7.2 to whatever came next, and the two releases that had gone
// out in between were invisible to anyone reading it. Writing the entry was a
// step in somebody's head, and steps in heads are the ones that get skipped.
//
// So the release notes are no longer written at release time — they are read
// out of site/changelog.mjs, which means an entry that does not exist cannot be
// rendered, and a release that cannot be rendered does not happen. That is the
// whole design: the gate is not an extra check bolted on next to the renderer,
// it *is* the renderer failing.
//
// `renderReleaseNotes` takes the array as an argument rather than reaching for
// the module itself, so these tests can hand it three lines of fixture and
// assert on the exact markdown. One test at the bottom runs the real array
// through it, because a pure function that is perfect on fixtures and never
// meets the shape of the actual data is a pure function that proves nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderReleaseNotes } from './release-notes.mjs';
import { RELEASES } from '../site/changelog.mjs';

/** The version this repo is at — the one a merge to `main` would release. */
const { version } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

/** Two releases, one of every type, in a deliberately unhelpful order. */
const FIXTURE = [
  {
    v: '9.9.9', date: '2026-01-02', tag: 'latest',
    changes: [
      ['fixed', 'The toast no longer outlives its own timer.', ['Callout']],
      ['added', 'A `spinner()` you can put inside a button.'],
      ['breaking', 'The `aurora()` export is gone.'],
      ['changed', 'Storybook 9 to 10.'],
      ['removed', 'The unused `.ui-hairline` utility.'],
    ],
  },
  {
    v: '9.9.8', date: '2026-01-01',
    changes: [['fixed', 'A different release entirely.']],
  },
];

test('a version with an entry renders its own changes and nobody else’s', () => {
  const notes = renderReleaseNotes(FIXTURE, '9.9.9');

  assert.match(notes, /The toast no longer outlives its own timer\./);
  assert.match(notes, /A `spinner\(\)` you can put inside a button\./);
  assert.doesNotMatch(
    notes,
    /A different release entirely/,
    'notes for 9.9.9 must not carry 9.9.8’s changes',
  );
});

test('every change reaches the output — none is dropped by the grouping', () => {
  const notes = renderReleaseNotes(FIXTURE, '9.9.9');
  const bullets = notes.split('\n').filter((l) => l.startsWith('- '));

  assert.equal(bullets.length, FIXTURE[0].changes.length);
});

test('breaking changes are set apart from added, changed and fixed', () => {
  const notes = renderReleaseNotes(FIXTURE, '9.9.9');
  const headings = notes.split('\n').filter((l) => l.startsWith('#'));

  // Distinct heading, not folded in with the rest — a breaking change read as
  // an ordinary "changed" is how someone upgrades a minor and loses a morning.
  assert.deepEqual(headings, [
    '### Breaking',
    '### Added',
    '### Changed',
    '### Fixed',
    '### Removed',
  ]);
  // And first, so it is above the fold of the release page rather than under
  // eight bullets of housekeeping.
  assert.ok(
    notes.indexOf('### Breaking') < notes.indexOf('### Added'),
    'breaking has to come first, not in changelog-entry order',
  );
  assert.match(notes, /### Breaking\n\n- The `aurora\(\)` export is gone\./);
});

test('a change naming components carries them into the bullet', () => {
  const notes = renderReleaseNotes(FIXTURE, '9.9.9');

  assert.match(notes, /\*\*Callout\*\* — The toast no longer outlives its own timer\./);
});

test('a version with no entry is an error that names the version', () => {
  assert.throws(
    () => renderReleaseNotes(FIXTURE, '1.2.3'),
    (err) => {
      assert.ok(err instanceof Error);
      // The message is what a human reads in a red job at release time, so it
      // has to say which version is missing and where to go and write it.
      assert.match(err.message, /1\.2\.3/);
      assert.match(err.message, /site\/changelog\.mjs/);
      return true;
    },
  );
});

test('an entry that exists but says nothing is an error too', () => {
  // Otherwise the gate is trivially satisfiable by an empty stub, and the
  // release goes out with a body that is the empty string.
  const hollow = [{ v: '9.9.9', date: '2026-01-02', changes: [] }];

  assert.throws(() => renderReleaseNotes(hollow, '9.9.9'), /9\.9\.9/);
});

test('a change type nobody planned for still gets rendered', () => {
  // A new tag added to the changelog months from now must not vanish from the
  // release notes silently. Unknown is a section of its own, at the end.
  const odd = [{ v: '9.9.9', date: '2026-01-02', changes: [['security', 'Rotated the key.']] }];

  const notes = renderReleaseNotes(odd, '9.9.9');
  assert.match(notes, /### Security\n\n- Rotated the key\./);
});

test('the real changelog renders for the version this repo is at', () => {
  // The version comes from package.json, not from a literal. Hardcoding it made
  // this an assertion about a frozen historical entry: from the next bump on it
  // would have gone on proving that 0.9.0 still renders while saying nothing
  // about the version actually about to be released.
  //
  // Read from the manifest it is the assertion nobody else makes — the current
  // version has a changelog entry — which is exactly the 0.8.0/0.8.1 hole,
  // caught in `npm test` rather than in a red release job after the tag.
  //
  // It doubles as the shape check the fixtures above cannot do: the real array
  // carries backticks, markdown, em dashes and component chips, and if
  // site/changelog.mjs ever changes shape this is the test that says so.
  const notes = renderReleaseNotes(RELEASES, version);

  const headings = notes.split('\n').filter((line) => line.startsWith('### '));
  const bullets = notes.split('\n').filter((line) => line.startsWith('- '));
  assert.ok(headings.length > 0, `${version} rendered no sections`);
  assert.ok(bullets.length > 0, `${version} rendered no changes`);
});
