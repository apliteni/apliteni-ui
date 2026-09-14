# The dropdown panel's padding becomes a property, and the head gains a foot

Closes #306.

## The premises this is built on

#306 is a report from a page, not a wish about the kit. It was found on 2026-09-13 while building
a popover on the kit's panel, and it says two things:

> `dropdown.css` (0.30.0) pads the panel 6px and bleeds `.ui-dropdown__head` to the edges with a
> hardcoded `margin: -6px -6px 5px`. The only custom property the sheet declares is
> `--ui-dropdown-gap` (the trigger offset), and there is no foot class.

> A consumer that puts its own footer in the panel (a Save/Cancel pair under the list) has to write
> the same `-6px` by hand, which its design-token guard rightly refuses as a magic number.

So the ask is not a new look. It is that a number the kit already depends on stops being private to
the kit's own sheet, and that the block the kit already draws at one edge has a twin at the other.
Nothing on screen should move — and nothing does, for that part of it. Round 10 adds two things that
*do* move, both of them Artur's own notes on the evidence this branch shot: the trigger's caret and
the search field's ground in light. They are listed under *What this does* and measured under
*Measured, not asserted*.

## What was actually found in the code

- **The padding was written twice and named nowhere.** `.ui-dropdown__panel` had `padding: 6px` and
  `.ui-dropdown__panel > .ui-dropdown__head` had `margin: -6px -6px 5px`. The two are the same
  number and nothing said so: change one and the head stops meeting the panel's edge, silently.
- **The sheet already had the pattern the fix wants.** `--ui-dropdown-gap` is declared once on the
  panel and read by the downward `top`, the upward `bottom` and the portal's JS, for exactly the
  reason #306 gives — *"so an upward panel cannot drift from a downward one"*. The padding is the
  same shape of problem with no property on it.
- **`.ui-dropdown__foot` did not exist, and one consumer was already writing the head by hand.**
  `railUser()` in `src/components/shell.js` builds `<div class="ui-dropdown__head">…</div>` as a
  string and passes it through the factory's unwrapped `header` slot. The kit's own rail is the
  consumer #306 describes, one step short of the magic number — and after round 10 it still writes
  that div itself, which is the point of the verdict below.
- **A foot with controls in it is not free.** The obvious use — a Save / Cancel pair — is refused by
  axe under a `role="menu"` or a `role="listbox"` panel, because both take rows and nothing else.
  The kit already answers this for the field above the rows: `search: true` makes the panel a
  `role="dialog"`. The story that ships a Save / Cancel foot ships it there, and the constraint is
  written down and measured rather than left for the next reader to discover with a red gate.

## What this does

**`--ui-dropdown-pad`, declared where `--ui-dropdown-gap` is declared.** On `.ui-dropdown__panel`,
6px, and the panel's own `padding` reads it. Both blocks below pull back through it with
`calc(var(--ui-dropdown-pad) * -1)`, so the number lives in one place and a consuming page can read
it off the panel like any other token.

**`.ui-dropdown__foot`, the head's mirror.** One rule gives the pair its inner padding, so the two
cannot drift apart; each then bleeds to the edge it sits on, draws its line on the edge it faces —
the head under itself, the foot over itself — and rounds the two corners it stands in. The `5px`
between a block and the rows is the same number on both sides, and the gate compares them term by
term rather than reading each on its own.

**`dropdown({ foot })`, and no `head`.** The foot draws its block when there is one and nothing when
there is not; `footer` stays the unwrapped slot and now sits **inside** it, because the block that
bleeds is the one that has to touch the edge it bleeds to. A head is the page's own markup through
`header`, the shape `railUser()` has always written one in — **`src/components/shell.js` is
byte-identical to `origin/main` on this branch.** A `head` option was built and is gone; see
*Where the decisions went*.

**The panel's role decides what a foot may hold**, and that is documented and measured rather than
discovered. A title, a count or a note is at home in any panel; a control belongs in the search
variant's dialog.

**The trigger's caret is centred on its ink.** Two borders of a square turned 45° make an L, so the
corner opposite it carries nothing and centring the *element* leaves the mark off centre. Measured
in Chrome at a device scale of 8, against the trigger's own middle: **1.75px low closed, 3.88px high
open** — the second is what Artur saw. `--caret-off` is that gap, `(--caret − --caret-ink) / 2√2`,
derived from the square and its stroke rather than typed, and applied **before** the rotation so it
lands in page space; written after it, `translateY` travels along the turned axis and moves the mark
sideways too, which is what the two hand-tuned numbers it replaces were doing. Re-measured the same
way: **0.25px in both states**, the antialiasing fringe, symmetric about the middle.

**The light search field sinks one rung less far.** It was never darker than the kit's fields — it
paints exactly what `.ui-input` paints, `rgb(227,230,238)`, measured in the browser. What moved was
underneath it: a panel is a rung above a card, and #314 took a light panel to pure white, so
`--surface-2` fell **two** rungs under its surface instead of one. Against the panel it read 1.249
and a 20.9-point drop in lightness, where a kit field on a card reads 1.186 and 15.6. In light it
takes `--bg`: **1.140 and 12.9**. Dark is untouched and is an open question — its panel is a middle
step rather than white, so the same drop reads as a well and not a hole, and nobody has been asked.
The gate holds dark at the 1.234 it measures rather than fixing it or waving it through.

**The search field is already optional and always was.** `dropdown({ search })` defaults off, and
Guidelines / Component choice gives the rule for when a list earns one — about ten options, or a
list fed from data. It appears in the *foot of controls* story for a different reason: a `role="menu"`
or `role="listbox"` panel may not hold a control, so the Save / Cancel pair needs the `role="dialog"`
that `search: true` brings. The story is about the foot; the field is what makes the foot legal.

## Before / After

Same viewport, same items, both themes. Before is `origin/main` at `a162922`, after is this branch,
and **both sides are shot by the same rig** — one static server over the checkout under test, the
kit's own factories imported as modules in the page, one Chrome, one viewport — so only the code
differs. `main` has no `foot`, so the same call draws no foot there.

**A head and a foot.** A title over the rows and a note under them, both running edge to edge. The
head is markup the story writes through `header`; the foot is the block the factory draws.

| | Before (`main`) | After |
|---|---|---|
| dark | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/958e0c5/docs/evidence/dropdown-before-head-foot-dark.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/958e0c5/docs/evidence/dropdown-after-head-foot-dark.png) |
| light | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/958e0c5/docs/evidence/dropdown-before-head-foot-light.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/958e0c5/docs/evidence/dropdown-after-head-foot-light.png) |

**A foot of controls, and the light field's ground.** The Save / Cancel pair #306 names, in the panel
role that may hold one. The foot's own layout is the page's — the kit gives it the bleed, the line
and the corners, and no `display`. This is also where the search field's ground shows: `--surface-2`
on the left against white, `--bg` on the right.

| | Before (`main`) | After |
|---|---|---|
| dark | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/958e0c5/docs/evidence/dropdown-before-foot-controls-dark.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/958e0c5/docs/evidence/dropdown-after-foot-controls-dark.png) |
| light | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/958e0c5/docs/evidence/dropdown-before-foot-controls-light.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/958e0c5/docs/evidence/dropdown-after-foot-controls-light.png) |

**The caret, closed and open.** A new subject on the rig, shot at a device scale of 4 because the
mark is an 8px square carrying a 1.6px stroke and at 1× a reader cannot see where its ink sits. The
open arrow is the one Artur called out; the closed one moves too, by less.

| | Before (`main`) | After |
|---|---|---|
| dark | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/958e0c5/docs/evidence/dropdown-before-caret-dark.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/958e0c5/docs/evidence/dropdown-after-caret-dark.png) |
| light | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/958e0c5/docs/evidence/dropdown-before-caret-light.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/958e0c5/docs/evidence/dropdown-after-caret-light.png) |

The first two are stories — `Components/Dropdown → A head and a foot (open)` and `A foot of controls
(open)` — so those panels are the ones Storybook draws, not pages written for the screenshot.

## Measured, not asserted: what moves and what does not

The CSS half of #306 is a rename, and a rename should move no pixel. Round 10 adds two changes that
*should*, so the claim is now two claims and the rig makes both.

**The rename moves nothing, and `shell.js` says so without the rig.** `head` is gone, `railUser()`
writes its own div again, and `diff` against `origin/main` on `src/components/shell.js` is **empty**.
There is no markup argument left to make.

**The caret moves, and only the caret.** `rail-user-menu` is the committed shot with a
`.ui-dropdown__head` in it, and it carries a trigger caret too. Shot off both checkouts on this box,
same Chrome, same moment:

| | run 1 vs run 2, same checkout | `main` vs this branch |
|---|---|---|
| dark | 0 of 2,918,400 samples differ | **189 of 2,918,400**, all in `x∈[222,234] y∈[713,722]` |
| light | 0 of 2,918,400 samples differ | **189 of 2,918,400**, the same box |

That box is the rail user menu's own caret, measured at `x∈[222,234] y∈[711,724]` — every differing
sample falls inside it, the count is identical in both themes, and nothing else in a 1280×760 frame
of the app shell changed. The padding property, the foot, the shared rule and the search field's
light ground are all invisible there, which is what they should be.

**The rig waits on the document, and one box it cannot settle.** Every fixed `waitForTimeout` is
gone from `shoot.mjs` and `dropdown.mjs`; `scripts/evidence/settle.mjs` asks
`document.getAnimations()` whether any `CSSTransition` is still running and then gives the
compositor a frame. Wave 2 found the fixed waits racing — 25 samples of 3.9M between two runs of one
tree — and that is fixed. One thing is not, and it is named in the rig's README rather than glossed:
the rail subjects still jitter intermittently by up to 13 samples in `x∈[24,43] y∈[28,47]`, the
brand mark's own 20×20. It is not a transition, so no wait reaches it — the mark is an SVG whose
rounded corners come from a `clipPath`, and Chrome does not always rasterise that clip identically.
The subjects with no brand mark in them, every `dropdown-*`, are byte-stable over repeated runs.

**How the pixels are counted.** `scripts/evidence/diff.mjs`: differing samples, max delta and the box
they fall in, from a `zlib` PNG read with no dependency. Checked against an oracle rather than
trusted — the same pair through a `<canvas>` `getImageData` in that same Chrome returns the same
82,151 differing samples at max delta 242.

## The gates this adds, and the mutation that kills each

Every rule below was put on disk, watched fail, and reverted. `pass/fail` is the run of
`src/components/dropdown.test.js` and `stories/dropdown-foot-role.test.js` under the mutation.

| # | The mutation | What went red |
|---|---|---|
| 1 | the head's bleed written back as `margin: -6px -6px 5px` | *a block bleeding through the panel reads the padding* + *the head and the foot are one pair* (24/2) |
| 2 | the panel pads itself with `6px` instead of the property | *the panel names its padding and pads itself with it* (25/1) |
| 3 | the foot's rule deleted | *a block bleeding…* — the swept count drops to 1 — + *one pair* (24/2) |
| 4 | the foot bleeds on all four sides, closing the gap to the rows | *one pair* (25/1) |
| 5 | the pair's inner padding written twice instead of once | *one pair* (25/1) |
| 6 | the foot draws its line under itself, on the panel's own edge | *one pair* (25/1) |
| 7 | the factory stops drawing a foot | three markup tests (23/3) |
| 8 | the foot drawn whether or not one was asked for | *no foot is drawn unless one was asked for* (25/1) |
| 9 | the foot moved inside the unwrapped `footer` | *the foot sits outside the unwrapped footer* (25/1) |
| 10 | the role gate's foot carries text instead of controls | *a foot of controls belongs in the dialog panel* (2/1) |
| 11 | the search panel stops writing `role="dialog"` | all three role tests (0/3) |
| 12 | the closed caret rotates before it shifts | *the caret is centred in both states* (26/1) |
| 13 | both caret states shift the same way | *the caret is centred in both states* (26/1) |
| 14 | `--caret-off` typed as `2.263px` instead of derived | *the caret is centred in both states* (26/1) |
| 15 | the open caret back to its hand-tuned `translateY(2px)` | *the caret is centred in both states* (26/1) |
| 16 | the light field's override deleted | *a light field sinks no deeper…* (28/1) |
| 17 | the light field sunk to `--surface-3` | *a light field sinks no deeper…* (28/1) |
| 18 | the light field flattened onto the panel | *the field is still a well…* (28/1) |
| 19 | the dark field sunk to `--bg` | *dark holds the well it already had* (28/1) |

Two things about the shape of these, both from `CONTRIBUTING.md`:

- **The margin sweep discovers its subjects.** It reads every `margin` in `dropdown.css`, picks out
  the ones that bleed, and refuses a negative *length* in any of them — the `-1` inside
  `calc(… * -1)` is a multiplier and carries no unit, so it is not one. A third block that bleeds
  tomorrow is in scope by being written, and the count is asserted so the sweep cannot quietly find
  nothing and stay green (mutation 3 is that case).
- **The ARIA rule is measured, not written down.** `stories/dropdown-foot-role.test.js` puts the same
  foot into each panel `dropdown()` can emit and records which ones axe refuses. If a future axe
  stops refusing a control in a menu, that goes red and the sentence in the specification gets
  rewritten, rather than becoming quietly false. It also asserts the three panels still write the
  three roles it names them for, so the cases cannot drift into measuring something else
  (mutation 11).

- **The field's depth is measured, and dark is a ratchet rather than a pass.** Written honestly, the
  gate reports that dark carries the same shape as light did — 1.234 against its panel where a card
  field is 1.108. Artur reported light and was not asked about dark, so dark keeps the token every
  other field takes and the gate holds it at the number this tree measures: deepening it goes red,
  and bringing it in line lowers the number and passes, which retires the entry. Weakening the gate
  to let dark through silently would have been the easy read of "dark unchanged", and it is the one
  thing the gate refuses to do.

Both new gates are discovered by others. `stories/dropdown-field-ground.test.js` says "contrast" in
its own text, so `stories/guidelines/accessibility-floor.test.js` — which sweeps the tree for exactly
that — failed until the floor page named it; it has a row now, with what it checks and its two blind
spots.

## Where the decisions went

| Decision | Who | Where it is recorded |
|---|---|---|
| The padding becomes a property; the head reads it | #306, Artur's backlog | `docs/specification.md#the-dropdown-panel` |
| The property is `--ui-dropdown-pad` | #306 suggests it, this PR takes it | the sheet, beside `--ui-dropdown-gap` |
| **`foot` only — no `head` option** | **Artur**, on #306, round 10 | `docs/specification.md#the-dropdown-panel`, stated as his call |
| `footer` stays, and sits inside the drawn foot | me | gated by *the foot sits outside the unwrapped footer* |
| The foot gets no layout of its own | me | see *What a reviewer should push on* |
| A control-bearing foot needs the dialog panel | axe, not taste | `docs/specification.md`, measured by the role gate |
| The caret is centred on its ink, in both states | **Artur** reported it; the arithmetic is mine | `docs/specification.md#the-dropdown-panel`, with the measurements |
| The light search field takes `--bg` | **Artur** reported it; the rung is mine | `docs/specification.md#elevation`, with the three ratios |
| Dark's field is left alone and held at a ratchet | me, because nobody asked about dark | the gate's own ledger comment |
| Version and changelog left alone | the coordinator's standing rule | below |

The third row is the one that matters. A `head` option was built beside the `foot` the issue asked
for, on the argument that a factory you can pass a `foot` to but not a `head` is a strange thing to
hand someone. Artur's verdict on #313 reversed it: the kit does not grow a second way to write a
block it already writes correctly by hand. The class, the bleed and the gate over the pair are what
#306 is about, and they apply to a head written as markup exactly as they apply to a drawn foot.
`railUser()` is back to `origin/main`'s bytes.

## Reviews

| Review | When | Findings | Resolved |
|---|---|---|---|
| Independent, wave 2 | 2026-09-14 | 2 should-fix, 2 nits | 4 of 4, in `582231f` |
| **Artur, round 10** | 2026-09-14 | approve after a change, + 3 notes | 4 of 4, in `6b79696` |
| *(further rows for the coordinator)* | | | |

**Artur's verdict, and what it changed.** *Approve after a change — foot only, no `head` option*,
plus three notes on the dropdown as rendered in the evidence. All four are in.

1. **The `head` option goes.** Done, and `src/components/shell.js` is byte-identical to
   `origin/main` again. The decisions table names him for it.
2. *"arrow UP need to be vertically centered i think"* — right, and by more than it looks: the open
   caret's ink sat 3.88px above the trigger's middle, the closed one 1.75px below. Both are within
   0.25px now, and the correction is derived from the caret's own two numbers rather than tuned.
3. *"search box background looks too dark in light theme"* — right about the look, and the field
   turned out to be innocent: it paints exactly what `.ui-input` paints. The panel under it went
   white in #314, so the same sunken token fell two rungs instead of one. Light takes `--bg` now.
4. *"Show search only for big dropdown (make it optional)"* — it already is, and the evidence was
   misleading rather than the component. Said in one sentence where the story is explained, above.

**What it found, and what changed.** The two should-fixes were both about this body rather than the
code, and both were right:

1. *"Measured, not asserted" does not reproduce.* The rig waited a fixed 400ms over a running
   transition, so two runs of one tree came back 25 samples of 3.9M apart and a `main` run could
   collide with a branch run. The rig waits on `document.getAnimations()` now, the claim is restated
   as what it measures, and the section above carries the re-measurement and the retraction that
   came with it.
2. *The version section gave the wrong reason.* It read as a hold; the `0.32.0` is the merge base's,
   and the red check is a separate, deliberate thing. Split in two above.

The nits: the accent-badge citation in `docs/specification.md` lost the backticks its neighbour
keeps, and
`scripts/evidence/dropdown.mjs` leaked its static server on a throw — the `try`/`finally`
`guideline.mjs` has is in both it and `shoot.mjs`, since the new settle can throw in either.

It also flagged `head` beside the `foot` #306 asked for, and the foot having no layout where
`.ui-drawer__footer` has one. Artur settled the first in round 10 — `head` is gone. The second still
stands under *What a reviewer should push on*.

## The version this branch shows, and the bump it does not carry

Two separate things, and the first version of this section ran them together.

**`package.json` says what `main` says.** The wave-2 review caught this section claiming a hold
where there was none: the number came from a merge base one commit behind a release. This branch has
since merged `origin/main` twice — 0.33.1 at `341240d`, and `a162922` with #312, #315 and #316 — and
touches neither `package.json` nor the lock file, so the version on the tin is `main`'s and nothing
here moves it.

**The red check is a different matter, and it is deliberate.** `src/components/dropdown.js` and
`src/styles/dropdown.css` are inside the published tarball and their bytes changed, with no bump of
their own on top of whatever `main` is at. (`src/components/shell.js` is back to `main`'s bytes and
is no longer part of this.) CI's `Shipped surface vs
version` job compares the tarball against the base and exits non-zero when the surface moves and the
version does not — **so it goes red, and it is not one of the five required checks.** Several PRs
are in flight, so the coordinator sequences versions at merge; the lines are under *Changelog entry*
below.

## Proof

- [x] The panel's padding is a custom property and the head's bleed reads it. (#306's first
      acceptance box.)
- [x] `.ui-dropdown__foot` bleeds the way the head does, to the opposite edge. (#306's second.)
- [x] A person meets both in something running: two Storybook stories, shot in both themes, above.
- [x] The rename moves no pixel, and `src/components/shell.js` proves it without the rig — `diff`
      against `origin/main` is empty.
- [x] The only pixels this branch moves in a 1280×760 app shell are the caret's own box: **189 of
      2,918,400 samples**, identical in both themes, every one inside `x∈[222,234] y∈[711,724]`.
- [x] The caret is centred on its ink in both states — 1.75px low and 3.88px high before, 0.25px
      after, measured in Chrome at a device scale of 8.
- [x] The light search field reads 1.140 against its panel where a kit field on a card reads 1.186,
      down from 1.249. Dark is untouched and held at a ratchet.
- [x] Nineteen mutations, each put on disk, each watched fail, each reverted.
- [x] `ai-slop-detector` at level 2 over every file this branch touches: **0 errors, 0 medium.** Two
      findings are `main`'s own — `dropdown.css`'s prose-to-code ratio, which this branch carries at
      0.58:1 against `main`'s 0.54:1 for two new rules with two short comments each, and
      `shot.html`'s two remote font stylesheets, which the linter cannot read from disk.
- [x] `npm run build`: clean. React: **530 tests in 20 files, all passing** — including #316's
      `<Dropdown>` parity gate, which this branch does not disturb.
- [x] `npm test`: **1566 tests, 1564 pass, 1 fail, 1 skipped** — see the box below.
- [ ] Exercised in the page that reported #306. Not done here: it installs a published version, so
      it can only be proven after a release.

**The one failure, and why it is the box.** `stories/contrast.test.js`'s wall-clock ceiling — *the
walk has not run away with the clock* — which asserts the contrast walk finishes inside 120s. This
machine is an 8-core box running several agent sessions at once, and the walk is the suite's
critical path. Measured across the day: **277.9s** on this branch, **294.5s** on `main` in a
worktree beside it, and **198.1s** on a clean tree at the branch's own base — three runs, three
numbers, all far over the bar, with `main` the slowest of them. The diff is not in it. The skip is
opt-in on `main` too: the `CONTRAST_ACCENTS=1` theme × accent matrix. A second one appears on a tree
with no `storybook-static/` — `overview.test.js`'s built-index check — and runs and passes after
`npm run build-storybook`.

## What a reviewer should push on

- **The foot has no layout.** `.ui-drawer__footer` is `display: flex` justified to the end with a
  10px gap, and a reader may reasonably ask why the dropdown's foot is not. The drawer's footer is
  one component's own footer with one job; the dropdown's foot is a slot whose content the page
  owns, like `header`/`footer` before it — and a `display: flex` on it would silently re-lay-out a
  foot holding a line of text, which is the shape the *head* has been used in since #286. The Save /
  Cancel story therefore writes three declarations inline. If the pair is the common case rather
  than the illustrative one, the layout belongs in the sheet and the story loses its inline style.
  Flagged by the wave-2 review and still open.
- **Dark's search field.** The gate says dark carries the same two-rung drop light did — 1.234
  against its panel where a card field is 1.108. It is not fixed, because Artur reported light and
  was not asked about dark, and its panel is a middle step rather than white so the well reads as a
  well. The number is held rather than hidden: deepening it goes red, and bringing it in line
  passes. **This is the one question in the diff I would put back to him.**
- **The ARIA constraint is documented, not enforced.** `dropdown()` will happily draw a foot full of
  buttons under a `role="menu"` panel and the page's own axe run will fail, not the kit's. Making
  the factory infer a role from the slot's HTML means regexing a caller's markup for focusable tags,
  and wrapping the rows in an inner list to keep them parented — a much larger change to a component
  three other branches are touching. Stated as the boundary rather than smuggled in.
- **The `5px` between a block and the rows** is inherited from the head and is now written on both
  sides. It is not a token. The gate holds the two equal to each other rather than to a scale, which
  is the weaker of the two things it could do.
- **`--caret-off`'s `2.8284`.** The geometry constant, 2√2, written as a literal inside a `calc()`
  because CSS has no square root. It is the one number in the caret fix nothing derives.

## Filed as follow-ups, not fixed here

- **The React `<Dropdown>` has no `foot`.** #316 landed a React port that renders this factory's
  markup class for class and carries `header`/`footer` — but not the block this branch adds. Its
  parity gate stays green because no case passes a `foot`, so nothing red says so; `docs/library.md`
  says it in prose instead. That is #316's surface and a separate change.
- **Citations moved twice.** Several `file:line` citations into `dropdown.css` and three guideline
  `kit` entries pointed at lines this branch and two merges moved. Re-pointed here rather than
  filed: `scripts/code-refs.test.js` and `stories/guidelines/refs.test.js` refuse a stale one, so
  this is the gate working rather than a finding.

## Changelog entry

- `.ui-dropdown__panel` declares `--ui-dropdown-pad` beside `--ui-dropdown-gap` and pads itself with
  it, so a page pinning its own block inside the panel reads the number instead of copying `-6px`
  out of the kit's stylesheet.
- New `.ui-dropdown__foot`, the mirror of `.ui-dropdown__head`: the same inner padding from one
  shared rule, bleeding to the panel's bottom edge, with its line on the edge it faces and the two
  corners it stands in. `dropdown({ foot })` draws it; `footer` remains the unwrapped slot and sits
  inside it. A head is the page's own markup through `header`, as it always was.
- A head or a foot holding a control belongs in a panel that may hold one — `search: true` makes the
  panel a dialog; a menu or a listbox takes rows and nothing else.
- The trigger's caret is centred on its ink rather than on its box, in both states. It is two
  borders of a rotated square, so the mark is an L and the corner opposite it is empty; the caret
  sat 1.75px low pointing down and 3.88px high pointing up, and now lands within a quarter pixel of
  the trigger's middle either way.
- In light, a dropdown's search field takes `--bg` rather than `--surface-2`. A sunken box is read
  against the surface it sits in, and a floating panel is a rung above a card — in light that panel
  is pure white, so the ordinary field token fell two rungs under it and read as a hole.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01UpJ1qEvtwfcjYh158CuiGH
