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
 * workflow's denylist greps tracked files for the infra shapes below. The rules
 * that keep that true are stated above the fixture builder, where editing
 * happens — read them before touching a fixture.
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

/**
 * A base64url payload that is GUARANTEED to contain '-' and '_', rather than
 * one that happens to draw them.
 *
 * This exists because trusting the draw silently voids cases. `stream()` with a
 * base64url alphabet is deterministic, and the Figma seed happens to draw
 * neither character across all 40: with that fixture, narrowing the rule's
 * class to [A-Za-z0-9] leaves every case green, so nothing reports real Figma
 * tokens — which are about half '-' and '_' — going unmatched. Two of the three
 * OpenAI fixtures had the same hole. Use this anywhere a rule's class claims
 * base64url, and the claim becomes falsifiable: narrow the class, case goes red.
 */
function streamUrlSafe(seed, n) {
  if (n < 21) throw new Error(`streamUrlSafe needs n >= 21 to place both markers, got ${n}`);
  const p = [...stream(seed, n, B64URL)];
  p[9] = '-';
  p[20] = '_';
  return p.join('');
}

/** The 1Password base64url payload — pinned the same way, and always was. */
const urlPayload = streamUrlSafe('b', 260);

// ┌─ READ THIS BEFORE EDITING A FIXTURE ────────────────────────────────────┐
// │ Every fixture is a TEMPLATE LITERAL, and that is load-bearing, not      │
// │ style. `ops_eyJ${x}` puts a '$' where the rule wants a base64           │
// │ character, so the source text of this file matches nothing. Collapse    │
// │ any of them to a plain string — bake the generated value in "to make    │
// │ it readable" — and this file becomes a real finding: the pre-commit     │
// │ gate then refuses every commit in the repo, for everyone, until it is   │
// │ put back. Keep the interpolation adjacent to the prefix.                │
// │ The same trick is what keeps LESSLY_DEPLOY_TOKEN, *.lessly.run and      │
// │ ttl.sh/ out of the denylist grep, which does not exclude scripts/.      │
// └─────────────────────────────────────────────────────────────────────────┘

const note = (value) =>
  ['A note quoting something that must never reach this repo.', '', `    ${value}`, '', 'That is all.'].join('\n');

/**
 * One planted file per case, carrying two separate claims.
 *
 * `ours` — the EXACT set of rules defined in this config that may name the
 * file: {ours} when set, {} when null. Exact, not "at least", because nothing
 * else detects one of our rules eating another's territory. Widening
 * clickup-api-token until it also matched figd_… left every case green under
 * the old "expected ∈ named" oracle; for a file whose recent history is
 * deliberate loosening of character classes, that is the likeliest failure.
 * A control case is simply `ours: null` — the same claim, not a special case.
 *
 * `upstream` — gitleaks' own rules that must ALSO fire. Only asserted where
 * upstream genuinely owns the shape, never as a general requirement: the
 * default ruleset is not ours to depend on. generic-api-key names
 * deploy-token.md today and is deliberately ignored, so that a stopword or
 * entropy tweak upstream cannot turn this check red.
 */
const CASES = [
  // ── 1Password ─────────────────────────────────────────────────────────────
  {
    file: 'onepassword-standard.md',
    ours: '1password-service-account-token',
    why: 'standard-base64 payload, unbroken',
    body: note(`ops_eyJ${stream('a', 260, B64)}`),
  },
  {
    file: 'onepassword-base64url.md',
    ours: '1password-service-account-token',
    why: "base64url payload — '-' and '_' pinned, not drawn",
    body: note(`ops_eyJ${urlPayload}`),
  },
  {
    // Also stands for the wrapped case: a wrap that leaves at least 30
    // characters on the anchor line is this same assertion, because only the
    // line carrying ops_eyJ can match. A separate wrapped fixture at 47
    // characters could not fail while this one passed, so it was decoration.
    file: 'onepassword-fragment.md',
    ours: '1password-service-account-token',
    why: 'truncated to 30 characters total — the floor, and equally a wrap leaving 30 on the anchor line',
    body: note(`ops_eyJ${stream('c', 23)}`),
  },

  // ── OpenAI ────────────────────────────────────────────────────────────────
  {
    file: 'openai-admin-30.md',
    ours: 'openai-api-key-watermark',
    why: '30-character halves — upstream pins 58 or 74 and catches nothing here',
    body: note(`sk-admin-${streamUrlSafe('d', 30)}${MARK}${streamUrlSafe('e', 30)}`),
  },
  {
    file: 'openai-service-prefix.md',
    ours: 'openai-api-key-watermark',
    why: "sk-service-, a real prefix outside upstream's proj|svcacct|admin set",
    body: note(`sk-service-${streamUrlSafe('sv', 40)}${MARK}${streamUrlSafe('sv2', 40)}`),
  },
  {
    file: 'openai-wrapped-80col.md',
    ours: 'openai-api-key-watermark',
    why: 'a real-shaped 74/74 key broken at column 80 — the hole this rule was rewritten to close',
    body: note(wrap(`sk-proj-${streamUrlSafe('p1', 74)}${MARK}${streamUrlSafe('p2', 74)}`, 80)),
  },
  {
    // Upstream's rule, and ours, both name this shape — which is the point:
    // our watermark rule took a NEW id rather than overriding openai-api-key,
    // so upstream's stays live. `upstream` is what pins that.
    //
    // Renaming ours onto upstream's id is measured, not assumed: it turns five
    // cases red — this one, openai-admin-30, openai-service-prefix,
    // openai-wrapped-80col and openai-base64-aligned. Under the older oracle,
    // which only asked whether the expected id was among the names, this case
    // stayed green through that rename and the other four carried the guard.
    // The exact-set oracle is what made the rename visible here directly.
    file: 'openai-legacy.md',
    ours: 'openai-api-key-watermark',
    upstream: ['openai-api-key'],
    why: "the legacy sk-<20>watermark<20> shape gitleaks' own rule still owns",
    body: note(`sk-${stream('l1', 20)}${MARK}${stream('l2', 20)}`),
  },

  // ── The watermark rule's known false-positive class, pinned both ways ─────
  //
  // T3BlbkFJ is base64 for "OpenAI", so ANY base64 blob whose plaintext says
  // "OpenAI" starting at a 3-byte-aligned offset contains it and matches. One
  // offset in three. That is the accepted cost of anchoring on the watermark
  // alone, and these two cases keep it a measured boundary rather than a note
  // in a comment nobody re-checks. The base64 is computed here, never a
  // literal: a literal would carry the watermark into the tree.
  {
    file: 'openai-base64-aligned.md',
    ours: 'openai-api-key-watermark',
    why: 'base64 of prose naming OpenAI at a 3-aligned offset — a false positive we accept, not a bug',
    body: note(Buffer.from(`OpenAI ${'is named in this configuration blob, for testing only'}`).toString('base64')),
  },
  {
    file: 'openai-base64-unaligned.md',
    ours: null,
    why: 'the same prose one byte over — two offsets in three do not produce the watermark',
    body: note(Buffer.from(`xOpenAI ${'is named in this configuration blob, for testing only'}`).toString('base64')),
  },

  // ── Other vendor tokens ───────────────────────────────────────────────────
  {
    file: 'apify.md',
    ours: 'apify-api-token',
    why: 'Apify API token',
    body: note(`apify_api_${stream('f', 32)}`),
  },
  {
    file: 'clickup.md',
    ours: 'clickup-api-token',
    why: 'ClickUp personal API token',
    body: note(`pk_${stream('g', 8, DIGITS)}_${stream('h', 32, UPPER)}`),
  },
  {
    file: 'figma.md',
    ours: 'figma-personal-access-token',
    why: "Figma personal access token — base64url pinned, since real ones are about half '-' and '_'",
    body: note(`figd_${streamUrlSafe('i', 40)}`),
  },

  // PostHog mints five prefixes; four are secrets. One case each, so widening
  // the class to ph[xsar]_ cannot silently narrow again.
  {
    file: 'posthog-personal.md',
    ours: 'posthog-api-key',
    why: 'phx_ personal API key',
    body: note(`phx_${stream('j', 44)}`),
  },
  {
    file: 'posthog-project-secret.md',
    ours: 'posthog-api-key',
    why: 'phs_ project secret key',
    body: note(`phs_${stream('j2', 44)}`),
  },
  {
    file: 'posthog-oauth-access.md',
    ours: 'posthog-api-key',
    why: 'pha_ OAuth access token',
    body: note(`pha_${stream('j3', 44)}`),
  },
  {
    file: 'posthog-oauth-refresh.md',
    ours: 'posthog-api-key',
    why: 'phr_ OAuth refresh token',
    body: note(`phr_${stream('j4', 44)}`),
  },

  // ── The PII and infra rules this repo had before issue #179 ───────────────
  {
    file: 'email.md',
    ours: 'pii-email',
    why: 'an email on no approved domain',
    body: note(`${stream('e1', 10, LOWER)}@${stream('e2', 12, LOWER)}.test`),
  },
  {
    file: 'private-ip.md',
    ours: 'pii-private-ip',
    why: 'an RFC1918 address',
    body: note(`10.${stream('n1', 2, DIGITS)}.${stream('n2', 2, DIGITS)}.${stream('n3', 2, DIGITS)}`),
  },
  {
    file: 'lessly-host.md',
    ours: 'infra-lessly-run',
    why: 'an internal runtime hostname',
    body: note(`${stream('h1', 14, LOWER)}.lessly.run`),
  },
  {
    file: 'ttlsh-ref.md',
    ours: 'infra-ttlsh-tag',
    why: 'an ephemeral registry reference',
    body: note(`ttl.sh/${stream('t1', 12, LOWER)}:1h`),
  },
  {
    file: 'uuid.md',
    ours: 'infra-uuid',
    why: 'a v4 UUID, the shape of a Lessly service/org/product id',
    body: note(
      `${stream('u1', 8, HEX)}-${stream('u2', 4, HEX)}-4${stream('u3', 3, HEX)}-a${stream('u4', 3, HEX)}-${stream('u5', 12, HEX)}`,
    ),
  },
  {
    file: 'deploy-token.md',
    ours: 'infra-deploy-token',
    why: 'a deploy-token assignment carrying a real-looking value',
    body: note(`${DEPLOY_VAR}=${stream('dt', 24)}`),
  },

  // ── Path allowlist, both directions ───────────────────────────────────────
  {
    // Unanchored, '''.*\.svg''' exempts this from EVERY rule in the file, and
    // a name like src/icons/sprite.svg.ts is an ordinary thing in an icon kit.
    // This case is why the entry is anchored to $.
    file: 'fixture.svg.ts',
    ours: 'apify-api-token',
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
    ours: null,
    why: 'a real .svg stays exempt (composed: our path entry and gitleaks’ default both cover it)',
    body: note(`apify_api_${stream('sv4', 32)}`),
  },

  // ── Ordinary identifiers that must NOT be credentials ─────────────────────
  //
  // Four vendor rules carry a leading \b because their prefixes occur happily
  // in the middle of ordinary names. Without it every one of these five fired:
  // a rule that refuses `const glyphs_…` is a rule someone turns off. These
  // pin the boundary — drop the \b from any of the four and the matching case
  // reddens. The declarations are shaped like real source, and the file
  // extensions are real too, so nothing here is exempt by path.
  {
    file: 'identifier-posthog-glyphs.ts',
    ours: null,
    why: "`glyphs_` ends in phs_ — the PostHog project-secret prefix mid-identifier",
    body: `const glyphs_${stream('x1', 44)} = 1;\n`,
  },
  {
    file: 'identifier-posthog-alpha.ts',
    ours: null,
    why: '`alpha_` ends in pha_ — the PostHog OAuth-access prefix mid-identifier',
    body: `export const alpha_${stream('x2', 44)} = 2;\n`,
  },
  {
    file: 'identifier-figma-configd.ts',
    ours: null,
    why: '`configd_` contains figd_, and that class allows _ and -, so snake_case reaches 35 easily',
    body: `const configd_${stream('x3', 20)}_channel_name_for_the_daemon = 3;\n`,
  },
  {
    file: 'identifier-apify-myapify.ts',
    ours: null,
    why: '`myapify_api_` contains apify_api_',
    body: `const myapify_api_${stream('x4', 34)} = 4;\n`,
  },
  {
    file: 'identifier-clickup-spk.ts',
    ours: null,
    why: '`spk_12345_` contains pk_ followed by digits and uppercase',
    body: `const spk_12345_${stream('x5', 32, UPPER)} = 5;\n`,
  },

  // ── Control ───────────────────────────────────────────────────────────────
  {
    // If the rule set has degenerated into flagging everything, this notices.
    file: 'control-prose.md',
    ours: null,
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

/**
 * The exit-code contract, stated where the codes are chosen.
 *
 * 0 — every case passed.
 * 1 — one or more assertions failed. Only ever set at the end of main(), and
 *     only after every case has been evaluated, so a run lists all failures
 *     rather than the first.
 * 2 — the check could not reach a verdict: no binary, the scanner refused to
 *     start, no report, unreadable report, a renamed field. Never a raw Node
 *     stack — a security gate that dies in a traceback reads as a broken
 *     script, and a broken script is what people skip.
 *
 * `fail` is 2 and only 2. It is used for every "cannot tell" path below.
 */
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
    // Two claims, deliberately different in scope. Ours is an EXACT set over
    // config-defined rules, so a rule growing into another's territory fails.
    // Upstream is a subset check over everything, so gitleaks' defaults firing
    // where we did not ask is not our failure.
    const oursNamed = named.filter((id) => ruleIds.has(id));
    const expected = c.ours ? [c.ours] : [];
    const missing = expected.filter((id) => !oursNamed.includes(id));
    const extra = oursNamed.filter((id) => !expected.includes(id));

    if (missing.length > 0 && oursNamed.length === 0) {
      failures.push(`${c.file} — NOT CAUGHT, expected ${c.ours} (${c.why})`);
    } else if (missing.length > 0) {
      failures.push(`${c.file} — named by ${oursNamed.join(', ')}, expected ${c.ours} (${c.why})`);
    } else if (extra.length > 0) {
      failures.push(
        expected.length === 0
          ? `${c.file} — flagged by ${extra.join(', ')}, expected no rule of ours (${c.why})`
          : `${c.file} — ${c.ours} is correct, but ${extra.join(', ')} also claims it (${c.why})`,
      );
    }

    for (const up of c.upstream ?? []) {
      if (!named.includes(up)) {
        failures.push(`${c.file} — upstream ${up} no longer names it (${c.why})`);
      }
    }
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
