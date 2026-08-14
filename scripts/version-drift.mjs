#!/usr/bin/env node
/**
 * version-drift — say out loud when `main`'s version and the version on npm
 * have disagreed for long enough to be a mistake rather than a gap.
 *
 * A gap on its own is not a fault — a bump lands on main minutes before the tag
 * that publishes it — so the verdict is a function of the gap AND its age.
 *
 * Usage: node scripts/version-drift.mjs [--threshold-hours N]
 *
 * Prints one JSON object and one human line to stderr. Exit 0 always: a non-zero
 * exit would make a red run out of a report.
 *
 * why: CONTRIBUTING.md#what-the-release-gates-are-shaped-by
 */

import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
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

/**
 * The line `git log -L` traces.
 *
 * Deliberately loose about the indent. Pinning the literal two spaces prettier
 * writes today made a reformat fatal in the quietest possible way: reindent
 * package.json to four spaces or a tab and git exits `regexec() failed to
 * match`, the catch below turns that into null, and every run from then on
 * reports `bump-date-unknown`, files nothing and goes green. A formatter
 * default is not supposed to be able to switch this check off.
 *
 * `[[:space:]]*` and not `\s*`: git's -L regex is POSIX, where `\s` matches
 * nothing at all. It matches the first `"version":` line in the file, which in
 * a package.json is the top-level one — `name` and `version` lead the manifest,
 * and nothing nested can appear above them.
 */
const VERSION_LINE = '/^[[:space:]]*"version":/';

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
 * around it. The two obvious alternatives both mislead: `-S` is the pickaxe and
 * matches a string's COUNT, so a bump leaves it at one and every release is
 * skipped; `-G` is a regex over the diff, and git's default POSIX engine matches
 * nothing for `\s`, reading as "the version has never changed".
 *
 * Needs full history and degrades silently without it: in a shallow clone the
 * boundary commit looks parentless, so this returns the boundary's date with
 * exit 0 — a bump that is always minutes old and therefore never drift. Hence
 * fetch-depth: 0 in the workflow.
 *
 * Exported only so the pathspec can be exercised against real repositories.
 */
export async function readVersionChangedAt(cwd = root) {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['log', '-1', '--format=%cI', '--no-patch', '-L', `${VERSION_LINE},+1:package.json`],
      { cwd, encoding: 'utf8', timeout: 60_000 },
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

// pathToFileURL, not `file://${...}`. String-concatenating the path is wrong
// for any directory containing a space or a character that needs percent
// encoding: `import.meta.url` has it as %20, the concatenation has it raw, the
// comparison comes back false and main() never runs. The script then prints
// nothing and exits 0, which the workflow reads as "no drift" — the check goes
// green by never having run. Encoding the path the same way the module URL is
// encoded is the only comparison that holds.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv.slice(2));
}
