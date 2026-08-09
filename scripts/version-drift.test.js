// Version-drift guard — the verdict has to be decidable without a network and
// without waiting a day for the clock to catch up.
//
// The failure this exists for is a silent one. `main` said 0.7.0 and npm said
// 0.6.0 and nothing anywhere said the two disagreed; the ./react subpath sat
// unpublished for a day, and later main ran thirteen commits and a changed
// export surface ahead of the registry. Both were found by a person happening
// to look.
//
// A scheduled job now looks instead, and that job is the reason this file is
// split the way it is. A check whose only exercise is "wait a day, hit the
// registry, see what happens" is the same class of thing as the bug — nobody
// runs it, so nobody knows it works. So `assessDrift` takes the three facts as
// arguments and returns a verdict, and everything that touches npm, git or the
// clock lives in the CLI half of version-drift.mjs where these tests never go.
//
// The one judgement call worth stating out loud: the threshold is exclusive. A
// bump that is exactly `thresholdHours` old is not yet drift. The job runs on a
// daily cron and "more than a day" is what we mean; an inclusive boundary would
// make the verdict depend on which side of a second the runner started on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assessDrift, readVersionChangedAt } from './version-drift.mjs';

/** An ISO instant `hours` before the fixed `now` every case below shares. */
const NOW = '2026-08-09T12:00:00Z';
const hoursAgo = (hours) => new Date(Date.parse(NOW) - hours * 3_600_000).toISOString();

/** The job's own arguments, minus whatever a case is actually varying. */
const base = { now: NOW, thresholdHours: 24 };

test('versions that agree are never drift, however old the bump is', () => {
  const fresh = assessDrift({
    ...base,
    mainVersion: '0.9.0',
    publishedVersion: '0.9.0',
    versionChangedAt: hoursAgo(0.5),
  });
  const ancient = assessDrift({
    ...base,
    mainVersion: '0.9.0',
    publishedVersion: '0.9.0',
    versionChangedAt: hoursAgo(10_000),
  });

  assert.equal(fresh.drift, false);
  assert.equal(ancient.drift, false);
  assert.equal(ancient.reason, 'in-sync');
});

test('a bump npm has not caught up with yet is not drift', () => {
  const verdict = assessDrift({
    ...base,
    mainVersion: '0.10.0',
    publishedVersion: '0.9.0',
    versionChangedAt: hoursAgo(2),
  });

  assert.equal(verdict.drift, false);
  assert.equal(verdict.reason, 'within-threshold');
  // The age still has to be reported: a run that says "not yet" needs to say
  // how far off it is, or the next run's "yes" looks like it came from nowhere.
  assert.equal(verdict.ageHours, 2);
});

test('a bump still unpublished after 30 hours is drift, and says what and for how long', () => {
  const verdict = assessDrift({
    ...base,
    mainVersion: '0.10.0',
    publishedVersion: '0.9.0',
    versionChangedAt: hoursAgo(30),
  });

  assert.equal(verdict.drift, true);
  assert.equal(verdict.reason, 'drift');
  assert.equal(verdict.mainVersion, '0.10.0');
  assert.equal(verdict.publishedVersion, '0.9.0');
  assert.equal(verdict.ageHours, 30);
  // The summary is what lands in the issue title and body, so it carries the
  // three facts a reader needs before opening anything else.
  assert.match(verdict.summary, /0\.10\.0/);
  assert.match(verdict.summary, /0\.9\.0/);
  assert.match(verdict.summary, /30/);
});

test('drift the other way round — npm ahead of main — is still drift', () => {
  const verdict = assessDrift({
    ...base,
    mainVersion: '0.9.0',
    publishedVersion: '0.10.0',
    versionChangedAt: hoursAgo(48),
  });

  assert.equal(verdict.drift, true);
  assert.match(verdict.summary, /0\.10\.0/);
});

test('a published version nobody could read is an unknown, not drift', () => {
  // npm being unreachable, or the package being unpublished, must never open an
  // issue. An outage that files a bug report every morning is worse than the
  // silence this replaces.
  for (const publishedVersion of [null, undefined, '']) {
    const verdict = assessDrift({
      ...base,
      mainVersion: '0.10.0',
      publishedVersion,
      versionChangedAt: hoursAgo(200),
    });
    assert.equal(verdict.drift, false, `published=${JSON.stringify(publishedVersion)}`);
    assert.equal(verdict.reason, 'published-version-unknown');
  }
});

test('a bump date nobody could read is an unknown, not drift', () => {
  for (const versionChangedAt of [null, '', 'not a date']) {
    const verdict = assessDrift({
      ...base,
      mainVersion: '0.10.0',
      publishedVersion: '0.9.0',
      versionChangedAt,
    });
    assert.equal(verdict.drift, false, `changedAt=${JSON.stringify(versionChangedAt)}`);
    assert.equal(verdict.reason, 'bump-date-unknown');
  }
});

test('the threshold is exclusive: exactly 24 hours old is not yet drift', () => {
  const at = assessDrift({
    ...base,
    mainVersion: '0.10.0',
    publishedVersion: '0.9.0',
    versionChangedAt: hoursAgo(24),
  });
  const justPast = assessDrift({
    ...base,
    mainVersion: '0.10.0',
    publishedVersion: '0.9.0',
    versionChangedAt: new Date(Date.parse(hoursAgo(24)) - 1000).toISOString(),
  });

  assert.equal(at.drift, false, 'exactly at the threshold must not fire');
  assert.equal(at.reason, 'within-threshold');
  assert.equal(justPast.drift, true, 'one second past the threshold must fire');
});

test('a bump dated in the future is not drift', () => {
  // Committer dates are attacker- and mistake-controlled, and a negative age
  // sailing through a `>` comparison would read as "0 hours" in the issue.
  //
  // 48 hours into the future, not five: five is inside the 24h threshold from
  // either direction, so the case would pass even if the age were taken as an
  // absolute value — which is precisely the mistake it is meant to catch.
  const verdict = assessDrift({
    ...base,
    mainVersion: '0.10.0',
    publishedVersion: '0.9.0',
    versionChangedAt: hoursAgo(-48),
  });

  assert.equal(verdict.drift, false);
  assert.equal(verdict.reason, 'within-threshold');
});

// ---------------------------------------------------------------------------
// Reading the bump date out of git — the one impure part with a sharp edge
// ---------------------------------------------------------------------------

/** A throwaway repository with two commits, the second one a version bump. */
function repoWithABump(indent) {
  const dir = mkdtempSync(path.join(realpathSync(os.tmpdir()), 'version-drift-'));
  const manifest = (version) =>
    JSON.stringify({ name: 'x', version }, null, indent) + '\n';
  const git = (...args) =>
    execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

  git('init', '-q', '.');
  writeFileSync(path.join(dir, 'package.json'), manifest('0.1.0'));
  git('add', '-A');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'first');
  writeFileSync(path.join(dir, 'package.json'), manifest('0.2.0'));
  git('add', '-A');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'bump');
  return dir;
}

test('the bump date is found however package.json happens to be indented', async () => {
  // `git log -L` takes a regex, and the pathspec used to pin the exact two
  // spaces prettier writes today. Reindent package.json — four spaces, a tab, a
  // formatter changing its default — and git exits `regexec() failed to match`,
  // the catch turns that into null, and every run from then on reports
  // `bump-date-unknown` and files nothing. Green every morning, checking
  // nothing. The whole point of this script is to end exactly that.
  for (const indent of [2, 4, '\t']) {
    const dir = repoWithABump(indent);
    try {
      const changedAt = await readVersionChangedAt(dir);
      assert.ok(
        changedAt && !Number.isNaN(Date.parse(changedAt)),
        `indent ${JSON.stringify(indent)} gave ${JSON.stringify(changedAt)}`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});
