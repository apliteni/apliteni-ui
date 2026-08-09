#!/usr/bin/env node
/**
 * release-notes — turn the changelog entry for a version into the body of its
 * GitHub Release, and refuse to produce anything at all when there is no entry.
 *
 * The refusal is the point. 0.8.0 and 0.8.1 both went out with nothing on
 * ui.apli.tech/changelog: the page jumped from 0.7.2 to the version after them,
 * and two releases were simply invisible to anyone reading it. Writing the
 * entry was a step somebody was supposed to remember, and it stayed unnoticed
 * for two releases because nothing anywhere depended on it existing. Now the
 * release body is read out of that entry, so a missing entry is not an
 * oversight to catch later — it is a release that cannot be built.
 *
 * The changelog is imported, not scraped. site/changelog.mjs exports `RELEASES`
 * as data with a renderer beside it, and importing the array means a change to
 * its shape shows up as a type of failure a test can catch, rather than as a
 * regex that quietly matches nothing and hands back empty notes. A regex would
 * also have to understand nested brackets, escaped quotes and the backticks
 * that appear in almost every entry.
 *
 * Same two halves as scripts/version-drift.mjs. `renderReleaseNotes` is pure:
 * it takes the array and a version and returns a string, so every branch —
 * including both failure branches — is exercised in milliseconds with no
 * filesystem and no network. Below the `import.meta.url` check is a CLI that
 * reads the real array, writes markdown to stdout and exits non-zero when
 * there is nothing to write.
 *
 * Usage: node scripts/release-notes.mjs [version]
 *
 * With no argument it uses the version in package.json, which is what the
 * tagging workflow releases. Exit 0 and markdown on stdout, or exit 1 and a
 * sentence on stderr saying which version has no entry.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * The order sections appear in, and the heading each type gets.
 *
 * Breaking is first because a release page is read top-down and abandoned
 * halfway. The changelog lists changes in whatever order they were written —
 * 0.9.0 happens to open with its breaking change, and no later entry is
 * obliged to. Sorting here rather than trusting the entry means "what will
 * this upgrade cost me" is always the first thing on the page.
 */
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
 * Pure: the array arrives as an argument, so the whole decision — including
 * both ways it can refuse — is testable without touching site/changelog.mjs.
 *
 * @param {Array<{v: string, date?: string, changes: Array<[string, string, string[]?]>}>} releases
 * @param {string} version  the version being released, without a leading `v`
 * @returns {string} markdown, `###` headings, no trailing newline
 * @throws {Error} when no entry exists for `version`, or the entry is empty
 */
export function renderReleaseNotes(releases, version) {
  const entry = releases.find((r) => r.v === version);

  // Both failures produce the same instruction, because from where the reader
  // is standing they are the same problem: the changelog does not describe
  // this release. The message is read in a red job with no other context, so
  // it names the version and the file rather than assuming either is obvious.
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

  // Group first, then walk SECTIONS. Walking the changes in place would emit a
  // heading every time the type alternates, and the entries are written in the
  // order they were thought of, not sorted.
  const byType = new Map();
  for (const [type, text, components] of entry.changes) {
    if (!byType.has(type)) byType.set(type, []);
    // Components lead the bullet in bold. The changelog page puts them after
    // the text as chips because it can style them; in plain markdown a trailing
    // "(Topbar)" lands after the full stop and reads like an afterthought,
    // whereas a lead-in tells you whether the line concerns you before you
    // read it.
    const prefix = components?.length ? `**${components.join('**, **')}** — ` : '';
    byType.get(type).push(`- ${prefix}${text}`);
  }

  // Anything SECTIONS has no opinion about goes after the known sections, in
  // the order it first appeared. A type added to the changelog later must show
  // up somewhere odd-looking rather than not show up at all — silently dropping
  // a change is the exact failure this file exists to prevent, and it would be
  // invisible precisely because the release notes would still look fine.
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
  // No argument means "the version this repo is at", which is what the tagging
  // workflow is about to release. Passing one explicitly is for checking a
  // release before you bump to it.
  const version = argv[0] || JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')).version;
  const { RELEASES } = await import(pathToFileURL(resolve(root, 'site/changelog.mjs')).href);

  // The throw is the gate. Let it out as a message and a non-zero exit rather
  // than a stack trace: the reader is looking at a workflow log, and the first
  // line of a Node stack tells them nothing they need.
  try {
    process.stdout.write(`${renderReleaseNotes(RELEASES, version)}\n`);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exitCode = 1;
  }
}

// pathToFileURL, not `file://${...}`. String-concatenating the path is wrong
// for any directory containing a space or a character that needs percent
// encoding: the comparison silently comes back false, main() never runs, the
// script prints nothing and exits 0 — which a workflow reads as an empty but
// successful release-notes render. Encoding the path the same way the module
// URL is encoded is the only comparison that holds.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv.slice(2));
}
