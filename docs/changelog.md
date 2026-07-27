# The changelog

`ui.apli.tech/changelog` is a hand-authored release timeline. Per release it shows typed
changes (Added / Changed / Fixed / Removed / **Breaking**), **component chips** that
deep-link to Storybook, a **Breaking** header badge, and a **contributor** row derived
from git.

- `site/changelog.mjs` — the `RELEASES` data + render helpers. **Pure** (no git, no fs).
- `site/build.mjs` — derives contributors from git, passes them to the renderer.
- `site/changelog.html` — page shell + CSS. `site/changelog.test.js` — unit tests.

## Data model (`RELEASES`)

An array, newest first:

```js
{
  v: '0.3.0', date: '2026-07-22', tag: 'latest',   // tag: 'latest' | 'first' | undefined
  changes: [
    // [type, text, components?]   type: added | changed | fixed | removed | breaking
    ['breaking', '`accountShell()` renamed `cap` → `maxWidth`.', ['Shell']],
    ['added',    'Finance data-table treatment.',                ['Table']],
    ['fixed',    'Enlarged the consent scope icons.'],           // components optional
  ],
}
```

`text` supports `` `code` `` and is escaped by `fmt()`. `components` is an optional list
of names from the registry below.

## Component chips → Storybook (`COMPONENTS`)

`COMPONENTS` maps a display name to a Storybook story id:

```js
const COMPONENTS = { Table: 'components-table--finance-data', /* Badge, Button, … */ };
```

A name **in** the registry renders as a purple pill linking to
`/storybook/?path=/story/<id>`; a name **not** in it (e.g. `Shell`, a helper with no
story) renders as a plain grey pill — so referencing anything is safe.

Story ids are Storybook's kebab of the story `title` + first export:
`Components/Table` + `FinanceData` → `components-table--finance-data` (`TextFields` →
`text-fields`, mind the word split). Verify new ids against `storybook-static/index.json`.

## Breaking changes

Tag a change `breaking` — that's it. It gets the red tag, and `isBreakingRelease(r)`
adds the `Breaking` header badge.

## Contributors (git-derived)

Not stored in `RELEASES`. `build.mjs` runs `git log` between each release's tag and its
predecessor, feeds the output to the pure `parseContributors()` (dedupe by email, drop
`[bot]`, order by commit count), and resolves authors via the `AUTHORS` map:

```js
const AUTHORS = { 'artur.sabirov@apliteni.com': { handle: 'asabirov', name: 'Artur Sabirov' } };
```

Known authors → GitHub avatar + `@handle` link; unknown → initials chip + name. **Every
git call is guarded**: a missing tag or absent git just means no contributor row for that
release — the build never fails. `changelog.mjs` stays pure and git-free; `build.mjs`
owns the git calls (`execFileSync`, args array — no shell).

## Adding a release

1. Prepend to `RELEASES`; move `tag: 'latest'` onto the new entry.
2. Write `changes`, tagging types and (where relevant) component names; use `breaking`
   for anything that requires a consumer change.
3. Add any new component to `COMPONENTS`, id verified against `storybook-static/index.json`.
4. Ensure the release's git tag `v<version>` exists so its contributor row renders.
5. `node --test site/changelog.test.js`, then `node site/build.mjs` and check the output.
