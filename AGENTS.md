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

## Changes

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
