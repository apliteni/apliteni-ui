# AGENTS.md

Rules for an agent working in this repo. Contributor-facing rules are in
`CONTRIBUTING.md`; this file holds only what an agent has to do differently.

## After a merge, surface a release waiting for approval

Publishing to npm is gated. `release.yml` runs on `release: published` and stops at the
`npm-publish` environment, which needs a human to approve it — merging a version bump tags and
releases, but **does not publish**. A release nobody approves sits in the queue silently, and
this repo has had three stacked up at once while npm served a version two behind `main`.

So: after merging anything into `main`, check for a run waiting on approval, and open the
approval page when there is one.

```bash
gh run list --workflow release.yml --status waiting \
  --json databaseId,displayTitle,headBranch,createdAt,url
```

**Open a window only when that returns a run.** Most merges do not produce one — only a merge
carrying a version bump does — and a tab opened for nothing is worse than no tab. This is the
standing ask that satisfies the "never open a browser unless I asked" rule; it is not a licence
to open anything else.

The approval lives on the run's own page: open the `url` the query returns.

**Check the order before approving more than one.** Approvals are independent, and `npm publish`
sets the `latest` dist-tag by default, so approving an older waiting run after a newer version
has already published moves `latest` backwards. When several are waiting, compare each against
`npm view @apliteni/apliteni-ui version` and approve only those newer than what is published.
Say so rather than approving a stale one.

Open it. The owner asked for the window itself, not for a link he has to click — that is the
whole point of this rule, and it is the one place in this repo where an agent opens a browser
without being asked in the moment:

```bash
open -a Comet "<url>"
```

Hand over the URL as text as well, so the run is still findable if the window is lost. You
cannot approve on his behalf; opening the window is where your part ends.
