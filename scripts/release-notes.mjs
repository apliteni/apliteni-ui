#!/usr/bin/env node
/**
 * release-notes — turn the changelog entry for a version into the body of its
 * GitHub Release, and refuse to produce anything at all when there is no entry.
 *
 * Usage: node scripts/release-notes.mjs [version] — defaults to package.json's
 * version. Exit 0 and markdown on stdout, or exit 1 and a sentence naming the
 * version that has no entry.
 *
 * why: CONTRIBUTING.md#what-the-release-gates-are-shaped-by
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

/** The order sections appear in, and the heading each type gets. */
const SECTIONS = [
  ['breaking', 'Breaking'],
  ['added', 'Added'],
  ['changed', 'Changed'],
  ['fixed', 'Fixed'],
  ['removed', 'Removed'],
];

/** `security` → `Security`. Only reached by a type SECTIONS does not know. */
const titleCase = (type) => type.charAt(0).toUpperCase() + type.slice(1);

/**
 * Render one release's changes as markdown, or throw if it has none to render.
 *
 * Pure: the array arrives as an argument, so both refusals are testable here.
 *
 * @param {Array<{v: string, date?: string, changes: Array<[string, string, string[]?]>}>} releases
 * @param {string} version  the version being released, without a leading `v`
 * @returns {string} markdown, `###` headings, no trailing newline
 * @throws {Error} when no entry exists for `version`, or the entry is empty
 */
export function renderReleaseNotes(releases, version) {
  const entry = releases.find((r) => r.v === version);

  // Both failures are one problem — the changelog does not describe this
  // release — and both messages are read in a red job with no other context,
  // so each names the version and the file rather than assuming either.
  if (!entry) {
    throw new Error(
      `No changelog entry for ${version}. Add one to the RELEASES array in ` +
        `site/changelog.mjs before releasing — the release notes are read from it, ` +
        `and a release nobody wrote down is a release nobody can find.`,
    );
  }
  if (!entry.changes || entry.changes.length === 0) {
    throw new Error(
      `The changelog entry for ${version} in site/changelog.mjs lists no changes, ` +
        `so there are no release notes to write.`,
    );
  }

  // Group first, then walk SECTIONS: the entries are written in the order they
  // were thought of, so walking in place emits a heading per type alternation.
  const byType = new Map();
  for (const [type, text, components] of entry.changes) {
    if (!byType.has(type)) byType.set(type, []);
    // Components lead the bullet in bold rather than trailing it as the styled
    // chips the changelog page can afford: after the full stop nobody reads them.
    const prefix = components?.length ? `**${components.join('**, **')}** — ` : '';
    byType.get(type).push(`- ${prefix}${text}`);
  }

  // Anything SECTIONS has no opinion about goes after the known sections, in
  // the order it first appeared: a type added later shows up somewhere
  // odd-looking rather than being dropped from notes that still look fine.
  const known = new Set(SECTIONS.map(([type]) => type));
  const extras = [...byType.keys()].filter((type) => !known.has(type));

  const blocks = [];
  for (const [type, heading] of [...SECTIONS, ...extras.map((t) => [t, titleCase(t)])]) {
    const bullets = byType.get(type);
    if (bullets?.length) blocks.push(`### ${heading}\n\n${bullets.join('\n')}`);
  }

  return blocks.join('\n\n');
}

// ---------------------------------------------------------------------------
// Below here: the half that reads files. Nothing above imports any of it.
// ---------------------------------------------------------------------------

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function main(argv) {
  // No argument means "the version this repo is at" — what the tagging workflow
  // is about to release. Passing one is for checking before you bump to it.
  const version = argv[0] || JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')).version;
  const { RELEASES } = await import(pathToFileURL(resolve(root, 'site/changelog.mjs')).href);

  // The throw is the gate, let out as a message and a non-zero exit: the reader
  // is in a workflow log, where the first line of a Node stack tells them nothing.
  try {
    process.stdout.write(`${renderReleaseNotes(RELEASES, version)}\n`);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exitCode = 1;
  }
}

// pathToFileURL, not `file://${...}`: under a directory needing percent
// encoding the concatenation compares false, main() never runs, and the script
// prints nothing and exits 0 — an empty render a workflow reads as a success.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv.slice(2));
}
