# 0001. The registry decides whether a release happened, and the tests run the workflow rather than read it

- **Date:** 2026-08-10
- **Status:** accepted
- **Code:** `.github/workflows/tag-on-bump.yml`, `scripts/tag-on-bump.test.js`
- **Issues:** #142, #170

## What we ran into

A failed publish could become permanently green, in three runs:

1. A bump lands. The workflow tags, cuts the Release, dispatches the publish, and the publish
   fails — or, far more ordinarily, sits waiting for a reviewer to approve the `npm-publish`
   environment. The job is red. Correct so far.
2. Any later push to `main`. The plan step asked "does the tag exist?"; the tag was created in
   step 1 *before* the publish, so the answer was yes. `release=false`, the publish step skipped
   itself on its own `if:`, and the job exited 0.
3. From then on, green for ever. Nothing on npm, a healthy-looking pipeline, and a re-run that
   could not retry because it reached the same conclusion. Only a manual dispatch, or
   `version-drift.yml` a day or two later, would notice.

## What we decided

**The registry decides, not the tag.** A version is released when npm serves it, and the plan step
asks npm rather than asking git.

**The tests execute the workflow's real `run:` bodies.** What is under suspicion is a decision made
in shell, so the plan step's body runs against a real git remote with `npm` stubbed, and the `if:`
expressions of the steps that depend on it are evaluated the way Actions evaluates them. Asserting
on the YAML would prove nothing: the strings under suspicion are exactly the ones a grep would be
looking for.

The publish step gets the same treatment, for the same reason in reverse — it was the one part of
this workflow no test executed, and four separate defects were living in it. `gh` is stubbed the
way `npm` is, a script first on `PATH`, over a virtual clock, so a seventeen-minute wait costs a
millisecond and the elapsed time is itself something a test can assert on. The stub hands real
`--jq` programs to the real `jq`, because those filters are where two of the four defects were.

## Why not the alternatives

**Assert on the YAML.** Cheapest, and it cannot see a decision. Every defect found here was in the
behaviour of a shell body, not in the presence of a string.

**Let the tag decide, and fix the ordering instead** — tag after the publish rather than before.
That trades one wedge for another: a publish that succeeds and a tag step that then fails leaves a
version on npm with no tag, which `version-drift.yml` reads as drift and a human has to
disentangle. Asking the registry answers the real question directly.

**Wait for a real release to test it.** The condition takes days to recur and cannot be induced on
demand. The virtual clock is what makes a seventeen-minute wait testable at all.

## What this does not cover

The job still depends on a run-level `waiting` status meaning the `npm-publish` environment gate,
which holds for `release.yml` as it stands and is not enforced anywhere.

`--limit 50` on the run lookup is a real dependency — a repository with more than fifty newer
`release.yml` runs would not find the one it wants — claimed by no comment and held by no test.
