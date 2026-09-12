# Documentation: simplify reader guidance (#276, text slice)

Prepared for the coordinator to open a PR from `slice/276-text` and dispatch independent review.
Artur's review follows that review and final verification; no human action is requested yet.
Prepared 2026-09-12 against main at `7ffbde4`.

## What & why

Issue #276 requests a rewrite and optimization pass over the kit with Astra.
This first slice simplifies ten reader documents while retaining their rules and examples.

## Problem

The documentation repeats explanations and uses rhetorical introductions where direct instructions
would be easier to read. The task requires behavior preservation, including rendered pixels,
DOM, classes, exports, tokens, guideline rules and test counts.

## Premises

- Artur chose separate text, comment and code PRs, each independently reviewed before his review.
- README and source files ship in the npm tarball. The shipped-surface gate hashes their bytes,
  so even comment edits require a bump under the existing gate. The coordinator explicitly
  confirmed that this check is expected to be red: no bump in these PRs, coordinator bumps at merge.
- Site and Storybook copy is rendered output. Rewording it would change DOM text and pixels,
  so findings on those surfaces are recorded below.
- The detector is a heuristic check. Its source mode measures comments; a second artifact-mode
  scan checked guideline, foundation and site files for text patterns.

## Before / after

| Before | After |
| --- | --- |
| Rhetorical introductions in the specification and library guide | Direct statements of the contract and architecture |
| Repeated explanation of where decisions belong | Instructions with the original issue citation and decision-record rule |
| Bold formatting on each documentation index link | Plain linked list entries |
| Indirect contributor and React development instructions | Shorter instructions with the same requirements |

No runtime, CSS, story, site, export, token, dependency or test file changes.
The ten documents lose 380 words (37,900 to 37,520).
All headings, numeric literals, fenced examples, link targets and gate references in the ten
edited documents match the base, checked by comparing their extracted multisets.

## Decisions

| Decision | Who | Why |
| --- | --- | --- |
| Separate slices; preserve behavior; no version bump or changelog edit | Artur, through the dispatch | Reviewable changes under a fixed consumer contract |
| Leave rendered copy as findings | Implementer | Rewording changes the output forbidden by the dispatch |
| Preserve conflicting documentation claims and flag them | Implementer | Correcting a rule or promise needs separate scope |

## Detector

Level 3, installed `ai-slop-detector` skill, before and after on every edited document:

| Scope | Before: errors / medium / warnings | After: errors / medium / warnings |
| --- | --- | --- |
| Nine edited documents | 0 / 0 / 2 | 0 / 0 / 1 |

The removed warning is `bold-header-list` in the documentation index. The remaining
`scope-template` warning in the specification describes a drawer moving from its anchored edge;
it names physical movement, not a rhetorical range, so it is retained.

The separate artifact-mode scan of guideline, foundation and site files found 0 errors,
0 medium findings and 5 warnings across 39 files. Its warnings on JavaScript include source
syntax rather than only rendered prose; they are classified under Findings.

## Findings

Locations below refer to the pre-change `7ffbde4` tree; they remain useful after prose reflows.

| Location | Finding | Disposition |
| --- | --- | --- |
| `7ffbde4:docs/README.md:11` | Bold formatting repeated on six index entries | Applied: retain links as plain list entries |
| `7ffbde4:docs/README.md:30` | Decision-record guidance repeats its rationale | Applied: shorten; preserve the rule, quotation and issue link |
| `7ffbde4:docs/specification.md:3` | Contract introduction uses rhetorical contrasts | Applied: state the contract and record locations directly |
| `7ffbde4:docs/specification.md:85` | Scale-selection explanation restates the preceding rule | Applied: shorten, retaining both units and scales |
| `7ffbde4:docs/library.md:12` | Architecture explanation claims review and production cannot diverge | Applied: describe the shared factory output directly |
| `7ffbde4:docs/library.md:74` | Optional-attribute explanation repeats the default | Applied: keep optional overrides and the dark Nebula default |
| `7ffbde4:docs/changelog.md:49` | “that's it” adds no instruction | Applied: remove; retain tags and helper names |
| `7ffbde4:docs/guidelines.md:26` | Exception guidance and reference-failure description are indirect | Applied: simplify without changing rule shape or checks |
| `7ffbde4:docs/landing-page.md:6` | Homepage distinction and chrome description are indirect | Applied: identify the page and build substitution directly |
| `7ffbde4:docs/storybook.md:3` | Workbench introduction repeats the rendering claim | Applied: describe factory-to-canvas flow |
| `7ffbde4:CONTRIBUTING.md:41` | Rhetorical framing in contributor and gate guidance | Applied: simplify introductions; retain requirements and historical evidence |
| `7ffbde4:react/README.md:3` | Indirect React purpose and port-probe instructions | Applied: shorten while retaining ports, lifecycle and restart rule |
| `7ffbde4:README.md:7` | Decorative icons, promotional architecture claims, indirect font and React setup instructions | Applied: describe the package and requirements directly |
| `7ffbde4:README.md:200` | Manual release commands conflict with automated release instructions in CONTRIBUTING | Filed: changes operational instructions, beyond prose-only preservation |
| `7ffbde4:react/README.md:40` | Escape warning says two React dialogs close together; later Drawer section says the stack prevents this | Filed: reconcile against implementation in a factual-correction change |
| `7ffbde4:docs/guidelines.md:3` | Five-page description predates additional guideline pages | Filed: task requires keeping numbers and rules; do not silently change them |
| `7ffbde4:docs/storybook.md:11` | Addon and three-section descriptions may be stale | Filed: configuration correction requires a separate factual review |
| `7ffbde4:stories/foundations/Typography.stories.js:55` | Typeface comparison uses a rhetorical defense of Poppins | Filed: rendered copy cannot change under this task |
| `7ffbde4:stories/foundations/Colors.stories.js:26` | Copy tells the reader to watch all components follow the theme | Filed: rendered copy cannot change under this task |
| `7ffbde4:site/changelog.mjs:1` | Detector flags a middot chain in release prose | Filed: historical rendered release text stays intact |
| `7ffbde4:stories/guidelines/_command-palette.js:1` | Detector flags a middot pattern across JavaScript syntax | Retained: artifact-mode source match does not establish a rendered text defect |
| `7ffbde4:stories/guidelines/_layout.js:1` | Detector flags descendant-to-ancestor description | Retained: describes an actual DOM relationship |
| `7ffbde4:site/segmented.test.js:1` | Artifact-mode vocabulary warning in test code | Filed to comment/code inspection; no rendered copy change |
| `7ffbde4:site/changelog.mjs:1` | Detector flags a “from … to …” range describing card geometry | Retained: concrete spatial relationship |

## Proof

- Baseline: `npm test` ran 1,397 tests, with 1,394 passes, two existing skips, and only
  the known contrast timing check failing (142.8 seconds versus 120 seconds).
- Baseline: `npm run build` passed; React Vitest passed 322 tests in 16 files.
- The permitted standalone contrast retry also failed only the timing ceiling (141.9 seconds).
  The coordinator confirmed this known machine failure is expected and must be documented;
  the threshold and measured workload remain unchanged.
- `scripts/doc-refs.test.js`, `scripts/code-refs.test.js` and
  `stories/guidelines/refs.test.js` pass with the edits.
- A separate preservation check confirms identical headings, numeric literals, fenced examples,
  link targets and gate references in all ten edited documents.
- The text working tree ran all 1,397 Node tests; only the same contrast timing check failed
  (148.1 seconds). Build passed and React passed all 322 tests in 16 files.
- No tests were added, removed, renamed or weakened.
- Runtime files are unchanged, so no visual comparison is claimed or needed for this slice.

## Verification

- [x] Full `npm test` completes with only the coordinator-accepted baseline timing failure.
- [x] `npm run build` and React Vitest pass.
- [x] `node site/build.mjs` / `npm run build-storybook` build cleanly.
- [x] No protected data added.

## Reviews

| Reviewer/model | Commit | Result | Resolution |
| --- | --- | --- | --- |
| Implementer / Astra | Working tree | Preservation and reference checks pass | Self-check only |
| Independent reviewer | Not started | Coordinator dispatches after push | Required before Artur's review |

## Earned merge

- Benefit: shorter reader instructions with the original rules and examples.
- Required before merge: independent review, findings resolved and Artur's review.
- The same suite will run again after the commit; the coordinator receives the commit and results.
- No npm version bump or site changelog edit, as instructed.

## Linked issue

Part of #276. This slice does not close the issue.

## Changelog entry

- Simplified documentation wording without changing component behavior or guideline rules.

<details>
<summary>Execution</summary>

| Phase | Agent/model | Time | Tokens |
| --- | --- | --- | --- |
| Investigation and text edits | Dispatched worker / Astra | Command logs retained | Unavailable in CLI check output |
| Independent review | Coordinator to assign | Not started | Not available |

| Metric | Value |
| --- | --- |
| Measurement source | Orca dispatch check and command logs, 2026-09-12 |
| Elapsed time | Per-phase duration not available from Orca CLI check; test durations are in the command logs |
| Retries | One isolated baseline contrast retry requested by the task |
| Coordinator decision | Timing and shipped-surface exceptions confirmed through the dispatch ask response |

</details>
