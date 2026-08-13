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
 * A case, though, can quietly stop testing anything: three of them did, and a
 * throwaway script found all three. So the cases are not the whole gate. After
 * they pass, this weakens every rule in .gitleaks.toml along each axis that
 * rule actually has — its character classes, its length floors, its word
 * boundaries, its id, its entropy — and re-runs every case against the weakened
 * config. The bar is per SUBJECT: a subject none of whose mutations kills a case
 * is not proven, and fails. Every INDIVIDUAL mutation that survives is printed,
 * and one that survives with no written justification fails too — see JUSTIFIED
 * below, which is also where a justification that has stopped being true turns
 * the run red. The mutation table is DERIVED from the config text, never listed
 * here.
 *
 * A SUBJECT IS A RULE OR AN ALLOWLIST ENTRY, because a gate can be switched off
 * from either side. Adding two lines to [allowlist] regexes takes this repo's
 * scan from "leaks found: 1" to "no leaks found" without touching a rule, and
 * the pass used to be blind to it: an unanchored paths entry generated no
 * mutation at all, and regexes had no axis whatsoever. So every entry in both
 * lists is mutated by being REMOVED, and is proven when some case goes red
 * without it. An entry no case exercises fails, exactly like a rule with no
 * case — which is what an exemption added for a shape nobody tests looks like.
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
 * The mutation pass uses that same seam from the inside: each mutated config is
 * written to the run's temp directory and judged by the same engine. Nothing
 * ever writes to .gitleaks.toml.
 *
 * why: docs/adr/0008-a-rule-is-proven-by-the-mutation-that-kills-its-case.md
 * why: docs/adr/0004-the-gates-discover-their-subjects.md
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

// The fabricated "shown once" value in Access.stories.js, which the [allowlist]
// regexes exempt by exact string. Assembled for the same reason as everything
// else here: written whole it would be a credential-shaped literal in a tracked
// file, and the point of this file is that it contains none.
const STORY_PLACEHOLDER = ['apli', 'sk', 'live', ['9f2c4b7e', '1a06d8f3', 'c5b2e9a1', 'd4f70c83'].join('')].join('_');

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
 *
 * `forbidden` — the mirror, and it exists for exactly one job: an [allowlist]
 * entry whose only effect is to silence an UPSTREAM rule cannot be proven by
 * `ours` at all, because no rule of ours ever names the shape. The demo-token
 * entry is that entry. Naming the upstream rule here does tie one case to
 * upstream's ruleset, which the paragraph above avoids on purpose — but the
 * alternative is an allowlist entry nothing exercises, which is the hole this
 * whole axis closes. Used nowhere else.
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
    // The watermark rule is an alternation, and each branch carries its own
    // class and its own floor. Narrowing or raising ONE branch leaves the other
    // matching, so a fixture that both branches can reach proves neither. This
    // one ends at the watermark, so only the leading branch can match it;
    // openai-wrapped-80col.md is the mirror, reachable only by the trailing
    // branch. Between them every branch of that rule is falsifiable.
    file: 'openai-watermark-tail.md',
    ours: 'openai-api-key-watermark',
    why: 'a key quoted only as far as its watermark — the leading branch alone can match',
    body: note(`sk-proj-${streamUrlSafe('w1', 30)}${MARK}`),
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
    // Both classes in the email rule carry '_' and '-', and both are '+'
    // quantified, so narrowing one only SHORTENS the match on an ordinary
    // address — the rule still names the file and nothing reddens. The two
    // cases below are the positions where narrowing breaks the match outright:
    // the character adjacent to the '@' on each side.
    file: 'email-underscore-local.md',
    ours: 'pii-email',
    why: "a local part that is punctuation — narrow the local class and this stops being an email",
    body: note(`_@${stream('e3', 12, LOWER)}.test`),
  },
  {
    file: 'email-hyphen-domain.md',
    ours: 'pii-email',
    why: 'a hyphenated domain — narrow the domain class and the run to the TLD breaks',
    body: note(`${stream('e4', 8, LOWER)}@${stream('e5', 6, LOWER)}-${stream('e6', 6, LOWER)}.test`),
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
  // The two shapes the rule missed while it carried a leading \b, and the reason
  // it no longer does: \b sits between a word character and a non-word one, and
  // there is no such pair between "_" and a letter or between a capital and a
  // letter. Both are ordinary internal hostnames. They are cases rather than a
  // note in .gitleaks.toml because a comment cannot go red — put the leading \b
  // back and these two do. The interpolation sits against `.lessly.run` for the
  // reason the box above gives.
  {
    file: 'lessly-host-underscore-label.md',
    ours: 'infra-lessly-run',
    why: 'a hostname label reached from "_" — no word boundary there, so a leading \\b misses it',
    body: note(`api_${stream('h2', 10, LOWER)}.lessly.run`),
  },
  {
    file: 'lessly-host-capital-label.md',
    ours: 'infra-lessly-run',
    why: 'a hostname label reached from a capital — likewise no boundary, and likewise missed',
    body: note(`API${stream('h3', 10, LOWER)}.lessly.run`),
  },
  {
    // The dash sits second, right behind the anchor, rather than somewhere in
    // the middle: the class after it is '+' quantified, so a dash further along
    // would leave a shorter run still matching and the class would be untested.
    file: 'ttlsh-ref.md',
    ours: 'infra-ttlsh-tag',
    why: 'an ephemeral registry reference, dashed the way real tags are — and dashed against the anchor',
    body: note(`ttl.sh/${stream('t0', 1, LOWER)}-${stream('t1', 10, LOWER)}:1h`),
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
    why: "a deploy-token assignment carrying a real-looking value — '-' and '_' pinned, so the class is falsifiable",
    body: note(`${DEPLOY_VAR}=${streamUrlSafe('dt', 24)}`),
  },

  // ── The allowlist's own entries, one case each ────────────────────────────
  //
  // An [allowlist] entry is held to the same bar as a rule: the mutation is
  // REMOVING it, and it is proven when some case goes red without it. An entry
  // exists to suppress something, so a case that relies on the suppression is
  // the honest test — and until these existed, five of the six `regexes`
  // entries were exercised by nothing at all. That is what makes an entry added
  // to switch the gate off (AKIA…, gh[pousr]_… — measured: they take the scan
  // from one finding to none) look exactly like the entries already there.
  //
  // Each address below is one the pii-email rule DOES match; the allowlist is
  // the only reason the file is clean. Domains are real approved ones, so the
  // case tests the entry as written rather than a paraphrase of it.
  {
    file: 'approved-corporate.md',
    ours: null,
    why: 'mail on the corporate domain — allowlisted, and flagged the moment that entry goes',
    body: note(`${stream('m1', 10, LOWER)}@apliteni.com`),
  },
  {
    file: 'approved-reserved-tld.md',
    ours: null,
    why: 'RFC 2606 reserves .test, so no address there can be deliverable — the fixtures below use it',
    body: note(`${stream('m2', 10, LOWER)}@apliteni.test`),
  },
  {
    file: 'approved-personal-domain.md',
    ours: null,
    why: 'the second approved domain, exempt by its own entry and nothing else',
    body: note(`${stream('m3', 10, LOWER)}@sabirov.io`),
  },
  {
    file: 'approved-github-noreply.md',
    ours: null,
    why: 'the address every commit made through the GitHub UI carries',
    body: note(`${stream('m4', 8, DIGITS)}+${stream('m5', 10, LOWER)}@users.noreply.github.com`),
  },
  {
    file: 'approved-example-domain.md',
    ours: null,
    why: 'RFC 2606 again — the placeholder domain documentation and fixtures use',
    body: note(`${stream('m6', 10, LOWER)}@example.com`),
  },
  {
    // The one entry here that is NOT a domain. acme.io is a domain somebody
    // really owns, so .gitleaks.toml exempts the exact string rather than the
    // domain — exempting the domain would wave through a real address at it.
    // That makes this case a literal where its neighbours are generated: a
    // generated local part would not be the allowlisted string and the file
    // would be flagged, which is the opposite of what this asserts.
    //
    // This entry arrived on main in #191 ahead of the guideline page that uses
    // it, so nothing in the tree exercised it and the entry-remove mutation
    // survived. That is the pass doing its job on the first entry added after
    // it existed; the answer is this case, not a justification.
    file: 'approved-guideline-example.md',
    ours: null,
    why: 'the one made-up address a guideline page quotes — exempted as a literal, not as a domain',
    body: note('ops@acme.io'),
  },
  {
    // The one entry whose suppression is invisible to `ours`: no rule of ours
    // matches this shape, upstream's generic-api-key does, and `forbidden` is
    // how a case can say so. See the note on `forbidden` above.
    file: 'access-demo.stories.js',
    ours: null,
    forbidden: ['generic-api-key'],
    why: 'the fabricated “shown once” value in Access.stories.js — exempt by exact string, not by shape',
    body: `export const Access = { args: { apiKey: '${STORY_PLACEHOLDER}' } };\n`,
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
    // The same claim for the other path entry. `package-lock.json` is anchored
    // to both ends; un-anchored it would exempt any path merely CONTAINING the
    // name, and a note ABOUT the lockfile is the ordinary way that happens.
    file: 'package-lock.json.md',
    ours: 'apify-api-token',
    why: 'a path merely containing package-lock.json must not inherit the lockfile exemption',
    body: note(`apify_api_${stream('pl', 32)}`),
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

  // ── Shapes the infra rules must NOT claim, one per boundary ───────────────
  //
  // The four rules above are anchored on a prefix; these three are anchored on
  // a SHAPE, and the \b at each end is what stops the shape being found inside
  // a longer one. Each case below satisfies every boundary but one, so removing
  // that one boundary — and only that one — reddens it. None of these is the
  // thing its rule is for: a five-part number is not an address, a 12-hex group
  // is not a UUID, and myttl.sh is somebody else's domain.
  {
    file: 'identifier-ip-prefixed.ts',
    ours: null,
    why: 'a four-part build stamp whose first part ENDS in 10 — an address only if the leading \\b goes',
    body: `const buildStamp = '2110.${stream('n4', 2, DIGITS)}.${stream('n5', 2, DIGITS)}.${stream('n6', 2, DIGITS)}';\n`,
  },
  {
    file: 'identifier-ip-suffixed.ts',
    ours: null,
    why: 'a last group of four digits — no octet is that long, so only dropping the trailing \\b matches it',
    body: `const serial = '10.${stream('n7', 2, DIGITS)}.${stream('n8', 2, DIGITS)}.${stream('n9', 4, DIGITS)}';\n`,
  },
  {
    file: 'identifier-uuid-prefixed.ts',
    ours: null,
    why: 'a 12-hex first group — a UUID hides inside it only if the leading \\b goes',
    body: `const digest = '${stream('v1', 12, HEX)}-${stream('v2', 4, HEX)}-4${stream('v3', 3, HEX)}-a${stream('v4', 3, HEX)}-${stream('v5', 12, HEX)}';\n`,
  },
  {
    file: 'identifier-uuid-suffixed.ts',
    ours: null,
    why: 'a 14-hex last group — likewise, but for the trailing \\b',
    body: `const digest = '${stream('v6', 8, HEX)}-${stream('v7', 4, HEX)}-4${stream('v8', 3, HEX)}-a${stream('v9', 3, HEX)}-${stream('v10', 14, HEX)}';\n`,
  },
  {
    // Written with the interpolation against the prefix for the reason the box
    // above gives: the denylist grep looks for ttl.sh/ followed by a lowercase
    // character in tracked files, and it does not exclude scripts/.
    file: 'identifier-ttlsh-lookalike.ts',
    ours: null,
    why: 'myttl.sh is a different domain — ours only without the leading \\b',
    body: `const registry = 'myttl.sh/${stream('x6', 12, LOWER)}:1h';\n`,
  },
  {
    file: 'identifier-lessly-runbook.ts',
    ours: null,
    why: 'a runbook filename ending in .lessly.runbook is not a hostname — ours only without the trailing \\b',
    body: `const doc = '${stream('x7', 8, LOWER)}.lessly.runbook.md';\n`,
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

// ── The mutation pass ──────────────────────────────────────────────────────
//
// Everything below reads .gitleaks.toml as TEXT and derives what to weaken from
// what each rule actually contains. There is no table of rules here on purpose:
// a rule added tomorrow gets its mutations by existing, which is the same
// argument ADR 0004 makes for the icon gates.

/** Every top-level TOML table header, with the span of text it owns. */
function sections(text) {
  const heads = [...text.matchAll(/^\[[^\n]*$/gm)];
  return heads.map((h, i) => ({
    header: h[0].trim(),
    start: h.index,
    end: i + 1 < heads.length ? heads[i + 1].index : text.length,
  }));
}

/**
 * A field's value, as absolute offsets into the config text. Both literal forms
 * this file uses are handled — '''raw''' and "basic" — because a rule written
 * in the other one must not silently fall out of the pass.
 */
function fieldSpan(text, sec, name) {
  const body = text.slice(sec.start, sec.end);
  for (const [pattern, quote] of [
    [new RegExp(`^${name}\\s*=\\s*'''([\\s\\S]*?)'''`, 'm'), "'''"],
    [new RegExp(`^${name}\\s*=\\s*"([^"\\n]*)"`, 'm'), '"'],
  ]) {
    const m = pattern.exec(body);
    if (!m) continue;
    const at = sec.start + m.index + m[0].indexOf(quote) + quote.length;
    return { start: at, end: at + m[1].length, value: m[1] };
  }
  return null;
}

/**
 * The character classes in a regex, with offsets. Written out rather than done
 * with a regex because `[` is legal inside a class and `\[` is legal outside
 * one, and getting either wrong silently drops a class from the pass.
 */
function charClasses(pattern) {
  const out = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '\\') {
      i++;
      continue;
    }
    if (pattern[i] !== '[') continue;
    let j = i + 1;
    if (pattern[j] === '^') j++;
    if (pattern[j] === ']') j++; // a ']' first in the class is literal
    for (; j < pattern.length; j++) {
      if (pattern[j] === '\\') {
        j++;
        continue;
      }
      if (pattern[j] === ']') break;
    }
    out.push({ start: i, end: j + 1, body: pattern.slice(i + 1, j) });
    i = j;
  }
  return out;
}

/** Base64url narrowed to alphanumerics: drop '_' and a LITERAL '-' from a class. */
function narrowClass(body) {
  let out = body.replaceAll('\\-', '').replaceAll('_', '');
  // A bare '-' is literal only at the very start or the very end of a class
  // body. Anywhere else it is a range operator and removing it would change
  // the class into something else entirely.
  if (out.endsWith('-')) out = out.slice(0, -1);
  if (out.startsWith('-')) out = out.slice(1);
  return out;
}

const NARROWABLE = (body) => body.includes('_') || body.includes('\\-') || body.startsWith('-') || body.endsWith('-');

/**
 * The floor every {n,} is raised to.
 *
 * Derived, not chosen: one more than the longest fixture body in this file. A
 * quantifier asking for more characters than the whole file contains cannot be
 * satisfied by anything planted here, whatever the payload inside that file is
 * — so this is provably above every fixture's payload without having to know
 * where each payload starts.
 */
const RAISED_FLOOR = Math.max(...CASES.map((c) => c.body.length)) + 1;

/**
 * The entropy floor every rule is given.
 *
 * 7.0 is above the Shannon entropy of ANY ASCII match, not just of these
 * fixtures: the printable set is 95 characters, so log2(95) ≈ 6.57 is the
 * ceiling, and a base64 payload caps at log2(64) = 6. A rule carrying this
 * floor reports nothing at all, which is the point — it stands for "someone
 * added an entropy line", the field .gitleaks.toml never writes and the one
 * our 1Password rule already inherits from the upstream rule it replaces.
 */
const RAISED_ENTROPY = '7.0';

/** The one contiguous region in which two texts differ, or null if identical. */
function diffSpan(a, b) {
  if (a === b) return null;
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  return { at: head, from: a.slice(head, a.length - tail), to: b.slice(head, b.length - tail) };
}

/**
 * Build one mutation, and refuse to hand back a no-op.
 *
 * This is the guard the throwaway script that found the vacuous fixtures did
 * not have. If a text edit matches nothing, the mutated config is the original,
 * every case stays green, and the pass reports "nothing detects this" — which
 * reads as a rule with no teeth when it means the edit was wrong. So the edit
 * is measured: the text must differ, in exactly one region, and that region
 * must lie inside the block it was meant to change.
 */
function mutation({ subject, axis, key, note, text, original, sec, edit }) {
  const span = diffSpan(original, text);
  if (!span) {
    fail(
      `gitleaks-rules.check: mutation "${subject} / ${axis} — ${note}" changed nothing.\n` +
        'The substitution did not land, so this run could not tell a toothless rule from a bad edit.',
    );
  }
  if (span.at < sec.start || span.at > sec.end) {
    fail(
      `gitleaks-rules.check: mutation "${subject} / ${axis} — ${note}" edited offset ${span.at},` +
        ` outside the ${sec.header} block at ${sec.start}..${sec.end}.`,
    );
  }
  // `edit` is what the report prints. It is the measured span by default, and
  // an override where the span reads worse than the truth: deleting a whole
  // line out of a list of near-identical lines leaves diffSpan describing the
  // change as a slice across two neighbours, which is correct and unreadable.
  // The span is still what the guard above checks — only the wording differs.
  return {
    subject,
    axis,
    key,
    note,
    text,
    edit: edit ?? `${JSON.stringify(span.from)} → ${JSON.stringify(span.to)}`,
  };
}

/**
 * Which of these ids gitleaks' own shipped ruleset already defines.
 *
 * Asked of the binary rather than of a list here, and rather than of a copy of
 * upstream's TOML fetched over the network: `--enable-rule` resolves against
 * the merged ruleset, so pointing it at a config that is nothing but
 * `useDefault = true` answers exactly "does upstream ship this id". An id it
 * cannot find is a fatal error naming the id; one it finds scans and exits 0.
 *
 * This matters because gitleaks merges an extended config into its default one
 * BY RULE ID, field by field. A rule of ours that reuses an upstream id
 * replaces that rule's regex and keywords and INHERITS everything it does not
 * mention — which is how our 1Password rule ends up with upstream's entropy
 * floor of 4 without .gitleaks.toml saying so anywhere.
 */
function upstreamIds(candidates, root, counter) {
  const probeConfig = join(root, 'upstream-probe.toml');
  const probeDir = join(root, 'upstream-probe');
  writeFileSync(probeConfig, '[extend]\nuseDefault = true\n');
  mkdirSync(probeDir, { recursive: true });
  const found = new Set();
  for (const id of candidates) {
    counter.runs++;
    const run = spawnSync(
      GITLEAKS,
      ['detect', '--no-git', '--source', probeDir, '--config', probeConfig, '--enable-rule', id, '--no-banner'],
      { encoding: 'utf8' },
    );
    if (run.error) fail(`gitleaks-rules.check: could not probe upstream rule ids: ${run.error.message}`);
    const missing = (run.stderr ?? '').includes(`Requested rule ${id} not found in rules`);
    if (!missing && run.status !== 0) {
      fail(`gitleaks-rules.check: upstream probe for "${id}" exited ${run.status}\n${(run.stderr ?? '').trim()}`);
    }
    if (!missing) found.add(id);
  }
  return found;
}

/**
 * Every mutation this config earns, generated from the config itself.
 *
 * Seven axes. The first four weaken a rule the four ways a rule in this file
 * can be weakened by hand — its classes, its floors, its boundaries, its name.
 * The fifth stands for an entropy line appearing, inherited or written.
 *
 * The last two are the ALLOWLIST, and they are the other half of the gate: an
 * allowlist edit switches rules off without touching a rule. Removing an entry
 * asks whether anything relies on it; un-anchoring a path entry widens it to
 * every path that merely CONTAINS the pattern.
 */
function planMutations(text, upstream) {
  const secs = sections(text);
  const out = [];

  for (const sec of secs.filter((s) => s.header === '[[rules]]')) {
    const idSpan = fieldSpan(text, sec, 'id');
    const reSpan = fieldSpan(text, sec, 'regex');
    if (!idSpan) fail(`gitleaks-rules.check: a [[rules]] block at offset ${sec.start} has no id`);
    if (!reSpan) fail(`gitleaks-rules.check: rule "${idSpan.value}" has no regex this pass can read`);
    const id = idSpan.value;
    const pattern = reSpan.value;
    const patch = (from, to, replacement) =>
      text.slice(0, reSpan.start + from) + replacement + text.slice(reSpan.start + to);
    // `key` names a mutation the way a human would — the substitution, not where
    // it landed — and `at` carries the offset for the printed line. They are
    // separate because JUSTIFIED below is looked up by key: editing a DIFFERENT
    // part of the same regex shifts every later offset, and a justification that
    // fell off for that reason would be noise. Editing the shape a justification
    // names DOES drop it, and that is the loud failure this wants.
    const make = (axis, key, at, mutated) =>
      out.push(
        mutation({
          subject: id,
          axis,
          key,
          note: at === null ? key : `${key} (regex offset ${at})`,
          text: mutated,
          original: text,
          sec,
        }),
      );

    // (1) class-narrow — one variant per class, not one per rule. A rule whose
    // alternatives each carry their own class is only half-tested by narrowing
    // both at once: the other branch keeps matching and nothing goes red.
    for (const cls of charClasses(pattern).filter((c) => NARROWABLE(c.body))) {
      const narrowed = `[${narrowClass(cls.body)}]`;
      // The offset is in the label because a rule can carry the same class
      // twice — the watermark rule does, once in each branch — and two lines
      // reading the same thing make a matrix that cannot be checked.
      make(
        'class-narrow',
        `${pattern.slice(cls.start, cls.end)} → ${narrowed}`,
        cls.start,
        patch(cls.start, cls.end, narrowed),
      );
    }

    // (2) floor-raise — every open-ended length floor, one at a time.
    for (const q of pattern.matchAll(/\{(\d+),\}/g)) {
      make(
        'floor-raise',
        `{${q[1]},} → {${RAISED_FLOOR},}`,
        q.index,
        patch(q.index, q.index + q[0].length, `{${RAISED_FLOOR},}`),
      );
    }

    // (3) anchor-drop — every \b, one at a time, so a leading and a trailing
    // boundary are two separate claims rather than one.
    //
    // The label is POSITIONAL, not ordinal: a \b at pattern index 0 is leading,
    // one whose match ends at the end of the pattern is trailing, and anything
    // else is #n. By ordinal, the FIRST boundary of any rule read "leading" — so
    // a rule carrying exactly one boundary was always called leading whichever
    // end it sat at. That was latent while every single-boundary rule here
    // happened to be leading-anchored, and infra-lessly-run stopped being one:
    // its remaining \b is the trailing one, and under the ordinal rule the
    // justification written for its LEADING anchor would have gone on matching
    // a mutation that no longer exists. A justification is looked up by this
    // key, so an excuse outliving its subject is precisely what must go red.
    const boundaries = [...pattern.matchAll(/\\b/g)];
    for (const [n, b] of boundaries.entries()) {
      const where = b.index === 0 ? 'leading' : b.index + b[0].length === pattern.length ? 'trailing' : `#${n + 1}`;
      make('anchor-drop', `the ${where} \\b removed`, b.index, patch(b.index, b.index + 2, ''));
    }

    // (4) id-rename — the rule keeps its regex and stops answering to its name.
    // Nothing but a case naming that id notices, which is what makes this the
    // test for "this rule has no case at all".
    make(
      'id-rename',
      `id "${id}" → "${id}-mutant"`,
      null,
      `${text.slice(0, idSpan.end)}-mutant${text.slice(idSpan.end)}`,
    );

    // (4b) id-rename onto an UPSTREAM id — the specific tidy-up .gitleaks.toml
    // warns against in prose. Taking an upstream id does not add a rule, it
    // REPLACES one, and the pair is derived from what the cases already assert
    // upstream owns, gated on the binary confirming that id ships.
    for (const target of [...new Set(CASES.filter((c) => c.ours === id).flatMap((c) => c.upstream ?? []))]) {
      if (!upstream.has(target) || target === id) continue;
      make(
        'id-onto-upstream',
        `id "${id}" → "${target}" (replaces upstream's rule instead of standing beside it)`,
        null,
        text.slice(0, idSpan.start) + target + text.slice(idSpan.end),
      );
    }

    // (5) entropy-raise — a floor no match can clear. Written after the regex
    // line so the block stays a block.
    const lineEnd = text.indexOf('\n', reSpan.end);
    make(
      'entropy-raise',
      `entropy = ${RAISED_ENTROPY} added`,
      null,
      `${text.slice(0, lineEnd + 1)}entropy = ${RAISED_ENTROPY}\n${text.slice(lineEnd + 1)}`,
    );
  }

  // (6) The allowlist, entry by entry. An entry is not a rule — it turns rules
  // OFF for what it matches — but it is held to the same bar, and EVERY entry
  // is a subject of its own rather than one lump called "the allowlist". That
  // is the difference between "some path entry is exercised" and "this entry
  // is", and it is the whole point: an entry added to switch the gate off is
  // one nothing exercises, and a lumped subject hides it behind its neighbours.
  for (const sec of secs.filter((s) => s.header === '[allowlist]')) {
    const body = text.slice(sec.start, sec.end);
    for (const list of ['paths', 'regexes']) {
      const found = new RegExp(`^${list}\\s*=\\s*\\[([\\s\\S]*?)^\\]`, 'm').exec(body);
      if (!found) continue;
      const listAt = sec.start + found.index + found[0].indexOf('[') + 1;
      for (const entry of found[1].matchAll(/'''([\s\S]*?)'''/g)) {
        const at = listAt + entry.index + 3;
        const subject = `[allowlist] ${list} ${entry[1]}`;

        // (6a) entry-remove — the entry is gone, which is what an edit that
        // switches the gate off looks like in reverse. An entry no case
        // exercises survives this, and an unexercised entry is exactly the
        // shape of an exemption added for something nobody tests.
        const lineStart = text.lastIndexOf('\n', at) + 1;
        const lineEnd = text.indexOf('\n', at + entry[1].length) + 1;
        out.push(
          mutation({
            subject,
            axis: 'entry-remove',
            key: 'the entry removed',
            note: 'the entry removed',
            edit: `the line holding '''${entry[1]}''' deleted from ${list}`,
            text: text.slice(0, lineStart) + text.slice(lineEnd),
            original: text,
            sec,
          }),
        );

        // (6b) paths-unanchor — gitleaks matches a path entry as an unanchored
        // substring search, so the unanchored form is the WIDER one: it exempts
        // anything whose path merely contains the pattern.
        if (list !== 'paths') continue;
        const loose = entry[1].replace(/^\(\?:\^\|\/\)/, '').replace(/^\^/, '').replace(/\$$/, '');
        if (loose === entry[1]) continue; // nothing to un-anchor
        out.push(
          mutation({
            subject,
            axis: 'paths-unanchor',
            key: `${entry[1]} → ${loose}`,
            note: `${entry[1]} → ${loose}`,
            text: text.slice(0, at) + loose + text.slice(at + entry[1].length),
            original: text,
            sec,
          }),
        );
      }
    }
  }

  return out;
}

/**
 * The individual mutations nothing here can kill, and why — beside the code
 * that generates them, because that is where the next person edits an axis.
 *
 * The bar this check enforces is per RULE: a rule none of whose mutations kills
 * a case is unproven and fails. But a single surviving mutation under a rule
 * that IS proven is still a hole in the argument, so it does not get to pass in
 * silence. It carries a written reason here, and that reason is itself checked
 * two ways every run:
 *
 *   - a justification whose mutation is no longer planned FAILS. The key below
 *     is the substitution, so rewording the rule's class or moving its \b out of
 *     the leading position drops the match and the run says so.
 *   - a justification on a mutation that a case DOES now kill FAILS, naming the
 *     case. An exception that outlives its reason is the same silent green this
 *     whole check exists to close, so it goes stale loudly rather than quietly.
 *
 * `mutation` matches the `key` a mutation is built with, not its printed `note`
 * — the offset is deliberately not part of the key. Both entries below were
 * measured on gitleaks 8.30.1, not reasoned about.
 */
const JUSTIFIED = [
  {
    subject: 'infra-lessly-run',
    axis: 'class-narrow',
    mutation: '[a-z0-9-] → [a-z0-9]',
    why:
      'The rule matches a SUFFIX, and the label in front of the domain is "+" quantified, so narrowing ' +
      'the class changes how much of a hostname the match covers, almost never WHETHER the file is ' +
      'flagged. Measured under the narrowed class: staging-box-01.<domain> is still flagged, because ' +
      '01.<domain> matches on its own. The only string that flips is a label ENDING in a hyphen — ' +
      'x-.<domain> — and that is not a valid DNS label, so a case carrying it would be a fixture ' +
      'pretending to be a hostname rather than a hostname. The domain is redacted in these strings for ' +
      'the reason the header gives: the denylist grep does not exclude scripts/, and a literal here ' +
      'would refuse every commit in the repo.',
  },
  {
    subject: '[allowlist] paths (?i)\\.svg$',
    axis: 'entry-remove',
    mutation: 'the entry removed',
    why:
      'Our entry is belt-and-braces over a default that already covers it, so removing OURS changes nothing ' +
      'and no honest case can die. Measured on gitleaks 8.30.1: gitleaks\' own default allowlist exempts ' +
      '.svg (with .png/.jpg/.gif/.pdf/.doc/.bin), useDefault pulls it in, and a real .svg carrying a planted ' +
      'Apify token stays clean with our entry deleted. The case exempt-fixture.svg says the same thing in its ' +
      'own comment. What our entry is worth is the day that default changes, which is not a thing a case here ' +
      'can stage. The entry is still PROVEN as a subject: un-anchoring it kills fixture.svg.ts, because the ' +
      'default entry is anchored and does not exempt a path merely containing .svg.',
  },
  {
    subject: '[allowlist] paths (?:^|/)package-lock\\.json$',
    axis: 'entry-remove',
    mutation: 'the entry removed',
    why:
      'The same argument as the .svg entry above, and measured the same way: gitleaks\' default allowlist ' +
      'already exempts package-lock.json, so a lockfile carrying a planted Apify token stays clean with our ' +
      'entry deleted. Measured twice, because the default could have been the looser one: against a config ' +
      'that is nothing but our rule, with no allowlist and no useDefault, that same lockfile IS flagged — so ' +
      'the exemption is upstream\'s and not an artefact of the fixture. Un-anchoring this entry does kill ' +
      'package-lock.json.md, which is what proves the entry as a subject.',
  },
];

/**
 * Attach each justification to the one mutation it excuses.
 *
 * Exactly one: a justification matching nothing has outlived its subject, and
 * one matching several cannot say which it means — a rule can carry the same
 * class twice, as the watermark rule does. Both are failures rather than
 * best-effort matches, because a mis-aimed excuse silences a mutation nobody
 * chose to silence.
 */
function matchJustifications(rows) {
  const failures = [];
  for (const j of JUSTIFIED) {
    const named = `justification for ${j.subject} / ${j.axis} — ${j.mutation}`;
    const hits = rows.filter((r) => r.subject === j.subject && r.axis === j.axis && r.key === j.mutation);
    if (hits.length === 0) {
      failures.push(
        `${named}: no such mutation is planned any more, so the reason it records is checked against nothing.` +
          ' Restate it against the mutation that replaced it, or delete it.',
      );
    } else if (hits.length > 1) {
      failures.push(`${named}: matches ${hits.length} planned mutations, so it cannot say which one it excuses.`);
    } else if (hits[0].justified) {
      failures.push(`${named}: a second justification already excuses that mutation.`);
    } else {
      hits[0].justified = j;
    }
  }
  return failures;
}

/** Word-wrap a justification so a paragraph in the report stays readable. */
function fold(text, columns = 96) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line.length > 0 && line.length + 1 + word.length > columns) {
      lines.push(line);
      line = word;
    } else {
      line = line.length > 0 ? `${line} ${word}` : word;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

/**
 * Run gitleaks once over the planted files with one config, and return which
 * rule ids named each file.
 *
 * A config that will not load is NOT a detected mutation — gitleaks refusing to
 * start says nothing about whether a rule has teeth — so it takes the exit-code
 * 2 "cannot tell" path above, naming the substitution that broke it.
 */
function scanWith(configPath, scanDir, root, counter, label, edit) {
  const report = join(root, `report-${counter.runs}.json`); // outside the scanned directory
  counter.runs++;
  const run = spawnSync(
    GITLEAKS,
    // prettier-ignore
    [
      'detect', '--no-git', '--source', scanDir, '--config', configPath,
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
  if (run.status !== 0) {
    // The substitution, not a path to the mutated file. Every mutant is written
    // under the run's temp root, and the process.on('exit') handler below
    // removes that root before any message printed here can be acted on — this
    // used to promise "config kept at …" and the path was always already gone.
    // The substitution is what reproduces the failure anyway.
    fail(
      `gitleaks-rules.check: "${GITLEAKS}" exited ${run.status} on ${label}.\n` +
        'A config that does not load is not a mutation this pass detected — it is a\n' +
        `verdict this run cannot reach. The substitution was ${edit ?? '(none — this was the unmutated config)'}\n` +
        `${(run.stderr ?? '').trim()}`,
    );
  }
  if (!existsSync(report)) fail(`gitleaks-rules.check: gitleaks wrote no report at ${report} for ${label}`);

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
  return byFile;
}

/** Judge every case against one scan. Returns the failures, and which cases died. */
function judge(byFile, ruleIds) {
  const failures = [];
  const dead = [];
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
    const before = failures.length;

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
    for (const no of c.forbidden ?? []) {
      if (named.includes(no)) {
        failures.push(`${c.file} — ${no} names it, and this case exists to assert nothing does (${c.why})`);
      }
    }
    if (failures.length > before) dead.push(c.file);
  }
  return { failures, dead };
}

/**
 * The exit-code contract, stated where the codes are chosen.
 *
 * 0 — every case passed, and every rule and allowlist entry is proven.
 * 1 — one or more assertions failed in the MUTATION PASS. Only ever set at the
 *     end of main(), and only after every mutation has been judged, so a run
 *     lists all failures rather than the first.
 * 2 — the check could not reach a verdict: no binary, the scanner refused to
 *     start, no report, unreadable report, a renamed field. Never a raw Node
 *     stack — a security gate that dies in a traceback reads as a broken
 *     script, and a broken script is what people skip.
 *
 * A RED BASELINE IS A 2, and that is deliberate rather than an oversight in the
 * wording. Every case is evaluated and every failure is printed first — so by
 * the letter of "1" above it could be a 1 — but the run then stops before a
 * single mutation is generated, because on a red baseline every mutation reads
 * as detected by the case that was already failing. The mutation pass reached no
 * verdict at all, and that is what the exit code carries. The distinction is
 * worth having: a 1 says the config is weaker than it claims, a 2 says nobody
 * knows yet. Measured rather than reasoned about, which is what the argument in
 * ADR 0002 asks of a comment like this one: point this check at a copy of
 * .gitleaks.toml with a rule deleted — the path argument exists for exactly that
 * — and it prints every failing case and exits 2, not 1.
 *
 * `fail` is 2 and only 2. It is used for every "cannot tell" path below.
 */
function fail(message) {
  console.error(message);
  process.exit(2);
}

/**
 * The matrix, printed rule by rule, and the verdict.
 *
 * Three things fail here, and they are separate claims:
 *
 *   - a SUBJECT none of whose mutations kills a case — a rule, or an allowlist
 *     entry. That is the bar: it is unproven, whatever the cases do on the
 *     unmutated config.
 *   - a rule with no case at all, which is the same hole one step earlier.
 *   - a surviving MUTATION carrying no justification. A survivor is printed
 *     either way, justified or not — a green tick that hides one is the shape of
 *     failure this check exists to close. See JUSTIFIED, and the stale-exception
 *     failure raised there and below.
 *
 * That is ADR 0004's second half applied to mutations: where a count cannot see,
 * a test says so.
 */
function report(rows, ruleSubjects, casesFor) {
  const failures = [];
  const subjects = [...new Set([...ruleSubjects, ...rows.map((r) => r.subject)])];
  for (const subject of subjects) {
    const mine = rows.filter((r) => r.subject === subject);
    const isRule = ruleSubjects.includes(subject);
    const cases = casesFor(subject);
    const owned = isRule ? `${cases.length} case${cases.length === 1 ? '' : 's'}, ` : '';
    const killed = mine.filter((r) => r.dead.length > 0).length;
    console.log(`  ${subject} — ${owned}${mine.length} mutations, ${killed} killed a case`);
    if (isRule && cases.length === 0) {
      failures.push(`${subject} — NO CASE plants this rule's shape, so nothing here can prove it fires`);
    }
    for (const r of mine) {
      let verdict;
      if (r.dead.length > 0 && r.justified) {
        // The stale exception. Loud on purpose: the reason below is now false,
        // and a false reason left in place is how an exception list rots.
        verdict = `killed ${r.dead.join(', ')} — but it carries a justification saying nothing can`;
        failures.push(
          `${subject} / ${r.axis} — ${r.note}: justified as unkillable, and ${r.dead.join(', ')} just killed it.` +
            ' The justification is now false and must be removed from JUSTIFIED.',
        );
      } else if (r.dead.length > 0) {
        verdict = `killed ${r.dead.join(', ')}`;
      } else if (r.justified) {
        verdict = 'SURVIVED — justified, nothing here can kill it';
      } else {
        verdict = 'SURVIVED — no case noticed, and no justification says why none can';
        failures.push(
          `${subject} / ${r.axis} — ${r.note}: survived, every case stayed green.` +
            ' Add the case that kills it, or a justification in JUSTIFIED saying why none can.',
        );
      }
      console.log(`      ${r.axis.padEnd(16)} ${r.note}\n        ${r.edit}\n        ${verdict}`);
      if (r.justified) for (const line of fold(r.justified.why)) console.log(`          ${line}`);
    }
    // The bar. Checked over the SUBJECT rather than over each mutation, so a
    // subject may carry a justified survivor and still be proven — by a
    // different mutation, on a different axis, killing a real case. Allowlist
    // entries are subjects too, and are held to it identically: an entry no
    // case exercises is as unproven as a rule no case names.
    if (mine.length > 0 && killed === 0) {
      failures.push(
        `${subject} — UNPROVEN: none of its ${mine.length} mutations killed a case, so nothing here shows` +
          (isRule ? ' this rule has teeth' : ' any case relies on this allowlist entry'),
      );
    }
  }
  return failures;
}

function main() {
  if (!existsSync(CONFIG)) fail(`gitleaks-rules.check: no config at ${CONFIG}`);
  const configText = readFileSync(CONFIG, 'utf8');

  const root = mkdtempSync(join(tmpdir(), 'gitleaks-rules-'));
  // Registered before anything is planted, and on 'exit' rather than in a
  // `finally`: a `finally` does NOT run after process.exit, so every early
  // bail below would otherwise leave eight credential-shaped files on disk.
  // The mutated configs land here too, so a run that dies mid-pass leaves no
  // weakened copy of .gitleaks.toml anywhere on the machine.
  process.on('exit', () => rmSync(root, { recursive: true, force: true }));
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130));

  const scanDir = join(root, 'files');
  mkdirSync(scanDir);
  for (const c of CASES) writeFileSync(join(scanDir, c.file), `${c.body}\n`);

  const counter = { runs: 0 };
  const started = Date.now();
  const where = `config: ${CONFIG} — ${gitleaksVersion()}`;

  // ── The baseline, first and on its own ──────────────────────────────────
  // Mutation results mean nothing on a red baseline: every mutation would look
  // "detected" by the case that was already failing. So a red baseline stops
  // the run before a single mutation is generated, and takes the "cannot tell"
  // exit rather than reporting a matrix nobody can read.
  const baseline = judge(scanWith(CONFIG, scanDir, root, counter, 'the unmutated config'), configuredRuleIds(configText));
  if (baseline.failures.length > 0) {
    console.error(`gitleaks rule regression: ${baseline.failures.length} of ${CASES.length} cases failed`);
    console.error(where);
    for (const f of baseline.failures) console.error(`  ✗ ${f}`);
    fail('The mutation pass did not run: on a red baseline every mutation reads as detected.');
  }
  console.log(`gitleaks rule regression: all ${CASES.length} cases pass (${where})`);

  // ── The mutation pass ───────────────────────────────────────────────────
  const ruleSubjects = sections(configText)
    .filter((s) => s.header === '[[rules]]')
    .map((s) => fieldSpan(configText, s, 'id')?.value)
    .filter(Boolean);
  const wanted = [...new Set([...ruleSubjects, ...CASES.flatMap((c) => c.upstream ?? [])])];
  const upstream = upstreamIds(wanted, root, counter);
  const collide = ruleSubjects.filter((id) => upstream.has(id));

  const mutations = planMutations(configText, upstream);
  const rows = mutations.map((m, i) => {
    const path = join(root, `mutant-${i}.toml`);
    writeFileSync(path, m.text);
    const label = `${m.subject} / ${m.axis} — ${m.note}`;
    const { dead } = judge(scanWith(path, scanDir, root, counter, label, m.edit), configuredRuleIds(m.text));
    rmSync(path, { force: true });
    return { ...m, dead };
  });

  const entrySubjects = [...new Set(rows.map((r) => r.subject))].filter((s) => !ruleSubjects.includes(s));
  console.log(
    `\nmutation pass — ${ruleSubjects.length} rules, ${entrySubjects.length} allowlist entries,` +
      ` ${rows.length} mutations`,
  );
  console.log(
    `  ids of ours gitleaks 8.30.1 already defines, so extending REPLACES rather than adds: ${
      collide.length > 0 ? collide.join(', ') : 'none'
    }`,
  );
  // Before the matrix is printed: each justification is attached to the one
  // mutation it excuses, so report() can tell a justified survivor from a bare
  // one — and so an excuse aimed at nothing fails rather than being ignored.
  const orphaned = matchJustifications(rows);
  const failures = [...report(rows, ruleSubjects, (subject) => CASES.filter((c) => c.ours === subject)), ...orphaned];

  const survivors = rows.filter((r) => r.dead.length === 0);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const summary = `${rows.length} mutations, ${counter.runs} gitleaks invocations, ${seconds}s`;
  if (failures.length > 0) {
    console.error(`\ngitleaks mutation pass: ${failures.length} unproven (${summary})`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(
    `\ngitleaks mutation pass: every rule and every allowlist entry has a case that dies under a mutation;` +
      ` ${survivors.length} of ${rows.length} mutations survive, each with a justification above (${summary})`,
  );
}

try {
  main();
} catch (err) {
  fail(`gitleaks-rules.check: ${err?.stack ?? err}`);
}
