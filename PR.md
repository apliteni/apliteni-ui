# Back link: the destination's name clips instead of wrapping, and a gate over every `__label`

Closes #303.

## Premises

Three, and the first two come from the issue.

1. **`backLink()` has emitted a class nothing styles since 0.29.0.** `<span class="ui-back__label">`
   is in the markup; `src/styles/back.css` styles the anchor, its colour, its focus ring and its
   glyph, and stops. Verified on `origin/main` at `c85f516`: `grep -c 'ui-back__label'
   src/styles/back.css` → `0`.
2. **It is the only one.** The five other `__label` classes a factory emits — `.ui-nav__label`,
   `.ui-cmdk__label`, `.ui-dropdown__label`, `.ui-field__label` and `.ui-stat__label` — all have a
   rule, and so does `.ui-tip__label`, which the documentation asks a consumer to write by hand.
   That is what made a consumer's class-coverage guard refuse this one, and it is why the reporter
   carries `.ui-nav__label`'s declaration by hand today.
3. **The spec says nothing about how a back link's destination behaves when it runs long.**
   `docs/specification.md` § *The back link* was read in full: it guarantees an `<a href>`, an
   accessible name, the trail's place above the title, the lit section, and a colour that holds
   against a host `a:link`. Nothing about wrap or clip. So the brief's condition applies — take the
   kit's existing answer — and the kit's existing answer is `.ui-nav__label`'s.

## What was found in the code

**The reporter's four declarations are half the fix.** `.ui-back` is `width: fit-content`, and
`fit-content` resolves to at least the box's own **min-content**. A `nowrap` label makes min-content
the whole destination name — so with the four declarations and nothing else, the link stops wrapping
and pushes straight through the closing edge of its column instead. Measured with the ceiling line
deleted: in a 120px column the box is 305px wide and stands 185px past the edge — the middle block
of the table below. `.ui-back` takes `max-width: 100%`, and that is what hands the overflow to
the label.

**The pre-fix behaviour is wrapping, not overflowing.** Worth saying because the issue's wording
("a long destination has no overflow rule") could be read either way. On `main` the box obeys the
column and the words wrap: 2 lines at 220px, 4 lines at 120px, and the link is 67.6px tall in a slot
the shell gives 24px and a `--space-5` margin. It pushes the page title down.

**Nothing in the repo would have caught it.** `scripts/stylesheet-manifest.test.js` checks that
every *sheet* reaches a consumer; `scripts/entry-reachability.test.js` checks that every *module*
does. No gate ran the other direction — from a class the kit emits to a rule that styles it — so
there was nothing to extend. This PR adds the smallest test that closes it.

## What this does

**One rule, and the ceiling that makes it work.**

```css
.ui-back { width: fit-content; max-width: 100%; … }

.ui-back__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

`min-width: 0` because a flex item's own floor is its content; without it the label refuses to
shrink and the other three never come into play. Those four are `.ui-nav__label`'s four clip
declarations (`src/styles/nav.css:99` `overflow: hidden; text-overflow: ellipsis;`), which is the
point — the rail already answers this question and the kit should answer it once. The rail's own
rule carries two more, `flex: 1 1 auto` and a transition, that a link with one label does not need.

**Two gates over one sweep**, `src/styles/label-coverage.test.js`: every `__label` a workspace's
shipped source names has a rule in the CSS that workspace ships. One gate per workspace and one
floor each, because a shared count cancels — `CONTRIBUTING.md` § *One gate per workspace, over one
shared implementation*. The kit's subjects come from `src/components/*.js` against `src/index.css`'s
manifest; React's from every `.ts`/`.tsx` under `react/src` that is not a test or a story, against
that manifest plus `react/src/*.css`, since the React package ships beside `./css` and its stories
load both. So the next component is in scope by existing. It carries the ledger `CONTRIBUTING.md`
asks for, and the classes it deliberately does not reach are named in it.

**A guarantee in `docs/specification.md`** § *The back link*, naming the two gates that hold it.

**Storybook**: `Components/Back link → A long destination`, the same link at three widths.

## Before / After

Same rig, same destination, both themes — 560×340 at 2× for the link alone, 390×620 for the shell.
Before is `origin/main` at `c85f516` and after is this branch; **both sides are shot by the same
rig** — one static server over the checkout under test, the kit's own factories imported as modules
in the page, one Chrome, one viewport — so only the code differs. The rig is committed at
`scripts/evidence/back.mjs` and `scripts/evidence/back.html`, and it takes three subjects: the link
alone with a short name, the same with a long one at three column widths, and the page shell at a
phone width.

The dashed edge in the first two pairs is the column the link is given. Without one drawn there is
nothing in the picture to say the link was ever narrowed.

**A long destination.** Before: two lines at 220px, four at 120px, the link 33.8px and 67.6px tall
in a slot that is 24px on a short name — the page title moves down by how long the parent page's
name happens to be. After: one line and an ellipsis at both widths, 24px tall at both. The first
row of each image is the same link with room for all of it, unchanged on both sides.

| | Before | After |
|---|---|---|
| dark | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/d51e7f6/docs/evidence/back-label-before-long-dark.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/d51e7f6/docs/evidence/back-label-long-dark.png) |
| light | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/d51e7f6/docs/evidence/back-label-before-long-light.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/d51e7f6/docs/evidence/back-label-long-light.png) |

**A short destination — the case that must not move.** The link is still only as wide as its words,
in a column three times wider than it. 82.3 × 24 on both sides.

| | Before | After |
|---|---|---|
| dark | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/d51e7f6/docs/evidence/back-label-before-short-dark.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/d51e7f6/docs/evidence/back-label-short-dark.png) |
| light | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/d51e7f6/docs/evidence/back-label-before-short-light.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/d51e7f6/docs/evidence/back-label-short-light.png) |

**In the page shell, at 390 wide.** This is the case the fix is for. The link sits above the page
title, so a wrapped destination pushes the title down by however long the parent page's name happens
to be — and the arrow ends up centred against two lines of text instead of standing beside one.
`appShell()`, one nav row, the record open. Before: two lines, the link 33.8px tall, `<h1>` starting
at y=81.8. After: one line, 24.0px, `<h1>` back at y=72 — exactly where a short name puts it.

| | Before | After |
|---|---|---|
| dark | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/d51e7f6/docs/evidence/back-label-before-shell-phone-dark.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/d51e7f6/docs/evidence/back-label-shell-phone-dark.png) |
| light | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/d51e7f6/docs/evidence/back-label-before-shell-phone-light.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/d51e7f6/docs/evidence/back-label-shell-phone-light.png) |

## Measured in a browser, not asserted

Headless Chrome for Testing 153.0.8010.12, the kit's own factories and stylesheet, the checkouts
served by the same rig. `clipped` is `scrollWidth > clientWidth` on the label; `past column` is the
link's right edge minus its column's.

```
                                      boxW    boxH   lines   clipped   past column
before — origin/main c85f516
  room for all of it                 305.0    24.0       1     false          0.0
  a 220px column                     220.0    33.8       2     false          0.0
  a 120px column                     120.0    67.6       4     false          0.0
  a short destination                 82.3    24.0       1     false        -14.6
  a short destination, wide column     82.3    24.0       1     false       -237.7

the four declarations with no ceiling — the state this PR does not ship
  room for all of it                 305.0    24.0       1     false          0.0
  a 220px column                     305.0    24.0       1     false         85.0
  a 120px column                     305.0    24.0       1     false        185.0
  a short destination                 82.3    24.0       1     false        -14.6
  a short destination, wide column     82.3    24.0       1     false       -237.7

after — this branch
  room for all of it                 305.0    24.0       1     false          0.0
  a 220px column                     220.0    24.0       1      true          0.0
  a 120px column                     120.0    24.0       1      true          0.0
  a short destination                 82.3    24.0       1     false        -14.6
  a short destination, wide column     82.3    24.0       1     false       -237.7
```

The middle block is the reporter's four declarations on their own, measured by deleting the
`max-width` line from this branch and restoring it: the wrap stops and the link keeps its
max-content width, standing 185px past a 120px column. That is why the ceiling is in the diff.

And the same link inside `appShell()`, at three viewport widths — which is what says the change is
confined to the case it is for. `past main` is the link's right edge minus `.ui-app__main`'s;
`title top` is the `<h1>`'s.

```
                        box       past main   title top   clipped
before — origin/main c85f516
  vw=1280  short      85.3x24.0      -723.5        84.0     false
  vw=1280  long      331.7x24.0      -477.1        84.0     false
  vw=900   short      85.3x24.0      -529.7        84.0     false
  vw=900   long      331.7x24.0      -283.3        84.0     false
  vw=390   short      85.3x24.0      -214.7        72.0     false
  vw=390   long      284.0x33.8       -16.0        81.8     false

after — this branch
  vw=1280  short      85.3x24.0      -723.5        84.0     false
  vw=1280  long      331.7x24.0      -477.1        84.0     false
  vw=900   short      85.3x24.0      -529.7        84.0     false
  vw=900   long      331.7x24.0      -283.3        84.0     false
  vw=390   short      85.3x24.0      -214.7        72.0     false
  vw=390   long      284.0x24.0       -16.0        72.0      true
```

**Five of the six rows are identical across the two checkouts.** The one that moves is the one the
issue is about: a long destination on a phone, where the reading column is narrow enough to reach
the words. At 1280 and 900 the link is 331.7px in a column with room to spare, and the
ceiling does nothing.

Two things the first table settles. **The clip does not cost the target.** 24.0 is `--space-6`, the
`min-height` `.ui-back` already declared for WCAG 2.5.8 — the link was taller than the floor on
`main` only because it had wrapped, and it is exactly on the floor now. And **nothing overflows in
either direction**: `past column` is 0 or negative on every row, on both sides.

The short-destination shots — the subject this change does not touch — are not byte-identical
across the two checkouts. Decoded and compared pixel by pixel they are 4 channel samples apart in
dark and 2 in light, max delta 6 on a 1120×680 frame: glyph antialiasing, not layout. The long pair
is 57,503 samples apart and the shell pair 171,337. That caveat is now in
`scripts/evidence/README.md`, whose determinism section had implied the byte count was the
comparison to make.

## The gates this adds, and the mutation that kills each

Each rule was broken on disk against the code as it stands, the named gate was run for real, the
file was restored and its SHA-256 compared with the one taken before the edit. A mutation whose text
did not change the file was refused rather than applied; none was. Every restore matched.

| Mutation | Gate | Result |
|---|---|---|
| **the `.ui-back__label` rule is deleted** | `label-coverage.test.js`, `back.test.js` | **2 red** |
| **`.ui-back` loses its `max-width` ceiling** — the four declarations are dead | `back.test.js` | **1 red** |
| the label keeps `nowrap` and loses `min-width: 0` | `back.test.js` | **1 red** |
| the label is allowed to wrap | `back.test.js` | **1 red** |
| the rule survives only inside a CSS comment | `label-coverage.test.js` | **1 red** |
| the class survives only inside a string (`content: "… .ui-back__label …"`) | `label-coverage.test.js` | **1 red** |
| the class survives only inside a `:not()` | `label-coverage.test.js` | **1 red** |
| the class survives only in a declaration body | `label-coverage.test.js` | **1 red** |
| **a kit component names a new `__label` with no rule** | `label-coverage.test.js` | **1 red** |
| **a React component names a new `__label` with no rule** | `label-coverage.test.js` | **1 red** |
| the kit's source list is emptied | `label-coverage.test.js` | **1 red** |
| React's source list is emptied | `label-coverage.test.js` | **1 red** |
| the kit's sheet list is emptied | `label-coverage.test.js` | **2 red** |

The first is the defect this PR is about, reproduced: the gate names `ui-back__label` and the file
that names it. Rows five to eight are the review's own positive controls — a class that survives
only inside a comment, a string, a `:not()` or a declaration body is not a rule, and each of the
last three was **green** against the first draft of this gate. The last three are the floor doing
its job: a sweep that has been emptied fails instead of passing loudly, and each workspace fails in
its own red rather than into a shared count.

`back.test.js` reads the sheet as text, as the rest of that file does. It cannot measure an
ellipsis — jsdom has no layout. That is what the browser tables above are for, and the test header
says so.

## What the gate does not reach

At the gate, and repeated here because it is the one place this PR is deliberately narrower than it
could be. Four classes the kit emits have no rule of their own today:

| Class | Emitted by | Styled |
|---|---|---|
| `ui-nav__tab-label` | `src/components/nav.js:137` `ui-nav__tab-label` | no |
| `ui-nav__crumb-label` | `src/components/nav.js:160` `ui-nav__crumb-label` | no |
| `ui-footer__col` | `src/components/footer.js:41` `ui-footer__col` | no — `.ui-footer__col-title` is a different class |
| `ui-pager__jump-of` | `src/components/pagination.js:212` `ui-pager__jump-of`, and `react/src/Pagination.tsx:221` `ui-pager__jump-of` | no |

A gate over *every* class the kit emits would fail on all four, and each would need either a rule or
a note at its own site saying why a consumer-targetable hook is deliberately unstyled. Those are
four decisions about three other components, and this is a one-concern PR about the back link. The
gate
therefore runs over `__label` — the part that carries words, which is the part that can run long —
and says in its ledger that a pass is no claim that the kit styles everything it emits. Filed below.

## Decisions, and who made them

| Decision | Chosen | Rejected | Who |
|---|---|---|---|
| clip, or wrap | clip to one line with an ellipsis | wrap to a second line | the kit, via `.ui-nav__label` — the brief's condition was "unless the spec says wrap", and the spec says neither |
| where the ceiling goes | `max-width: 100%` on `.ui-back` | dropping `width: fit-content`, which would run the hover ground the width of the column and undo #270's quiet link | worker, small and reversible |
| the gate's subject | every `__label` a workspace's source names | every class the kit emits (fails on four today, see above); a `back.css`-only check (would not refuse the next one) | worker, small and reversible; the wider gate is filed |
| the gate's shape | one gate per workspace, one floor each, over one sweep | a single kit-wide gate with a shared count, which is what the first draft did | the repo — `CONTRIBUTING.md` § *One gate per workspace, over one shared implementation*, which the review found the draft contradicted |
| where the guarantee is recorded | `docs/specification.md` § The back link, naming both gates | the guidelines page, which holds rules for the screen rather than kit guarantees | worker, per `docs/README.md` "Where a decision gets recorded" |
| the evidence rig | a second page beside `shot.html`, reusing `serve.mjs` | extending `shot.html`, which renders a whole shell and is the rail's subject | worker, small and reversible |

## Proof

Run on the code as it stands at `4b059e6`, Node 24.20.0, `jq` present. The image URLs above
point at `d51e7f6`, the commit that added the last of them; nothing in `docs/evidence/` has moved
since.

```
$ npm test
ℹ tests 1525
ℹ pass 1522
ℹ fail 1
ℹ skipped 2

$ npm run build
ESM dist/index.css 2.06 KB
ESM dist/index.js  39.58 KB
ESM ⚡️ Build success in 84ms
DTS ⚡️ Build success in 2115ms
DTS dist/index.d.ts 8.49 KB

$ cd react && npm test
 Test Files  17 passed (17)
      Tests  353 passed (353)
   Duration  11.49s
```

**The one failure is the box, not the branch — and here is the arithmetic, because this branch does
add a story.** `stories/contrast.test.js` → *the walk has not run away with the clock* fails against
a 120s ceiling whose comment sets it from "a measured worst case of 47.6s on a fully contended
10-core laptop". `origin/main` at `c85f516` was checked out into a second worktree on the same
machine and run against the same `node_modules`. Both fail it, and the wall clock crosses over
between runs:

```
                 branch                          main
run 1            156.7s                          157.0s
run 2            201.1s                          172.9s
run 3            160.3s                          224.7s
```

`main` is the *slower* side of the third pair, which is what a busy box looks like. The gate
immediately above it in the same file is the deterministic one — the style cache's miss rate — and
it is the one its own comment says catches a real regression, "unlike the wall clock". It passes,
and its counters are comparable across checkouts:

| | branch | `main` | delta |
|---|---|---|---|
| style reads | 353,092 | 352,622 | **+470 (+0.13%)** |
| miss rate | 0.1987 | 0.1986 | +0.0001, against a 0.30 ceiling |
| pairs judged | 15,502 | 15,478 | **+24 (+0.16%)** |
| distinct failures | 182 | 182 | 0 |

The 24 pairs are the new story, walked in both themes. That is the whole cost of it, and it is 0.16%
of a walk whose ceiling is 2.5× its measured worst case. The two skips are the same two `main` has —
the `CONTRAST_ACCENTS=1` matrix, which is opt-in, and the built Storybook index, which needs
`npm run build-storybook`.

The gates this change moved, each re-run green: `scripts/font-loading.test.js` (`EXPECTED_LOADERS`
8 → 9, and the header now names `back.html` beside `shot.html`, which is what that gate's own
message asks for in the same commit) and `stories/guidelines/refs.test.js` (`_going-back.js`'s `kit`
reference into `back.css`, moved by the comment above it, re-pinned at line 33).

`ai-slop-detector` at level `recommended`, over every file this PR adds or changes: **0 errors**,
and one new finding. The review found the first version of this paragraph understated it, so here
is the full count. The run reports 2 medium and 2 warnings; three of those four fire on `main`'s own
copies of the same files, and the fourth is the new one:

| Finding | File | On `main`? |
|---|---|---|
| `scope-template` | `docs/specification.md` | yes — a pre-existing sentence this PR does not touch |
| `comment-essay`, 12 lines | `scripts/font-loading.test.js`, the file header | yes, unchanged |
| `comment-essay`, 12 lines | `scripts/font-loading.test.js`, the loader list | yes, at **13** — this PR's edit made it shorter |
| `comment-ratio`, 0.77 | `src/styles/back.css` | **new** |

The new one is a threshold artifact rather than a regression: the rule skips a file under 20 code
lines, `main`'s `back.css` has 19, and its prose-to-code ratio there is already **0.89**. With this
change the file has 26 code lines, so the rule starts measuring — at **0.77**. The two comments this
PR adds were cut twice to get there, with the argument moved here. `label-coverage.test.js`,
`back.test.js`, the story, both rig files and this body run clean.

## What a reviewer should push on

- **The ellipsis over the wrap, which is one of two answers the kit already gives.** The rail clips
  (`src/styles/nav.css:99` `overflow: hidden; text-overflow: ellipsis;`) and so does the reader
  block. But the **breadcrumb trail this link replaces wraps** —
  `src/styles/nav.css:307` `flex-wrap: wrap;` — and so does the dropdown head. The rail's column is fixed and narrow; a back
  link sits in the reading column, beside the trail that wraps. So this is a choice, not a lookup —
  the brief said take the kit's answer where the spec is silent, and the kit has two. If a truncated
  parent name is worse than a two-line one here, this is the decision to send back; the rule is four
  declarations and a ceiling.
- **A clipped name has no tooltip.** The full destination stays in the accessible name —
  `backLink()` writes `aria-label="Back to …"` whenever it is given one — so a screen reader still
  hears all of it. A sighted pointer user gets the ellipsis and nothing else. Adding `title` was not
  in scope for this PR and is a decision about every truncated label in the kit, not this one.
- **`max-width: 100%` on `.ui-back`.** It is a change to the anchor, not just to the new span. It
  binds the link to its containing block in every context the kit puts it in.
- **The gate's narrowness.** See *What the gate does not reach* above.

## Filed as a follow-up, not fixed here

- **A gate over every class the kit emits, not only `__label`.** The four unstyled classes above
  each need a rule or a note at the site; the mechanism for the note (the exception shape
  `CONTRIBUTING.md` § *An exception is a note at the site* asks for) has to be decided for JS
  emission sites, where the kit only has it for CSS today.

## Changelog entry

```
### Fixed

- **Back link — the destination's name clips instead of wrapping.** `backLink()` has emitted
  `<span class="ui-back__label">` since 0.29.0 with no rule behind it, so a parent page with a long
  name wrapped to two lines or four above the page title. It now takes one line and an ellipsis, the
  same way a rail row's label does, and `.ui-back` takes a `max-width` so the column is what stops
  it. A short name is unchanged. ([#303](https://github.com/apliteni/apliteni-ui/issues/303))

### Added

- **A gate over every `__label` the kit emits.** `src/styles/label-coverage.test.js` refuses a
  component that puts a `__label` into its markup with no rule for it in either workspace's CSS —
  the omission above, which a consumer's own class-coverage guard found first.
  ([#303](https://github.com/apliteni/apliteni-ui/issues/303))
```

## The review before this was opened

A read-only sub-agent reviewed the branch against `CONTRIBUTING.md` and re-derived every number in
this body, breaking rules on copies in a scratchpad to prove its findings. It reported eight; six
are fixed here and two stand.

| # | Finding | Resolution |
|---|---|---|
| 1 | The gate was **one sweep and one count over both workspaces**, which `CONTRIBUTING.md` § *One gate per workspace* argues against by name | **Fixed.** Two gates, two floors, one implementation. Each workspace's sweep now fails in its own red — the last three mutation rows. |
| 2 | The CSS side **matched a class inside a string and inside `:not()`** — proven green by mutation | **Fixed.** Strings are blanked with `blankStrings` (the helper in the same lib whose comment names that trap), only a block's prelude is read, and `:not(…)` is dropped. Four of the mutation rows are the reviewer's own controls. |
| 3 | The source side **counted comments and `querySelector` calls** as emission sites, which the docblock did not say | **Fixed for comments** (they are blanked now). **Kept for `querySelector`**, and the ledger says so: both are a site that needs the class to exist, which is the question the gate asks. |
| 4 | The floor is `>=` at today's count, so a label added and later dropped is silent | **Stands.** It is the pattern every sweep in this repo uses (`onDisk.length >= 10`, `SHEETS.length >= 20`), and the per-workspace split narrows what a single number can hide. |
| 5 | `back.test.js`'s header cited `docs/evidence/back-long-*.png`, which does not exist | **Fixed** — `back-label-long-*.png`. No gate resolves a glob, so nothing had caught it. |
| 6 | The slop-detector claim in this body **counted only the new finding** | **Fixed** — the full count and its per-file table are in *Proof*. |
| 7 | Four small overstatements: `.ui-tip__label` has no factory; `walkReact` keeps `.d.ts` and `test-setup.ts`; `ui-pager__jump-of` is also emitted by React; the rule is `.ui-nav__label`'s *clip* declarations, not all of it | **Fixed**, all four. |
| 8 | Committed image URLs pointed at a commit without the shell images | **Fixed** — every URL is `d51e7f6`, checked with `git cat-file -e` per file. |

Two things it could not check, said here rather than left implied: it has no Chrome on its host, so
the two browser tables are the author's measurement and not independently reproduced; and its own
`npm test` was killed by its 600s ceiling mid-contrast-walk, so it confirmed the new gate green
inside the suite but not the suite's total.

It also raised the breadcrumb precedent and the missing tooltip, which are not defects — they are in
*What a reviewer should push on*.

## Reviews

*Left for the coordinator.*

| Review | Round | Findings | Resolved |
|---|---|---|---|
| | | | |

## How this was made

| Phase | Model | Skills and context |
|---|---|---|
| implement, verify, evidence | [none] `claude-opus-5` (Claude Code) | <ul><li>Skills: the repo's own rules (`AGENTS.md`, `CONTRIBUTING.md`, `docs/`), `ai-slop-detector`</li><li>Context: issue #303 read over the public REST API (`gh` holds no credential on this host); the coordinator's brief naming PR #279 as the bar and PR #286 as this body's shape; `origin/main` at `c85f516`</li></ul> |
| independent review | [none] `claude-opus-5` sub-agent, read-only | <ul><li>Context: `git diff origin/main...HEAD`, `CONTRIBUTING.md` § How the gates work</li></ul> |
| open the PR | [orchestrator] | — |

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01CyP12qn69Db7kx7vQjLFoR
