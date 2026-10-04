# The evidence rig

Every image under `docs/evidence/rail-*.png`, `docs/evidence/nav-collapsed-*.png`,
`docs/evidence/dropdown-*.png`, `docs/evidence/back-label-*.png`,
`docs/evidence/react-*.png` and `docs/evidence/295-floating/` is produced here.
Round 9's review said the rig "still has no producer committed, so I cannot
reproduce ten of them"; this is that producer, and everything shot since is shot
with it.

One static server over one checkout, the kit's own factories imported as modules
in the page, one Chrome, one viewport — so between two checkouts only the code
differs, and the before side of a pair is the same rig pointed at `main`.

## Running it

Playwright is deliberately not a dependency: the kit ships no browser and nothing
in `npm test` drives one. Point two variables at what you have.

```sh
export UI_PLAYWRIGHT=/path/to/playwright/index.mjs   # or leave unset if it resolves
export UI_CHROME=/path/to/chrome                     # Chrome, or Chrome for Testing

node scripts/evidence/shoot.mjs . out/               # the eight desktop shots + the phone four
node scripts/evidence/film.mjs  . out/               # the two filmstrips
node scripts/evidence/nav.mjs   . out/ nav-collapsed-after
git worktree add --detach /tmp/before origin/main
node scripts/evidence/shoot.mjs /tmp/before out/ rail-before
node scripts/evidence/nav.mjs   /tmp/before out/ nav-collapsed-before

node scripts/evidence/dropdown.mjs .          out/ dropdown-after    # the head/foot pair, #306
node scripts/evidence/dropdown.mjs /tmp/before out/ dropdown-before
```

The back link's label is its own subject, on its own page (#303) — the link alone
at 560×340, and the page shell at 390 wide, where a reading column is narrow
enough for a long destination to reach its edge:

```sh
node scripts/evidence/back.mjs . out/               # short, long and the shell, both themes
node scripts/evidence/back.mjs /tmp/before out/ back-label-before
```

A third argument to `shoot.mjs` is a substring filter over the names, so one
subject can be re-taken on its own; `back.mjs` takes a name prefix there instead,
and `dropdown.mjs` takes the prefix third and that filter fourth.

## The one cross-check worth running on a refactor

A change that only renames a number should move no pixel, and the rig can say so
rather than the pull request claiming it. Shoot the same subject off both
checkouts and compare the pixels:

```sh
node scripts/evidence/shoot.mjs /tmp/before out/main   rail-user-menu
node scripts/evidence/shoot.mjs .           out/branch rail-user-menu
node scripts/evidence/diff.mjs out/main/rail-user-menu-light.png out/branch/rail-user-menu-light.png
```

`diff.mjs` prints how many channel samples differ, the largest difference and the
box they fall in, and exits non-zero past a bound given as its third argument
(default 0). **The pixels and not the byte count**, because a `sha256` that has
moved says only *something is different* — antialiasing that landed a shade
apart reads exactly like a rule that moved four pixels, and only one of those is
a finding. When the two agree sample for sample, say so as bytes; when they do
not, the count and the box are the answer.

`rail-user-menu` is the subject to pick for anything touching the panel: it is
the only committed shot with a `.ui-dropdown__head` in it.

`float.mjs` is the floating step's pair, added for #309. Four subjects in both
themes at 1440 and 390. Two are the frame set
`docs/reviews/295-popover-variants.html` measured the decision against — the
kit's dropdown panel held open over a card, and a popover holding a small form.
Two more were added by the #314 review, because they are the surfaces that carry
their own inner line rather than the neutral one: the drawer, whose line runs in
one direction, and the three toast styles, each of which re-points that line at
its own status. Its third argument is the name prefix rather than a filter,
because both sides of the pair are the same sixteen names:

```sh
node scripts/evidence/float.mjs .          out/ after
git worktree add --detach /tmp/before origin/main
node scripts/evidence/float.mjs /tmp/before out/ before
```

It captures `.fl-cell` rather than the viewport, so the frame carries the ground
beside the card — a drop falls outside the card it is over, and a viewport shot
cropped to the card would cut off the thing the pair is about. The drawer is the
exception and is clipped out of the viewport instead: it is fixed to a screen
edge, and what its frame has to show is the top and bottom of a full-height
panel, where there is no edge and no line belongs. Nothing in
`float.html` writes a shadow: both sides are that page over a different checkout,
so the only thing that can differ between them is what the kit's own stylesheet
paints.
`guideline.mjs` shoots a Guidelines page on the same server, through the story's
own `guidelinePage()` call under Storybook's theme decorator. Its third argument
is the side of the pair and its fourth is the page, defaulting to `the-page`; it
writes the full page and a life-size crop of the first rule that draws a specimen
pair. A fifth argument names one rule's heading instead, for a page whose changed
rule is not the first that draws a pair, and a sixth is a comma-separated list of
viewport widths, 1200 by default. A width other than the default is in the file
name, because a specimen pair that drops single-file on a phone is two pictures;
the default keeps its bare name, so the commands below still shoot the images
committed under it. #310's caption
evidence is these two calls, eight images:

```sh
node scripts/evidence/guideline.mjs .           docs/evidence/caption-rank after
node scripts/evidence/guideline.mjs /tmp/before docs/evidence/caption-rank before
node scripts/evidence/guideline.mjs . out/ after accessibility-floor "Status labels" 1280,390
```

`react.mjs` is the same rig pointed at the React workspace's own Storybook build,
which is where `docs/evidence/react-*.png` comes from. A React component needs a
bundler and `shot.html` has none, so the subject is the built story rather than a
page that imports the factories:

```sh
npm run build-storybook -w react                     # react/storybook-static
node scripts/evidence/react.mjs . out/               # the ten React shots
node scripts/evidence/react.mjs . out/ select        # one subject, re-taken
```

It takes the same third-argument filter. Both faces are loaded into the story the
way `shot.html` loads them — the React Storybook's preview imports the kit's
stylesheet and nothing else, so without that the shot is of the box's fallback
face rather than of the kit.

It waits on `settle.mjs` and never on a clock: the panel renders open, so its fade
is running when the page arrives, and a query typed into the field starts another.
A fixed `waitForTimeout` over a running transition is a race the rig loses quietly
— it cost 2px of drift in `react-dropdown-search-links-dark.png` between two runs
of the same tree, which a pair shot across two checkouts could not tell from a
change. Reach for `settle()` in any new producer here, and never for a number of
milliseconds.

The clocks were necessary and not sufficient. With them gone, one frame of fourteen
still differed between two runs — a single level of antialiasing on a rounded
corner, and a different frame each time. Three more things buy the rest, and each
is on the launch or the context rather than in a shot:

- `--font-render-hinting=none` and `--disable-lcd-text`, because hinting snaps a
  glyph to the pixel grid from state the browser carries, and one advance landing a
  64th of a pixel differently moves a corner by a level.
- `reducedMotion: 'reduce'`, so no frame can catch a compositor layer mid-travel.
  The kit's net takes the travel off rather than changing what is drawn.
- `--deterministic-mode` and `--disable-partial-raster`, Chromium's own pixel-test
  switches: one raster pass per frame, and no re-raster of a tile already drawn.

Four runs of fourteen frames agree to the byte with those on, and the last of them
against what is committed under `docs/evidence/react-*.png`. A subject that has to
open itself is opened by the rig with a real click once the page has settled: the
dropdown panel freezes the width the whole list needs as it opens, so a panel open
before the webfaces land freezes a width measured in the fallback.

`filter-bar-fit.mjs` is a gate rather than a shoot, and the only producer here
that fails. It is #467's measurement: a filter row adds nothing to the page's
scrollable width on a phone, and its panels open inside the row.

It sweeps for its subjects rather than naming them. Both Storybook indexes are
rendered — the root's and the React workspace's — and every story that puts a
`.ui-filter-bar` on a settled page joins the set, so a new filter-bar surface is
measured by existing and neither half of the kit can go unmeasured: the run fails
if either index yields none. The membership question is the bar itself rather than
a box under `#storybook-root`, because a palette renders a modal of no size and a
toast renders through a portal. The one named subject is `filter-bar-fit.html`,
the issue's own reproduction through `filterBar()`.

Each subject is measured at 320, 375 and 390 in both themes, shut and with each
chip opened in turn — the widest option list in the kit is not on the second chip.
A case waits for a `.ui-filter-bar` to exist before it is probed: `load` fires
before React mounts, and settling waits on fonts and transitions rather than on a
render, so without it a loaded host reports a case as carrying no panel.

Three things are checked. That a panel is exactly as wide as the `.ui-dropdown`
that contains it, which is what the rule does. That the page gains no scrollable
width, with every panel inside its row, which is what #467 reported. And that each
option row's own text fits the row, because a panel is `overflow: visible`: at
1280 an unbreakable label left its panel by 200.9px with the page never
overflowing, so the page-edge check alone would have passed it. The fixture page
carries such a value, on its second chip, so the wrap hint is measured rather than
assumed.

Two mutations have to be rejected. Putting the 240px floor back has to widen a
panel in every case that carries one — judged on width rather than on overflow,
because a 240px panel does not push every layout past the screen: a bar sitting
early in a wide one absorbs it, and three of the swept subjects do, so overflow
alone would let those cases pass having measured nothing. Taking the wrap hint
away has to make at least one row spill, which the floor mutation cannot do
because it only ever widens panels.

Coverage is held by two recorded constants, `FLOOR_SUBJECTS` and
`FLOOR_PANELLED`, rather than by a count the sweep re-derives: a sweep that lost
half its surfaces would otherwise report its own smaller number back and pass.
Raising them is the deliberate act of someone who has seen the new surfaces:

```sh
npm run build-storybook && npm run build-storybook -w react
node scripts/evidence/filter-bar-fit.mjs . out/     # out/ takes a JSON ledger; it is optional
```

It needs both Storybook builds and the checkout for the vanilla half, and it exits
non-zero on a finding. `npm test` does not run it — nothing in `npm test` drives a
browser — so its counts belong in the pull request.

`table-stack.mjs` is the other gate that fails, and it is a shoot as well. It is
#499's measurement: every gap a stacked row draws, against the token it owes.

`src/styles/table-stack.test.js` resolves the cascade in JSDOM, so it can say which
declaration wins; JSDOM lays nothing out, so it cannot say where the text lands.
This measures the boxes — the row's own inset, the gap between two values on a
line, the gap down to the paragraph, the step between two rows, and whether the
first cell starts on the card's own text edge, the reading that was 4px out when
round 3 re-reviewed it. Each one is checked against a step read from
`src/tokens/tokens.css` rather than against a number written here.

Subjects are swept: every story whose source names `ui-table--stack` is rendered
and each stacked table on the settled page joins the set. The sweep is narrowed by
the source rather than by rendering the whole index, because the index is several
hundred stories and a handful could possibly stack; the page is still asked, so a
story that names the modifier without rendering one does not count.

Each subject is measured at 320 and 390 in both themes. 320 is there for the
wrapped line: the pinned recipe's values do not fit one line at that width, and the
run fails if no case wraps, because the gap between two lines of values would
otherwise go unread. 1280 is shot but not measured — above the one-column step
there is no stacked row to read — and the claim that the modifier is inert there is
checked by comparing the two frames, with the modifier and without it, byte for
byte.

The before side of every pair is the same frame with the class taken off the table,
which is what `main` draws for the same markup. A modifier inside a media query
cannot be undone by a rule, so the class is removed rather than overridden.

`FLOOR_SUBJECTS`, `FLOOR_CASES` and `FLOOR_ROWS` hold the coverage, for the reason
`filter-bar-fit.mjs` holds its own.

```sh
npm run build-storybook
node scripts/evidence/table-stack.mjs . out/    # out/ takes the frames and spacing.json
```

It needs the root Storybook build and the checkout, and exits non-zero on a
finding. `npm test` does not run it either, so its readings belong in the pull
request.

## What is deterministic and what is not

`shoot.mjs`, `nav.mjs`, `float.mjs`, `guideline.mjs`, `back.mjs` and `dropdown.mjs`
are: the same checkout, the same Chrome and the same viewport give the same bytes.
That is the cross-check to run first — re-shoot `rail-before-*` off `main` and
compare it with what is committed before trusting anything else the rig says.

One caveat measured on #303, where the pair was shot across two checkouts rather
than twice off one: a subject the change does not touch comes back a handful of
channel samples apart, max delta 6 on a 1120×680 frame — glyph antialiasing, not
layout. `diff.mjs` above is the answer to that: compare the pixels rather than
the byte count when the question is whether a subject moved.

**They are deterministic because they wait on the document rather than on a
clock**, and that was bought rather than given. Until #306 each shot sat behind a
fixed `waitForTimeout` over a running transition, which is a race the rig loses
quietly: `rail-user-menu-light` came back 25 samples of 3.9M apart between two
runs of the *same* tree, and a pair shot across two checkouts could not tell that
from a change. `settle.mjs` is the replacement — `document.getAnimations()`
holds a `CSSTransition` for every property still travelling, so the wait asks
whether any is still running and then gives the compositor a frame. Reach for it
in any new producer here, and never for a number of milliseconds.

**One box it does not settle, measured on #306's round 10.** The rail subjects
jitter in `x∈[24,43] y∈[28,47]` — the brand mark's own 20×20 — by up to 13
channel samples of 2.9M, intermittently, between two runs of ONE checkout. It is
not a transition, so no wait reaches it: the mark is an SVG whose rounded corners
come from a `clipPath`, and Chrome does not always rasterise that clip the same
way twice. Nothing else in the frame moves, and the subjects with no brand mark
in them — every `dropdown-*` — are byte-stable over repeated runs. So when a
rail pair comes back a handful of samples apart in that box, `diff.mjs` names the
box and the answer is the rig rather than the diff.

`film.mjs` is not, and cannot be. Its frames come off the compositor with
`Page.startScreencast` and each caption is the time the browser painted that
frame, so the six times land near 0, 50, 100, 150, 200 and 250 ms but never on
them. The composition is fixed; the milliseconds are the run's own.

## Fonts

The page loads Poppins and IBM Plex Sans from Google Fonts and waits on
`document.fonts.ready`. Shot with no network, every face falls back and the
bytes will not match — `scripts/font-loading.test.js` is the gate that says why
a token whose family never loads is a token that silently resolves to something
else.

## Component type scale

`font-scale.mjs` is a one-off evidence script for #322, not a permanent gate.
It discovers changed pixel sizes in `font-size`, `font` and `--*-font` against
the supplied pre-change revision and checks their replacements in Chromium: exact default parity and a 1px increase when
all text tokens grow by 1px (`--text-sm: 14px`, for example). It also renders the
source stories at 1280px and 390px, compares every element's computed font size,
and requires each changed selector to grow in at least one real story.

```sh
UI_PLAYWRIGHT=/path/to/playwright/index.mjs UI_CHROME=/path/to/chrome \
  node scripts/evidence/font-scale.mjs <revision-before-322> /tmp/font-scale
```

The output includes a JSON measurement ledger and 1x before/default/larger
screenshots of the first matching story in each component file. The run uses
light theme and available system fonts; it does not certify other host CSS or
font metrics. The deliberate flat 16px touch-field protection is excluded.

`focus.mjs` is the keyboard-focus rig, added for #482. Its subject is one control
at a time rather than a screen: it presses a key so the browser is in keyboard
modality, moves focus to the control, and **asserts the control matches
`:focus-visible` before it shoots** — a capture of a control that was only
clicked would show whatever the mouse state draws and would prove nothing about
the ring. The key it presses is a bare modifier, because Tab is a key the kit's
own dropdown handles: it closes an open panel, which would take a subject like an
account-menu row out of the frame.

Two surfaces, one run: the landing page as `site/build.mjs` writes it, and any
vanilla story, rendered by `focus.html` from the checkout being served. Each shot
is the control's box with 16px of room around it, at device scale 2, in both
themes.

```sh
git worktree add --detach /tmp/before origin/main
node scripts/evidence/focus.mjs .           out/ after
node scripts/evidence/focus.mjs /tmp/before out/ before
node scripts/evidence/focus.mjs --sheet     out/     # the pairs, laid side by side
```

Its third argument is the side of the pair and its fourth a name filter over the
subjects. The `--sheet` pass needs the captures and nothing else: it lays the two
sides of every pair it finds into one image per surface and theme, so a reader
compares pictures instead of filenames. React is not a subject here, for
`react.mjs`'s reason — a React component needs a bundler, and `focus.html`
imports modules over HTTP.

`scroll.mjs` is the same rig for the boxes the kit SCROLLS, added for #531. A
browser makes an overflowing box a keyboard stop with no `tabindex` and no author
rule, so a scroll container has the same claim on the ring as a button — unless its
own children are keyboard-focusable, in which case it is given no stop at all. Three
differences from `focus.mjs`:

- Two widths per subject, 1280 and 390, because a box that scrolls at one may not at
  the other. The width is in the filename.
- Each subject is **measured** before it is shot, and the readings are printed and
  written to `<side>-scroll-measurements.json`: whether the box overflows, how many
  of its own children are in the tab order, and where Tab actually lands. That
  measurement is what decides whether a box needs the ring at all.
- Two subjects are expected NOT to take focus — the underline tab strip and the
  application rail. For those the rig Tabs into the region and shoots wherever focus
  landed, which is the row inside: the evidence that the container is not the stop.
- The two subjects with a table in them are SCROLLED before the shot. Round r30 made
  the band an outline rather than an inset shadow because an inset shadow is painted
  under a box's own children, and a table scrolled sideways under one erased it. The
  frames are where that is shown rather than argued.

The subjects are built from the kit's own factories by `scroll.html`, each forced to
overflow. The React modal's body is shot off the React Storybook build, for
`react.mjs`'s reason, so build it first.

```sh
npm run build-storybook -w react
git worktree add --detach /tmp/before origin/main
node scripts/evidence/scroll.mjs .           out/ after
node scripts/evidence/scroll.mjs /tmp/before out/ before
node scripts/evidence/scroll.mjs --sheet     out/     # one sheet per subject
```

A subject whose story is new on this branch is reported as "not found on this
checkout" rather than taking the before side down; copy the story file across before
building the other checkout's Storybook if the before frame is wanted.
