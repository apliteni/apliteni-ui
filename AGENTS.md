# AGENTS.md

Rules for an agent working in this repo. Contributor-facing rules are in
`CONTRIBUTING.md`; this file holds only what an agent has to do differently.

## After a merge, surface a release waiting for approval

Publishing to npm is gated. `release.yml` runs on `release: published` and stops at the
`npm-publish` environment, which needs a human to approve it — merging a version bump tags and
releases, but **does not publish**. A release nobody approves sits in the queue silently, and
this repo has had three stacked up at once while npm served a version two behind `main`.

After merging anything into `main`, check for a run waiting on approval:

```bash
gh run list --repo apliteni/apliteni-ui --workflow release.yml --status waiting \
  --json databaseId,displayTitle,headBranch,createdAt,url
```

When a run is waiting, the coordinator asks Artur through the decisions flow on
Amberstone, or the visual companion when Amberstone is down. Include the run URL,
version and current npm `latest`. Only after Artur explicitly confirms that run,
the coordinator reads its pending deployments and approves the `npm-publish`
environment through the API:

```bash
gh api repos/apliteni/apliteni-ui/actions/runs/<run-id>/pending_deployments
gh api --method POST repos/apliteni/apliteni-ui/actions/runs/<run-id>/pending_deployments \
  -F 'environment_ids[]=<environment-id>' -f state=approved \
  -f comment='Approved after Artur confirmed this release in the decisions flow.'
```

**Check the order before approving more than one.** Compare each waiting version
against `npm view @apliteni/apliteni-ui dist-tags.latest` and approve only those newer
than what is published. Report stale runs rather than approving them. The workflow
now guards `latest`: it compares semver immediately before publishing, uses `latest`
only for a higher version (or when no latest exists), and otherwise uses `backport`.
Publish jobs are serialized with a queue so overlapping runs cannot use the same
stale read.
Old tagged workflows do not gain this guard, so ordering still matters.
