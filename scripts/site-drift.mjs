#!/usr/bin/env node
/**
 * Check that the deployed static site reflects the version and release list in
 * this repository. The verdict half is pure so its failure cases are cheap to
 * exercise without a network.
 */

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function assessSite({ expectedVersion, expectedReleases, topbarHtml, changelogHtml }) {
  const expected = expectedReleases.map(String);
  const topbarVersion = topbarHtml?.match(/class="ver">v([^<]+)</)?.[1] || null;
  const changelogVersions = [...(changelogHtml?.matchAll(/class="rel__v">v([^<]+)</g) || [])]
    .map((match) => match[1]);
  const verdict = {
    drift: false,
    reason: 'in-sync',
    expectedVersion,
    topbarVersion,
    expectedReleases: expected,
    changelogVersions,
    summary: '',
  };

  if (!topbarVersion || !changelogVersions.length) {
    verdict.reason = 'site-unreadable';
    verdict.summary = 'The deployed site did not expose its version or changelog releases.';
    return verdict;
  }
  if (topbarVersion !== expectedVersion) {
    verdict.drift = true;
    verdict.reason = 'version-mismatch';
    verdict.summary = `The deployed site badge is v${topbarVersion}; the repository is at v${expectedVersion}.`;
    return verdict;
  }
  if (changelogVersions.length !== expected.length || changelogVersions.some((v, i) => v !== expected[i])) {
    verdict.drift = true;
    verdict.reason = 'changelog-mismatch';
    verdict.summary =
      `The deployed changelog has ${changelogVersions.length} releases; the repository has ` +
      `${expected.length} through v${expectedVersion}.`;
    return verdict;
  }

  verdict.summary = `The deployed site is at v${expectedVersion} and lists all ${expected.length} releases.`;
  return verdict;
}

async function main() {
  const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const { RELEASES } = await import(new URL('../site/changelog.mjs', import.meta.url));
  const urls = [`https://ui.apli.tech/`, `https://ui.apli.tech/changelog/`];
  try {
    const responses = await Promise.all(urls.map((url) => fetch(url, { signal: AbortSignal.timeout(30_000) })));
    if (responses.some((response) => !response.ok)) throw new Error('site returned a non-success status');
    const [topbarHtml, changelogHtml] = await Promise.all(responses.map((response) => response.text()));
    const verdict = assessSite({
      expectedVersion: version,
      expectedReleases: RELEASES.map((release) => release.v),
      topbarHtml,
      changelogHtml,
    });
    process.stdout.write(`${JSON.stringify(verdict)}\n`);
    process.stderr.write(`${verdict.summary}\n`);
    process.exitCode = verdict.drift ? 2 : 0;
  } catch (error) {
    const verdict = { drift: false, reason: 'site-unreachable', summary: `Could not read the deployed site: ${error.message}` };
    process.stdout.write(`${JSON.stringify(verdict)}\n`);
    process.stderr.write(`${verdict.summary}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
