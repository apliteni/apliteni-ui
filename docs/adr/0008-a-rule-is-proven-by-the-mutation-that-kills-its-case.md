# 0008. A rule is proven by the mutation that kills its case

- **Date:** 2026-08-13
- **Status:** accepted
- **Code:** `scripts/gitleaks-rules.check.mjs`, `.github/workflows/security.yml`
- **Issues:** #179, #184

## What we ran into

`gitleaks-rules.check.mjs` plants a fabricated instance of every shape `.gitleaks.toml` covers and
asserts the intended rule names it. Forty cases, all green.

Three of them tested nothing. Each payload is drawn from a deterministic hash stream, and the Figma
seed happened to draw 40 base64url characters containing neither `-` nor `_` — the value is not
reproduced here, because this repo's own scan reads `docs/` and would refuse the commit that carried
it, which is the same reason the hostnames below are written with their domain redacted.

That rule's class claims base64url. Narrow it to `[A-Za-z0-9]` and every case stays green — so
nothing would report real Figma tokens, which are about half `-` and `_`, going unmatched. Two of
the three OpenAI fixtures had the same hole. A throwaway script found all three; the suite could
not, because a case only ever ran against the config it was written for.

## What we decided

**A rule is proven by the mutation that kills its case.** After the cases pass, the check weakens
`.gitleaks.toml` one axis at a time and re-runs every case against each weakened copy. A rule with
teeth loses a case; a rule that has stopped meaning anything loses nothing.

| Axis | What it weakens | What it catches |
|---|---|---|
| `class-narrow` | one character class, `_` and literal `-` removed | a class that claims base64url and is never tested on one |
| `floor-raise` | one `{n,}`, raised past the longest fixture in the file | a length floor no case sits near |
| `anchor-drop` | one `\b`, leading and trailing counted separately | a boundary with no negative case behind it |
| `id-rename` | the rule's `id` | a rule no case names at all |
| `id-onto-upstream` | the `id`, onto one gitleaks already ships | a "tidy-up" that replaces an upstream rule instead of standing beside it |
| `entropy-raise` | an `entropy = 7.0` line added | a floor inherited or written that silences the rule |
| `paths-unanchor` | one `[allowlist] paths` entry's `^`/`$` | an exemption that leaks to every path merely containing the pattern |
| `entry-remove` | one `[allowlist]` entry, `paths` or `regexes`, deleted | an exemption no case relies on — the shape of one added to switch the gate off |

**A subject is a rule *or* an allowlist entry.** A gate can be switched off from either side, and
for a while this one only watched the rules. Adding two lines to `[allowlist] regexes` —
`AKIA[A-Z0-9]{16}` and `gh[pousr]_[A-Za-z0-9]{36}` — takes a scan carrying both shapes from "leaks
found: 2" to "no leaks found", and the check said `every rule has a case that dies under a mutation`
and exited 0 over it. Worse, the pass punished the *safe* form of the edit and ignored the dangerous
one: an unanchored `paths` entry generated no mutation at all, because there was nothing to
un-anchor, and gitleaks matches paths as an unanchored substring search — so the unanchored form is
the wider one. `regexes` had no axis whatsoever.

So every entry in both lists is a subject in its own right, held to the bar a rule already meets.
The mutation is removing the entry, and it is proven when a case goes red without it: an entry
exists to suppress something, so a case relying on that suppression is the honest test. An entry no
case exercises fails, exactly like a rule with no case. Five of the six `regexes` entries were
exercised by nothing before this — an approved-domain address that must *not* be flagged is a
legitimate case, and there was none.

**The axes are derived from the config text, never listed.** A rule earns its mutations by existing:
its classes are parsed out, its `{n,}` and `\b` counted, its id read; an allowlist entry earns its
by being an entry. This is [0004](0004-the-gates-discover-their-subjects.md)'s argument applied to
mutations — a table of mutations beside a table of rules is an undercount waiting to happen, and the
undercount reads as coverage. Today that derivation yields 63 mutations over 12 rules and 8
allowlist entries, run as 77 gitleaks invocations in 2.4 seconds, against 46 cases.

**Every edit is measured before it is trusted.** A substitution that matches nothing produces a
mutated config identical to the original, every case stays green, and the run reports "nothing
detects this" — which reads as a rule with no teeth when it means the edit was wrong. So each
mutation must differ from the original in exactly one contiguous region, and that region must lie
inside the block it was meant to change. Neither holds: exit 2, "cannot tell", not exit 1.

**The bar is per subject.** A subject — a rule, or an allowlist entry — fails when *no* case dies
under *any* of its mutations. It may carry a surviving mutation and still be proven, by a different
mutation on a different axis killing a real case. Each allowlist entry is its own subject rather
than one lump called "the allowlist": lumped, a new entry that nothing exercises hides behind its
neighbours, which is the whole thing being caught.

**A mutation nothing can kill carries a written justification, and it goes stale loudly.** Survivors
are printed every run, justified or not — a green tick that hides one is the shape of failure this
check exists to close. A survivor with no justification fails. A justification whose mutation is no
longer planned fails, because the reason it records is then checked against nothing. And a
justification on a mutation that some case has *since started* killing fails, naming the case: an
exception that outlives its reason is silent green with extra steps.

Four justifications exist. Two are on the `[allowlist] paths` entries, and they are the same
argument twice: gitleaks' own default allowlist already exempts `.svg` and `package-lock.json`, so
removing *ours* changes nothing and no honest case can die. Measured on 8.30.1, both ways round — a
real `.svg` and a real `package-lock.json` each carrying a planted Apify token stay clean with our
entry deleted, and the lockfile *is* flagged against a config with our rule and no allowlist at all,
so the exemption is upstream's rather than an artefact of the fixture. Both entries are still proven
as subjects, because un-anchoring them kills `fixture.svg.ts` and `package-lock.json.md`: the
default entries are anchored and do not exempt a path merely containing the pattern. What ours are
worth is the day that default changes, which is not something a case here can stage.

The other two are on `infra-lessly-run` (`\b[a-z0-9-]+\.lessly\.run\b`), which clears
the bar because three of its five mutations do kill cases. Narrowing its class is unkillable because
the rule matches a suffix behind a `+` quantifier — `staging-box-01.<redacted>` is still flagged
under the narrowed class, and the only string that flips is a label ending in a hyphen, which is not
a valid DNS label. Dropping its leading `\b` is unkillable in principle, because dropping an anchor
only widens what a rule matches: no positive case can die, and the honest negative case does not
exist. Probing for one found a real weakness instead, which the justification records rather than
hides — `api_staging.<redacted>` and `APIstaging.<redacted>` are internal hostnames the rule misses
today. The internal-terms denylist in `.github/workflows/security.yml` greps tracked files for the
same shape without the anchor and catches both, so nothing escapes the repo.

## Why not the alternatives

**Fail per mutation.** This is what was built first, and it is stricter than it looks useful. It
demands a case for a mutation no honest fixture can produce, so the pressure is to plant
`x-.<redacted>` — a string that exists only to keep the run green. A fixture written to satisfy a
mutation rather than to stand for a real secret is the vacuous fixture again, one level up.

**Let survivors pass quietly, or drop them from the report.** That is the silent green being fixed.
Printing them under a green tick with their reason costs nothing and keeps the hole legible.

**Write each mutation into `.gitleaks.toml` and revert it.** A weakened config on disk is a window,
and a run that dies mid-pass leaves it open. Every mutated config is written to the run's temp
directory, which is removed on every exit path including `process.exit`.

**Replace the cases with the mutation pass.** The pass *re-runs* the cases; it does not stand in for
them. The `identifier-*.ts` cases are exactly what dies when an anchor is dropped, and
`fixture.svg.ts` is what dies when a paths entry is un-anchored. No case is subsumed.

## What this does not cover

**The argument inside a justification.** It is prose. The check verifies it is aimed at a real
surviving mutation and that it has not gone false — not that it is right.

**Rules that are too wide.** Every axis here weakens; none strengthens. A rule that fires on
something innocent is caught by a negative case (`ours: null`), which the mutation pass re-runs but
does not generate.

**An allowlist entry that silences only an *upstream* rule.** The demo-token entry is one: no rule
of ours matches that string, so `ours: null` cannot notice it going away. Its case names
`generic-api-key` in a `forbidden` list instead — the one place in the suite that depends on
gitleaks' default ruleset on purpose. If upstream stops flagging that shape, the entry becomes
unprovable and the run says so, loudly, which is the right direction to fail.

**`infra-lessly-run`'s leading anchor.** Recorded in the justification and filed as its own issue.
This check never edits `.gitleaks.toml`, so it names the hole rather than closing it.

**Rules whose regex this pass cannot read.** `fieldSpan` handles the `'''raw'''` and `"basic"` forms
`.gitleaks.toml` uses. A rule written another way is a hard failure naming the rule, not a skip.
