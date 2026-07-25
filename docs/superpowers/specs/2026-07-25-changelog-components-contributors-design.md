# Changelog: components, breaking flags & contributors — design

**Date:** 2026-07-25
**Goal:** Make `ui.apli.tech/changelog` show, per release, **which components** each
change touches (as deeplinks into Storybook), **which changes are breaking**, and **who
contributed** — the contributor list derived automatically from git tags at build time.

## Scope

In scope (extends the existing hand-authored changelog):
- A `breaking` change type, rendered as a red tag on the change line **and** a `Breaking`
  badge in the release header when any change in that release is breaking.
- Per-change **component chips** — each change may name one or more components; each
  renders as a pill that deep-links to that component's Storybook story. A named
  component with no registry entry renders as a plain (unlinked) pill.
- A per-release **contributors** row (avatar + `@handle` chips), derived at build time
  from `git log` between the previous release's tag and this one.

Out of scope (flagged, separate follow-up):
- Backfilling stale release data. `RELEASES` currently stops at `0.2.4` while git tags
  reach `v0.5.0`, and there is no `v0.2.4` tag. This design **handles the gap
  gracefully** (missing tag ⇒ no contributors shown for that release) but does not
  reconcile the data.

## Data model (`site/changelog.mjs`)

**Change tuples gain an optional third element** — a list of component names. Existing
two-element entries keep working unchanged.

```js
// [type, text, components?]
//   type ∈ 'added' | 'changed' | 'fixed' | 'removed' | 'breaking'
//   components ∈ string[]  (keys of COMPONENTS; unknown keys render unlinked)
['added',    'Finance data-table treatment.',              ['Table']],
['changed',  'Status pills switched to solid fills.',      ['Badge', 'Table']],
['breaking', '`accountShell()` renamed `cap` → `maxWidth`.', ['Shell']],
['fixed',    'Enlarged the consent scope icons.'],          // no components — fine
```

**`TAG` gains `breaking`:**

```js
breaking: { label: 'Breaking', cls: 'breaking' },
```

**`COMPONENTS` registry** — display name → Storybook story id (derived from each story's
`title` + first export; `Components/Table` + `FinanceData` ⇒ `components-table--finance-data`):

```js
const COMPONENTS = {
  Table:     'components-table--finance-data',
  Badge:     'components-badge-status--badges',
  Button:    'components-button--playground',
  Card:      'components-card--variants',
  Callout:   'components-callout-toast--callouts',
  Inputs:    'components-inputs--textfields',
  Segmented: 'components-segmented-control--playground',
  Snippet:   'components-code-snippet--shell',
  Switch:    'components-switch-checkbox--switches',
  Topbar:    'components-topbar--full',
  Feedback:  'components-feedback--default',
};
```

Chip href: `/storybook/?path=/story/<id>`. A name absent from `COMPONENTS` (e.g. `Shell`,
which is a kit helper, not a story) renders as `<span class="comp plain">` — no link.

## Contributors (git-derived, at build time)

**Pure parser (in `changelog.mjs`, unit-tested without git):**

```js
// logText: output of `git log --format=%an%x09%ae` for one version range.
// authors: AUTHORS map (below). Returns deduped, bot-filtered contributor objects.
export function parseContributors(logText, authors) { … }
```

Rules:
- Split on tab into `{ name, email }`; **dedupe by email**.
- **Drop bots**: any name or email containing `[bot]` (covers `dependabot[bot]`).
- Resolve each via `authors[email]` → `{ handle, name }`. Known ⇒ GitHub avatar
  `https://github.com/<handle>.png?size=48` + `@handle` link to `https://github.com/<handle>`.
  Unknown ⇒ initials chip (first letters of name) + plain name, no link.
- Order: by commit count descending (most commits first), then name.

**`AUTHORS` map** (seed; grows as contributors join):

```js
const AUTHORS = {
  'artur.sabirov@apliteni.com': { handle: 'asabirov', name: 'Artur Sabirov' },
};
```

**Build wiring (`site/build.mjs`)** — `build.mjs` owns git + fs; `changelog.mjs` owns
data + render. For each release `r`, compute its predecessor tag (the next-lower `v` in
`RELEASES` that has a matching `git tag`), then:

```js
import { execFileSync } from 'node:child_process';
// range = prevTag ? `${prevTag}..v${r.v}` : `v${r.v}`   (first release: whole history to its tag)
const out = execFileSync('git', ['log', '--format=%an%x09%ae', range], { encoding: 'utf8' });
```

Wrapped in `try/catch` **per release**: any failure (no tag, shallow clone, git absent)
⇒ that release gets no contributors and the build still succeeds. The whole map is passed
into the renderer: `changelogMain(contributorsByVersion)`.

`changelog.html` already calls `() => changelogMain()`; build.mjs changes it to
`() => changelogMain(contributorsByVersion)`.

## Rendering

- Component chips: appended to each change line (inline, wrapping under on narrow
  widths). Purple pill = deeplink; grey pill = unlinked fallback.
- Breaking: `tag--breaking` (white on pink) on the line; `ui-badge--breaking` (pink,
  with a small warning glyph) in the header when `r.changes.some(c => c[0] === 'breaking')`.
- Contributors: a row under a dashed top-border at the foot of each release body. No
  "Contributors" label — the avatar chips stand alone. Omitted entirely when the release
  has no derived contributors.
- All change text and component names pass through the existing `fmt()` HTML-escape.

New CSS lives in `changelog.html`'s `<style>` alongside the existing `.rel`/`.tag` rules,
using existing tokens (`--purple-mid`, `--glow-purple`, `--pink`, `--surface-2`,
`--border`, `--border-strong`). Renders correctly in both dark and the white/light theme.

## Testing

`node --test` (repo's `npm test`; new file `site/changelog.test.js`):
- `parseContributors`: dedupe by email; `[bot]` filtered; known email → handle/avatar;
  unknown email → initials + plain name; commit-count ordering; empty input → `[]`.
- Component-chip renderer: known name → anchor with correct `/storybook/?path=` href;
  unknown name → `.plain` span, no anchor; HTML in names/text is escaped.
- Breaking header logic: release with a `breaking` change → header badge present; without
  → absent.

Build smoke check: run `node site/build.mjs`, assert generated
`site/public/changelog/index.html` contains a component-chip anchor, the breaking badge,
and at least one contributor chip.

## Files touched

- `site/changelog.mjs` — extend `RELEASES` entries with components + a `breaking` example;
  add `TAG.breaking`, `COMPONENTS`, `AUTHORS`, `parseContributors`, chip + contributor
  render; `changelogMain(contributorsByVersion)`.
- `site/build.mjs` — derive `contributorsByVersion` from git (guarded), pass to renderer.
- `site/changelog.html` — CSS for `tag--breaking`, `ui-badge--breaking`, `.chips`/`.comp`,
  contributor row.
- `site/changelog.test.js` (new, ESM per `type: module`, matching
  `src/components/feedback.test.js`) — the unit tests above.
