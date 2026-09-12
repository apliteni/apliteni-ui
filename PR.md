# Release 0.31.0 — the wave, written down

The wave Artur approved on 12 September, described as one version: the command palette, the
drawer and motion work, and the labels-and-titles typography. `package.json`, the lockfile and
a `RELEASES` entry in `site/changelog.mjs` — no kit code changes here.

## Why 0.31.0 and not 0.28.0

0.28.0 was the number the wave was planned under, and it is taken. Three pull requests that
branched before the wave merged after it and each carried its own bump:

| Version | Tag | Merged as | Describes |
|---|---|---|---|
| 0.28.0 | `v0.28.0` | [#287](https://github.com/apliteni/apliteni-ui/pull/287) | `tooltip()` and the Hover readouts guidelines |
| 0.29.0 | `v0.29.0` | [#290](https://github.com/apliteni/apliteni-ui/pull/290) | `backLink()` and the Going back guidelines |
| 0.30.0 | `v0.30.0` | [#291](https://github.com/apliteni/apliteni-ui/pull/291) | `dropdown({ search: true })` |

`shipped-surface.mjs` refuses a bump that is not upwards, and for the reason it states: a
version that is merely *different* releases nothing. So the wave takes the next number up.

**The code is already on npm.** `@apliteni/apliteni-ui@0.30.0` is `latest` and its tarball
carries `src/components/command-palette.js`, `src/styles/command-palette.css`, the drawer
sheet, and zero `text-transform` rules — the wave landed on `main` before #287 branched off it,
so every version published since has shipped it undescribed. This release is where it gets
written down. Anyone already on 0.30.0 has the two breaking changes below in the tree they
installed.

## What ships

Three merged pull requests, none of which carried a version bump by design:

| PR | Issues | What it added |
|---|---|---|
| [#292](https://github.com/apliteni/apliteni-ui/pull/292) | #268, #269 | Sentence case everywhere, five named type ranks, a card title that is a heading |
| [#289](https://github.com/apliteni/apliteni-ui/pull/289) | #272, #271 | A quieter drawer, the Drawers and Motion guidelines, a React `Drawer` that moves |
| [#293](https://github.com/apliteni/apliteni-ui/pull/293) | #274 | `commandPalette()`, `<CommandPalette>`, and the Guidelines page for it |

## The breaking line

Two changes are marked **breaking**, both #292's, both visible to a consumer's existing markup:

- **Nothing in the kit sets text in capitals by style.** `text-transform` is gone from eleven
  rules. A label written `Paid` rendered `PAID` and now renders `Paid`, so copy that leaned on
  the uppercasing has to be rewritten in sentence case.
- **`card()` and `<Card>` emit the title as an `h2`.** A card title joins the page's heading
  outline, `level` takes it to `h3`–`h6`, and a title holding block content has to become
  inline content.

Neither is a rename anybody can grep for, which is why both are tagged rather than mentioned.

Two more are consumer-visible without being breaking, and the entries say what to do: React
`Modal` now stays mounted until its exit transition ends (about 250ms after `open` turns
false), and React Modals, Drawers and CommandPalettes share one dialog stack.

## What was decided here

- **No `tag: 'latest'` on the entry.** `docs/changelog.md` still documents the field, but
  nothing reads it — no entry in `RELEASES` carries one, and `site/changelog.mjs`'s own header
  says the Latest and First badges come from the release list rather than a flag. Adding it
  would be dead data that contradicts the file.
- **`CommandPalette` joins `COMPONENTS`** as `components-command-palette--playground`, so its
  chips deep-link to Storybook instead of rendering grey. The id is Storybook's own
  `toId('Components/Command palette', 'Playground')`.
- **Each change keeps the type its PR gave it.** #289 marked the Modal's motion and layer
  *Changed (visible)* rather than breaking; that judgement is the author's and is preserved.
- **The entry does not say "already in 0.30.0".** The changelog reads as what a version
  contains, and 0.31.0 contains all of it. The provenance is here, in the pull request, rather
  than in a line every future reader of the changelog has to step over. Say the word and it
  moves into the entry.

## The gates

```
npm test                        1362 tests, 1360 pass, 0 fail, 2 skipped
npm run build                   exit 0 — site, then tsup ESM + DTS
npm test --workspace react      15 files, 300 tests, 0 fail
node scripts/release-notes.mjs 0.31.0   renders Breaking / Added / Changed / Fixed
node scripts/shipped-surface.mjs        0.30.0 → 0.31.0, tarball byte-for-byte the base's
```

The tarball is unchanged on purpose: this pull request touches `package.json`, the lockfile,
`site/changelog.mjs` and this file, and `files` publishes none of them but `package.json` —
whose `version` the gate excludes by design. `shipped-surface.mjs` has a sentence for exactly
this shape: *the release goes out on the version alone.*
