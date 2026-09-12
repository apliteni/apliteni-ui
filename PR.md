# Labels and titles: sentence case everywhere, five type ranks, and a card title that is a heading

Closes #268 and #269.

## Premises

**What this is about.** The kit set labels in capitals by stylesheet. Eleven rules did it, each
with the letter-spacing capitals need to stay legible, and no two agreed on the size they did it
at. Separately, a card's title was a `<div>`, so a page full of cards had nothing in its heading
outline but the page title.

**What I found.** Both complaints are live, and the second is larger than a look.

- **Eleven rules set capitals**, at five different sizes: the eyebrow, the table head, the badge,
  the pill, the nav caption, the menu group caption, the menu row badge, the footer column title,
  the code sample's label, the confirmation's eyebrow and the version badge. `.ui-badge` was 10px
  bold at `0.12em`; `.ui-table th` was 11px semibold at `0.09em`; `.ui-nav__cap` was 11px at
  `0.16em`. Nothing decided those numbers — they accumulated.
- **Capitals hid the case the author wrote.** `versionSwitcher()` was handed `live` and
  `archive` — tone keys — and the stylesheet uppercased the key itself into a label. The story
  and the component had been disagreeing about whether `badge` was text or a key for as long as
  the `text-transform` covered it up.
- **A card title was a `<div class="ui-card__title">`.** Not in the outline, so a reader moving
  by heading went from the page's `h1` to whatever heading a card's *body* happened to contain.
  `<Card>` did the same in React.
- **A label had no rank.** It was smaller than the body and bolder than the body and set in
  capitals, and which of those three was doing the work was never written down.

**What I did.** Took `text-transform` out of the kit entirely, wrote five type ranks into the
specification with a gate that reads them at run time, made a card title a real heading, and put
three label treatments in front of Artur to pick the sizes from.

**The verdict: Changed.** Both issues are real; the fix is a rank table, not eleven edits.

## What changed

**Nothing in the kit sets a case any more.** Not `text-transform`, not `font-variant: small-caps`,
not a small-caps feature in `font-feature-settings`. A label is written in sentence case and
renders as written. `--tracking-caps` still exists as a token — no kit rule reads it, and a
consumer's rule still may — and says so at the declaration.

**Where the displayed text was a key, the kit now writes the word.** `versionSwitcher()` maps
`live` → `Live` and `archive` → `Archive` through a `VBADGE` table, so a caller keeps passing the
tone key and the reader sees a word. Text a caller hands a `badge()` is still shown exactly as
handed: `badge('paid')` reads `paid`. The kit does not correct its consumer's copy.

**Five ranks, each smaller than the one above it**, written into
`docs/specification.md#labels-and-titles`:

| rank | size | weight | what takes it |
| --- | --- | --- | --- |
| `page-title` | `--text-2xl` · 30px | bold | the page's `h1` inside `appShell()` |
| `card-title` | `--text-lg` · 18px | semibold | a card's title |
| `body` | `--text-base` · 14.5px | normal | running text |
| `label` | `--text-sm` · 13px | medium | eyebrow, table head, nav and menu caption, footer column title, code sample's label, confirmation's eyebrow |
| `chip` | `--text-xs` · 11px | semibold | badge, pill, menu row badge, version badge |

A label is one step under the body; its `--muted` ink and medium weight do what capitals used to.
A chip is the smallest because its fill already sets it apart.

**A card title is an `h2`.** `card({ level })` and `<Card level>` move it to `h3`–`h6` for a card
inside a section with an `h2` of its own. `.ui-card__title` names `--font-sans` on its own rule,
because an `h2` would otherwise take the display face from the bare element selector — the third
rule in the kit to do that, after `.ui-drawer__title` and `.ui-confirm__title`. `<Card>` renders
no heading at all for an empty title, where it used to emit an empty `<div>`.

**A new guidelines page, Guidelines / Labels and titles**, with four rules, each citing the line
of kit code that keeps it and each resolved by `refs.test.js` to a file, a line and a literal on
that line.

## The three treatments, and which one shipped

All three were built as scoped overrides, rendered on one board in both themes, and put in front
of Artur as screenshots. They differ only in the two sizes a label and a chip take:

| | label | chip | reads as |
| --- | --- | --- | --- |
| A · one size up *(shipped)* | `--text-sm` · 13px medium | `--text-xs` · 11px semibold | a label sits one step under the body and is plainly a label |
| B · same size, weight only | `--text-xs` · 11px semibold | `--text-xs` · 11px semibold | label and chip collapse into one rank; a table head stops reading as a head |
| C · two sizes up | `--text-base` · 14.5px medium | `--text-sm` · 13px semibold | a label reaches the body's size and competes with the figure it names |

`docs/evidence/labels-and-titles/variant-a-{light,dark}.png`, `…-b-…`, `…-c-…` are the
screenshots the choice was made on. They stay in the tree as the record; the overrides that
produced them are gone.

## Decision record for the issues

**What was chosen.** Treatment **A — one size up**. A label takes `--text-sm` (13px) at
`--weight-medium`; a chip takes `--text-xs` (11px) at `--weight-semibold`; neither sets capitals,
and neither spaces its letters. That is the `label` and `chip` rows of the rank table in
`docs/specification.md#labels-and-titles`, and `src/styles/type-ranks.test.js` reads that table at
run time and fails any rule that claims a rank and disagrees with its row.

**What was rejected, and why.**

- **B — same size, weight only.** A label and a chip both at 11px. Rejected because it leaves four
  ranks rather than five: a table head and a badge become the same typographic object, and with
  the capitals gone there is nothing else separating a column head from the data under it.
- **C — two sizes up.** A label at 14.5px, the body's own size. Rejected because a caption that
  is as large as the running text stops being a caption, and in the figure band the label starts
  competing with the figure it names — the same failure capitals caused, in the other direction.

**Who chose, and on what.** Artur, 2026-09-11, from the three rendered variants in light and
dark, not from a derivation. The sizes are an owner's choice and the specification says so at the
rank table rather than implying they fall out of the scale.

**What was not decided here.** Sentence case itself was not a choice between treatments — all
three dropped the capitals, and the argument for that is on the guidelines page with its
citations. Only the two sizes were open.

## Case, after the capitals came off

Removing `text-transform` made every label show the case its author actually wrote, and some of
that source had been leaning on the stylesheet. Caught in review of the rendered board:

- **Version and menu badges.** Fixed on this branch before the final shots: `versionSwitcher()`
  writes `Live` and `Archive` for the keys rather than rendering the key.
- **A code sample's label read `shell`.** Now `Shell`, in
  `stories/components/Snippet.stories.js` and on the board. `mcp.json` beside it is a filename and
  is left as it is spelled.
- **Foundations / Sub-themes badged each panel `dark` / `light`** — the theme key, straight into
  a badge next to a `Live`. Now `Dark` / `Light` through a `THEME_WORD` table, the same move
  `versionSwitcher()` makes. The dead ternary that picked `archive` either way went with it, and
  the switch beside it now reads `Accent drives every control`.

**The sweep is a gate, not a pass I did once.** `stories/guidelines/letter-case.test.js` now ends
with a second sweep that renders **every story in both themes and every site page**, finds each
element matching a rule that claims `rank: label` or `rank: chip`, and reads the text it renders.
402 labels and chips are read under 11 ranked rules; each must start with a capital.

Both halves of the gate discover their subjects. The selectors are whatever the shipped sheets
mark with a `/* rank: … */` note — nothing is listed — and the text is whatever the stories and
the site actually render, so a tone key and a label are told apart by what reaches the screen
rather than by the name of the prop that carried it. That distinction is the whole point: a
source scan cannot tell `badge: 'live'` handed to `versionSwitcher()` (a key, correct) from
`badge: 'live'` handed to `dropdown()` (text, wrong), and this one never has to.

What it does not reach is written at the top of the test: a label no rule ranks, a word inside a
label that is not the first, and the case of a name — a first word carrying anything but letters
(`mcp.json`, `phoenix.2026.002`) is spelled rather than written and is left alone. The capitals
on the guidelines page's **don't** specimens (`INCOME`, `INVOICES WAITING`) are typed into the
source on purpose: they are the counter-example, they start with a capital, and the gate passes
them.

The version switcher's trigger still reads `version:` in lower case. That is a key–value prefix
in front of a value, it was never set in capitals by style, and this branch did not invent it.
Left as it is.

## Before / After

Shot on this branch, both themes, at 1280px:

| | before | after |
| --- | --- | --- |
| Every label the kit sets, on one board | `before-board-{dark,light}.png` | `after-board-{dark,light}.png` |
| The portal page the issues were reported from | `before-page-…` | `after-page-…` |
| Foundations / Typography | `before-typography-…` | `after-typography-…` |
| A guidelines page's own chrome | `before-guideline-shell-…` | `after-guideline-shell-…` |
| Guidelines / Labels and titles | *(new page)* | `after-guideline-{dark,light}.png` |
| The changelog site page, served | `before-changelog-…` | `after-changelog-…` |

All under `docs/evidence/labels-and-titles/`. The `after` set was re-shot at the head of this
branch, against the served site and this branch's own Storybook, after the case fixes above.

**The gates**

```
                       before      after
root  npm test          1126       1151   (2 skipped, as on main)
react npm test           213        216
```

## Changelog entry

For the release that ships this, under a new version in `site/changelog.mjs`:

```js
['breaking', "Nothing in the kit sets text in capitals by style. `text-transform` is gone from eleven rules — the eyebrow, the table head, the badge, the pill, the nav caption, the menu group caption, the menu row badge, the footer column title, the code sample's label, the confirmation's eyebrow and the version badge — and the letter-spacing that only capitals need went with it. A label written `Paid` rendered `PAID` and now renders `Paid`. Copy that relied on the uppercasing has to be rewritten in sentence case; a word that is capitals in itself is typed that way. `--tracking-caps` is still exported and no kit rule reads it.", ['Badge', 'Table', 'Nav', 'Dropdown', 'Footer', 'Snippet']],
['breaking', "`card()` and `<Card>` emit the title as an `h2` instead of a `div`. A card title is now in the page's heading outline, and `level` takes it to `h3`–`h6` for a card under a section heading of its own. A title holding block content has to become inline content — a heading cannot hold a block. `<Card>` renders no heading for an empty title, where it used to emit an empty `div`.", ['Card']],
['changed', "Labels and chips take named type ranks. A label is `--text-sm` at `--weight-medium`; a chip is `--text-xs` at `--weight-semibold`; a card title is `--text-lg` at `--weight-semibold` and keeps the text face on any element. Five ranks in all, each smaller than the one above it, written in the specification and read at run time by `src/styles/type-ranks.test.js`. The sizes were the owner's choice between three rendered treatments.", ['Badge', 'Card', 'Table']],
['added', "Guidelines / Labels and titles — four rules on sentence case, the rank a title takes, a card title as a heading, and what an eyebrow is for. Each cites the line of kit code that keeps it.", ['Card']],
['added', "`stories/guidelines/letter-case.test.js` — refuses a case change anywhere in `src/`, `stories/`, `site/`, `react/src` and `.storybook`, in a stylesheet, a `<style>` block, an inline style or a JSX style object, across 21 spellings; and renders every story in both themes and every site page to check that the text under a label or chip rank starts with a capital."],
```

Marked **breaking** twice, deliberately. Both are visible changes to what a consumer's existing
markup renders — the first rewrites every label on every screen, the second changes an element
and can break a caller who put a block inside a card title. Neither is a rename anyone can
grep for.

## Proof

- [x] Artur chose the sizes from the three rendered treatments, in both themes, before they
      were written into the specification.
- [x] `src/styles/type-ranks.test.js` reads the rank table out of `docs/specification.md` at run
      time and fails a ranked rule that disagrees with its row, writes the `font` shorthand, or
      spaces its letters out; and fails a table whose sizes stop descending.
- [x] `stories/guidelines/letter-case.test.js` sweeps five trees for a case change and refuses 21
      spellings of one, and renders every story in both themes plus every site page to read 402
      labels and chips for their case.
- [x] Every rule on the new guidelines page cites kit code, and `refs.test.js` resolves each
      citation to a file, a line and a literal on that line.
- [x] Both gates were broken on purpose and watched go red: the badge's capitals put back are
      named at their line, and `shell` / `dark` restored are named with their story, selector,
      rank and CSS line.
- [ ] **Exercised against a consumer.** Not done and not claimed. The consumer installs a
      published version, so this is provable only after a release. What would settle it is a
      portal upgrading and reporting which of its own labels now read in the case they were
      typed in — that is where the breaking half of this lands.

## Review

**Findings closed on this branch.** `letter-case.test.js` could not read small caps in the `font`
shorthand or in `font-feature-settings`, a quoted or bracketed JS key, and passed a value it
could not read rather than refusing it. `type-ranks.test.js` could not read a rank note in mixed
case, found braces inside comments, and let a ranked rule hide a size in the `font` shorthand.
`<Card>` rendered an empty heading for an empty title. `versionSwitcher()` read keys it was not
given and rewrote the caller's markup. Stale prose describing 10px uppercase labels, two dead
citations, the guideline shell's `h1` rule and the `card()` row in `docs/library.md` were fixed.

**A defect the gates did not catch, found in the render.** The version and menu badges read
`live` and `archive` beside status badges reading `Live` and `Archived`. Both gates were green:
no rule set a case, and every ranked rule matched its row. The text was simply wrong, and only a
person looking at the board saw it. That is what the second sweep in `letter-case.test.js` exists
for, and it now catches the class — it was written after the defect, not before.

**One gate fails on the machine this was finished on, and it is not this branch.**
`stories/contrast.test.js` asserts the contrast walk finishes inside 120s. On this host the
branch reports 147.2s inside `npm test`. **`origin/main`, checked out beside it and run the same
way, reports 157.1s and fails the same assertion.** The host is a shared 8-core box running other
agents; load average during the runs was above 20. It is the only failing test in either run.

Measured rather than assumed, with `/usr/bin/time` over the same file in two worktrees:

```
                user CPU   sys      wall
origin/main      163.61s   2.02s   311.90s
this branch      151.97s   1.86s   280.14s
```

The branch does **less** work than main, and the wall clock is roughly twice the CPU time in both
— the box was giving each run about half a core's worth of the machine. The ceiling is set at
~2.5× a 47.6s worst case measured on a deliberately saturated 10-core laptop
(`CONTRIBUTING.md#the-two-cost-gates-fail-for-different-reasons-so-they-are-kept-apart`), and that
document says plainly what it is for: *"it catches a runaway… it does not catch a 2× performance
regression, and no wall-clock number can."* The deterministic half of the cost gate — the cache
miss rate, which is the half that would see a real regression — passes on this branch.

The ceiling was **not** loosened. It is a measured pin and this is not the machine to re-measure
it on.

**Not fixed, on purpose.** `--tracking-caps` stays exported with nothing in the kit reading it,
because a consumer's rule may. The version switcher's `version:` trigger prefix stays in lower
case. The kit does not correct the case of text a caller hands a badge.

## What a reviewer should push on

- **The new sweep costs 7.1s of user CPU on every `npm test`**, to render every story twice and
  read 402 strings. It dedupes the second theme when a story renders identically in both, which
  is most of them. Against the contrast walk's 152s it is small, but it is the second gate in the
  suite to render the whole catalogue, and a third would be worth arguing about.
- **`label` and `chip` are the only two ranks the case sweep reads.** A `card-title` or a
  `page-title` written in lower case passes. That is deliberate — a title is a sentence and a
  label is not — but it is a judgement, not a derivation.
- **The rank table lives in `docs/specification.md` and is parsed by a test.** It is prose that a
  gate reads, so reformatting the table breaks the build. That is the point, and it is also a trap
  for whoever next edits that file.
- **`--text-sm` is now doing two jobs**: the label rank, and whatever else in the kit asks for
  13px. Nothing today disagrees, but the rank is a role and the token is a size, and they are not
  the same thing.
