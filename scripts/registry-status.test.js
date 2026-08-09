// Registry guard — "is this version published?" has to have three answers.
//
// tag-on-bump used to decide whether a release still needed doing by asking
// whether the tag existed. The tag is created before the publish, so it only
// ever proved the attempt had *started*. One failed publish and every later
// push to main read the tag, decided there was nothing to do, skipped the
// publish step and went green — for good. The registry is the only thing that
// knows whether a version shipped, so the registry is what gets asked.
//
// Asking is easy to get wrong in the quiet direction. `npm view` exits non-zero
// for a version that is not there AND for a DNS failure, and collapsing those
// two into one answer is how an npm outage either re-publishes a released
// version or waves an unpublished one through. So the classifier below has
// three outcomes and the middle one — "I could not find out" — is a first-class
// answer that stops the job.
//
// Everything here is the pure half: an exit code and whatever npm printed go
// in, a verdict comes out, and no network is touched. The one case that does
// run the CLI end to end stubs `npm` on PATH, because the three exit codes are
// the actual contract the workflow reads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyRegistryAnswer, EXIT_CODES } from './registry-status.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The package and version every case below asks about, unless it says otherwise. */
const asked = { name: '@apliteni/apliteni-ui', version: '0.10.0' };

// Captured from npm 11 against registry.npmjs.org, not invented. `npm view
// <spec> version --json` writes its error object to stdout, which is why these
// are stdout fixtures and not stderr ones.
const E404_NO_MATCH = JSON.stringify({
  error: {
    code: 'E404',
    summary: 'No match found for version 0.10.0',
    detail: "The requested resource '@apliteni/apliteni-ui@0.10.0' could not be found …",
  },
});
const E404_NO_PACKAGE = JSON.stringify({
  error: {
    code: 'E404',
    summary: 'Not Found - GET https://registry.npmjs.org/@apliteni%2fapliteni-ui - Not found',
    detail: "The requested resource '@apliteni/apliteni-ui@0.10.0' could not be found …",
  },
});
const ENOTFOUND = JSON.stringify({
  error: {
    code: 'ENOTFOUND',
    summary:
      'request to https://registry.npmjs.org/@apliteni%2fapliteni-ui failed, ' +
      'reason: getaddrinfo ENOTFOUND registry.npmjs.org',
    detail: 'This is a problem related to network connectivity.',
  },
});

test('a version the registry serves back is published', () => {
  const verdict = classifyRegistryAnswer({ ...asked, exitCode: 0, stdout: '"0.10.0"\n' });

  assert.equal(verdict.state, 'published');
  assert.match(verdict.summary, /0\.10\.0/);
});

test('a 404 for the version is unpublished, and so is a 404 for the whole package', () => {
  const noVersion = classifyRegistryAnswer({ ...asked, exitCode: 1, stdout: E404_NO_MATCH });
  const noPackage = classifyRegistryAnswer({ ...asked, exitCode: 1, stdout: E404_NO_PACKAGE });

  assert.equal(noVersion.state, 'unpublished');
  assert.equal(noPackage.state, 'unpublished');
});

test('a network failure is unknown — never unpublished', () => {
  const verdict = classifyRegistryAnswer({ ...asked, exitCode: 1, stdout: ENOTFOUND });

  assert.equal(verdict.state, 'unknown');
  assert.match(verdict.summary, /ENOTFOUND/);
});

test('a registry error that is not a 404 is unknown', () => {
  const forbidden = JSON.stringify({ error: { code: 'E403', summary: 'Forbidden' } });

  assert.equal(classifyRegistryAnswer({ ...asked, exitCode: 1, stdout: forbidden }).state, 'unknown');
});

test('an answer about some other version is not an answer', () => {
  // The spec handed to `npm view` is exact, so this should not happen — which is
  // the reason to check. A registry, proxy or npm alias that resolves 0.10.0 to
  // something else must not have its reply read as "0.10.0 is published".
  const verdict = classifyRegistryAnswer({ ...asked, exitCode: 0, stdout: '"0.9.0"\n' });

  assert.equal(verdict.state, 'unknown');
  assert.match(verdict.summary, /0\.9\.0/);
});

test('a success with nothing in it is unknown, not published', () => {
  assert.equal(classifyRegistryAnswer({ ...asked, exitCode: 0, stdout: '' }).state, 'unknown');
  assert.equal(classifyRegistryAnswer({ ...asked, exitCode: 0, stdout: '\n' }).state, 'unknown');
});

test('an answer that is not JSON at all is unknown', () => {
  // A proxy returning an HTML error page, or npm changing its output shape.
  const verdict = classifyRegistryAnswer({
    ...asked,
    exitCode: 1,
    stdout: '<html><body>502 Bad Gateway</body></html>',
  });

  assert.equal(verdict.state, 'unknown');
});

test('a non-zero exit with no output at all is unknown', () => {
  // What a killed process looks like: the 60s timeout firing, or the runner
  // being out of memory. There is no error object to read, and there must not
  // be a guess either.
  assert.equal(classifyRegistryAnswer({ ...asked, exitCode: null, stdout: '' }).state, 'unknown');
});

test('every verdict says which package and version it is about', () => {
  for (const [exitCode, stdout] of [
    [0, '"0.10.0"'],
    [1, E404_NO_MATCH],
    [1, ENOTFOUND],
  ]) {
    const verdict = classifyRegistryAnswer({ ...asked, exitCode, stdout });
    assert.match(verdict.summary, /@apliteni\/apliteni-ui/, `no package name in: ${verdict.summary}`);
    assert.match(verdict.summary, /0\.10\.0/, `no version in: ${verdict.summary}`);
  }
});

// ---------------------------------------------------------------------------
// The CLI contract: three exit codes, the same three-way shape the tag check
// next to it in the workflow uses. A workflow reads `$?`, so `$?` is the thing
// that has to be tested.
// ---------------------------------------------------------------------------

/** Run the real CLI with a fake `npm` first on PATH. */
function runCli({ exitCode, stdout }, args = ['0.10.0']) {
  const scratch = mkdtempSync(path.join(realpathSync(os.tmpdir()), 'apliteni-ui-registry-'));
  try {
    const bin = path.join(scratch, 'bin');
    mkdirSync(bin);
    const npm = path.join(bin, 'npm');
    writeFileSync(npm, `#!/bin/sh\ncat <<'NPMEOF'\n${stdout}\nNPMEOF\nexit ${exitCode}\n`);
    chmodSync(npm, 0o755);

    return spawnSync(process.execPath, [path.join(root, 'scripts/registry-status.mjs'), ...args], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

test('the CLI exits 0 for published, 2 for unpublished and 1 for unknown', () => {
  assert.equal(EXIT_CODES.published, 0);
  assert.equal(EXIT_CODES.unpublished, 2);
  assert.equal(EXIT_CODES.unknown, 1);

  const published = runCli({ exitCode: 0, stdout: '"0.10.0"' });
  assert.equal(published.status, 0, published.stderr);
  assert.match(published.stdout, /^published$/m);

  const unpublished = runCli({ exitCode: 1, stdout: E404_NO_MATCH });
  assert.equal(unpublished.status, 2, unpublished.stderr);
  assert.match(unpublished.stdout, /^unpublished$/m);

  const unknown = runCli({ exitCode: 1, stdout: ENOTFOUND });
  assert.equal(unknown.status, 1, unknown.stderr);
  assert.match(unknown.stdout, /^unknown$/m);
  // The reason has to reach the run log, or a red job says only "exited 1".
  assert.match(unknown.stderr, /ENOTFOUND/);
});

test('the CLI refuses to guess when it is given no version', () => {
  const run = runCli({ exitCode: 0, stdout: '"0.10.0"' }, []);

  assert.equal(run.status, EXIT_CODES.unknown);
  assert.match(run.stderr, /version/i);
});
