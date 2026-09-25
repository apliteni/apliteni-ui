// Release guard — the command that publishes has to work on a path with a slash
// in it. 0.8.0 was tagged, built, packed and never published: npm read the bare
// `a/b` tarball path as a GitHub shorthand and died on a public-key error before
// it looked at the file, and a leading `./` is the whole fix. So this runs the
// publish command read out of the workflow — grepping for the string under
// suspicion would pin nothing — against a real tarball in a subdirectory.
//
// Check the packed files, release notes and registry result.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, mkdirSync, readdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
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
      env: { ...process.env, TGZ: path.join('dist-pack', tgz), DIST_TAG: 'backport' },
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

// Run the real selection and publish bodies with the artifact layout used by
// download-artifact. Only npm's network boundary is stubbed; nothing is published.
for (const [latest, version, expected, approvedVersion = version] of [
  ['0.40.1', '0.41.1', 'latest'],
  ['0.41.1', '0.41.0', 'backport'],
  ['0.41.1', '0.41.1', 'backport'],
  ['', '0.1.0', 'latest'],
  ['0.1.0', '1.0.0', null, '0.9.0'],
  ['invalid', '1.0.0', null],
  ['unavailable', '1.0.0', null],
]) {
  test(`workflow selects ${expected} for ${version} against ${latest || 'no latest'}`, () => {
    const scratch = mkdtempSync(path.join(realpathSync(os.tmpdir()), 'release-tag-'));
    try {
      mkdirSync(path.join(scratch, 'dist-pack'));
      mkdirSync(path.join(scratch, 'package'));
      mkdirSync(path.join(scratch, 'bin'));
      writeFileSync(path.join(scratch, 'package/package.json'), JSON.stringify({ version }));
      execFileSync('tar', ['-czf', 'dist-pack/package.tgz', 'package/package.json'], { cwd: scratch });
      copyFileSync(path.join(root, 'scripts/release-tag.mjs'), path.join(scratch, 'dist-pack/release-tag.mjs'));
      writeFileSync(path.join(scratch, 'bin/npm'), `#!/bin/bash
set -eu
if [ "$1" = view ]; then
  [ "$2" = '@apliteni/apliteni-ui' ]
  [ "$3" = 'dist-tags.latest' ]
  [ "$4" = '--json' ]
  [ "$5" = '--registry=https://registry.npmjs.org' ]
  if [ "$LATEST" = unavailable ]; then
    printf '%s\\n' '{"error":{"code":"E503"}}'
    exit 1
  fi
  if [ -n "$LATEST" ]; then printf '"%s"\\n' "$LATEST"; fi
else
  printf '%s\\n' "$@" > "$PUBLISH_ARGS"
fi
`, { mode: 0o755 });
      const selection = workflow.match(/      - name: Choose the dist-tag\n[\s\S]*?        run: \|\n((?:          .*\n)+)/)?.[1];
      assert.ok(selection, 'workflow must select the tag immediately before publish');
      const run = spawnSync('bash', ['-euo', 'pipefail', '-c', `${selection}\nsource "$GITHUB_OUTPUT"\nexport DIST_TAG="$tag"\n${publishCommand()}`], {
        cwd: scratch,
        encoding: 'utf8',
        env: { ...process.env, PATH: `${scratch}/bin:${process.env.PATH}`, LATEST: latest,
          TGZ: 'dist-pack/package.tgz', EXPECTED_VERSION: approvedVersion, GITHUB_OUTPUT: path.join(scratch, 'output'),
          PUBLISH_ARGS: path.join(scratch, 'publish-args') },
      });
      if (expected === null) {
        assert.notEqual(run.status, 0, 'an unknown latest must stop publishing');
        assert.equal(existsSync(path.join(scratch, 'publish-args')), false);
        return;
      }
      assert.equal(run.status, 0, run.stderr);
      assert.deepEqual(readFileSync(path.join(scratch, 'publish-args'), 'utf8').trim().split('\n'),
        ['publish', './dist-pack/package.tgz', '--tag', expected]);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
}
