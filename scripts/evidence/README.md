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
pair. #310's caption evidence is these two calls, eight images:

```sh
node scripts/evidence/guideline.mjs .           docs/evidence/caption-rank after
node scripts/evidence/guideline.mjs /tmp/before docs/evidence/caption-rank before
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

`font-scale.mjs` discovers the baseline's literal component font sizes and checks
all 63 replacements in Chromium: exact default parity and a 1px increase when
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
