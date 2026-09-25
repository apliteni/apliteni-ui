# Release approval setup

The policy in `release.yml` runs from main and approves a release when its tag
commit is on main, CI and Security passed for that commit, and its version is
above npm latest. Other valid releases wait for a required reviewer. An invalid
tag or missing environment setup stops before build. The final publish guard
still prevents an older version from moving latest backwards.

## Owner setup, in this order

Do not remove the current reviewers until the main-only restriction and fallback
reviewers are saved. No GitHub App or new secret is needed.

1. On **apliteni/apliteni-ui → Settings → Environments**, open **npm-publish**
   and note its current reviewers. Keep them enabled during setup.
2. Return to **Environments → New environment**, enter **npm-publish-review**,
   and click **Configure environment**. Enable **Required reviewers**, add the
   same people/teams, select **Prevent self-review**, then **Save protection rules**.
   Under **Deployment branches and tags**, choose **Selected branches and tags**,
   click **Add deployment branch or tag rule**, choose **Branch**, enter **main**,
   and click **Add rule**. Add no tag rule and no secrets.
3. Merge the reviewed PR only after #370 is merged. Until the remaining setup
   is complete the new workflow cannot publish through the old tag-only gate.
4. In **Settings → Environments → npm-publish → Deployment branches and tags**,
   keep **Selected branches and tags**. Add a **Branch** rule named **main**;
   delete the **Tag** rule `v*` and any other branch/tag allowances. Verify the
   only rule is **Branch: main**. Keep the reviewers enabled for this step.
5. On **npmjs.com → @apliteni/apliteni-ui → Settings → Trusted Publisher**,
   verify provider **GitHub Actions**, organization **apliteni**, repository
   **apliteni-ui**, workflow **release.yml**, and environment **npm-publish**.
   If the environment is empty, set it to **npm-publish** and save. Never leave
   the environment binding blank; GitHub's restriction is part of the boundary.
6. Back in GitHub's **npm-publish**, clear **Required reviewers** and click
   **Save protection rules**. Leave **Branch: main** in place. Keep required
   reviewers enabled on **npm-publish-review**.
7. In **Actions → Release**, cancel obsolete waiting tag runs. Click **Run
   workflow**, select **main**, enter the version tag in **tag**, and click
   **Run workflow**. The policy summary gives the exact source SHA and reason.
   A newer tag on main with green CI should skip Review and reach Publish;
   exceptions should wait at **npm-publish-review**. Use a previously published
   tag to confirm the fallback without approving it. Confirm a dispatch from
   a tag or non-main branch cannot reach the publish environment.

No settings were changed by the PR. These steps and a real release are required
to verify GitHub environment enforcement and npm OIDC end to end. A policy test
cannot prove account settings.

## Recovery and security boundary

To pause automatic releases, re-enable required reviewers on **npm-publish**.
Do not remove the environment binding from npm or widen its main-only rule.
A failed policy lookup waits for review; a failure reading the fallback's reviewer
configuration stops the run. Configure the environment and rerun failed jobs.
A person can approve an exception from the run's **Review deployments** control;
this approves its resolved source commit and does not override the dist-tag guard.

People who can dispatch workflows can request releases. Automatic publishing
requires the rule; exceptions require one configured reviewer. People who can
change main's workflow can change the rule, and repository administrators can
change its settings. Main currently requires no PR approval and allows admin
bypass: this design does not add a mandatory human check on every release.

Only the publish job can request npm OIDC credentials. Build runs without that
permission or saved checkout credentials. The policy and publish selector run
from the main workflow revision; the package is built from the resolved tag SHA.
The policy summary records that SHA because the workflow's provenance revision
is main's revision, which may differ from the package source revision.

References: [GitHub environment setup](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments),
[npm trusted publishers](https://docs.npmjs.com/trusted-publishers/).
