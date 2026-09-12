# Escaping: reuse character lookup tables (#276, code slice)

Prepared for the coordinator to open `slice/276-code` and dispatch independent review.
Artur reviews after that review; no human action is requested yet. Based on main `7ffbde4`,
2026-09-12. The text and comment slices are separate branches and are not included here.

## What & why

Reuse private HTML entity tables in the core factory module and the changelog renderer.
Three replacement callbacks previously constructed their lookup object for every matched
character; they now read a module-level table, with no new export or dependency.

## Problem

Issue #276 requests a rewrite and optimization pass without changing consumer behavior,
rendered pixels or DOM, classes, exports, tokens, guideline rules, test counts or gate logic.
The code audit found repeated helpers with different contracts, public CSS whose external
use cannot be inferred here, and a small escaping optimization with directly comparable output.

## Premises

- Keep text and attribute escaping distinct. The core helper coerces values and treats null
  as empty; the changelog text formatter does neither and leaves quotes unchanged; its
  attribute helper coerces values and escapes quotes. Those contracts stay intact.
- Keep both tables private. A shared cross-module helper would add coupling without removing
  the different coercion and replacement rules.
- Preserve the 19 guideline-cited source lines in the factory file. The new table occupies
  an existing blank line; no rendered reference or guideline module changes.
- The coordinator confirmed expected contrast timing failure on this machine and expected
  shipped-surface red without a bump. The coordinator bumps at merge. Neither gate changes.

## Before / after

| Before | After |
| --- | --- |
| A lookup literal inside each matched-character callback | Private table reused by each callback |
| Separate text and attribute rules | Same expressions, coercion and replacement rules |
| Changelog records and rendered HTML | Byte-identical in differential comparison |

This changes implementation in two files. No release entry, token, selector, component
markup template, public export, dependency, test or gate implementation changes.

## Decisions

| Decision | Who | Why |
| --- | --- | --- |
| Optimize only demonstrated equivalent code | Artur/task | Preserve consumer behavior |
| Hoist the entity tables; keep helpers local | Implementer | Avoid repeated lookup objects without new coupling |
| File broader helper and CSS candidates | Implementer | Contracts differ or consumer usage is unavailable |
| No bump; document the two expected red checks | Coordinator | Version bump belongs to merge handling |

## Detector

Level 3 on both changed source files: before 0 errors, 0 medium findings, 0 warnings;
after 0 errors, 0 medium findings, 0 warnings. PR.md is also checked before commit.
The detector's source mode checks comments, not code quality; the allocation finding comes
from source inspection and a local experiment.

## Findings

Locations refer to the pre-change `7ffbde4` tree.

| Location | Finding | Disposition |
| --- | --- | --- |
| `7ffbde4:src/components/index.js:7` | Entity lookup literal is rebuilt in each escaping callback | Applied: private table, same regex, callback result and null coercion |
| `7ffbde4:site/changelog.mjs:565` | Text and attribute formatters repeat lookup literals | Applied: private table shared by the two local callbacks; quote behavior remains distinct |
| `7ffbde4:src/components/index.js:6` | One-line `cx` helper is repeated across components and React | Retained: moving it adds an internal module/export and imports without demonstrated benefit; typed React inputs differ from vanilla callers |
| `7ffbde4:stories/lib/contrast.js:460` | Serializer logic repeats across accessibility, glyph and other story gates | Filed: some variants accept text nodes/fragments while others do not; consolidation needs a separate contract decision and proof of unchanged gate discovery |
| `7ffbde4:stories/guidelines/letter-case.test.js:218` | Its serializer does not share every accepted output shape of the contrast serializer | Filed with serializer consolidation; broadening acceptance would change a gate |
| `7ffbde4:src/components/overlay.js:37` | Vanilla and React focus eligibility look similar but differ | Filed: React checks negative tabindex, disabled fieldsets and closed disclosures; vanilla checks overlay state and visibility. Unifying them changes behavior |
| `7ffbde4:react/src/dialog.ts:23` | Dialog focus logic cannot directly reuse the internal vanilla helper | Filed with overlay eligibility; no new export or behavior change |
| `7ffbde4:stories/lib/motion-css.js:23` | CSS and script discovery both recurse over files | Retained: script discovery excludes tests and declarations; a generic walker adds abstraction and must preserve order and symlink behavior |
| `7ffbde4:src/styles/pagination.css:1` | Repository-only usage cannot prove public selectors are dead | Filed: consumers may select kit classes that stories do not render; no CSS deletion is justified |
| `7ffbde4:stories/contrast.test.js:531` | Wall-clock ceiling fails on unchanged main on this machine | Filed and coordinator-accepted: keep ceiling, workload and cache/mutation assertions intact |
| `7ffbde4:site/changelog.mjs:565` | Combining all escaping helpers would change null/type/quote treatment | Retained distinct contracts; only their private lookup data is reused |

A targeted scan found no literal `if (false)` branch, unconditional `assert.ok(true)`, or
literal `test.skip` or `it.skip` call to remove. That scan is not a proof that every branch or assertion
is necessary; no test or branch was deleted on that basis.

## Proof

The differential check imports the old and new modules with the same dependencies:

- 66,069 escaping cases match, including every UTF-16 code unit, mixed strings, null,
  undefined, booleans, numbers and bigint.
- Both versions coerce an object exactly once and return the same escaped result.
- Export names match in both modules.
- All 54 release records are identical; every release and the full changelog render identical HTML.
- Contributor and component chips match for quotes, markup, ampersands, backticks, Unicode,
  newlines, missing avatar/URL and supplied avatar/URL.
- All 19 guideline-cited lines in the factory module remain identical at their original positions.

An illustrative local microbenchmark made 200,000 calls per run over four fixed strings,
including plain text and escape-heavy markup. After warmup, four alternating runs measured
578–602 ms before and 538–573 ms after. This measures this helper on this machine; it does
not establish a whole-kit speedup or a performance guarantee.

The working tree ran all 1,397 Node tests: 1,395 passed, one skipped and only the accepted
contrast timing check failed. Build and all 322 React tests passed, as did the site and
Storybook builds. The same suite runs after the commit.

## Verification

- [x] Full `npm test` completes with only the accepted baseline timing failure.
- [x] `npm run build` and React Vitest pass.
- [x] `node site/build.mjs` / `npm run build-storybook` build cleanly.
- [x] No protected data added.
- [x] Differential output and export checks pass.
- [x] No tests, mutation checks, thresholds or subjects removed.

## Reviews

| Reviewer/model | Commit | Result | Resolution |
| --- | --- | --- | --- |
| Implementer / Astra | Working tree | Differential comparison and local benchmark complete | Self-check only |
| Independent reviewer | Not started | Coordinator dispatches after push | Required before Artur's review |

## Earned merge

- Reuses lookup data with measured equivalent output and a small local timing improvement.
- Required before merge: independent review, findings resolved and Artur's review.
- No version bump or changelog entry is committed.

## Linked issue

Part of #276. All three slices need review and delivery before the issue can close.

## Changelog entry

- Reused private HTML escaping lookup tables without changing output.

<details>
<summary>Execution</summary>

| Phase | Agent/model | Time | Tokens |
| --- | --- | --- | --- |
| Code audit and differential checks | Dispatched worker / Astra | Command logs retained | Unavailable from Orca CLI check |
| Independent review | Coordinator to assign | Not started | Not available |

| Metric | Value |
| --- | --- |
| Measurement source | Orca dispatch check, Node performance timer and command logs, 2026-09-12 |
| Elapsed time | Phase duration not supplied by CLI check |
| Retries | No new contrast retry; baseline isolated failure already documented |
| Coordinator decisions | Existing timing and shipped-surface exceptions apply |

</details>
