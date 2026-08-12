#!/usr/bin/env node
/**
 * gitleaks-rules.check — prove every rule in .gitleaks.toml still catches the
 * thing it was written for, and still names itself when it does.
 *
 * A rule that has quietly stopped matching looks exactly like a repo with no
 * secrets in it: the scan is green either way. So this plants a fabricated
 * instance of each covered shape and asserts the scanner finds it. The rule ID
 * is half the assertion, not decoration — several of these shapes would
 * otherwise be picked up by gitleaks' generic-api-key, which needs a
 * credential-ish word next to the value and stands down on its own stopword
 * list. Being caught by that instead of by the intended rule is the footing
 * issue #179 exists to replace, so the check calls it a failure.
 *
 * Every fixture is generated here, at runtime, into a temp directory removed on
 * every exit path. None is real, and none may ever be written into the tree:
 * this repo is public, its own scan runs over scripts/, and the Security
 * workflow's denylist greps tracked files for the infra shapes below.
 *
 * ┌─ READ THIS BEFORE EDITING A FIXTURE ────────────────────────────────────┐
 * │ Every fixture is a TEMPLATE LITERAL, and that is load-bearing, not      │
 * │ style. `ops_eyJ${x}` puts a '$' where the rule wants a base64           │
 * │ character, so the source text of this file matches nothing. Collapse    │
 * │ any of them to a plain string — bake the generated value in "to make    │
 * │ it readable" — and this file becomes a real finding: the pre-commit     │
 * │ gate then refuses every commit in the repo, for everyone, until it is   │
 * │ put back. Keep the interpolation adjacent to the prefix.                │
 * │ The same trick is what keeps LESSLY_DEPLOY_TOKEN, *.lessly.run and      │
 * │ ttl.sh/ out of the denylist grep, which does not exclude scripts/.      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * NOT named *.test.js on purpose. `npm test` globs scripts/**\/*.test.js and
 * runs on a machine with no gitleaks; this check needs the pinned binary and
 * belongs to the security workflow, which downloads it.
 *
 * Usage: node scripts/gitleaks-rules.check.mjs [path-to-.gitleaks.toml]
 *        GITLEAKS_BIN=./gitleaks node scripts/gitleaks-rules.check.mjs
 *
 * The argument exists so the check can be pointed at an older or deliberately
 * mutated config to prove it still fails there. Default is this repo's own.
 *
 * Exit codes: 0 all cases pass. 1 one or more assertions failed. 2 the check
 * could not reach a verdict (no binary, scanner error, unreadable report).
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFIG = resolve(process.argv[2] ?? join(HERE, '..', '.gitleaks.toml'));
const GITLEAKS = process.env.GITLEAKS_BIN ?? 'gitleaks';

const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const B64 = `${ALNUM}+/`; // standard base64
const B64URL = `${ALNUM}_-`; // base64url — the alphabet real tokens use
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const LOWER = 'abcdefghijklmnopqrstuvwxyz0123456789';
const DIGITS = '0123456789';
const HEX = '0123456789abcdef';

// base64 of "OpenAI". Every key OpenAI mints carries it; it is what the
// watermark rule anchors on, and the reason that rule needs no prefix.
const MARK = 'T3BlbkFJ';

// Assembled from pieces so the literal name never appears in this file — the
// Security workflow's denylist greps tracked files for it followed by '='.
const DEPLOY_VAR = ['LESSLY', 'DEPLOY', 'TOKEN'].join('_');

/**
 * A deterministic hash stream, so a failure is reproducible and every payload
 * is obviously synthetic. Nothing here is drawn from a real credential.
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

/** Break a long value across lines, the way prose or a formatter would. */
function wrap(value, columns) {
  return (value.match(new RegExp(`.{1,${columns}}`, 'g')) ?? []).join('\n');
}

/** The base64url 1Password payload: '-' and '_' early, as a real one has. */
const urlPayload = (() => {
  const p = [...stream('b', 260)];
  p[9] = '-';
  p[20] = '_';
  return p.join('');
})();

const note = (value) =>
  ['A note quoting something that must never reach this repo.', '', `    ${value}`, '', 'That is all.'].join('\n');

/**
 * One planted file per case. `rule` is the ID that must name the finding.
 * `rule: null` means the opposite assertion: no rule DEFINED IN THIS CONFIG
 * may name it. Deliberately not "no findings at all" — that would make the
 * case hostage to gitleaks' entire default ruleset, where changing one word of
 * the prose to "api key" flips generic-api-key on and fails the check for a
 * reason that has nothing to do with us.
 */
const CASES = [
  // ── 1Password ─────────────────────────────────────────────────────────────
  {
    file: 'onepassword-standard.md',
    rule: '1password-service-account-token',
    why: 'standard-base64 payload, unbroken',
    body: note(`ops_eyJ${stream('a', 260, B64)}`),
  },
  {
    file: 'onepassword-base64url.md',
    rule: '1password-service-account-token',
    why: "base64url payload — '-' and '_' early, which upstream's class cannot reach",
    body: note(`ops_eyJ${urlPayload}`),
  },
  {
    file: 'onepassword-fragment.md',
    rule: '1password-service-account-token',
    why: 'truncated to 30 characters total, the floor the remainder quantifier sets',
    body: note(`ops_eyJ${stream('c', 23)}`),
  },
  {
    file: 'onepassword-wrapped.md',
    rule: '1password-service-account-token',
    why: 'wrapped, leaving 47 characters on the anchor line — above the 30 floor',
    body: note(`ops_eyJ${stream('w', 40)}\n    ${stream('w2', 60)}`),
  },

  // ── OpenAI ────────────────────────────────────────────────────────────────
  {
    file: 'openai-admin-30.md',
    rule: 'openai-api-key-watermark',
    why: '30-character halves — upstream pins 58 or 74 and catches nothing here',
    body: note(`sk-admin-${stream('d', 30, B64URL)}${MARK}${stream('e', 30, B64URL)}`),
  },
  {
    file: 'openai-service-prefix.md',
    rule: 'openai-api-key-watermark',
    why: "sk-service-, a real prefix outside upstream's proj|svcacct|admin set",
    body: note(`sk-service-${stream('sv', 40, B64URL)}${MARK}${stream('sv2', 40, B64URL)}`),
  },
  {
    file: 'openai-wrapped-80col.md',
    rule: 'openai-api-key-watermark',
    why: 'a real-shaped 74/74 key broken at column 80 — the hole this rule was rewritten to close',
    body: note(wrap(`sk-proj-${stream('p1', 74, B64URL)}${MARK}${stream('p2', 74, B64URL)}`, 80)),
  },
  {
    // Upstream's rule, not ours. It is still live because our watermark rule
    // took a NEW id rather than overriding openai-api-key; if someone ever
    // renames ours onto upstream's id, this case goes red.
    file: 'openai-legacy.md',
    rule: 'openai-api-key',
    why: "the legacy sk-<20>watermark<20> shape gitleaks' own rule still owns",
    body: note(`sk-${stream('l1', 20)}${MARK}${stream('l2', 20)}`),
  },

  // ── Other vendor tokens ───────────────────────────────────────────────────
  {
    file: 'apify.md',
    rule: 'apify-api-token',
    why: 'Apify API token',
    body: note(`apify_api_${stream('f', 32)}`),
  },
  {
    file: 'clickup.md',
    rule: 'clickup-api-token',
    why: 'ClickUp personal API token',
    body: note(`pk_${stream('g', 8, DIGITS)}_${stream('h', 32, UPPER)}`),
  },
  {
    file: 'figma.md',
    rule: 'figma-personal-access-token',
    why: 'Figma personal access token',
    body: note(`figd_${stream('i', 40, B64URL)}`),
  },

  // PostHog mints five prefixes; four are secrets. One case each, so widening
  // the class to ph[xsar]_ cannot silently narrow again.
  {
    file: 'posthog-personal.md',
    rule: 'posthog-api-key',
    why: 'phx_ personal API key',
    body: note(`phx_${stream('j', 44)}`),
  },
  {
    file: 'posthog-project-secret.md',
    rule: 'posthog-api-key',
    why: 'phs_ project secret key',
    body: note(`phs_${stream('j2', 44)}`),
  },
  {
    file: 'posthog-oauth-access.md',
    rule: 'posthog-api-key',
    why: 'pha_ OAuth access token',
    body: note(`pha_${stream('j3', 44)}`),
  },
  {
    file: 'posthog-oauth-refresh.md',
    rule: 'posthog-api-key',
    why: 'phr_ OAuth refresh token',
    body: note(`phr_${stream('j4', 44)}`),
  },

  // ── The PII and infra rules this repo had before issue #179 ───────────────
  {
    file: 'email.md',
    rule: 'pii-email',
    why: 'an email on no approved domain',
    body: note(`${stream('e1', 10, LOWER)}@${stream('e2', 12, LOWER)}.test`),
  },
  {
    file: 'private-ip.md',
    rule: 'pii-private-ip',
    why: 'an RFC1918 address',
    body: note(`10.${stream('n1', 2, DIGITS)}.${stream('n2', 2, DIGITS)}.${stream('n3', 2, DIGITS)}`),
  },
  {
    file: 'lessly-host.md',
    rule: 'infra-lessly-run',
    why: 'an internal runtime hostname',
    body: note(`${stream('h1', 14, LOWER)}.lessly.run`),
  },
  {
    file: 'ttlsh-ref.md',
    rule: 'infra-ttlsh-tag',
    why: 'an ephemeral registry reference',
    body: note(`ttl.sh/${stream('t1', 12, LOWER)}:1h`),
  },
  {
    file: 'uuid.md',
    rule: 'infra-uuid',
    why: 'a v4 UUID, the shape of a Lessly service/org/product id',
    body: note(
      `${stream('u1', 8, HEX)}-${stream('u2', 4, HEX)}-4${stream('u3', 3, HEX)}-a${stream('u4', 3, HEX)}-${stream('u5', 12, HEX)}`,
    ),
  },
  {
    file: 'deploy-token.md',
    rule: 'infra-deploy-token',
    why: 'a deploy-token assignment carrying a real-looking value',
    body: note(`${DEPLOY_VAR}=${stream('dt', 24)}`),
  },

  // ── Path allowlist, both directions ───────────────────────────────────────
  {
    // Unanchored, '''.*\.svg''' exempts this from EVERY rule in the file, and
    // a name like src/icons/sprite.svg.ts is an ordinary thing in an icon kit.
    // This case is why the entry is anchored to $.
    file: 'fixture.svg.ts',
    rule: 'apify-api-token',
    why: 'a path merely CONTAINING .svg must not inherit the .svg exemption',
    body: note(`apify_api_${stream('sv3', 32)}`),
  },
  {
    // The other half: genuine SVGs stay exempt, so anchoring cannot have lit up
    // every brand asset in the tree.
    //
    // Measured caveat, so nobody reads more into a green than it carries: this
    // passes even with our own .svg entry deleted, because gitleaks' DEFAULT
    // allowlist already exempts .svg (along with .png/.jpg/.gif/.pdf/.doc/.bin)
    // and useDefault pulls it in. So this case pins the COMPOSED behaviour, not
    // our entry — our entry is belt-and-braces over the default. What it would
    // catch is that default going away.
    file: 'exempt-fixture.svg',
    rule: null,
    why: 'a real .svg stays exempt (composed: our path entry and gitleaks’ default both cover it)',
    body: note(`apify_api_${stream('sv4', 32)}`),
  },

  // ── Control ───────────────────────────────────────────────────────────────
  {
    // If the rule set has degenerated into flagging everything, this notices.
    file: 'control-prose.md',
    rule: null,
    why: 'prose naming the ops_eyJ prefix, plus a phc_ project key that is public by design',
    body: [
      'A 1Password service account token starts with the prefix ops_eyJ, which',
      'is the vendor prefix followed by the base64 of the two characters that',
      'open its JSON claims. That prefix on its own is not a credential.',
      '',
      `The PostHog project identifier ships inside published pages: phc_${stream('k', 44)}`,
    ].join('\n'),
  },
];

/** Rule IDs this config defines, for scoping the control assertion. */
function configuredRuleIds(text) {
  return new Set([...text.matchAll(/^id\s*=\s*"([^"]+)"/gm)].map((m) => m[1]));
}

function gitleaksVersion() {
  const v = spawnSync(GITLEAKS, ['version'], { encoding: 'utf8' });
  return v.status === 0 ? (v.stdout ?? '').trim() : 'unknown';
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function main() {
  if (!existsSync(CONFIG)) fail(`gitleaks-rules.check: no config at ${CONFIG}`);
  const ruleIds = configuredRuleIds(readFileSync(CONFIG, 'utf8'));

  const root = mkdtempSync(join(tmpdir(), 'gitleaks-rules-'));
  // Registered before anything is planted, and on 'exit' rather than in a
  // `finally`: a `finally` does NOT run after process.exit, so every early
  // bail below would otherwise leave eight credential-shaped files on disk.
  process.on('exit', () => rmSync(root, { recursive: true, force: true }));
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130));

  const scanDir = join(root, 'files');
  const report = join(root, 'report.json'); // outside the scanned directory
  mkdirSync(scanDir);
  for (const c of CASES) writeFileSync(join(scanDir, c.file), `${c.body}\n`);

  const run = spawnSync(
    GITLEAKS,
    // prettier-ignore
    [
      'detect', '--no-git', '--source', scanDir, '--config', CONFIG,
      '--report-format', 'json', '--report-path', report,
      '--redact', '--no-banner', '--exit-code', '0',
    ],
    { encoding: 'utf8' },
  );

  if (run.error?.code === 'ENOENT') {
    fail(
      `gitleaks not found (tried "${GITLEAKS}").\n` +
        'The Security workflow (.github/workflows/security.yml) downloads the pinned\n' +
        'v8.30.1 binary into the working directory and runs this check with\n' +
        'GITLEAKS_BIN=./gitleaks. Locally, put gitleaks on PATH or set GITLEAKS_BIN.',
    );
  }
  if (run.error) fail(`gitleaks-rules.check: could not run "${GITLEAKS}": ${run.error.message}`);
  if (run.status !== 0) fail(`gitleaks-rules.check: "${GITLEAKS}" exited ${run.status}\n${(run.stderr ?? '').trim()}`);
  if (!existsSync(report)) fail(`gitleaks-rules.check: gitleaks wrote no report at ${report}`);

  let findings;
  try {
    findings = JSON.parse(readFileSync(report, 'utf8'));
  } catch (err) {
    fail(`gitleaks-rules.check: report at ${report} is not valid JSON: ${err.message}`);
  }
  if (!Array.isArray(findings)) fail('gitleaks-rules.check: report JSON is not an array of findings');

  const byFile = new Map();
  for (const f of findings) {
    if (typeof f?.File !== 'string' || typeof f?.RuleID !== 'string') {
      fail('gitleaks-rules.check: a finding is missing File or RuleID — report format changed');
    }
    const key = basename(f.File);
    if (!byFile.has(key)) byFile.set(key, new Set());
    byFile.get(key).add(f.RuleID);
  }

  const failures = [];
  for (const c of CASES) {
    const named = [...(byFile.get(c.file) ?? [])].sort();
    if (c.rule === null) {
      const ours = named.filter((id) => ruleIds.has(id));
      if (ours.length > 0) failures.push(`${c.file} — flagged by ${ours.join(', ')}, expected none (${c.why})`);
      continue;
    }
    if (named.length === 0) failures.push(`${c.file} — NOT CAUGHT, expected ${c.rule} (${c.why})`);
    else if (!named.includes(c.rule)) failures.push(`${c.file} — caught by ${named.join(', ')}, expected ${c.rule} (${c.why})`);
  }

  const where = `config: ${CONFIG} — ${gitleaksVersion()}`;
  if (failures.length > 0) {
    console.error(`gitleaks rule regression: ${failures.length} of ${CASES.length} cases failed`);
    console.error(where);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`gitleaks rule regression: all ${CASES.length} cases pass (${where})`);
}

try {
  main();
} catch (err) {
  fail(`gitleaks-rules.check: ${err?.stack ?? err}`);
}
