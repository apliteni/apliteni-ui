# Contributing to @apliteni/apliteni-ui

The kit is **framework-agnostic HTML + CSS**: design tokens, one CSS file per
component, and tiny factory functions. Storybook is the workbench. `src/` has no build
step — what you write is what ships. The one exception is the React components in
`react/`, which are compiled by tsup into `react/dist/` and published as the
`@apliteni/apliteni-ui/react` subpath (see below).

## Setup

```bash
npm install
npm run storybook        # http://localhost:6006
```

`npm test` also needs [`jq`](https://jqlang.github.io/jq/) on your PATH: `brew install jq`,
`apt install jq`, `winget install jqlang.jq`. Without it the tests covering the release
workflow's publish step skip themselves instead of failing, so a green local run is not
proof they passed. CI stops the run rather than skipping them.

## Issues & pull requests

- **Found a bug or want a component?** Open an issue — pick **Bug report** or **Component
  or enhancement request** so the important details are captured up front. One thing per issue.
- **Sending a change?** Fork, branch off `main` (`fix/…` or `feat/…`), and open a PR against
  `main`. Fill in the PR template: what changed, the linked issue, and the verification
  checklist.
- **`main` is protected.** Direct pushes are blocked, and five checks have to be green before
  the merge button works: `build`, `Dependency audit`, `Published artifact check`, `Secret scan
  (gitleaks)` and `Internal-terms denylist`. Inside `build` are the build itself, `npm test`
  (unit + axe a11y) and the React tests. Review conversations have to be resolved as well —
  one open thread greys the button out with all five checks green.
- **Less is enforced than that sounds.** No review is required — the rule asks for zero
  approvals, so you can merge your own pull request. Nor is `Shipped surface vs version` (see
  Release) one of the required checks, which means it can go red while the merge button stays
  green. And because pull requests need not be up to date with `main`, two of them can each
  bump to the same version. Repository admins are exempt from all of it. Making any of this
  stricter takes three settings on the branch rule for `main` — require one approving review,
  add `Shipped surface vs version` to the required checks, turn on "require branches to be up
  to date" — and none of them live in this repository.
- Keep PRs focused. One concern per PR reviews faster than a grab-bag.

## Rules

The rules for designing a screen are in the **Guidelines** section of Storybook —
[ui.apli.tech/storybook](https://ui.apli.tech/storybook/). Tokens and colour, the states
a component owes, which component to reach for, how it words itself. Read them before
you start, not at review.

**No visual slop.** Run the AI-slop detector on any new example page. It reads
comments too: past about twenty-five lines, a comment block has stopped being a
comment and become a design document. The argument goes in `docs/adr/` and the
code keeps a one-line pointer — see [docs/adr/README.md](docs/adr/README.md).

## Data handling

This repo is **public**. Never commit real customer or financial data, personal
emails or phone numbers, or internal infrastructure identifiers (Lessly
service/org/product IDs, `*.lessly.run` hosts, ttl.sh image tags, deploy tokens) —
in code, fixtures, **issues, or PR text**. Use clearly-fabricated placeholders for
all demo data (e.g. `Ada Lovelace / ada@apliteni.com`).

Two automated gates enforce this (see `.github/workflows/security.yml`), and both
are required checks: gitleaks with a PII/infra ruleset (`.gitleaks.toml`), and an
internal-terms denylist, which greps the tracked files as they stand. On a pull
request gitleaks reads only that pull request's own commits; on a push to main it
reads the whole history. Run them locally before pushing with
[pre-commit](https://pre-commit.com): `pip install pre-commit && pre-commit install`.
Issues and PR bodies aren't covered by gitleaks — a separate workflow warns on
internal identifiers posted there, but the responsibility is yours.

The files those gates are *made of* — `.github/`, `.gitleaks.toml`,
`.pre-commit-config.yaml`, the `scripts/*.check.mjs` — are owned, and the owner is
named in [.github/CODEOWNERS](.github/CODEOWNERS). A pull request is graded by the
gate as that pull request defines it, so a diff loosening a rule is checked by the
loosened rule: the review is the part that catches it. Touch one of those files and
the Security workflow says so in a warning on the run — nothing blocks the merge, so
get the owner to read it. `scripts/codeowners.check.mjs` keeps the record honest; a
new workflow or a new check script has to end up covered by it.

## Add a component

1. `src/styles/<name>.css` — token-driven, `.ui-<name>` class namespace.
2. `@import` it in `src/index.css`, and add it to `src/inline.js` (`styles` map +
   `cssText`) so server-render consumers get it.
3. A factory in `src/components/index.js` returning an HTML string.
4. `stories/components/<Name>.stories.js` — a Playground + a states gallery.

## React components (`react/`)

`react/` is a **private workspace** — it is not a package anyone installs. Its build
output ships as the `@apliteni/apliteni-ui/react` subpath of this package, so the kit
is one package with one version, one pin and one supply-chain surface. Rules:

1. **No drift.** React components render only `.ui-*` classes + tokens — never
   their own colours, spacing, or radii. The design tokens' source of truth is
   the `apliteni/design-system` repo.
2. **Parity test is a merge gate.** Each primitive has a class-name parity test
   (`react/src/test/classlist.ts`) asserting its class list equals the vanilla
   factory's output. If it fails, fix the React component — the vanilla output
   is the source of truth.
3. **React stays out of the root manifest.** The root package declares `react` and
   `react-dom` nowhere — not as dependencies, not as peers. An optional peer lands in
   the lockfile as `devOptional`, which put React in the set the production audit
   walks, and that audit gates `main`: one react-dom advisory would redden every PR
   in a repo that ships no React. React reaches us only as a devDependency of this
   workspace, stays `external` in `tsup.config.ts` — never bundled — and consumers
   install it themselves, which the README has to keep saying.
   `scripts/packaging.test.js` fails if any of that slips.
4. Use TypeScript; every component gets a test and a Storybook story.
5. **Never publish it separately, and never give it a `*` dependency.** The workspace
   is `"private": true` with no `dependencies`; it reaches the vanilla factories
   through the bare `@apliteni/apliteni-ui` specifier, which resolves to this very
   package once installed and to `../src/` in the repo (`react/kit-alias.ts`, wired
   into `vitest.config.ts` and `.storybook/main.ts`). `scripts/packaging.test.js`
   enforces all of it.
6. **Root `test` glob is explicit.** The root `test` script lists directories
   (`src/`, `stories/`, `site/`, `scripts/`) rather than globbing everything — if you
   add a new top-level directory containing tests, add it to that glob too. It names
   each directory twice: once in the guard that fails the run when a directory is
   missing, once in the glob handed to `node --test`. A renamed directory used to
   drop its tests and still exit 0; now it exits 1 and says which one is gone.

### Packaging guard

`scripts/packaging.test.js` packs the real tarball (`npm pack`, which runs `prepare` →
the tsup build), installs it into a scratch directory outside the repository, and then
checks every `exports` entry **from a consumer that lives there**: the target is in the
tarball, it is not zero bytes once installed, it resolves under **both** `import` and
`require`, and — for JS entries — importing it yields exports. 0.7.2 shipped an
`exports` map that read fine and a `files` array that dropped every React file;
reading `package.json` back to itself proves nothing. A guard that would still pass
with an empty bundle, or with a subpath no `require()` can reach, is not a guard.

The install is what makes the check honest. `react/package.json` is deliberately kept
out of the tarball, and that absence is what lets Node's self-reference resolution find
the root manifest — so the bare `import { icon } from "@apliteni/apliteni-ui"` inside
`react/dist/index.js` only resolves once the package is installed. Checked from the
working tree it either fails, or passes by accident off a stale
`node_modules/@apliteni/apliteni-ui` left over from an earlier install.

The install is offline: the kit declares no runtime dependencies, so a correct tarball
needs nothing from the registry. React is linked in from the repo's own `node_modules`
afterwards, the way a real consumer of `./react` supplies it — and only after the guard
has asserted that installing the kit alone dragged no React along. If the install
itself fails, the run fails with npm's output attached; it never passes because nothing
was checked. Adds roughly 0.3s to the run.

If you add an export, add its files to `files`; the guard will tell you. Wildcard
targets (`"./guidelines/*"`) are expanded against the pack list and each match is
checked, so a pattern is never reported as a missing file.

## Add an accent sub-theme

Append a pair of blocks to `src/tokens/accents.css`:

```css
:root[data-theme="dark"][data-accent="<name>"]  { /* --accent, --purple*, --glow-purple, --ring, --grad-* */ }
:root[data-theme="light"][data-accent="<name>"] { /* light variant */ }
```

Add it to the toolbar (`.storybook/preview.js` globalTypes.accent), the
`accentPicker()` swatches, and the `Sub-themes` story maps. Verify contrast of the
primary button (`--accent` bg × `--accent-contrast` text) in both themes.

## Brand tokens (synced from design-system)

`src/tokens/brand.generated.css` is **generated — never hand-edit it.** It holds
the Apliteni umbrella-brand colour primitives (`--color-apliteni-*`: the violet
and supporting ramps), owned upstream by
[`apliteni/design-system`](https://github.com/apliteni/design-system) and served
at `style.apliteni.com`. Every push to that repo's `main` opens a CI-gated PR here
that rewrites this one file (RFC #42, Option B).

- To change a **brand** colour: edit it upstream, not here. The sync PR follows.
- To refresh locally: `npm run tokens:sync -- --url https://style.apliteni.com/tokens.css`
  (or `--from <path>/dist/tokens.css` against a local checkout). `npm run tokens:check`
  fails if the file is stale.
- Our **semantic** tokens (`--bg`, `--surface`, `--accent`, signal colours) stay
  hand-authored in `tokens.css`. The purple deck theme is a deliberate product
  choice, so it may diverge from the brand palette. `npm run tokens:drift` prints
  where — expected, not a bug.

`src/assets/brand.generated/` is the same story for the **Apliteni marks** — the
umbrella wordmark + seedling mark, synced from upstream (`index.js` exports them as
inline strings; see Foundations → Brand → Umbrella). Use these for *Apliteni the
company*. The kit's own `prism` mark stays hand-authored in `src/assets/brand.js`.

## Release

A release is a version bump. Merge one to `main` and the rest happens on its
own: `tag-on-bump.yml` tags the commit, cuts a GitHub Release whose notes are
the changelog entry for that version, and dispatches the publish workflow on
the tag. The old ritual of `npm version`, a pushed tag and `gh release create`
is gone.

One step still needs a person. The publish job runs in the `npm-publish`
environment, which asks one of four reviewers to approve it and will not let you
approve your own, so expect to be waiting for somebody else. `tag-on-bump.yml`
watches the publish for ten minutes and then stops watching. A run that finishes
inside that window is reported as it finished, red if the publish failed. It also
goes red when the publish succeeded and npm's last answer, once the two and a half
minutes are up, is that it does not have the version — and the message sends you
to npm first, because a version is published before every edge can read it. Any
other last answer leaves the job green with a warning on it, because a registry
that was not answering when the window closed has said nothing either way, and
`version-drift.yml` is what catches that one.

A run still waiting on a reviewer when the ten minutes are up leaves the job
green, with a warning naming what it is waiting for and, where it can, the run.
Somebody who has not clicked yet is not a broken pipeline.

So that green does not mean the version shipped. It means the release was
started: the tag, the Release and the dispatch are all done, and npm has nothing
new on it until the approval lands. If the approval never comes, what notices
is `version-drift.yml` — it compares npm against `main` once a day and only
reports a gap older than twenty-four hours, so expect the issue in one to two
days rather than overnight.

A red job does not undo itself. The publish it started can still finish, since a
run that was building when the watch ran out may publish minutes later, but the
job that already went red stays red — nothing goes back and re-runs it. What
turns green is the next push to `main`, because the decision comes from the
registry rather than from the tag: once the version is on npm, any run after
that reads the release as done. Or re-run the failed job by hand — same thing.
Either way nothing needs undoing: whatever part of the release is missing gets
picked up from where it stopped.

Two things have to be in the pull request. The `Shipped surface vs version` job
checks both and goes red without either. Since it is not one of the checks
branch protection requires, though, a red one does not stop the merge — read it
yourself before you merge.

**A change to what we publish needs a bump.** The `Shipped surface vs version`
job packs the tarball at both ends of the pull request and compares the
contents. If they differ and the version does not, it fails and names the
files. `files` in package.json is what decides "published" — everything in
`src/` except its tests, `react/dist`, plus the readme, licence and manifest
files npm adds whether you list them or not. 52 files today. Two cases catch
people out. `react/dist` is built from `react/src` and is not in the
repository, so a React change lands in the report as a `react/dist` change you
never saw in your diff. Tests under `src/` ship nothing, so editing one needs
no bump.

**A bump needs a changelog entry.** Add it to the `RELEASES` array in
`site/changelog.mjs`, in the same pull request. The Release notes are read from
there, so a version nothing describes is a release that cannot be built.
Without this gate the failure would arrive after the bump was already on
`main`, and undoing that takes a second pull request.

Which number to bump is still yours to choose. Patch or minor is a judgement
about what the change costs the people who installed the package, and once a
version is on npm it is there for good.

The publish runs as two jobs. `build` installs and runs `npm pack`, whose
`prepare` builds `react/dist` from the tagged commit — so the React subpath can
never ship stale — and `publish` holds the OIDC credential and does nothing but
push that tarball to the public npm registry, so no third-party install or
build script runs beside it.

If `main` and npm disagree for more than a day, a scheduled job opens an issue
saying so. It is the backstop for a release that was tagged and never reached
the registry.

The `ui.apli.tech` site rebuilds from the repo (landing + Storybook) — see the
README for the image build/deploy.
