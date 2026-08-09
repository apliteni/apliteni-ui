#!/usr/bin/env node
/**
 * version-drift — say out loud when `main`'s version and the version on npm
 * have disagreed for long enough to be a mistake rather than a gap.
 *
 * Nothing used to say it. The ./react subpath sat on main unpublished for a
 * day with no signal; later main ran thirteen commits and one changed export
 * surface ahead of the registry, again with no signal. Both were noticed by a
 * person happening to look at two numbers side by side.
 *
 * A gap on its own is not a fault — a version bump lands on main minutes before
 * the tag that publishes it, and for those minutes the two numbers differ
 * exactly as they should. What makes it a fault is time. So the verdict is a
 * function of the gap *and* its age, and the default age is a day.
 *
 * The file is deliberately in two halves. `assessDrift` is pure: it takes the
 * three facts and returns a verdict, with no registry, no git and no clock
 * inside it, so the whole decision is testable in milliseconds without a
 * network. Everything that reaches out to the world lives below the
 * `import.meta.url` check, runs only when the file is executed directly, and
 * has no judgement in it beyond "here is what I found, or here is why I found
 * nothing".
 *
 * Usage: node scripts/version-drift.mjs [--threshold-hours N]
 *
 * Prints one JSON object (the verdict, for a workflow to read) and one human
 * line to stderr. Exit 0 always, drift or not — the caller decides what a
 * verdict means, and a non-zero exit would make a red run out of a report.
 */

import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const HOUR_MS = 3_600_000;

/** How long a disagreement may persist before it counts as drift. */
export const DEFAULT_THRESHOLD_HOURS = 24;

/**
 * Decide whether two versions disagreeing amounts to drift worth reporting.
 *
 * Pure by design — every fact arrives as an argument, including `now`. Returns
 * a verdict object rather than a boolean so the caller can print why it decided
 * what it decided; a job that only ever says "no" is indistinguishable from a
 * job that is broken.
 *
 * @param {object} facts
 * @param {string} facts.mainVersion       version field of package.json on main
 * @param {string|null|undefined} facts.publishedVersion  what npm reports, or a
 *   falsy value when npm could not be reached or the package is unpublished
 * @param {string|null|undefined} facts.versionChangedAt  ISO instant the version
 *   field last changed, or a falsy/unparseable value when it could not be found
 * @param {string|number|Date} facts.now
 * @param {number} [facts.thresholdHours]
 * @returns {{drift: boolean, reason: string, mainVersion: string,
 *   publishedVersion: string|null, ageHours: number|null,
 *   thresholdHours: number, summary: string}}
 */
export function assessDrift({
  mainVersion,
  publishedVersion,
  versionChangedAt,
  now,
  thresholdHours = DEFAULT_THRESHOLD_HOURS,
}) {
  const verdict = {
    drift: false,
    reason: 'in-sync',
    mainVersion,
    publishedVersion: publishedVersion || null,
    ageHours: null,
    thresholdHours,
    summary: '',
  };

  // An unknown is not a disagreement. npm being down, rate-limiting, or the
  // package not existing yet must all stay silent: a registry outage that files
  // a bug report every morning is worse than the silence this replaces.
  if (!publishedVersion) {
    verdict.reason = 'published-version-unknown';
    verdict.summary =
      `main is ${mainVersion}; the published version could not be read, so nothing is claimed.`;
    return verdict;
  }

  if (mainVersion === publishedVersion) {
    verdict.summary = `main and npm both say ${mainVersion}.`;
    return verdict;
  }

  const changedAtMs = Date.parse(
    versionChangedAt instanceof Date ? versionChangedAt.toISOString() : versionChangedAt || '',
  );
  if (Number.isNaN(changedAtMs)) {
    // Without a date there is no age, and without an age the whole "long enough
    // to be a mistake" judgement is missing. Report the gap, claim nothing.
    verdict.reason = 'bump-date-unknown';
    verdict.summary =
      `main is ${mainVersion} and npm is ${publishedVersion}, but the date the version ` +
      `last changed could not be read, so the age of the gap is unknown.`;
    return verdict;
  }

  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));
  const exactAgeHours = (nowMs - changedAtMs) / HOUR_MS;
  // Two decimals for anyone reading it — an unrounded 29.983333333 in an issue
  // title invites a shrug. The comparison below deliberately uses the unrounded
  // value: rounding first makes a bump one second past a 24h threshold round
  // back down to 24.0 and sail through as "within threshold", which is a
  // 36-minute blind spot either side of every threshold this is run with.
  const ageHours = Math.round(exactAgeHours * 100) / 100;
  verdict.ageHours = ageHours;

  // A committer date is whatever the committing machine's clock said, so a
  // future date is entirely possible. Treating a negative age as "older than
  // the threshold" would be wrong in the loud direction; treat it as young.
  if (exactAgeHours <= thresholdHours) {
    verdict.reason = 'within-threshold';
    verdict.summary =
      `main is ${mainVersion} and npm is ${publishedVersion}, but the bump is only ` +
      `${ageHours}h old (threshold ${thresholdHours}h) — a release in flight looks like this.`;
    return verdict;
  }

  verdict.drift = true;
  verdict.reason = 'drift';
  verdict.summary =
    `main is ${mainVersion} but npm still serves ${publishedVersion}, and has done for ` +
    `${ageHours}h (threshold ${thresholdHours}h).`;
  return verdict;
}

// ---------------------------------------------------------------------------
// Below here: the half that talks to the world. Nothing above imports any of it.
// ---------------------------------------------------------------------------

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The version this repo believes it is at. */
async function readMainVersion() {
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  return { name: pkg.name, version: pkg.version };
}

/**
 * What the registry serves, or null.
 *
 * `npm view` exits non-zero both when the package does not exist and when the
 * network is gone, and it writes config warnings to stderr on a perfectly good
 * run — so the answer is stdout, and any failure at all collapses to null. The
 * caller treats null as an unknown, never as a version.
 */
async function readPublishedVersion(name) {
  try {
    const { stdout } = await execFileAsync('npm', ['view', name, 'version'], {
      encoding: 'utf8',
      timeout: 60_000,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/**
 * The committer date of the last commit that changed the version field.
 *
 * `git log -L` traces one line's history and follows it as the file is edited
 * around it, which is exactly the question being asked. The two obvious
 * alternatives both mislead:
 *
 *   -S'"version":'  is the pickaxe, and it matches on the *count* of a string,
 *                   not its content. A bump leaves the count at one, so this
 *                   silently skips every release and answers with whichever
 *                   ancient commit last added or removed the line. On this
 *                   repo it returns b39ed24 (July 20) instead of 05b0e0d.
 *   -G'\s*"version"' is a regex over the diff, but git's default engine is
 *                   POSIX, where `\s` matches nothing at all — it returns no
 *                   commits and reads as "the version has never changed".
 *
 * Needs full history, and degrades silently without it. In a shallow clone the
 * boundary commit looks parentless, so the version line appears to have been
 * introduced there and this returns the boundary's date with exit 0 — a bump
 * that is always minutes old and therefore never drift. Hence fetch-depth: 0 in
 * the workflow.
 */
async function readVersionChangedAt() {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['log', '-1', '--format=%cI', '--no-patch', '-L', '/^  "version":/,+1:package.json'],
      { cwd: root, encoding: 'utf8', timeout: 60_000 },
    );
    return stdout.trim().split('\n')[0] || null;
  } catch {
    return null;
  }
}

async function main(argv) {
  const flag = argv.indexOf('--threshold-hours');
  const parsed = flag === -1 ? NaN : Number(argv[flag + 1]);
  const thresholdHours = Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_THRESHOLD_HOURS;

  const { name, version: mainVersion } = await readMainVersion();
  const [publishedVersion, versionChangedAt] = await Promise.all([
    readPublishedVersion(name),
    readVersionChangedAt(),
  ]);

  const verdict = assessDrift({
    mainVersion,
    publishedVersion,
    versionChangedAt,
    now: new Date(),
    thresholdHours,
  });

  // stdout is the machine's copy and holds nothing else, so a workflow can pipe
  // it straight into a parser. The sentence for a human goes to stderr, where it
  // shows up in the run log without corrupting that.
  process.stdout.write(`${JSON.stringify({ ...verdict, name, versionChangedAt })}\n`);
  process.stderr.write(`${verdict.summary}\n`);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  await main(process.argv.slice(2));
}
