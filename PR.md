# Elevation: the floating step takes a two-step edge and a soft drop

Closes #309. Follows #295, which built the ladder this sits on top of.

## Premises

**A floating panel reads flat, and the complaint is a number rather than a taste.** #295 replaced
every cast shadow in the kit with a step of lightness and a hairline. The ladder is right and this
PR does not touch it, but at the top of it the two devices run out of room at once:

| | dark | light |
| --- | --- | --- |
| the panel against the card it covers | 1.11 | **1.05** |
| its hairline against that card | 1.27 | 1.18 |
| its hairline against the panel it edges | 1.14 | 1.24 |

In light, 1.05 is below the level at which most viewers see an edge on a large flat area at all,
so the whole separation rests on a one-pixel line at 1.18. A better hairline colour cannot fix
that: no hairline colour makes a 1.05 step read as raised.

**The ladder cannot buy the step back.** `--muted` is the faintest text a panel carries, and the
specification already says the ladder is capped by ink rather than by taste. Raising
`--bg-elevated` in dark until the step reads takes `--muted` to 4.62 — AA by 0.12, with the next
value failing outright. Light has nothing above white to give the panel at all.

**So the separation has to come from a device the ladder does not own.** Seven were drawn and
measured against the same scene in `docs/reviews/295-popover-variants.html`; five were real
candidates.

## Decision record

**Artur, on #309, 2026-09-13: a + b — the two-step edge *and* the soft drop, in one declaration,
kept to the floating step.** The page's own recommendation, unopposed, on both questions it asked:

| the page asked | the page recommended | picked |
| --- | --- | --- |
| which treatment | `a + b` · the two-step edge with the floating drop | **a + b** |
| which surfaces | the floating step as the elevation ladder already lists it | **that list** |

**Why two devices and not one.** Each covers the theme the other cannot.

- **The second line works identically in both themes and does nothing for the step.**
  `--border-strong` on the border with `--border` one pixel inside it takes the edge from
  1.27 / 1.18 to **1.64 / 1.44**, and the two lines read 1.30 / 1.23 against *each other*, which is
  what makes them two lines rather than one drawn thick. It makes the panel better drawn. It does
  not make it higher.
- **The drop is the only device that separates by area rather than by one pixel,** and it is the
  only thing that lifts the light frame: the drop's core reads **1.44** against the card in light.
  In dark it reaches **1.20** and no further, because near-black ink on a near-black page has
  nowhere to go — which is the observation the no-shadow rule was built on, and it is still true.

Taken together: light is carried by the drop, dark by the doubled edge, and neither theme is left
holding the separation on the half that is weak for it. It is also the shape GitHub Primer's
`--shadow-floating-*` and Vercel Geist already ship — a 1px line in the `box-shadow` list, then
broad faint drops, reserved for the overlay layer and nothing under it.

**The three rejected options, in one line each.** `c` frost: translucency composites the panel
*toward* what is behind it, so the step goes **down**, 1.11 → 1.08 and 1.05 → 1.04. `d` a stronger
lightness step: the biggest dark gain on offer and it spends `--muted` to get it, and light cannot
do it at all without taking the card down until the card stops reading as a card. `e` tinted edge:
the strongest line of the five, and in this kit the accent already means *this one is chosen* — it
would make every panel look permanently selected.

### Two places this PR does not follow the page, and why

**The token is `--elev-floating`, not the page's `--shadow-float`.** Five `--shadow-*` tokens are
deprecated and resolve to `0 0 #0000`. A live token named into that family would be the one member
of it that paints, and `stories/elevation.test.js` has a test whose whole subject is that nothing
under `src/` reads a `--shadow-*`. `--elev-*` says which layer it belongs to and cannot be confused
with the dead five.

**The drafted specification sentence is taken but not quoted verbatim.** The page drafted it under
option `b`, the drop alone, so as written it says a floating surface keeps its step and its
hairline and adds a drop — it does not mention the doubled edge, which is half of what was picked,
and it names `--shadow-float`. The opening clause, which is the part that matters, is verbatim:

> **Nothing in the kit casts a shadow except a surface that floats.**

The rest carries the draft's shape and its sentence about the drop word for word, with the hairline
clause amended to say the line is drawn **twice**. `docs/specification.md#elevation` has it.

## What changed

**One token, per theme,** holding both devices in one `box-shadow` list in Primer's order — the
inset line first, then the drops:

```css
--elev-floating:
  inset 0 0 0 1px var(--elev-edge, var(--border)),
  0 14px 30px -12px color-mix(in srgb, var(--shadow-ink) 62%, transparent),   /* light: 18% */
  0 3px 9px -4px  color-mix(in srgb, var(--shadow-ink) 50%, transparent);     /* light: 10% */
```

The alphas are per theme because the device is not worth the same in each; the geometry is not,
because the shape of a drop is not a theme's business. Light's 18% is what lands the core at
`#d1d2d8`. `--elev-edge` is the hook a surface carrying its own tint re-points; unset it is
`--border`.

**Eleven declarations under `src/` take it, plus the React modal** — the `--bg-elevated` step as
the ladder lists it, and nothing below it:

| | |
| --- | --- |
| `src/styles/dropdown.css` | the dropdown panel |
| `src/styles/topbar.css` | the workspace switcher, the account menu |
| `src/styles/confirm.css` | the panel, and its focus rule |
| `src/styles/drawer.css` | the panel, and its focus rule |
| `src/styles/command-palette.css` | the panel, and its focus rule |
| `src/styles/callout.css` | all three toast styles |
| `src/styles/tooltip.css` | the hover readout |
| `react/src/Modal.css` | the React modal |

The card, the field, the chip and the row are untouched. So is the ladder, so are the five
deprecated `--shadow-*`, and so is `--muted`, which still measures 5.60 / 6.11 on a panel.

### Three things fell out of doing it

- **The focus ring has to be composed with the treatment, not written over it.** A `box-shadow`
  list replaces the whole list, so the four panels that wrote `box-shadow: var(--ring)` on focus
  would have taken their own edge and their own drop off for as long as they held focus. They now
  write `var(--ring), var(--elev-floating)`.
- **The drawer is flush to a screen edge, so it has one edge rather than four.** A full inset ring
  would draw 1px lines across the top and bottom of a full-height panel, where there is no edge, so
  its `--elev-edge` is `transparent` and each `--drawer--<edge>` rule sets `--drawer-line` in the
  direction its own border runs. Holding that line in a variable rather than in four literal
  `box-shadow` declarations is what lets the focus rule compose all three layers without knowing
  which edge it is on — and it removes a source-order hazard, because
  `.ui-drawer__panel:focus-visible` weighs the same `(0,2,0)` as `.ui-drawer--right
  .ui-drawer__panel`.
- **The collapsed rail's flyout label read `var(--shadow-md)` in both of its rules.** Deprecated in
  #295 and resolving to `0 0 #0000`, so it painted nothing while the specification said nothing
  under `src/` read one. Dropped. Nobody looking at the kit sees a change; a consumer who sets
  `--shadow-md` themselves no longer gets a shadow there.

## The gate, and the one that had to be re-scoped

**Nothing mechanical asserted "no box-shadow anywhere" — that claim lived only in prose,** in
`docs/specification.md#elevation`, in `src/tokens/tokens.css`, and on Foundations → Elevation and
Foundations → Backgrounds. All four are re-scoped to *no cast shadow below the floating step*. The
prose was the whole enforcement, which is exactly why this PR adds the gate the claim never had:

`stories/elevation.test.js` and `react/src/elevation.test.ts`, over one reader,
`scripts/lib/box-shadow.js`. Both **discover** their subjects — every `box-shadow` declaration in
every sheet `src/index.css` imports — rather than naming a component, so a stylesheet added
tomorrow is in scope by existing. Each declaration is read per theme with the token files
substituted in, because the property name decides nothing: a ring, a glow and a drop are all
written `box-shadow`, and only a layer's geometry says which it is. A layer that resolves to a cast
shadow has to **be** `var(--elev-floating)`, not merely contain ink that looks like it.

It holds four things: the shape of the token (an inset 1px line at zero offset, then drops with no
sideways offset, a blur at least twice the offset, and a negative spread), the counts (38
declarations swept, 11 of them floating), the numbers as a **floor** — the review page's `a + b`
row, so a treatment can get better and cannot quietly get worse — and `--muted` at AA on both
raised surfaces.

One existing gate needed a line: `stories/guidelines/accessibility-floor.test.js` discovers every
accessibility gate in the tree and fails when the floor page has not heard of one.
`stories/elevation.test.js` measures contrast, so it is one, and it is on the page with the three
blind spots it states about itself.

The blind spots, stated rather than papered over: `filter: drop-shadow()` (two ship, both
zero-offset glows of a signal colour; an offset one would pass unread); a shadow arriving from
markup; whether a surface that *should* float actually took the treatment — the rule is
one-directional, and the count is what catches a panel that quietly loses it; and the rendered
result, because a blurred penumbra is not a flat colour and the ratios score the drop's **core**,
which is the number the review page was read from.

## Proof

**The numbers, measured off the real token files** (`stories/lib/contrast.js`, both themes):

| | dark | light | the page's `a + b` |
| --- | --- | --- | --- |
| outer line against the card | **1.64** | **1.44** | 1.64 / 1.44 |
| the two lines against each other | 1.30 | 1.23 | 1.30 / 1.23 |
| the drop's core against the card | **1.20** | **1.44** | 1.20 / 1.43 |
| `--muted` on the panel | 5.60 | 6.11 | untouched |
| `--muted` on `--surface-3` | 5.38 | 5.07 | — |

Light's drop reads 1.44 where the page measured 1.43, because the prototype wrote the ink as a
literal `#101626` at 17% rather than reading `--shadow-ink`, which is `#1e1e32`. The gate floors
1.43, so the page's own number is what has to hold.

**Frames.** `docs/evidence/295-floating/`, sixteen of them: the two subjects the review page used —
the kit's dropdown panel held open over a card, and a popover holding a small form — before and
after, light and dark, 1440 and 390.

The producer is committed with them: `scripts/evidence/float.mjs` and `float.html`, a sibling of
the rail's rig. One static server over one checkout, the kit's own factories imported as modules,
one Chrome, one viewport — the before side is the same page pointed at a `main` worktree, so the
only thing that can differ between the two sides is what the kit's stylesheet paints. Nothing in
`float.html` writes a shadow. It captures `.fl-cell` rather than the viewport, because a drop falls
outside the card it is over and a frame cropped to the card would cut off the thing the pair is
about.

**Checks.**

| | |
| --- | --- |
| `npm test` | 1525 tests, 1522 pass, 2 skipped, **1 fail** — see below |
| `npm run build` (React, tsup) | pass |
| `npx vitest run` (react) | 18 files, 355 tests, pass |
| gitleaks 8.30.1, `--log-opts origin/main..HEAD` | no leaks |
| gitleaks 8.30.1, `--no-git` over the tree | no leaks |
| internal-terms denylist (`security.yml`'s own grep) | clean |
| AI-slop detector, paranoid, over this branch's prose | 0 errors, 0 medium, 3 warnings — the same three `main` reports on the same files |

The two skips are the opt-in `CONTRAST_ACCENTS=1` matrix, behind an environment variable on `main`
too.

**The one failure is the contrast walk's wall-clock ceiling, and `main` fails it the same way on
this host.** `stories/contrast.test.js` asserts the walk finishes inside 120s, a number set at
~2.5x a measured 47.6s worst case on a contended 10-core laptop. Paired runs, this branch against a
detached `origin/main` worktree on the same machine:

| | this branch | `origin/main` |
| --- | --- | --- |
| idle host | **146.5s** | **147.2s** |
| host at load ~10 | 173.4s / 15,994 pairs | 159.0s / 15,478 pairs |

This host is about 3x slower than the laptop the ceiling came from, and `main` is over the bar
before this branch touches anything. The branch does add work — **+516 pairs, 3.3%** — and the
source is named rather than waved at: one row on the accessibility floor page, the entry
registering `stories/elevation.test.js` and its three blind spots. Per pair the two trees are
10.84ms and 10.27ms, which is inside the gap between the two runs' load averages.

The deterministic half of that pair passes on both: the style cache's miss rate is 0.195 against a
0.30 ceiling. The gate's own comment says the two are kept apart precisely so a busy or slow
machine cannot be mistaken for a regression, and nothing here adds a theme×accent cell.

**Three counts moved, each in a commit that says why.** The elevation gate's sweep (42 → 38) and
its floating declarations (15 → 11), both because the drawer's four edge rules now set a custom
property instead of writing a fifth and sixth `box-shadow`; and `scripts/font-loading.test.js`'s
loader count (8 → 9), because the evidence page loads the kit's faces — a shot taken in the
fallback faces is a shot of a different kit.

**Five `file:line` citations this branch shifted are repaired**, and one of them —
`src/styles/topbar.css` → `dropdown.css:130` — was already stale on `main`, pointing at `border: 0`
rather than at the hover rule it describes.

## The version bump

**0.33.1.** `main` is at 0.33.0, tagged `v0.33.0`. A patch: no API moves, no class is renamed,
nothing a consumer imports changes shape. The changelog entry in `site/changelog.mjs` names the
decision, the reason and the numbers.

#296 takes the next patch after this one.
