#!/usr/bin/env node
/**
 * registry-status — ask the registry whether one exact version is published,
 * and be able to say "I could not find out".
 *
 * Three answers, not two: `unknown` is a first-class verdict and the caller is
 * expected to stop on it, exactly as the `git ls-remote` check beside it in the
 * workflow stops on exit 128.
 *
 * Usage: node scripts/registry-status.mjs <version>
 * Exits 0 published / 2 unpublished / 1 unknown.
 *
 * why: CONTRIBUTING.md#what-the-release-gates-are-shaped-by
 */

import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { basename, dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

/**
 * The contract a shell reads. Deliberately the same shape as
 * `git ls-remote --exit-code`: 0 found, 2 absent, anything else "ask again
 * later, and do not act on this". Exported so the workflow's meaning and the
 * test's expectation come from one place.
 */
export const EXIT_CODES = Object.freeze({ published: 0, unpublished: 2, unknown: 1 });

/**
 * Turn one `npm view <name>@<version> version --json` invocation into a verdict.
 *
 * With `--json`, npm writes its error object to *stdout* — `{"error":{"code":…}}`
 * — and leaves stderr for the `npm error` prose and config warnings. So stdout
 * is the whole input, on success and on failure.
 *
 * @param {object} answer
 * @param {string} answer.name             package asked about
 * @param {string} answer.version          exact version asked about
 * @param {number|null|undefined} answer.exitCode  npm's exit code, null if it was killed
 * @param {string} answer.stdout           everything npm printed to stdout
 * @returns {{state: 'published'|'unpublished'|'unknown', reason: string, summary: string}}
 */
export function classifyRegistryAnswer({ name, version, exitCode, stdout }) {
  const spec = `${name}@${version}`;
  const body = parseJson(stdout);

  if (exitCode === 0) {
    // An exact spec makes npm answer with exactly one version string. Anything
    // else — an array from a range, an empty body, a different number — means
    // the question that was answered is not the question that was asked, and
    // "published" is not a safe reading of it.
    if (typeof body === 'string' && body === version) {
      return {
        state: 'published',
        reason: 'version-served',
        summary: `${spec} is on the registry.`,
      };
    }
    return {
      state: 'unknown',
      reason: 'answered-about-something-else',
      summary:
        `Asked the registry for ${spec} and it exited 0 with ${describe(stdout)}, ` +
        `which is not an answer about ${version}. Not treating that as published.`,
    };
  }

  // E404 is the only failure that means "not there". It covers both the version
  // being absent from a package that exists and the package itself being absent
  // — the second is what a first-ever publish looks like from here.
  const code = typeof body?.error?.code === 'string' ? body.error.code : null;
  if (code === 'E404') {
    return {
      state: 'unpublished',
      reason: 'not-found',
      summary: `${spec} is not on the registry.`,
    };
  }

  return {
    state: 'unknown',
    reason: code ? 'registry-error' : 'unreadable-answer',
    summary:
      `Could not find out whether ${spec} is published: npm exited ${exitCode ?? 'without a code'}` +
      (code ? ` with ${code} — ${body.error.summary ?? 'no summary'}` : ` and printed ${describe(stdout)}`) +
      '.',
  };
}

/** JSON.parse that answers `undefined` instead of throwing. */
function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** A short, quotable rendering of output that did not parse, for an error line. */
function describe(stdout) {
  const trimmed = String(stdout ?? '').trim();
  if (!trimmed) return 'nothing';
  const oneLine = trimmed.replace(/\s+/g, ' ');
  return oneLine.length > 200 ? `${JSON.stringify(oneLine.slice(0, 200))}…` : JSON.stringify(oneLine);
}

// ---------------------------------------------------------------------------
// Below here: the half that talks to the world. Nothing above imports any of it.
// ---------------------------------------------------------------------------

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Which registry to ask.
 *
 * `publishConfig.registry` and not npm's ambient default, because the question
 * is "did our publish land", and a `npm view` pointed somewhere other than
 * where `npm publish` writes answers a different question convincingly. An
 * `.npmrc`, an `npm_config_registry` in the environment or a corporate mirror
 * would all otherwise be able to move it silently.
 */
async function readPackage() {
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  return { name: pkg.name, registry: pkg.publishConfig?.registry ?? null };
}

async function main(argv) {
  const version = argv[0];
  if (!version) {
    process.stdout.write('unknown\n');
    process.stderr.write('registry-status: needs the version to ask about, e.g. 0.10.0.\n');
    process.exitCode = EXIT_CODES.unknown;
    return;
  }

  const { name, registry } = await readPackage();
  const args = ['view', `${name}@${version}`, 'version', '--json'];
  if (registry) args.push('--registry', registry);

  // execFile, so nothing here goes near a shell. A failed npm rejects, and the
  // rejection carries the same stdout the success path would have had — which
  // for `--json` is where the error object is.
  let exitCode = 0;
  let stdout = '';
  try {
    ({ stdout } = await execFileAsync('npm', args, { encoding: 'utf8', timeout: 60_000 }));
  } catch (error) {
    // `code` is the exit status for a process that ran, a string like 'ENOENT'
    // when npm itself could not be started, and null when it was killed on the
    // timeout. Only a number can be zero-compared, so anything else becomes
    // null and lands in the unknown branch.
    exitCode = typeof error.code === 'number' ? error.code : null;
    stdout = error.stdout ?? '';
  }

  const verdict = classifyRegistryAnswer({ name, version, exitCode, stdout });
  process.stdout.write(`${verdict.state}\n`);
  process.stderr.write(`${verdict.summary}\n`);
  process.exitCode = EXIT_CODES[verdict.state];
}

// Am I the program, or am I being imported?
//
// pathToFileURL, not `file://${…}` — see the same guard in version-drift.mjs.
// String concatenation loses to any path containing a space, the comparison
// comes back false, main() never runs and the script exits 0 saying nothing,
// which a caller reading exit codes would read as "published".
//
// Asked twice, because one string comparison is a thin thing to hang a release
// on: a symlink, a path spelt through a `..`, or a Node that hands argv[1] over
// in some other shape would all miss. Real paths catch what the URL string does
// not.
function ranAs(entry) {
  if (import.meta.url === pathToFileURL(entry).href) return true;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

const entry = process.argv[1];
if (entry && ranAs(entry)) {
  await main(process.argv.slice(2));
} else if (entry && basename(entry) === basename(fileURLToPath(import.meta.url))) {
  // Somebody ran a file by this name and neither identity check agreed it was
  // this one. Whatever that is, it is not an import, and exiting 0 here is the
  // dangerous direction: the workflow reads 0 as "the version is published" and
  // goes green over a release that never happened. So it is a loud unknown.
  process.stdout.write('unknown\n');
  process.stderr.write(
    `registry-status: ran as ${entry}, which this script could not confirm is itself, ` +
      'so it has not asked the registry anything. Exiting unknown rather than 0.\n',
  );
  process.exitCode = EXIT_CODES.unknown;
}
