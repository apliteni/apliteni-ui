# Comments: move gate reasoning into contributor documentation (#276)

Prepared for the coordinator to open `slice/276-comments` and dispatch independent review.
Artur reviews after that review; no human action is requested yet. Based on main `7ffbde4`,
2026-09-12. The earlier text slice is independent and is not included here.

## What & why

Move the eight comment blocks that outgrew `CONTRIBUTING.md:51`'s twenty-five-line ceiling
into eleven CONTRIBUTING sections and short pointers, keeping a local coverage ledger at each
gate. Every shorter block stays at its declaration. Existing specification guarantees are
linked rather than duplicated.

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
| Eight comment blocks past the twenty-five-line ceiling, in six files | Short pointers; coverage limits remain beside the gates |
| Long count histories mixed into test setup | History tables in CONTRIBUTING |
| Browser-default measurements, discovery exclusions and ledger decisions in button-chrome's four essays | Linked implementation notes with the measurements and limitations retained |
| The pager's cascade story told nine times across one stylesheet and a component | One `#pagination-layout` section, with the declaration notes still at their declarations |

Every comment block at or under twenty-five lines stays where it was. Ten source files are
now byte-identical to `main`.

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
| All 251 tracked source files under src, react/src, stories, scripts and site | 0 / 24 / 9 | 0 / 15 / 8 |
| The 8 edited source files | 0 / 13 / 3 | 0 / 4 / 2 |
| CONTRIBUTING | 0 / 0 / 0 | 0 / 0 / 0 |

These are the numbers after the review fixes, not the ones the first push reported (0 / 4 / 4
tree-wide). Restoring the seventeen comment blocks that never reached the repository's own
twenty-five-line ceiling gives eleven of those mediums back. The detector's `comment-essay`
rule fires at twelve prose lines; `CONTRIBUTING.md:51` fires at twenty-five, and the
twenty-five-line rule is this slice's stated authority, so where the two disagree the
repository's rule wins. No detector error remains, and every block still moved is one the
repository's own rule would move.

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

## Review resolutions

The independent review of `7c5ca16` proved the safety claim by two independent parsers, found
118 of 119 distinctive facts surviving, and reproduced the detector table exactly. Its five
findings are resolved as follows.

| Finding | Severity | Resolution |
| --- | --- | --- |
| F301-1: `wirePagination()` and `setPagerStatus()` are exported from a file that ships on npm, and their JSDoc became a pointer to a file the consumer does not have | Medium | Fixed. Both carry a one-line summary and an `@returns` contract beside the `why:` pointer. The usage example and the reason stay in CONTRIBUTING; a consumer hovering the symbol now gets the shape and the return value without leaving their editor. |
| F301-2: seventeen of the twenty-five removed blocks never reached the twenty-five-line ceiling the slice cites as its authority, including every note in `pagination.css` | Medium | Fixed. Every block at or under twenty-five lines is back at its declaration, verbatim from `main` — the `[disabled]`-against-`:disabled` note stands on the selector it protects again. Ten source files are byte-identical to `main`. The ten CONTRIBUTING sections that only restated a restored comment were dropped, so each fact has one home; the eight blocks over the ceiling stay moved with their pointers. |
| F301-3: the typeface-roles reason — "a literal here is invisible… which is exactly how the kit ended up with one face doing two jobs" — had no home anywhere | Low | Fixed by F301-2's restoration: the sixteen-line block is back at the top of `src/styles/typeface-roles.test.js`, with its `#253` framing and its pointer to [Typefaces](docs/specification.md#typefaces). It is not also copied into the specification, which states outcomes rather than arguments, nor into CONTRIBUTING — that would be the duplication F301-2 asks to remove. |
| F301-4: `#257` was the one distinctive token of 119 to leave the tree | Nit | Fixed twice over. Row 32 of the count table reads `#257: the portalled .ui-dropdown__panel states its own face`, and the block that first recorded it is back at src/styles/typeface-roles.test.js:259 `#257 gave dropdown()`. |
| F301-5: `#pagination-layout`'s `a:link` paragraph describes a specificity table in prose | Nit | Fixed. It is a four-row table now — `a:link` (0,1,1), `.ui-btn--ghost` (0,1,0), the pager's own anchor rules (0,1,1) and `.ui-nav .ui-nav__item` (0,2,0) — with who writes each. That section is kept rather than dropped: it is the one place the pager's cascade is told end to end, and the eight declaration notes are back beside their declarations as well. |

Two consequences worth naming. The detector numbers in the table above are worse than the
first push reported, by exactly the eleven mediums and four warnings the restored blocks cost;
`CONTRIBUTING.md:51` is the rule this slice cites, and it fires at twenty-five lines. And the
merge conflict the review predicted against #286 is now louder rather than silent: #286's
`68 (#277: …)` history line lands in a comment this slice no longer deletes, so the conflict
appears in `src/styles/icon-size.test.js` where a resolver will see it.

## Proof

- Baseline: 1,397 Node tests; only contrast timing fails on this machine. The allowed isolated
  retry also fails only that ceiling. Two original skips become one after building Storybook,
  because the static-story-ID check then runs.
- After the review fixes: all 1,397 tests ran; 1,395 passed, one skipped and only the accepted
  contrast timing check failed. No test count dropped.
- `npm run build` and `npm run build -w react` pass. React Vitest passes 322 tests in 16 files.
- All three citation gates pass (89 tests), with every guideline module untouched.
- esbuild whitespace-only minification (comments dropped, syntax and identifiers preserved)
  makes all 15 touched JS/TS files byte-identical to `7ffbde4`. Stripping comments and
  normalising whitespace makes `src/styles/pagination.css` byte-identical to it too.
- Every distinctive token in the ten CONTRIBUTING sections dropped below still exists in the
  tree; `#257` is back, both at src/styles/typeface-roles.test.js:259 `#257 gave dropdown()` and on row 32 of the
  count table.
- All eleven surviving CONTRIBUTING sections are pointed at from source; none is an orphan,
  and no pointer names a heading that no longer exists.

## Verification

- [x] Full `npm test` completes with only the accepted baseline timing failure.
- [x] `npm run build` and React Vitest pass.
- [x] `node site/build.mjs` / `npm run build-storybook` build cleanly for this slice.
- [x] No protected data added.

## Reviews

| Reviewer/model | Commit | Result | Resolution |
| --- | --- | --- | --- |
| Implementer / Astra | Working tree | Executable equivalence, gate classification and suite checked | Self-check only |
| Independent reviewer | `7c5ca16` | Approve with two findings: 2 medium, 1 low, 2 nits | All five resolved below |

## Earned merge

- Removes the eight comment essays the repository's own rule calls design documents, and nine
  of its density warnings, while retaining every fact they carried.
- Independent review done and all five findings resolved. Required before merge: Artur's review.
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
