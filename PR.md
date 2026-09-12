# Comments: move gate reasoning into contributor documentation (#276)

Prepared for the coordinator to open `slice/276-comments` and dispatch independent review.
Artur reviews after that review; no human action is requested yet. Based on main `7ffbde4`,
2026-09-12. The earlier text slice is independent and is not included here.

## What & why

Move 31 comment blocks across 16 source files into short pointers and local coverage ledgers.
Keep unique gate rationale, measurements, count histories and API guidance in CONTRIBUTING;
link existing specification guarantees instead of duplicating them in source.

## Problem

Issue #276 asks for a behavior-preserving rewrite in separate text, comment and code slices.
Several tests carried design documents in comments, including 60 prose lines at the start
of the button-chrome gate. The repository's No visual slop rule assigns this reasoning to
documentation and leaves a short pointer beside the code.

## Premises

- Comment edits must preserve all executable code, CSS declarations, rendered content, classes,
  exports, tokens, guideline rules, tests and mutation checks.
- Source line citations in guidelines are rendered copy. Removing comments before those lines
  would force visible reference changes, so those cases are filed below.
- The coordinator confirmed two expected failures: this machine exceeds the existing contrast
  timing ceiling even on main, and shipped-surface is red when packed comments change without
  a bump. The coordinator handles the version bump at merge; neither gate is weakened here.

## Before / after

| Before | After |
| --- | --- |
| 31 long or repeated comment blocks in 16 files | Short pointers; coverage limits remain beside tests |
| Count histories mixed into test setup | History tables in CONTRIBUTING |
| Browser-default measurements, discovery exclusions and ledger decisions in button-chrome comments | Linked implementation notes with the measurements and limitations retained |
| Repeated pagination layout and wiring explanations | One documentation home for each concern |

A TypeScript parser/printer comparison with comments removed confirms identical executable
code in every edited JS/TS file. Removing CSS comments and normalizing whitespace gives
identical pagination CSS. Accessibility-gate classification, using the floor gate's own
source-discovery expression, is unchanged for every edited test.

## Decisions

| Decision | Who | Why |
| --- | --- | --- |
| Move essays and keep behavior | Artur/task | Repository comment rule and #276 scope |
| Keep short coverage ledgers at the gates | Repository rule | Readers must see what a green result does not prove |
| File comments whose line positions are rendered references | Implementer | Reference repair would change visible text |
| Document timing and shipped-surface failures without changing gates or versions | Coordinator | Explicit dispatch response |

## Detector

Level 3, same installed detector before and after:

| Scope | Before: errors / medium / warnings | After: errors / medium / warnings |
| --- | --- | --- |
| All 284 source files under src, react/src, stories, scripts and site | 0 / 24 / 9 | 0 / 4 / 4 |
| The 16 edited source files | 0 / 21 / 5 | 0 / 1 / 0 |
| CONTRIBUTING | 0 / 0 / 0 | 0 / 0 / 0 |

The remaining medium finding in an edited file is the early pagination normalization comment.
Its source location precedes rendered guideline references; later uncited pagination comments
were moved without shifting those references. No detector error remains.

## Findings

Locations use the pre-change `7ffbde4` tree. Applied findings have their rationale linked
from the affected source; the main docs retain existing guarantees.

| Location | Finding and disposition |
| --- | --- |
| `7ffbde4:react/src/index.ts:1` | Applied: entry-point and page-size declaration reasoning moved to CONTRIBUTING; imports, exports and readonly types unchanged |
| `7ffbde4:scripts/font-loading.test.js:1` | Applied: family-discovery rationale moved; quoted webfont versus system-family distinction retained |
| `7ffbde4:src/styles/button-disabled.test.js:1` | Applied: ghost-button measurements and the rejected boxed alternative moved, including 5.18:1 and 4.66:1 observations |
| `7ffbde4:src/styles/icon-size.test.js:36` | Applied: count history moved to a table; EXPECTED_SUBJECTS remains 70 |
| `7ffbde4:src/styles/typeface-roles.test.js:1` | Applied: existing typeface guarantee gets a pointer; count history moved and portal reasoning links the spec; EXPECTED_SUBJECTS remains 51 |
| `7ffbde4:src/components/pagination.js:238` | Applied: event-wiring and status-update guidance moved, including callbacks, native links, delegation, teardown and existing live-region updates |
| `7ffbde4:src/styles/pagination.css:1` | Applied: layout rationale moved; all declarations, selectors and values preserved |
| `7ffbde4:stories/accent-without-theme.test.js:1` | Applied: original #250 defect and render-derived comparison explained in CONTRIBUTING |
| `7ffbde4:stories/apps/FinanceReport.stories.js:74` | Applied: independent busy regions, matching skeleton geometry and usable period control explained in CONTRIBUTING |
| `7ffbde4:stories/button-chrome.test.js:1` | Applied: five essays moved; browser measurements, discovery exclusions, pins, exact ledgers and deliberate width limit retained |
| `7ffbde4:stories/drawer-rules.test.js:1` | Applied: border model moved; local coverage ledger retained |
| `7ffbde4:stories/dropdown-tag-parity.test.js:1` | Applied: browser-default simulation rationale moved |
| `7ffbde4:stories/guidelines/letter-case.test.js:194` | Applied: rendered label discovery explained in CONTRIBUTING; unranked labels, later words and spelled names remain local limitations |
| `7ffbde4:stories/motion-coverage.test.js:1` | Applied: discovery and entrance checks moved; source retains scope limits and accessibility classification |
| `7ffbde4:stories/reduced-motion.test.js:1` | Applied: important declarations, fallback timer detection and model limitations moved; WCAG coverage ledger retained |
| `7ffbde4:stories/stat-basis.test.js:1` | Applied: caption and comparison reasoning already in the spec gets a pointer; accessibility classification retained |
| `7ffbde4:src/components/back.js:1` | Filed: essay precedes the source lines rendered by Going back; moving it changes visible citations |
| `7ffbde4:src/components/confirm.js:1` | Filed: comment density includes the comment itself cited by Component choice and precedes the dialog reference |
| `7ffbde4:src/components/overlay.js:1` | Filed: comment density precedes source lines rendered by Command palette |
| `7ffbde4:src/components/pagination.js:40` | Filed: early essay precedes Pagination's rendered references; later essays are fixed |
| `7ffbde4:src/styles/button.css:105` | Filed: essay precedes the busy-state line rendered by The full state set |
| `7ffbde4:src/tokens/accents.css:1` | Filed: the essay itself and later declarations are cited by Colour and theming |
| `7ffbde4:src/tokens/tokens.css:1` | Filed: token comment density precedes rendered references across several guidelines |
| `7ffbde4:site/index.html:397` | Filed: HTML comments are DOM nodes; source removal would break the literal no-DOM-change constraint |

Cited material stays in place pending authorization to update its visible references.

## Proof

- Baseline: 1,397 Node tests; only contrast timing fails on this machine. The allowed isolated
  retry also fails only that ceiling. Two original skips become one after building Storybook,
  because the static-story-ID check then runs.
- Comment working tree: all 1,397 tests ran; 1,395 passed, one skipped and only the accepted
  contrast timing check failed. No test count dropped.
- `npm run build` passes. React Vitest passes 322 tests in 16 files.
- All three citation gates pass, with every guideline module untouched.
- All 16 edited source files retain identical executable code/CSS and gate classification.
- Existing mutation checks remain in the suite and their assertions are unchanged.
- The same full suite runs again after the commit; the coordinator receives its result.

## Verification

- [x] Full `npm test` completes with only the accepted baseline timing failure.
- [x] `npm run build` and React Vitest pass.
- [x] `node site/build.mjs` / `npm run build-storybook` build cleanly for this slice.
- [x] No protected data added.

## Reviews

| Reviewer/model | Commit | Result | Resolution |
| --- | --- | --- | --- |
| Implementer / Astra | Working tree | Executable equivalence, gate classification and suite checked | Self-check only |
| Independent reviewer | Not started | Coordinator dispatches after push | Required before Artur's review |

## Earned merge

- Removes 20 comment essays and five density warnings while retaining their useful information.
- Required before merge: independent review, findings resolved and Artur's review.
- No version bump or changelog entry is committed, as instructed.

## Linked issue

Part of #276; this slice does not close it.

## Changelog entry

- Moved long implementation comments into contributor documentation; behavior is unchanged.

<details>
<summary>Execution</summary>

| Phase | Agent/model | Time | Tokens |
| --- | --- | --- | --- |
| Comment audit and edits | Dispatched worker / Astra | Command logs retained | Unavailable from Orca CLI check |
| Independent review | Coordinator to assign | Not started | Not available |

| Metric | Value |
| --- | --- |
| Measurement source | Orca dispatch check and command logs, 2026-09-12 |
| Elapsed time | Phase duration not supplied by CLI check |
| Retries | No new contrast retry; baseline isolated failure already documented |
| Coordinator decisions | Existing timing and shipped-surface exceptions apply |

</details>
