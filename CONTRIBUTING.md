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

## Issues & pull requests

- **Found a bug or want a component?** Open an issue — pick **Bug report** or **Component
  or enhancement request** so the important details are captured up front. One thing per issue.
- **Sending a change?** Fork, branch off `main` (`fix/…` or `feat/…`), and open a PR against
  `main`. Fill in the PR template: what changed, the linked issue, and the verification
  checklist.
- **`main` is protected.** A PR needs one approving review and green CI before it merges — no
  direct pushes. CI runs the build, `npm test` (unit + axe a11y), an `npm audit`, a published-
  artifact check, and the secret-scan + internal-terms gates (see Data handling).
- Keep PRs focused. One concern per PR reviews faster than a grab-bag.

## Golden rules

1. **Tokens, never literals.** Components reference semantic tokens
   (`var(--accent)`, `var(--surface)`, `var(--space-4)`) — never raw hex or px
   colours. If you need a value that doesn't exist, add a token first.
2. **Signal colours are constant.** `--green` = live, `--pink` = danger. They do
   **not** move with the accent. Only the accent family does.
3. **Every state.** A component isn't done until hover, focus-visible, disabled,
   busy, empty, error and success are all designed and in a story.
4. **Both themes, all accents.** Check dark and light, and at least Nebula +
   Phoenix, before opening a PR. Use the toolbar toggles.
5. **No visual slop.** Run the AI-slop detector on any new example page.
6. **A stateful control reports the state it is in** — never the state a click
   would produce. `segmented()` marks the active option `aria-pressed`, the
   Deck/Text switch marks the current view `aria-current`, the theme toggle
   shows a moon while dark and a sun while light. The accessible name says the
   state too (`Theme: Dark. Switch to light.`) and is rewritten whenever the
   state changes — a name that is right once and never again tells a screen-
   reader user nothing. See `themeName()` in `src/components/topbar.js`.

## Data handling

This repo is **public**. Never commit real customer or financial data, personal
emails or phone numbers, or internal infrastructure identifiers (Lessly
service/org/product IDs, `*.lessly.run` hosts, ttl.sh image tags, deploy tokens) —
in code, fixtures, **issues, or PR text**. Use clearly-fabricated placeholders for
all demo data (e.g. `Ada Lovelace / ada@apliteni.com`).

Two automated gates enforce this (see `.github/workflows/security.yml`): gitleaks
with a PII/infra ruleset (`.gitleaks.toml`) and an internal-terms denylist, both
over the full history. Run them locally before pushing with
[pre-commit](https://pre-commit.com): `pip install pre-commit && pre-commit install`.
Issues and PR bodies aren't covered by gitleaks — a separate workflow warns on
internal identifiers posted there, but the responsibility is yours.

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

```bash
npm version patch|minor|major     # bumps package.json + tags
git push --follow-tags
gh release create v$(node -p "require('./package.json').version") --generate-notes
```

CI publishes to the public npm registry (`@apliteni/apliteni-ui`) on the Release.
The release runs as two jobs: `build` installs and runs `npm pack`, whose `prepare`
builds `react/dist` from the tagged commit — so the React subpath can never ship
stale — and `publish` holds the OIDC credential and does nothing but publish that
tarball, so no third-party install or build script runs beside it.
The `ui.apli.tech` site rebuilds
from the repo (landing + Storybook) — see the README for the image build/deploy.
