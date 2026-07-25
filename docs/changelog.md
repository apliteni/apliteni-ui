# The changelog

`ui.apli.tech/changelog` is a hand-authored release timeline that, per release, shows:

- typed changes (**Added / Changed / Fixed / Removed / Breaking**);
- **component chips** on each change, deep-linking to that component's Storybook story;
- a **Breaking** badge in the header when a release contains a breaking change;
- a **contributor** row, derived automatically from git tags at build time.

## Files

- `site/changelog.mjs` — the data (`RELEASES`) and all render helpers. **Pure**: no git,
  no filesystem.
- `site/changelog.html` — the page shell + inline CSS.
- `site/changelog.test.js` — `node --test` unit tests.
- `site/build.mjs` — derives contributors from git and passes them to the renderer.

## Data model (`RELEASES`)

`RELEASES` is an array, newest first. Each entry:

```js
{
  v: '0.3.0', date: '2026-07-22', tag: 'latest',   // tag: 'latest' | 'first' | undefined
  changes: [
    // [type, text, components?]
    ['breaking', '`accountShell()` renamed `cap` → `maxWidth`.', ['Shell']],
    ['added',    'Finance data-table treatment.',                ['Table']],
    ['fixed',    'Enlarged the consent scope icons.'],           // components optional
  ],
}
```

- **`type`** ∈ `added | changed | fixed | removed | breaking`. Each maps to a colored
  tag via the `TAG` table; `breaking` is a white-on-pink tag.
- **`text`** — the change description. Inline `` `code` `` and `&<>` are handled by the
  `fmt()` escaper.
- **`components`** — optional list of component names (see the registry below). Each
  renders as a chip after the change text.

Change text supports markdown-ish backticks only (via `fmt`); everything else is plain,
escaped text.

## Component chips → Storybook (`COMPONENTS`)

`COMPONENTS` maps a display name to a Storybook **story id**:

```js
const COMPONENTS = {
  Table: 'components-table--finance-data',
  Badge: 'components-badge-status--badges',
  // …Button, Card, Callout, Inputs, Segmented, Snippet, Switch, Topbar, Feedback
};
```

- A name **in** the registry renders as a purple pill linking to
  `/storybook/?path=/story/<id>`.
- A name **not** in the registry (e.g. `Shell`, a kit helper with no story) renders as a
  plain, unlinked grey pill — so referencing anything is always safe.

**Story ids** follow Storybook's kebab-casing of the story's `title` + first export:
`Components/Table` + export `FinanceData` → `components-table--finance-data`
(`TextFields` → `text-fields`, not `textfields` — mind the word split). When you add a
registry entry, confirm the id against the built `storybook-static/index.json`.

## Breaking changes

Any change with type `breaking` gets the red `Breaking` tag on its line, and
`isBreakingRelease(r)` drives a `Breaking` badge in that release's header. No separate
flag to set — tagging a change `breaking` is enough.

## Contributors (git-derived, at build time)

Contributors are **not** stored in `RELEASES`. `build.mjs` computes them:

1. For each release with a matching git tag `v<version>`, it finds the previous
   release's tag and runs `git log --format=%an%x09%ae <prevTag>..<thisTag>` (or just
   `<thisTag>` for the oldest).
2. The output goes to the pure `parseContributors(logText, authors)` in `changelog.mjs`,
   which dedupes by email, drops `[bot]` accounts, orders by commit count, and resolves
   each author via the `AUTHORS` map.
3. `AUTHORS` maps a commit email to a GitHub handle:
   ```js
   const AUTHORS = { 'artur.sabirov@apliteni.com': { handle: 'asabirov', name: 'Artur Sabirov' } };
   ```
   Known authors render as a GitHub avatar (`https://github.com/<handle>.png`) + `@handle`
   link; unknown authors fall back to an initials chip + plain name.

**Every git call is guarded.** A missing tag, a shallow clone, or git being absent just
means that release shows no contributor row — the build never fails. (The `RELEASES`
data currently tops out before the newest tags, and one release has no tag; both degrade
silently.)

`changelog.mjs` stays pure so it's unit-testable without git; `build.mjs` owns the git
calls (via `execFileSync` with an args array — no shell) and passes the result in as
`changelogMain(contributorsByVersion)`.

## How to add a release

1. Prepend an entry to `RELEASES` in `site/changelog.mjs` (newest first). Set `v`,
   `date`, and — if it's the newest — move `tag: 'latest'` onto it (and remove it from
   the previous entry).
2. Write the `changes`, tagging each with a type and, where a component is touched, its
   registry name. Use `breaking` for anything that requires a consumer change.
3. If a change references a component not yet in `COMPONENTS`, add it — display name →
   `components-<kebab-title>--<kebab-first-story>`, verified against
   `storybook-static/index.json`.
4. Contributors need no edit — they come from the git tag range. Make sure the release's
   git tag exists (`v<version>`) so its contributor row renders.
5. `node --test site/changelog.test.js`, then `node site/build.mjs` and check
   `site/public/changelog/index.html`.

## Tests

`site/changelog.test.js` covers the pure pieces: `componentChips` (known link / unknown
plain / escaping), `isBreakingRelease` + the header badge, `parseContributors` (dedupe,
bot filter, ordering by displayed name, initials fallback), and `contributorChips`
(avatar vs initials, attribute escaping). The git derivation itself is verified by the
build smoke check (a real build must emit both component and contributor chips).
