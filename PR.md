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
Nothing on screen should move.

## What was actually found in the code

- **The padding was written twice and named nowhere.** `.ui-dropdown__panel` had `padding: 6px` and
  `.ui-dropdown__panel > .ui-dropdown__head` had `margin: -6px -6px 5px`. The two are the same
  number and nothing said so: change one and the head stops meeting the panel's edge, silently.
- **The sheet already had the pattern the fix wants.** `--ui-dropdown-gap` is declared once on the
  panel and read by the downward `top`, the upward `bottom` and the portal's JS, for exactly the
  reason #306 gives — *"so an upward panel cannot drift from a downward one"*. The padding is the
  same shape of problem with no property on it.
- **`.ui-dropdown__foot` did not exist, and one consumer was already writing the head by hand.**
  `railUser()` in `src/components/shell.js` built `<div class="ui-dropdown__head">…</div>` as a
  string and passed it through the factory's unwrapped `header` slot. The kit's own rail was the
  consumer #306 describes, one step short of the magic number.
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

**`dropdown({ head, foot })`.** Each draws its block when there is one and nothing when there is
not. `header` and `footer` stay the unwrapped slots and now sit **inside** the drawn blocks, because
the block that bleeds is the one that has to touch the edge it bleeds to. `railUser()` passes `head`
and stops naming a dropdown class of its own; its markup is byte-identical, checked by rendering the
shell before and after and comparing the strings.

**The panel's role decides what a foot may hold**, and that is documented and measured rather than
discovered. A title, a count or a note is at home in any panel; a control belongs in the search
variant's dialog.

## Before / After

Same viewport (420 wide), same items, both themes. Before is `origin/main` at `c85f516` and after is
this branch; **both sides are shot by the same rig** — the committed one from #286, one static
server over the checkout under test, the kit's own factories imported as modules in the page, one
Chrome, one viewport — so only the code differs. `main` knows neither `head` nor `foot`, so the same
call draws neither block there.

**A head and a foot.** A title over the rows and a note under them, both running edge to edge.

| | Before (`main`) | After |
|---|---|---|
| dark | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/4428666/docs/evidence/dropdown-before-head-foot-dark.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/4428666/docs/evidence/dropdown-after-head-foot-dark.png) |
| light | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/4428666/docs/evidence/dropdown-before-head-foot-light.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/4428666/docs/evidence/dropdown-after-head-foot-light.png) |

**A foot of controls.** The Save / Cancel pair #306 names, in the panel role that may hold one. The
foot's own layout is the page's — the kit gives it the bleed, the line and the corners, and no
`display`.

| | Before (`main`) | After |
|---|---|---|
| dark | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/4428666/docs/evidence/dropdown-before-foot-controls-dark.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/4428666/docs/evidence/dropdown-after-foot-controls-dark.png) |
| light | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/4428666/docs/evidence/dropdown-before-foot-controls-light.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/4428666/docs/evidence/dropdown-after-foot-controls-light.png) |

Both are stories — `Components/Dropdown → A head and a foot (open)` and `A foot of controls (open)`
— so the panel above is the one Storybook draws, not a page written for the screenshot.

## Measured, not asserted: the refactor moves no pixel

The whole point of the CSS half is that it changes nothing on screen. Saying so is cheap, so the rig
says it instead — and the first version of this section could not, which the wave-2 review caught.

**The rig was racing itself.** Every shot sat behind a fixed `waitForTimeout` over a running
transition: 400ms after the ArrowDown that opens the reader menu, 500ms after load. Longer than the
kit's own `--dur-med`, and still a race, because what lands in the file is whatever the compositor
had painted when the clock ran out. The reviewer measured it: `rail-user-menu-light` came back **25
samples of 3.9M apart between two runs of the same tree**, all inside x∈[24,43]. Small enough that
the conclusion held, and a race all the same — a run of `main` could collide with a run of the
branch and nothing would say which had happened.

**It waits on the document now.** `scripts/evidence/settle.mjs`: `document.getAnimations()` holds a
`CSSTransition` for every property still travelling, so the wait asks whether any is still running,
then gives the compositor one frame. No number of milliseconds anywhere in `shoot.mjs` or
`dropdown.mjs`. A ceiling of 5s exists to fail rather than to wait on.

**Re-measured, four runs.** Same box, same Chrome, `origin/main` at `233a1e7` in a worktree beside
this branch, every shot taken by the same rig — only `src/` comes from the checkout under test:

| | run 1 vs run 2, same checkout | `main` vs this branch |
|---|---|---|
| dark | 0 of 2,918,400 samples differ, on each side | **0 of 2,918,400, max delta 0** |
| light | 0 of 2,918,400 samples differ, on each side | **0 of 2,918,400, max delta 0** |

Two runs of each checkout agree sample for sample, so byte-identity is now a claim this rig can
make rather than one it got lucky on, and the four files carry two hashes between them —
`03d283ac…` dark, `424ade29…` light. `--ui-dropdown-pad`, the shared padding rule and `railUser()`'s
move to `head` are invisible, which is what a refactor of a magic number should be.

**And it retracts something.** The first version of this section reported that the committed
`rail-user-menu-dark.png` did not reproduce and called it a shot gone stale on `main`. That was the
race, not `main`: under the settled rig **both** committed rail shots come back byte-for-byte, and
so do all eight of this branch's own `dropdown-*.png`, off both checkouts. Nothing is stale and
nothing needed re-shooting.

**How the pixels are counted.** `scripts/evidence/diff.mjs`, new here: reads what the rig's Chrome
writes (8-bit, uninterlaced, `zlib` and about sixty lines of unfiltering, no dependency) and prints
differing samples, max delta and the box they fall in. Checked against an oracle rather than
trusted — the same pair run through a `<canvas>` `getImageData` in that same Chrome returns the same
82,151 differing samples at max delta 242. It is what the README now tells the next branch to use,
because a `sha256` that has moved says only *something is different*, and antialiasing a shade apart
reads exactly like a rule that moved four pixels.

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
| 8 | the foot drawn whether or not one was asked for | *neither a head nor a foot is drawn unless one was asked for* (25/1) |
| 9 | the bleeding blocks moved inside the unwrapped slots | *the blocks that bleed sit outside the unwrapped slots* (25/1) |
| 10 | the role gate's foot carries text instead of controls | *a foot of controls belongs in the dialog panel* (2/1) |
| 11 | the search panel stops writing `role="dialog"` | all three role tests (0/3) |

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

The new gate is an accessibility gate, so `stories/guidelines/accessibility-floor.test.js` — which
discovers every such file in the tree — failed until the floor page named it. It has a row now, with
what it checks and the two blind spots it has.

## Where the decisions went

| Decision | Who | Where it is recorded |
|---|---|---|
| The padding becomes a property; the head reads it | #306, Artur's backlog | `docs/specification.md#the-dropdown-panel` |
| The property is `--ui-dropdown-pad` | #306 suggests it, this PR takes it | the sheet, beside `--ui-dropdown-gap` |
| `dropdown()` gains `head` as well as `foot` | me, small and reversible | the factory's JSDoc; `docs/library.md` |
| `header`/`footer` stay, and sit inside the drawn blocks | me | gated by *the blocks that bleed sit outside…* |
| The foot gets no layout of its own | me | see *What a reviewer should push on* |
| A control-bearing foot needs the dialog panel | axe, not taste | `docs/specification.md`, measured by the new gate |
| `railUser()` moves to `head` | me | byte-identical markup, and the pixel parity above |
| Version and changelog left alone | the coordinator's standing rule | below |

Nothing here needed Artur to pick between variants: the issue names the property and the class, and
the rest is the sheet's own existing shape. If any row above is wrong it is the third and the fifth,
and both are one commit to reverse.

## Reviews

| Review | When | Findings | Resolved |
|---|---|---|---|
| *(left for the coordinator)* | | | |

## The version this branch shows, and the bump it does not carry

Two separate things, and the first version of this section ran them together.

**`package.json` says `0.32.0` here because the merge base does.** This branch is cut at `c85f516`,
one commit behind `main`, and the commit it is behind is `233a1e7` — *Release 0.33.0*, which bumps
`package.json` and the lock file and nothing else. This branch does not touch either file, so the
merge restores `0.33.0` silently and there is nothing to do about the number on the tin.

**The red check is a different matter, and it is deliberate.** `src/components/dropdown.js`,
`src/components/shell.js` and `src/styles/dropdown.css` are inside the published tarball and their
bytes changed, with no bump of their own on top of whatever `main` is at. CI's `Shipped surface vs
version` job compares the tarball against the base and exits non-zero when the surface moves and the
version does not — **so it goes red, and it is not one of the five required checks.** Several PRs
are in flight, so the coordinator sequences versions at merge; the lines are under *Changelog entry*
below.

## Proof

- [x] The panel's padding is a custom property and the head reads it. (#306's first acceptance box.)
- [x] `.ui-dropdown__foot` bleeds the way the head does, to the opposite edge. (#306's second.)
- [x] A person meets both in something running: two Storybook stories, shot in both themes, above.
- [x] The refactor moves no pixel — the same subject off both checkouts, 0 of 2,918,400 samples
      apart in both themes, on a rig that now agrees with itself across two runs of each side.
- [x] `railUser()`'s markup is unchanged: the shell rendered before and after the move to `head`
      compares equal as a string, and the rail's two committed shots both reproduce byte-for-byte.
- [x] Eleven mutations, each put on disk, each watched fail, each reverted.
- [x] `ai-slop-detector` at level 2 over every file this branch touches: **0 errors, 0 medium.** Two
      findings are `main`'s and unchanged by this branch — `dropdown.css`'s prose-to-code ratio, at
      the same 0.54:1 it carries there, and `shot.html`'s two remote font stylesheets, which the
      linter cannot read from disk.
- [x] `npm run build`: clean. React: **353 tests in 17 files, all passing.**
- [x] `npm run build-storybook`: completed, with both new stories in the built index
      (`components-dropdown--head-and-foot`, `components-dropdown--foot-of-controls`).
- [x] `npm test`: **1529 tests, 1527 pass, 1 fail, 1 skipped** — see the box below.
- [ ] Exercised in the page that reported #306. Not done here: it installs a published version, so
      it can only be proven after a release.

**The one failure, and why it is the box.** `stories/contrast.test.js`'s wall-clock ceiling — *the
walk has not run away with the clock* — which asserts the contrast walk finishes inside 120s. This
machine is an 8-core box running several agent sessions at once, and the walk is the suite's
critical path:

| tree | the walk took |
|---|---|
| this branch | **277.9s** |
| `origin/main` at `c85f516`, in a worktree beside it | **294.5s** |
| this branch's own base, clean tree, earlier in the day | **198.1s** |

Three runs, three different numbers, all far over the bar, and `main` is the slowest of them. The
diff is not in it. The skip is opt-in on `main` too: the `CONTRAST_ACCENTS=1` theme × accent matrix.
There is a second one on a tree with no `storybook-static/` — `overview.test.js`'s built-index check
— and after `npm run build-storybook` it runs and passes (5/5), which is the count above.

## What a reviewer should push on

- **The foot has no layout.** `.ui-drawer__footer` is `display: flex` justified to the end with a
  10px gap, and a reader may reasonably ask why the dropdown's foot is not. Two reasons, and I would
  reverse on either being wrong. The drawer's footer is one component's own footer with one job; the
  dropdown's foot is a slot whose content the page owns, like `header`/`footer` before it — and a
  `display: flex` on it would silently re-lay-out a foot holding a line of text, which is the shape
  the head has been used in since #286. The Save / Cancel story therefore writes three declarations
  inline. If the pair is the common case rather than the illustrative one, the layout belongs in the
  sheet and the story loses its inline style.
- **`head` as well as `foot`.** #306 asks for a foot. I added both, because a factory you can pass a
  `foot` to but not a `head` is a strange thing to hand someone, and because the kit's own rail was
  the consumer hand-writing the class. The cost is one more option on a factory that has plenty.
- **The ARIA constraint is documented, not enforced.** `dropdown()` will happily draw a foot full of
  buttons under a `role="menu"` panel and the page's own axe run will fail, not the kit's. Making the
  factory infer a role from the slot's HTML means regexing a caller's markup for focusable tags, and
  wrapping the rows in an inner list to keep them parented — a much larger change to a component
  three other branches are touching. Stated as the boundary rather than smuggled in.
- **The `5px` between a block and the rows** is inherited from the head and is now written on both
  sides. It is not a token. The gate holds the two equal to each other rather than to a scale, which
  is the weaker of the two things it could do.

## Filed as nothing, deliberately

Three citations into `dropdown.css` (`docs/specification.md`, `CONTRIBUTING.md`,
`stories/accent-contrast.test.js`) and three guideline `kit` entries pointed at line numbers this
branch moved. They are re-pointed here rather than filed, because `scripts/code-refs.test.js` and
`stories/guidelines/refs.test.js` already refuse a stale one — this is the gate working, not a
finding.

## Changelog entry

- `.ui-dropdown__panel` declares `--ui-dropdown-pad` beside `--ui-dropdown-gap` and pads itself with
  it, so a page pinning its own block inside the panel reads the number instead of copying `-6px`
  out of the kit's stylesheet.
- New `.ui-dropdown__foot`, the mirror of `.ui-dropdown__head`: the same inner padding from one
  shared rule, bleeding to the panel's bottom edge, with its line on the edge it faces and the two
  corners it stands in.
- `dropdown()` takes `head` and `foot` and draws each block for you. `header` and `footer` remain
  the unwrapped slots and sit inside the drawn blocks. A head or a foot holding a control belongs in
  a panel that may hold one — `search: true` makes the panel a dialog; a menu or a listbox takes
  rows and nothing else.
- `appShell()`'s reader menu uses the new `head` rather than writing the class itself. Its markup
  and its pixels are unchanged.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01UpJ1qEvtwfcjYh158CuiGH
