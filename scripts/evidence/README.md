# The evidence rig

Every image under `docs/evidence/rail-*.png`, `docs/evidence/nav-collapsed-*.png`,
`docs/evidence/dropdown-*.png` and `docs/evidence/295-floating/` is produced here.
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

A third argument to `shoot.mjs` is a substring filter over the names, so one
subject can be re-taken on its own. `dropdown.mjs` takes the prefix third and
that filter fourth.

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

## What is deterministic and what is not

`shoot.mjs`, `nav.mjs`, `float.mjs` and `dropdown.mjs` are: the same checkout, the
same Chrome and the same viewport give the same bytes. That is the cross-check to
run first — re-shoot
`rail-before-*` off `main` and compare it with what is committed before trusting
anything else the rig says.

**They are deterministic because they wait on the document rather than on a
clock**, and that was bought rather than given. Until #306 each shot sat behind a
fixed `waitForTimeout` over a running transition, which is a race the rig loses
quietly: `rail-user-menu-light` came back 25 samples of 3.9M apart between two
runs of the *same* tree, and a pair shot across two checkouts could not tell that
from a change. `settle.mjs` is the replacement — `document.getAnimations()`
holds a `CSSTransition` for every property still travelling, so the wait asks
whether any is still running and then gives the compositor a frame. Reach for it
in any new producer here, and never for a number of milliseconds.

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
