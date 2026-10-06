# Agent rules

Human setup is described in [README.md](README.md#contribute). Before changing
components, read [foundations](docs/foundations.md), [components](docs/components.md)
and the [guidelines](guidelines/overview.md).

## Data handling

This repository is public, so use fabricated demo data. Never include real customer or financial
data, personal contact details, credentials, or internal infrastructure identifiers in files,
issues, PRs, or evidence.

Run security checks on the branch's commits before pushing: removing a secret later does not
remove it from the history. Create scanner fixtures in temporary folders and remove them.
If you change security checkers, workflows, or pre-commit configuration, flag it in the PR so a
reviewer checks the protection itself.

## Verification

Before handoff, run `npm test` with `jq` installed, `npm test -w react`, `npm run
build-storybook`, and `node site/build.mjs`. Stage new files first so git-based tests can find
them, and add new test directories to both the guard and the glob in `npm test`.

While you work, run `node --test <file>` for the files you changed. Run both suites once
for the pull request, on a Linux host where you have one. Their budgets on an 8-core Linux
host: `npm test` 3m20s, `npm test -w react` 1m40s. Measured at 3m02s and 1m30s. The budget
is a ceiling with room for a busier machine, not the best time anyone has seen; a run
outside it means the machine was loaded or the suite grew.

Each suite run ends with its ten slowest tests and files, and anything over budget: 5
seconds a test, 10 for a browser test, 60 for one file. That report never fails a run.
Keep a suite inside its budget by making its slowest tests faster. Do not serialise the
machine's test runs behind a lock.

The contrast walk is dealt to half the machine's cores. Set `CONTRAST_SHARDS=1` to walk in
one thread when you need the stack of a story that threw, and run
`CONTRAST_SHARD_PARITY=1 node --test stories/lib/contrast.test.js` when you change how it
is dealt.

Before handing over a guideline change run `npm run check:words`, which is not in CI and
fails a `guidelines/*.md` page that is over its word budget or has grown past its
recorded figure. Nothing in CI runs that command, so when you change what it counts also
run its CLI half and report the result in the PR:
`WORD_BUDGET_CLI=1 node --test scripts/word-budget.test.js`

New gates must discover their subjects, fail when cases are not measured, check coverage
counts, and prove rejection with a failing mutation. Share calculations across
workspaces, but keep their coverage checks separate. Read the source unless you are
testing the built package. State each test's limits beside it and keep those statements
current.

Review changed contrast measurements by hand. Never regenerate accepted-failure ledgers
automatically, and explain the cause and limitation of each accepted failure.

## Check accents locally

Before opening a PR that changes colours, tokens or theme/accent CSS, run:
`CONTRAST_ACCENTS=1 node --test --test-name-pattern='contrast ledger:' stories/contrast.test.js`
Report the result in the PR.

## Check the phone tap floor locally

Before opening a PR that changes a control's size, a container's gap, or
`src/styles/tap-zone.css`, measure the tap zones in a real browser:
`UI_PLAYWRIGHT=… TAP_ZONES=1 node --test stories/tap-zone.test.js`
Report the result in the PR. CI runs only this gate's source half, so the measurement is yours.

## Check the chart's point targets locally

Before opening a PR that changes a chart's point target, its plot height or
`src/styles/chart.css`, measure the targets in a real browser — a hit test is
something only an engine answers, and a rect's attributes certified a clipped
target once already:
`npm run build-storybook -w react`, then
`UI_PLAYWRIGHT=… CHART_TARGETS=1 node --test stories/chart-target.test.js`
Report the result in the PR. Playwright is not a dependency and CI runs only this
gate's source half.

## Check the disabled field paint locally

Before opening a PR that changes a field's or a button's disabled paint, or
`src/styles/input.css`, measure it in a real browser — the source half only emulates the one
declaration Chromium fades a disabled select with:
`UI_PLAYWRIGHT=… UI_CHROME=… FIELD_PAINT=1 node --test stories/field-ground.test.js`
Report the result in the PR. CI runs only this gate's source half.

## Check the motion helpers' missing-element guard locally

Before opening a PR that changes `src/motion.js` or `src/motion.d.ts`, run the browser half:
`MOTION_GUARDS=1 UI_PLAYWRIGHT=… node --test stories/motion-missing-element.test.js`
Report the result in the PR. The source half runs in CI against a jsdom window; the engine a
consumer ships against is yours to measure, because Playwright is not a dependency.

## Documentation

Record a consumer guarantee in one of the two reader pages: a token or a floor in
[docs/foundations.md](docs/foundations.md), a component's promise in
[docs/components.md](docs/components.md), a rule for a screen in `guidelines/*.md`. Keep it short and
state it in words a consumer can act on, with no source-file references, no gate names and no
issue archaeology; a low-level guarantee belongs with the test that holds it. How a gate works
goes beside the gate, and why a number is what it is goes in the issue. See
[docs/README.md](docs/README.md#where-a-decision-gets-recorded).

[docs/contributing.md](docs/contributing.md) is the one page for a human working on the kit — the
tour of the parts and the commands. Keep it short, and put a rule that constrains your own work
here instead. A page under `docs/` never links to the deployed site — link the file in the
repository, or a Storybook path under it.

## Annotations the gates read

A declaration a gate cannot judge on its own carries its reason beside it, in the shape the gate
parses. There is no unannotated exception.

- `/* muted-ink: glyph|state|placeholder — reason */` on every `color` or
  `-webkit-text-fill-color` that can reach muted or dim ink. The three classes are a closed list.
- `/* motion: still — why */` on a state rule that shows, hides or moves an element without
  moving; `/* motion: ambient — why */` or `/* motion: choreographed — why */` on an animation
  keeping its own number. There is no third kind.
- `/* rank: <name> */` inside the block that claims a type rank, with the longhands written out.
- `/* display: brand — why */` where a wordmark keeps the display face.

Every media query is at one of the three documented breakpoints. Where a spacing value sits
between two steps, say at the declaration what it is for.

## The guidelines collection

`guidelines/*.md` ships in the package and is the text Storybook renders, so a page is reading and
nothing else: a `#` title and its rules, with no introduction and no appendix.

- A rule is a short `##` title, a stable `<!-- rule: id -->` and a one-sentence `**Rule:**`, plus
  `**Why:**`, `**Do:**`, `**Don't:**`, `**Except:**` and `**Gap #123:**` where they earn their
  place. Each field stays on one source line.
- Guideline prose carries no file path, line number, test name, selector, token or function name.
  A measurement belongs in a reader page; a boundary belongs in `Except`. A citation points at a
  rule's heading, never at its id.
- A `Why` gives the reason the rule exists. It may not say the rule again in other words.
- Give every rule a rendered do-and-don't pair built from kit parts, and let the text say only
  what the picture cannot. Leave a rule text-only when drawing the failure would break the rule in
  front of the reader, when the state needs a pointer, keyboard or viewport a static specimen
  cannot set, or when the rule governs an order of work rather than a result — and name which of
  the three in the same `Why`.
- A page is the reading surface, not a card and not the grey page ground.
- `references.json` and `accessibility-coverage.json` sit beside the gates that read them. Neither
  ships as guideline content, and no guideline imports either.
- Adding a page means updating the collection counts, the Overview and `storySort`.

## Storybook and the site

A story calls a factory and puts the returned string on the canvas; the decorator applies the
theme, the accent and `wireTopbar()`, so hand-wire none of the three. Check a new story id against
`storybook-static/index.json` rather than deriving it.

A changelog entry is written for someone using the kit: what changed and who is affected, in one
to three short sentences, with no praise, no filler and no test diary. Add detail only for a
migration step or a behaviour limit. `site/changelog.mjs` stays pure — no git and no filesystem;
`site/build.mjs` owns the git calls. Keep deploy specifics out of committed files.

## Changes

No new factories, no parity tests for new React work. See #429.

Add a general, composable kit component only when all three checks are true:

- The issue names at least two products that use it or have requested it.
- Existing components cannot provide it without copying their markup or logic.
- It contains no domain-specific data or rules.

Otherwise, build the UI by composition and add a Storybook showcase. Keep the vanilla kit's
existing look.

Keep explicit Storybook IDs stable. Give every React component a test and a story. Run the slop
detector on new example pages. When overriding styles, check every existing state. Remove
obsolete guideline `unmet` markers when closing an issue.

Change generated brand tokens and marks in `apliteni/design-system`, then sync them here. Use
unmodified Lucide paths for glyphs, recording the Lucide source name when it differs from the kit
name and explaining any hand-drawn path. Name and group glyphs by what they depict, and use the
vendor's artwork for brand marks.

Keep comments short. Record design decisions in the issue, including rejected choices and who
made the decision.

## Releases

Check `Shipped surface vs version` even when branch protection does not require it.
Choose the version based on its impact on consumers. Fetch `origin/main` before pushing,
and use the next unused version. Do not create release tags or publish manually. Merging
a version bump starts the release workflow.

A merge or tag does not prove publication: after any merge to `main`, check the Release workflow
and npm's `latest`. For a waiting run the coordinator gives Artur the run URL, version and
current `latest` through Amberstone, or the visual companion if Amberstone is down, and only the
coordinator approves the exact run Artur confirms, after reading its pending deployments.

Compare every waiting version with `latest`, and report stale runs instead of approving them.
Retry a canceled release only when it is still needed, on `main` with the version tag as input.
Never weaken the main-only environment restriction or remove npm's environment binding.
`.github/workflows/release.yml` records how that boundary is configured and why.
