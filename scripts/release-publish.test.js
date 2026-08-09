// Release guard — the command that publishes has to work on a path with a slash
// in it.
//
// 0.8.0 was tagged, built, packed and never published. The release workflow ran
// `npm publish "$TGZ"` with `TGZ=dist-pack/apliteni-apliteni-ui-0.8.0.tgz`, and
// npm read that bare `a/b` string as a GitHub shorthand rather than a file. It
// went off to `git ls-remote` an ssh URL built from the tarball's own name, and
// died on a public-key permission error before it ever looked at the file.
//
// A leading `./` is the whole fix. The failure only appears when the path
// contains a slash, which is why it survived review twice and only surfaced at
// release time, on the one step no test covered.
//
// Grepping the workflow for the string would pin nothing — the string is the
// thing under suspicion. So this test reads the publish command out of the
// workflow, runs it against a real packed tarball placed in a subdirectory, and
// asserts npm resolves it as a file. `--dry-run` does everything except upload:
// it resolves the spec, reads the tarball and needs no credentials.
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
    execFileSync('npm', ['pack', '--pack-destination', sub], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const tgz = readdirSync(sub).find((f) => f.endsWith('.tgz'));
    assert.ok(tgz, 'npm pack produced no tarball');

    // Run the workflow's own command, with TGZ set the way the workflow sets it:
    // relative to the working directory, with a slash in it.
    //
    // The exit code is deliberately ignored, and both streams are kept. An
    // unauthenticated `--dry-run` resolves the spec, reads the tarball and
    // prints it, and *then* exits non-zero — but only when the version is
    // already on the registry. On the version bump itself it resolves the same
    // way and exits zero, so a branch that reads stdout alone loses everything:
    // npm writes the tarball report to stderr as `npm notice` lines, and stdout
    // carries one `+ name@version`. Read one stream and this guard passes only
    // when the publish would have failed anyway, which is to say it is blind on
    // the one pull request it exists to protect.
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
