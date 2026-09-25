#!/usr/bin/env node
// Select a dist-tag without moving latest backwards. No dependencies: this also
// runs beside the OIDC credential, without a checkout or dependency install.
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

function parseVersion(version) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?(?:\+[\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*)?$/.exec(version);
  const pre = match?.[4]?.split('.') ?? [];
  if (!match || pre.some((part) => /^0\d+$/.test(part))) {
    throw new Error(`Invalid semver: ${version}`);
  }
  return { core: match.slice(1, 4).map(BigInt), pre };
}

function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function chooseTag(version, latest) {
  const next = parseVersion(version);
  if (latest === null) return 'latest';
  const current = parseVersion(latest);
  for (let i = 0; i < 3; i++) {
    const order = compare(next.core[i], current.core[i]);
    if (order) return order > 0 ? 'latest' : 'backport';
  }
  if (!next.pre.length || !current.pre.length) {
    return !next.pre.length && current.pre.length ? 'latest' : 'backport';
  }
  for (let i = 0; i < Math.max(next.pre.length, current.pre.length); i++) {
    const a = next.pre[i];
    const b = current.pre[i];
    if (a === undefined) return 'backport';
    if (b === undefined) return 'latest';
    const aNumeric = /^\d+$/.test(a);
    const bNumeric = /^\d+$/.test(b);
    const order = aNumeric && bNumeric ? compare(BigInt(a), BigInt(b))
      : aNumeric !== bNumeric ? (aNumeric ? -1 : 1) : compare(a, b);
    if (order) return order > 0 ? 'latest' : 'backport';
  }
  return 'backport';
}

export function registryLatest({ status, stdout, error }) {
  if (error) throw error;
  const text = (stdout ?? '').trim();
  if (status === 0 && !text) return null; // npm prints nothing for a missing tag.
  const result = JSON.parse(text);
  if (status !== 0) {
    if (result?.error?.code === 'E404') return null;
    throw new Error(`Cannot read npm latest: ${text}`);
  }
  if (typeof result !== 'string') throw new Error(`Unexpected npm latest: ${text}`);
  parseVersion(result);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const version = process.argv[2];
  parseVersion(version);
  const latest = registryLatest(spawnSync('npm', [
    'view', '@apliteni/apliteni-ui', 'dist-tags.latest', '--json',
    '--registry=https://registry.npmjs.org',
  ], { encoding: 'utf8', timeout: 60_000 }));
  const tag = chooseTag(version, latest);
  console.error(`Publishing ${version}; registry latest ${latest ?? '(none)'}; tag ${tag}`);
  console.log(tag);
}
