#!/usr/bin/env node
/**
 * gitleaks-rules.check — prove the rules in .gitleaks.toml still catch the
 * credentials they were written for, and still name themselves when they do.
 *
 * A rule that has quietly stopped matching looks exactly like a repo with no
 * secrets in it: the scan is green either way. So this plants a fabricated
 * credential of each covered shape and asserts the scanner finds it. The rule
 * ID is half the assertion, not decoration — several of these shapes would
 * otherwise be picked up by gitleaks' generic-api-key, which needs a
 * credential-ish word next to the value and stands down on its own stopword
 * list. Being caught by that instead of by the vendor rule is the footing
 * issue #179 exists to replace, so the check calls it a failure.
 *
 * Every token is generated here, at runtime, into a temp directory that is
 * deleted afterwards. None of them is real, and none of them is ever written
 * into the tree: this repo is public, and its own scan would flag them.
 *
 * NOT named *.test.js on purpose. `npm test` globs scripts/**\/*.test.js and
 * runs on a machine with no gitleaks; this check needs the pinned binary and
 * belongs to the security workflow, which downloads it.
 *
 * Usage: node scripts/gitleaks-rules.check.mjs [path-to-.gitleaks.toml]
 *
 * The argument exists so the check can be pointed at an older config to prove
 * it still fails there. Default is this repo's own .gitleaks.toml.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFIG = resolve(process.argv[2] ?? join(HERE, '..', '.gitleaks.toml'));

const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const B64 = `${ALNUM}+/`; // standard base64
const B64URL = `${ALNUM}_-`; // base64url — the alphabet real tokens use
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DIGITS = '0123456789';

/**
 * A deterministic hash stream, so a failure is reproducible and the payloads
 * are obviously synthetic. Nothing here is drawn from a real credential.
 */
function stream(seed, n, alphabet = ALNUM) {
  const out = [];
  let h = Buffer.from(seed, 'utf8');
  while (out.length < n) {
    h = createHash('sha256').update(h).digest();
    for (const b of h) {
      out.push(alphabet[b % alphabet.length]);
      if (out.length === n) break;
    }
  }
  return out.join('');
}

// The base64url 1Password token: a '-' and a '_' early in the payload, which
// is what a real one looks like and what the upstream rule cannot reach.
const urlPayload = (() => {
  const p = [...stream('b', 260)];
  p[9] = '-';
  p[20] = '_';
  return p.join('');
})();

/**
 * One planted file each. `rule` is the ID that must name the finding; a case
 * with `rule: null` is a control that must produce no finding at all.
 */
const CASES = [
  {
    file: 'onepassword-base64.md',
    rule: '1password-service-account-token',
    why: '1Password token, standard-base64 payload',
    token: `ops_eyJ${stream('a', 260, B64)}`,
  },
  {
    file: 'onepassword-base64url.md',
    rule: '1password-service-account-token',
    why: "1Password token, base64url payload ('-' and '_' early)",
    token: `ops_eyJ${urlPayload}`,
  },
  {
    file: 'onepassword-fragment.md',
    rule: '1password-service-account-token',
    why: '1Password token truncated to 30 characters total, as prose wraps it',
    token: `ops_eyJ${stream('c', 23)}`,
  },
  {
    file: 'openai-admin.md',
    rule: 'openai-api-key-watermark',
    why: 'OpenAI admin key with 30-character halves — upstream wants 58 or 74',
    token: `sk-admin-${stream('d', 30, B64URL)}T3BlbkFJ${stream('e', 30, B64URL)}`,
  },
  {
    file: 'apify.md',
    rule: 'apify-api-token',
    why: 'Apify API token',
    token: `apify_api_${stream('f', 32)}`,
  },
  {
    file: 'clickup.md',
    rule: 'clickup-api-token',
    why: 'ClickUp personal API token',
    token: `pk_${stream('g', 8, DIGITS)}_${stream('h', 32, UPPER)}`,
  },
  {
    file: 'figma.md',
    rule: 'figma-personal-access-token',
    why: 'Figma personal access token',
    token: `figd_${stream('i', 40, B64URL)}`,
  },
  {
    file: 'posthog.md',
    rule: 'posthog-personal-api-key',
    why: 'PostHog personal API key',
    token: `phx_${stream('j', 44)}`,
  },
  {
    // The control. If the rule set has degenerated into refusing everything,
    // this is what notices. phc_ is PostHog's project key, which ships inside
    // published pages by design — flagging it would flag every landing page.
    file: 'control-prose.md',
    rule: null,
    why: 'prose naming the ops_eyJ prefix, and a public phc_ project key',
    token: null,
    body: [
      'A 1Password service account token starts with the prefix ops_eyJ, which',
      'is the vendor prefix followed by the base64 of the two characters that',
      'open its JSON claims. That prefix on its own is not a credential.',
      '',
      `The PostHog project identifier is public by design: phc_${stream('k', 44)}`,
    ].join('\n'),
  },
];

function plant(dir) {
  for (const c of CASES) {
    const body =
      c.body ??
      ['A note quoting a credential that must never reach this repo.', '', `    ${c.token}`, '', 'That is all.'].join(
        '\n',
      );
    writeFileSync(join(dir, c.file), `${body}\n`);
  }
}

function scan(dir) {
  const report = join(dir, 'report.json');
  const run = spawnSync(
    'gitleaks',
    [
      'detect',
      '--no-git',
      '--source',
      dir,
      '--config',
      CONFIG,
      '--report-format',
      'json',
      '--report-path',
      report,
      '--no-banner',
      '--exit-code',
      '0',
    ],
    { encoding: 'utf8' },
  );

  if (run.error?.code === 'ENOENT') {
    console.error(
      'gitleaks is not on PATH.\n' +
        'The security workflow (.github/workflows/security.yml) downloads the pinned\n' +
        'v8.30.1 binary into the working directory and runs this check with\n' +
        'PATH="$PWD:$PATH". Locally, put a v8.30.1 gitleaks on PATH and re-run.',
    );
    process.exit(2);
  }
  if (run.status !== 0) {
    console.error(`gitleaks exited ${run.status}\n${run.stderr ?? ''}`);
    process.exit(2);
  }

  // An empty report file is valid gitleaks output for "nothing found".
  const raw = readFileSync(report, 'utf8').trim();
  return raw === '' ? [] : JSON.parse(raw);
}

function main() {
  const dir = mkdtempSync(join(tmpdir(), 'gitleaks-rules-'));
  let findings;
  try {
    plant(dir);
    findings = scan(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  const byFile = new Map();
  for (const f of findings) {
    const key = basename(f.File ?? '');
    if (!byFile.has(key)) byFile.set(key, new Set());
    byFile.get(key).add(f.RuleID);
  }

  const failures = [];
  for (const c of CASES) {
    const rules = [...(byFile.get(c.file) ?? [])].sort();
    if (c.rule === null) {
      if (rules.length > 0) {
        failures.push(`${c.file} — control was flagged by ${rules.join(', ')} (${c.why})`);
      }
      continue;
    }
    if (rules.length === 0) {
      failures.push(`${c.file} — NOT CAUGHT, expected ${c.rule} (${c.why})`);
    } else if (!rules.includes(c.rule)) {
      failures.push(`${c.file} — caught by ${rules.join(', ')}, expected ${c.rule} (${c.why})`);
    }
  }

  const checked = CASES.length;
  if (failures.length > 0) {
    console.error(`gitleaks rule regression: ${failures.length} of ${checked} cases failed`);
    console.error(`config: ${CONFIG}`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }

  console.log(`gitleaks rule regression: all ${checked} cases pass (config: ${CONFIG})`);
}

main();
