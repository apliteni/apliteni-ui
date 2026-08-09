#!/usr/bin/env node
/**
 * registry-status — ask the registry whether one exact version is published,
 * and be able to say "I could not find out".
 *
 * tag-on-bump.yml used to decide whether a release still needed doing by asking
 * whether the tag existed. The tag is created before the publish, so its
 * existence only ever proved that the attempt had started. One failed publish —
 * and with a reviewer required on the `npm-publish` environment, a slow approval
 * is enough — left the tag behind, and every later push to `main` read that tag,
 * concluded there was nothing to do, skipped the publish and exited green. The
 * pipeline reported healthy for as long as anyone cared to look while nothing
 * was on npm. That is the silence the whole release automation exists to end,
 * rebuilt inside it.
 *
 * The registry is the only thing that knows whether a version shipped. So the
 * registry is what gets asked, and this is the asking.
 *
 * Three answers, not two. `npm view` exits non-zero for a version that is not
 * there and for a DNS failure alike, and folding those together is how an npm
 * outage becomes either a re-publish of a released version or a green tick over
 * an unpublished one. `unknown` is a first-class verdict and the caller is
 * expected to stop on it, exactly as the `git ls-remote` check beside it in the
 * workflow stops on exit 128.
 *
 * The file is in two halves, like scripts/version-drift.mjs. `classifyRegistryAnswer`
 * is pure — an exit code and whatever npm printed go in, a verdict comes out —
 * so every branch is testable in milliseconds with no network. Everything that
 * runs npm lives below the `import.meta.url` check and has no judgement in it.
 *
 * Usage: node scripts/registry-status.mjs <version>
 *
 * Prints the verdict word on stdout and a sentence for a human on stderr, and
 * exits 0 published / 2 unpublished / 1 unknown.
 */

import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
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

// pathToFileURL, not `file://${…}` — see the same guard in version-drift.mjs.
// String concatenation loses to any path containing a space, the comparison
// comes back false, main() never runs and the script exits 0 saying nothing,
// which a caller reading exit codes would read as "published".
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv.slice(2));
}
