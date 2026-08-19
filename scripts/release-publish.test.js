// Release guard — the command that publishes has to work on a path with a slash
// in it. 0.8.0 was tagged, built, packed and never published: npm read the bare
// `a/b` tarball path as a GitHub shorthand and died on a public-key error before
// it looked at the file, and a leading `./` is the whole fix. So this runs the
// publish command read out of the workflow — grepping for the string under
// suspicion would pin nothing — against a real tarball in a subdirectory.
//
// why: CONTRIBUTING.md#what-the-release-gates-are-shaped-by
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, mkdirSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflow = readFileSync(path.join(root, '.github/workflows/release.yml'), 'utf8');

/** The `run:` line of the step whose env carries TGZ — the publish step. */
function publishCommand() {
  const line = workflow.split('\n').find((l) => /^\s*run:\s*npm publish\b/.test(l));
  assert.ok(line, 'release.yml has no `run: npm publish …` step — has the release changed shape?');
  return line.replace(/^\s*run:\s*/, '').trim();
}

test('the workflow publishes a file path, not a git shorthand', () => {
  const scratch = mkdtempSync(path.join(realpathSync(os.tmpdir()), 'apliteni-ui-publish-'));
  try {
    // A subdirectory is essential: npm only mistakes the argument for
    // `owner/repo` when it contains a slash. Packing to the scratch root would
    // pass while the real workflow, which packs into dist-pack/, fails.
    const sub = path.join(scratch, 'dist-pack');
    mkdirSync(sub);
    // --ignore-scripts is load-bearing, and dropping it reds scripts/packaging.test.js
    // rather than this one: both pack the root, and tsup's `clean: true` removes
    // index.d.ts in the gap where the other build archives react/dist. Nothing here
    // reads the tarball; it only has to be a real .tgz at a path with a slash in it.
    execFileSync('npm', ['pack', '--ignore-scripts', '--pack-destination', sub], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const tgz = readdirSync(sub).find((f) => f.endsWith('.tgz'));
    assert.ok(tgz, 'npm pack produced no tarball');

    // Run the workflow's own command, with TGZ set the way the workflow sets it:
    // relative to the working directory, with a slash in it. Exit code ignored and
    // both streams kept: an unauthenticated `--dry-run` exits zero on the version
    // bump itself and non-zero only when the version is already published, and it
    // writes the tarball report to stderr as `npm notice` lines while stdout carries
    // one `+ name@version`. Branch on either and this goes blind on the one pull
    // request it exists to protect.
    const command = `${publishCommand()} --dry-run`;
    const run = spawnSync('bash', ['-c', command], {
      cwd: scratch,
      encoding: 'utf8',
      env: { ...process.env, TGZ: path.join('dist-pack', tgz) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const text = `${run.stdout ?? ''}${run.stderr ?? ''}`;

    assert.doesNotMatch(
      text,
      /ls-remote|Permission denied \(publickey\)|unknown git error/,
      `\`${command}\` made npm resolve the tarball as a git repository instead of a file. ` +
        `A relative path containing a slash needs a leading "./". npm said:\n${text}`,
    );
    // Proves npm read the tarball, rather than merely not hitting the git path.
    assert.match(
      text,
      /filename:\s*apliteni-apliteni-ui-/,
      `npm never reported reading the tarball:\n${text}`,
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
