#!/usr/bin/env node
/**
 * shipped-surface — fail a pull request that changes what the package publishes
 * without changing the version that would publish it.
 *
 * A version bump landing on `main` is now the whole trigger for a release: the
 * sibling workflow tags whatever version has no tag yet and dispatches the
 * publish. Which means the inverse is also true and nothing said so — a change
 * to what we ship, merged without a bump, is a change that never reaches anyone
 * who installed the package. It sits on `main` looking merged.
 *
 * That has happened twice. The ./react subpath shipped to `main` and stayed off
 * npm. `footer()`, `success()`, `successCheck()` and `wireSuccess()` sat on
 * `main` exported from the entry point and unreachable by every consumer.
 * Neither was caught by review, because a diff does not tell you whether the
 * thing it changes is published.
 *
 * ---------------------------------------------------------------------------
 * Why this measures the artefact and not the paths
 * ---------------------------------------------------------------------------
 * The obvious implementation — match the changed paths against `files` in
 * package.json — cannot work here, in both directions:
 *
 *   react/dist   is built and gitignored, so a change to what it contains
 *                never appears in a `git diff` at all. That is precisely the
 *                surface that caused this issue.
 *   react/src/** is never published, but it is what produces react/dist. A
 *                glob wide enough to catch it also catches
 *                react/src/*.test.tsx, which ships nothing.
 *
 * So the subject is the tarball. The caller packs the package at the base of
 * the pull request and at its head, fingerprints every file npm would put
 * inside, and hands both maps to `assessShippedSurface`. Paths never enter the
 * decision.
 *
 * ---------------------------------------------------------------------------
 * How the contents get compared
 * ---------------------------------------------------------------------------
 * `npm pack --dry-run --json` gives paths and sizes, and sizes are not enough:
 * an edit that changes a colour token or an off-by-one keeps the byte count and
 * changes what ships. So the pack list is used for *which* files ship, and each
 * of those files is then read off disk and hashed. Reading from disk rather
 * than extracting the tarball keeps this to node builtins — no tar, no
 * dependency — and the tarball's contents are those files, so the two answers
 * are the same answer.
 *
 * ---------------------------------------------------------------------------
 * The one field that is deliberately ignored
 * ---------------------------------------------------------------------------
 * package.json is inside the tarball, so the version bump that satisfies this
 * gate is itself a change to the shipped surface. Counted naively, the only fix
 * for a red gate would be a change that keeps it red. So `version` — that field
 * alone, not the file — is excluded from package.json's fingerprint. `exports`
 * and `files` still count, and they are the two fields that decided both of the
 * failures above.
 *
 * ---------------------------------------------------------------------------
 * The second assertion, folded into the same job
 * ---------------------------------------------------------------------------
 * If the pull request does bump the version, the bump has to be upwards and
 * site/changelog.mjs must have a RELEASES entry for it. Upwards because a
 * version that is merely *different* releases nothing: set it to something
 * already tagged and `tag-on-bump` finds the tag on `main`, no-ops, and the
 * change sits merged and unpublished — the original bug, wearing a bump. An
 * intentional rollback goes forwards too, since npm will not re-serve a version
 * it has already served. It is the same decision as the surface one — is this
 * a release, and is it a complete one — asked at the only moment it can still
 * be answered cheaply. Without it a bump merges, `tag-on-bump` runs on `main`,
 * and the release fails *after* the version is already there: bumped,
 * unreleased, and needing a second pull request to fix. The check itself is
 * scripts/release-notes.mjs, imported rather than reimplemented — its refusal
 * to render is the gate, so there is exactly one definition of "the changelog
 * describes this release".
 *
 * Same two halves as scripts/version-drift.mjs and scripts/release-notes.mjs.
 * Everything above the `import.meta.url` check is pure and takes its facts as
 * arguments; everything below runs npm, reads files and has no judgement in it.
 *
 * Usage: node scripts/shipped-surface.mjs --base <path-to-base-checkout>
 *
 * The head is this script's own repository. Exit 0 and a sentence when the pull
 * request is consistent, exit 1 and the list of what would and would not ship
 * when it is not.
 */

import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

import { renderReleaseNotes } from './release-notes.mjs';

/**
 * A fingerprint of one published file, standing in for its contents.
 *
 * The path is an argument only so package.json can be treated specially; two
 * different files with identical contents fingerprint alike, so a rename reads
 * as one addition and one removal rather than as a modification of something
 * unrelated.
 *
 * @param {string} path      the file's path inside the tarball
 * @param {string|Buffer} contents
 * @returns {string} hex sha256
 */
export function surfaceHash(path, contents) {
  let subject = contents;

  if (path === 'package.json') {
    try {
      const manifest = JSON.parse(typeof contents === 'string' ? contents : contents.toString('utf8'));
      delete manifest.version;
      // Re-serialised rather than string-edited: a regex over the raw text
      // would also have to not match a dependency called "version", a nested
      // one, or the same key inside a comment-shaped string. Key order survives
      // JSON.parse, so re-ordering the manifest still registers as a change —
      // which it is, to a file that ships.
      subject = JSON.stringify(manifest);
    } catch {
      // A manifest this cannot read is a manifest whose version it cannot
      // exclude, so it excludes nothing and hashes the bytes. Never silently
      // equal: a broken package.json must not read as "no change".
      subject = contents;
    }
  }

  return createHash('sha256').update(subject).digest('hex');
}

/**
 * The file paths out of an `npm pack --json` stdout.
 *
 * `prepare` runs on pack and writes its own build progress to the same stdout,
 * so the JSON document does not start at byte 0 — it starts at the first bare
 * `[` line. That two-line dance was written out three separate times before it
 * lived here; the third copy is the package-contents job in
 * `.github/workflows/security.yml`, which is where the problem was first found
 * and which is a shell one-liner rather than a module, so it cannot import
 * this. If you change the parsing, change it there too.
 *
 * @param {string} stdout  everything `npm pack --json` printed
 * @param {string} where   named in the error, so a failure says which tree
 * @returns {string[]}
 */
export function packedFilePaths(stdout, where) {
  const lines = stdout.split('\n');
  const start = lines.indexOf('[');
  if (start === -1) throw new Error(`npm pack --json in ${where} printed no JSON document`);
  return JSON.parse(lines.slice(start).join('\n'))[0].files.map((file) => file.path);
}

/**
 * What moved between two fingerprinted file lists.
 *
 * Pure. Sorted, so the same difference reads the same way twice — a list whose
 * order depends on filesystem iteration turns a re-run into a different message
 * about the same problem.
 *
 * @param {Record<string,string>} base  path → fingerprint, before
 * @param {Record<string,string>} head  path → fingerprint, after
 * @returns {{added: string[], removed: string[], modified: string[], changed: boolean}}
 */
export function diffSurface(base, head) {
  const added = Object.keys(head).filter((path) => !(path in base)).sort();
  const removed = Object.keys(base).filter((path) => !(path in head)).sort();
  const modified = Object.keys(head)
    .filter((path) => path in base && base[path] !== head[path])
    .sort();

  return { added, removed, modified, changed: added.length + removed.length + modified.length > 0 };
}

/** `- a.js` lines under a heading, or nothing at all when the list is empty. */
const section = (heading, paths) =>
  paths.length ? [heading, ...paths.map((path) => `  ${path}`), ''] : [];

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * Order two versions the way npm does, or `null` if either is not semver.
 *
 * Needed because "the version changed" is not the question — "the version went
 * up" is. Only a version greater than what is published gets a tag, so a
 * version merely *different* is a pull request that ships nothing.
 *
 * Prerelease ordering is the semver rule and not string order: `1.0.0-rc.1`
 * comes before `1.0.0`, `rc.2` after `rc.1`, and a numeric identifier below an
 * alphanumeric one. Build metadata is ignored, as the spec says it must be.
 *
 * @returns {-1|0|1|null}
 */
function compareSemver(a, b) {
  const left = SEMVER.exec(String(a));
  const right = SEMVER.exec(String(b));
  if (!left || !right) return null;

  for (let i = 1; i <= 3; i += 1) {
    if (Number(left[i]) !== Number(right[i])) return Number(left[i]) < Number(right[i]) ? -1 : 1;
  }

  // No prerelease outranks any prerelease of the same core version.
  if (!left[4] && !right[4]) return 0;
  if (!left[4]) return 1;
  if (!right[4]) return -1;

  const leftIds = left[4].split('.');
  const rightIds = right[4].split('.');
  for (let i = 0; i < Math.max(leftIds.length, rightIds.length); i += 1) {
    const l = leftIds[i];
    const r = rightIds[i];
    // A shorter set of identifiers sorts lower when everything before is equal.
    if (l === undefined) return -1;
    if (r === undefined) return 1;

    const lNumeric = /^\d+$/.test(l);
    const rNumeric = /^\d+$/.test(r);
    if (lNumeric && rNumeric) {
      if (Number(l) !== Number(r)) return Number(l) < Number(r) ? -1 : 1;
    } else if (lNumeric !== rNumeric) {
      return lNumeric ? -1 : 1;
    } else if (l !== r) {
      return l < r ? -1 : 1;
    }
  }
  return 0;
}

/**
 * Decide whether a pull request's effect on the published package is coherent.
 *
 * Three questions, and which ones get asked depends on the version:
 *
 *   version unchanged → does the tarball differ? A difference here is a change
 *                       that will never be published, so it fails.
 *   version changed   → did it go up? Only a greater version has no tag yet,
 *                       and only a version with no tag releases anything. A
 *                       version merely different ships nothing.
 *                     → and is it described? The surface may do whatever it
 *                       likes; a release is going out either way, and a release
 *                       with no changelog entry is the 0.8.0/0.8.1 hole.
 *
 * Both version questions are asked on any change, including one that leaves the
 * tarball otherwise identical — the version still publishes, and the page still
 * needs to say what it was for.
 *
 * @param {object} facts
 * @param {Record<string,string>} facts.base  fingerprints at the base of the PR
 * @param {Record<string,string>} facts.head  fingerprints at its head
 * @param {string} facts.baseVersion
 * @param {string} facts.headVersion
 * @param {Array<{v: string, changes?: unknown[]}>} facts.releases  site/changelog.mjs's RELEASES
 * @returns {{ok: boolean, reason: string, title: string, versionChanged: boolean,
 *   added: string[], removed: string[], modified: string[], report: string}}
 */
export function assessShippedSurface({ base, head, baseVersion, headVersion, releases }) {
  const { added, removed, modified, changed } = diffSurface(base, head);
  const versionChanged = baseVersion !== headVersion;
  // `title` is the one line that lands on the Files-changed view as an
  // annotation, and it is empty on a pass — a green run has nothing to title.
  const verdict = {
    ok: true, reason: '', title: '', versionChanged, added, removed, modified, report: '',
  };

  if (versionChanged) {
    // Asked before the changelog, because a version going the wrong way makes
    // "is there an entry for it" the wrong question — the entry for a version
    // already published is of course there, and it describes a release that
    // already happened.
    const order = compareSemver(headVersion, baseVersion);
    if (order === null || order <= 0) {
      verdict.ok = false;
      verdict.reason = 'version-not-an-increase';
      verdict.title = `Version ${headVersion} is not an increase on ${baseVersion}`;
      verdict.report = [
        `This pull request moves the version from ${baseVersion} to ${headVersion}, which is not `
          + `an increase.`,
        '',
        order === null
          ? `One of the two is not a version this repository can release: \`tag-on-bump\` tags `
            + `\`v<version>\` and refuses anything that is not plausible semver.`
          : `Releases are triggered by a version on \`main\` with no tag yet. ${headVersion} is `
            + `behind ${baseVersion}, so it has almost certainly been tagged and published `
            + `already — \`tag-on-bump\` would find the tag, do nothing, and everything in this `
            + `pull request would sit on \`main\` unpublished. That is the failure this gate `
            + `exists for, arriving with a version bump attached.`,
        '',
        `Undoing a release goes forwards, not back: npm will not re-serve a version it has `
          + `already served. Ship the next version up with the change reverted in it, rather `
          + `than putting the old number back in package.json.`,
      ].join('\n');
      return verdict;
    }

    try {
      renderReleaseNotes(releases, headVersion);
    } catch (err) {
      verdict.ok = false;
      verdict.reason = 'changelog-entry-missing';
      verdict.title = `Version ${headVersion} has no changelog entry`;
      // release-notes.mjs already names the version and the file, and it is
      // the same sentence the release job would print. Reworded here it would
      // be two descriptions of one rule, drifting apart.
      verdict.report = [
        `This pull request releases ${headVersion}, and the changelog does not describe it.`,
        '',
        err.message,
        '',
        `A version bump on \`main\` releases itself — \`tag-on-bump\` tags whatever version has`,
        `no tag and publishes it. Without an entry that release fails after the bump is already`,
        `on \`main\`, which takes a second pull request to undo. Add the entry here instead.`,
      ].join('\n');
      return verdict;
    }

    verdict.reason = 'released-by-bump';
    verdict.report = changed
      ? `${baseVersion} → ${headVersion}, with ${added.length} added, ${removed.length} removed and ` +
        `${modified.length} modified in the tarball, and a changelog entry for ${headVersion}.`
      : `${baseVersion} → ${headVersion} with an identical tarball, and a changelog entry for ` +
        `${headVersion}. Nothing published changes; the release goes out on the version alone.`;
    return verdict;
  }

  if (!changed) {
    verdict.reason = 'surface-unchanged';
    verdict.report =
      `The tarball is byte-for-byte what ${baseVersion} already publishes, so there is nothing ` +
      `here that needs releasing.`;
    return verdict;
  }

  verdict.ok = false;
  verdict.reason = 'unshipped-surface-change';
  verdict.title = 'The published package changes and the version does not';
  verdict.report = [
    `This pull request changes what the package publishes and leaves the version at ${baseVersion}.`,
    '',
    `Releases are triggered by the version on \`main\` having no tag yet. With the version`,
    `untouched, nothing below reaches anyone who has installed the package — it lands on \`main\``,
    `and stops there. That is how the ./react subpath sat unpublished, and how four exports sat`,
    `on \`main\` that nobody could import.`,
    '',
    ...section('Would start shipping:', added),
    ...section('Would stop shipping:', removed),
    ...section('Ships today, with different contents:', modified),
    // Only when it applies. A react/dist entry names a gitignored build
    // artefact the author has never opened — they edited react/src — so
    // without this line the finding reads as being about a file that is not
    // in the diff, and a finding a reader cannot place is one they click past.
    ...([...added, ...removed, ...modified].some((path) => path.startsWith('react/dist'))
      ? [
        `\`react/dist\` is built from \`react/src\` by \`npm run build -w react\` and is not in the`,
        `repository, which is why it is listed here and not in your diff.`,
        '',
      ]
      : []),
    `To ship it: bump "version" in package.json and add a matching entry to the RELEASES array`,
    `in site/changelog.mjs.`,
    '',
    `If it genuinely should not ship yet, the change does not belong in the published surface —`,
    `\`files\` in package.json is what decides that.`,
  ].join('\n');
  return verdict;
}

// ---------------------------------------------------------------------------
// Below here: the half that runs npm and reads files. Nothing above imports it.
// ---------------------------------------------------------------------------

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The paths npm would put in the tarball for the package rooted at `dir`. */
async function packedPaths(dir) {
  const { stdout } = await execFileAsync('npm', ['pack', '--dry-run', '--json'], {
    cwd: dir,
    encoding: 'utf8',
    // The pack builds react/dist with tsup on the way through. A couple of
    // seconds in practice; the ceiling is here so a wedged build fails the job
    // rather than holding a runner until GitHub's own limit.
    timeout: 600_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  return packedFilePaths(stdout, dir);
}

/** Fingerprint every file the package at `dir` would publish. */
async function fingerprint(dir) {
  const paths = await packedPaths(dir);
  const entries = await Promise.all(
    paths.map(async (path) => [path, surfaceHash(path, await readFile(resolve(dir, path)))]),
  );
  return Object.fromEntries(entries);
}

const readVersion = async (dir) =>
  JSON.parse(await readFile(resolve(dir, 'package.json'), 'utf8')).version;

async function main(argv) {
  const flag = argv.indexOf('--base');
  if (flag === -1 || !argv[flag + 1]) {
    process.stderr.write('Usage: node scripts/shipped-surface.mjs --base <path-to-base-checkout>\n');
    process.exitCode = 2;
    return;
  }
  const baseDir = resolve(argv[flag + 1]);

  // Sequential, not Promise.all. Both packs run `prepare`, which builds
  // react/dist with tsup; running them at once has two tsup processes writing
  // into two trees that may share a node_modules, and the whole point of this
  // script is that the two answers are trustworthy.
  const baseVersion = await readVersion(baseDir);
  const headVersion = await readVersion(root);
  const base = await fingerprint(baseDir);
  const head = await fingerprint(root);

  // The head checkout's changelog, because the entry a pull request adds is
  // part of the pull request.
  const { RELEASES } = await import(pathToFileURL(resolve(root, 'site/changelog.mjs')).href);

  const verdict = assessShippedSurface({ base, head, baseVersion, headVersion, releases: RELEASES });

  // The report goes to stdout whichever way it went: a passing run that prints
  // nothing is indistinguishable from a job that never ran.
  process.stdout.write(`${verdict.report}\n`);
  if (!verdict.ok) {
    // An annotation as well as the log, so the finding is on the pull request's
    // Files-changed view rather than only inside a job somebody has to open.
    // Annotations are one line: a `\n` ends the workflow command and the rest
    // of the report would be printed as ordinary output, so the body is folded
    // into `%0A`, which GitHub renders back as line breaks.
    const body = verdict.report.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
    process.stdout.write(`::error title=${verdict.title}::${body}\n`);
    process.exitCode = 1;
  }
}

// pathToFileURL, not `file://${...}`. String-concatenating the path is wrong
// for any directory containing a space or a character that needs percent
// encoding: the comparison silently comes back false, main() never runs, the
// script prints nothing and exits 0 — and a gate that goes green by never
// having run is worse than no gate, because the tick says it checked.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv.slice(2));
}
