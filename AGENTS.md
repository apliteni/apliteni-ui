# Agent rules

Human setup is described in [README.md](README.md#contribute). Before changing
components, read the [specification](docs/specification.md) and
[guidelines](guidelines/overview.md).

## Data handling

This repository is public, so use fabricated demo data. Never include real customer or
financial data, personal contact details, credentials, or internal infrastructure
identifiers in files, issues, PRs, or evidence. Automated scans cannot find everything.

Run security checks on the branch's commits before pushing. Removing a secret later does
not remove it from the history. Create scanner fixtures in temporary folders and always
remove them. If you change security checkers, workflows, or pre-commit configuration,
flag this in the PR so a reviewer checks the protection itself.

## Verification

Before handoff, run `npm test` with `jq` installed, `npm test -w react`, `npm run
build-storybook`, and `node site/build.mjs`. Stage new files first so git-based tests
can find them. Add new test directories to both the guard and the glob in `npm test`.

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
recorded figure.

New gates must discover their subjects, fail when cases are not measured, check coverage
counts, and prove rejection with a failing mutation. Share calculations across
workspaces, but keep their coverage checks separate. Read the source unless you are
testing the built package. State each test's limits beside it and keep those statements
current.

Review changed contrast measurements by hand. Never regenerate accepted-failure ledgers
automatically. Explain the cause and limitation of each accepted failure.

## Check accents locally

Before opening a PR that changes colours, tokens or theme/accent CSS, run:
`CONTRAST_ACCENTS=1 node --test --test-name-pattern='contrast ledger:' stories/contrast.test.js`
Report the result in the PR. Keep this check out of routine CI to save Actions minutes.

## Check the phone tap floor locally

Before opening a PR that changes a control's size, a container's gap, or
`src/styles/tap-zone.css`, measure the tap zones in a real browser:
`UI_PLAYWRIGHT=… TAP_ZONES=1 node --test stories/tap-zone.test.js`
Report the result in the PR. Playwright is not a dependency and CI runs only this
gate's source half, so the measurement is yours to run.

## Check the disabled field paint locally

Before opening a PR that changes a field's or a button's disabled paint, or
`src/styles/input.css`, measure it in a real browser — JSDOM ships no user-agent
stylesheet, so the source half only emulates the one declaration Chromium fades a
disabled select with:
`UI_PLAYWRIGHT=… UI_CHROME=… FIELD_PAINT=1 node --test stories/field-ground.test.js`
Report the result in the PR. Playwright is not a dependency and CI runs only this
gate's source half.

## Changes

No new factories, no parity tests for new React work. See #429.

Add a general, composable kit component only when all three checks are true:

- The issue names at least two products that use it or have requested it.
- Existing components cannot provide it without copying their markup or logic.
- It contains no domain-specific data or rules.

Otherwise, build the UI by composition and add a Storybook showcase.
Keep the vanilla kit’s existing look.

Keep explicit Storybook IDs stable. Give every React component a test and a story. Run
the slop detector on new example pages. When overriding styles, check every existing
state. Remove obsolete guideline `unmet` markers when closing an issue.

Change generated brand tokens and marks in `apliteni/design-system`, then sync them
here. Use unmodified Lucide paths for glyphs. Record the Lucide source name when it
differs from the kit name, and explain any hand-drawn path. Name and group glyphs by
what they depict. Use the vendor's artwork for brand marks.

Keep comments short. Record consumer guarantees in the specification. Record design
decisions in the issue, including rejected choices and who made the decision.

## Releases

Check `Shipped surface vs version` even when branch protection does not require it.
Choose the version based on its impact on consumers. Fetch `origin/main` before pushing,
and use the next unused version. Do not create release tags or publish manually. Merging
a version bump starts the release workflow.

A merge or tag does not prove publication. After any merge to `main`, check the
Release workflow and npm's `latest`. For waiting runs, the coordinator gives Artur
the run URL, version and current `latest` through Amberstone, or the visual companion
if Amberstone is down. Only the coordinator approves the exact run Artur confirms,
after reading its pending deployments.

Compare every waiting version with `latest`, and report stale runs instead of approving
them. The publish job checks again and sends older versions to `backport`. Retry a
canceled release only when it is still needed. Run retries on `main` with the version
tag as input. Never weaken the main-only environment restriction or remove npm's
environment binding. See [release setup](docs/release-approval.md).
