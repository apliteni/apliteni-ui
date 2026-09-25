#!/usr/bin/env node
// Approval runs from main without installing or executing the release's code.
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { chooseTag, registryLatest } from './release-tag.mjs';

export async function releasePolicy({ tag, version, sha, onMain, getRuns, getLatest }) {
  const manual = reason => ({ automatic: false, reason });
  if (!/^v\d+\.\d+\.\d+(?:[-+][\da-zA-Z.+-]+)?$/.test(tag) || tag !== `v${version}`) {
    return manual('Tag must match the package version.');
  }
  if (!onMain) return manual('Tag commit is not on main.');
  try {
    for (const workflow of ['ci.yml', 'security.yml']) {
      const runs = (await getRuns(workflow)).filter(run => run.head_sha === sha &&
        run.head_branch === 'main' && run.event === 'push').sort((a, b) => b.id - a.id);
      if (runs[0]?.status !== 'completed' || runs[0]?.conclusion !== 'success') {
        return manual(`${workflow} has no successful latest main run for this commit.`);
      }
    }
    const latest = await getLatest();
    if (latest === null || chooseTag(version, latest) !== 'latest') {
      return manual('Version is not above a confirmed npm latest.');
    }
    return { automatic: true, reason: 'Tag is on main, CI and Security passed, version is above npm latest.' };
  } catch {
    return manual('GitHub or npm evidence is unavailable or invalid.');
  }
}

export async function github(path) {
  const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/${path}`, {
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
  return response.json();
}

export function requireReviewEnvironment(environment) {
  if (!environment.protection_rules?.some(rule => rule.type === 'required_reviewers' && rule.reviewers?.length)) {
    throw new Error('Configure required reviewers on npm-publish-review before enabling this workflow.');
  }
}

export function readRelease(tag, cwd = process.cwd()) {
  if (!/^v\d+\.\d+\.\d+(?:[-+][\da-zA-Z.+-]+)?$/.test(tag ?? '')) throw new Error('Supply a version tag.');
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const sha = git('rev-parse', '--verify', `refs/tags/${tag}^{commit}`);
  const { version, name } = JSON.parse(git('show', `${sha}:package.json`));
  chooseTag(version, version); // Validate before writing the version to Actions outputs.
  if (name !== '@apliteni/apliteni-ui') throw new Error('Unexpected package name.');
  const onMain = spawnSync('git', ['merge-base', '--is-ancestor', sha, 'origin/main'], { cwd }).status === 0;
  return { sha, version, onMain };
}

export async function waitForCI(getRuns, { now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const deadline = now() + 600_000;
  while (now() < deadline) {
    try {
      const groups = await Promise.all(['ci.yml', 'security.yml'].map(getRuns));
      const latest = groups.map(runs => runs.sort((a, b) => b.id - a.id)[0]);
      if (latest.some(run => run?.status === 'completed' && run.conclusion !== 'success')) break;
      if (latest.every(run => run?.status === 'completed')) break;
    } catch { break; }
    await sleep(15_000);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Release must run from main.');
  // Missing environments are created unprotected by Actions: check before any
  // job names the fallback environment, so missing setup cannot approve itself.
  requireReviewEnvironment(await github('environments/npm-publish-review'));
  const tag = process.env.RELEASE_TAG;
  const { sha, version, onMain } = readRelease(tag);
  const getRuns = async workflow => {
    const result = await github(`actions/workflows/${workflow}/runs?head_sha=${sha}&branch=main&event=push&per_page=100`);
    return result.workflow_runs;
  };
  const getLatest = async () => registryLatest(spawnSync('npm', [
    'view', '@apliteni/apliteni-ui', 'dist-tags.latest', '--json', '--registry=https://registry.npmjs.org',
  ], { encoding: 'utf8', timeout: 60_000 }));
  // A version bump and its CI start together. Give CI ten minutes to finish;
  // errors and failed runs go straight to the manual path.
  if (onMain && tag === `v${version}`) {
    await waitForCI(getRuns);
  }
  const result = await releasePolicy({ tag, version, sha, onMain, getRuns, getLatest });
  appendFileSync(process.env.GITHUB_OUTPUT, `sha=${sha}\nversion=${version}\nautomatic=${result.automatic}\n`);
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Release ${tag} (${sha})\n\n${result.reason}\n\n${result.automatic ? 'Approved by policy.' : 'Waiting for npm-publish-review approval.'}\n`);
}
