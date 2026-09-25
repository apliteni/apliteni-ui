# AGENTS.md

Rules for an agent working in this repo. Contributor-facing rules are in
`CONTRIBUTING.md`; this file holds only what an agent has to do differently.

## After a merge, surface a release waiting for approval

After [owner setup](docs/release-approval.md), ordinary releases approve by rule.
Exceptions wait at `npm-publish-review`; rollout may also leave runs at the old
`npm-publish` reviewer gate. A merge does not prove npm has published. Check the
actual run and registry, and surface a waiting approval rather than approving it.

After merging anything into `main`, check for a run waiting on approval:

```bash
gh run list --repo apliteni/apliteni-ui --workflow release.yml --status waiting \
  --json databaseId,displayTitle,headBranch,createdAt,url
```

When a run is waiting, the coordinator asks Artur through the decisions flow on
Amberstone, or the visual companion when Amberstone is down. Include the run URL,
version and current npm `latest`. Only after Artur explicitly confirms that run,
the coordinator reads its pending deployments and approves the `npm-publish-review`
environment (or the legacy `npm-publish` gate during rollout) through the API:

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
Publish jobs are serialized so overlapping runs cannot use the same stale read.
GitHub keeps only one pending job per concurrency group and cancels older pending
jobs. This cannot move `latest` backwards: any job that runs checks the registry.
Rerun a canceled release if that version is still needed.
Old tagged workflows do not gain this guard. After owner setup blocks tag refs,
cancel obsolete tag runs and dispatch their tags through the Release workflow
on `main` instead. Do not weaken the main-only environment restriction to retry.
