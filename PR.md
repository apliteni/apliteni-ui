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

**The token is `--elev-drop`, not the page's `--shadow-float`.** Five `--shadow-*` tokens are
deprecated and resolve to `0 0 #0000`. A live token named into that family would be the one member
of it that paints, and `stories/elevation.test.js` has a test whose whole subject is that nothing
under `src/` reads a `--shadow-*`. `--elev-*` says which layer it belongs to and cannot be confused
with the dead five. It holds the drops alone — the reason is the round-1 review's first finding,
below.

**The drafted specification sentence is taken but not quoted verbatim.** The page drafted it under
option `b`, the drop alone, so as written it says a floating surface keeps its step and its
hairline and adds a drop — it does not mention the doubled edge, which is half of what was picked,
and it names `--shadow-float`. The opening clause, which is the part that matters, is verbatim:

> **Nothing in the kit casts a shadow except a surface that floats.**

The rest carries the draft's shape and its sentence about the drop word for word, with the hairline
clause amended to say the line is drawn **twice**. `docs/specification.md#elevation` has it.

## What changed

**Both devices in one `box-shadow` list in Primer's order** — the inset line first, then the drops.
The drops are a token, one per theme; the line is written on the floating surface's own rule:

```css
/* :root, per theme */
--elev-drop:
  0 14px 30px -12px color-mix(in srgb, var(--shadow-ink) 62%, transparent),   /* light: 18% */
  0 3px 9px -4px  color-mix(in srgb, var(--shadow-ink) 50%, transparent);     /* light: 10% */

/* every floating surface */
box-shadow: inset 0 0 0 1px var(--elev-edge, var(--border)), var(--elev-drop);
```

The alphas are per theme because the device is not worth the same in each; the geometry is not,
because the shape of a drop is not a theme's business. Light's 18% is what lands the core at
`#d1d2d8`. `--elev-edge` is the hook a surface carrying its own tint re-points; unset it is
`--border`.

**The line cannot live in the token, and this is the round-1 blocker.** A `var()` written inside a
custom property is substituted at computed-value time on the element that *declares* it. Written
inside a `:root` token, `var(--elev-edge, var(--border))` resolves at `:root`, bakes `--border` in,
and inherits the already-literal string down — so every component that re-points the hook writes a
declaration the browser ignores. Composed at the call site, the surface setting `--elev-edge` is
the surface the layer is substituted on, and the override lands. Both halves are proven in Chrome
under **Review round 1**, below. One place still owns the drop; thirteen declarations own a line
they are allowed to tint.

**Thirteen declarations under `src/` take it, plus the React modal** — every surface whose job is
to be temporarily above something else, and nothing else:

| | |
| --- | --- |
| `src/styles/dropdown.css` | the dropdown panel |
| `src/styles/topbar.css` | the workspace switcher, the account menu |
| `src/styles/confirm.css` | the panel, and its focus rule |
| `src/styles/drawer.css` | the panel, and its focus rule |
| `src/styles/command-palette.css` | the panel, and its focus rule |
| `src/styles/callout.css` | all three toast styles |
| `src/styles/tooltip.css` | the hover readout |
| `src/styles/layout.css` | the collapsed rail's flyout label, in both of its rules |
| `react/src/Modal.css` | the React modal |

Nine surfaces: three write the treatment twice, once on the panel and once on its focus rule, and
the flyout writes it twice because it is one surface at two widths. Most of them paint the
`--bg-elevated` step; the hover readout and the flyout paint `--surface-3`, the rung above it, and
they float for the same reason the rest do — **what floats is the surface's job, not its rung.**
The card, the field, the chip and the row are untouched. So is the ladder, so are the five
deprecated `--shadow-*`, and so is `--muted`, which still measures 5.60 / 6.11 on a panel.

### Three things fell out of doing it

- **The focus ring has to be composed with the treatment, not written over it.** A `box-shadow`
  list replaces the whole list, so a panel writing `box-shadow: var(--ring)` on focus would take
  its own edge and its own drop off for as long as it held focus. The three that have a focus rule
  — the drawer, `confirm()` and the command palette — write the ring in front of the treatment
  rather than over it.
- **The drawer is flush to a screen edge, so it has one edge rather than four.** A full inset ring
  would draw 1px lines across the top and bottom of a full-height panel, where there is no edge, so
  it is the one floating surface that writes no ring at all: `var(--drawer-line), var(--elev-drop)`,
  with each `--drawer--<edge>` rule setting `--drawer-line` in the direction its own border runs.
  Holding that line in a variable rather than in four literal `box-shadow` declarations is what
  lets the focus rule compose all three layers without knowing which edge it is on — and it removes
  a source-order hazard, because `.ui-drawer__panel:focus-visible` weighs the same `(0,2,0)` as
  `.ui-drawer--right .ui-drawer__panel`.
- **The collapsed rail's flyout label read `var(--shadow-md)` in both of its rules.** Deprecated in
  #295 and resolving to `0 0 #0000`, so it painted nothing while the specification said nothing
  under `src/` read one. It takes the floating treatment now — it is the hover readout's twin, and
  round 1 is where that was settled. A consumer who set `--shadow-md` themselves gets the kit's
  drop there instead of their own shadow.

## The gate, and the one that had to be re-scoped

**Nothing mechanical asserted "no box-shadow anywhere" — that claim lived only in prose,** in
`docs/specification.md#elevation`, in `src/tokens/tokens.css`, and on Foundations → Elevation and
Foundations → Backgrounds. All four are re-scoped to *no cast shadow but the floating step's*. The
prose was the whole enforcement, which is exactly why this PR adds the gate the claim never had:

`stories/elevation.test.js` and `react/src/elevation.test.ts`, over one reader and one cascade
resolver, `scripts/lib/box-shadow.js`. Both **discover** their subjects — every `box-shadow`
declaration in every sheet `src/index.css` imports, and in the React workspace's own sheets —
rather than naming a component, so a stylesheet added tomorrow is in scope by existing. Each declaration is read per theme with the token files
substituted in, because the property name decides nothing: a ring, a glow and a drop are all
written `box-shadow`, and only a layer's geometry says which it is. A layer that resolves to a cast
shadow has to **be** `var(--elev-drop)`, not merely contain ink that looks like it — and it is
judged against **every** value the kit gives the properties it read — each gate resolving against
its own workspace's declarations as well as the token files — not one guess at the cascade,
because a reader that keeps one declaration per name can be walked past by writing a second one.
Round 1 did exactly that; see below, and round 2 did it again on the React side.

It holds eight things: the shape of the drops (no sideways offset, a blur at least twice the
offset, a negative spread), the shape of the line at every call site (inset, a hairline, in front
of the drops, with the focus ring in front of both), the counts (40 declarations swept, 13 of them
floating), the numbers as a **floor** — the review page's `a + b` row, so a treatment can get
better and cannot quietly get worse — `--muted` at AA on both raised surfaces, that no `:root`
token reads a hook a component re-points, and that no component re-points `--elev-edge` on an
element that writes no line to tint. The last two are the rule behind round 1's blocker, held as a
shape rather than as a value.

One existing gate needed a line: `stories/guidelines/accessibility-floor.test.js` discovers every
accessibility gate in the tree and fails when the floor page has not heard of one.
`stories/elevation.test.js` measures contrast, so it is one, and it is on the page with the blind
spots it states about itself — three at first, four after round 1.

The blind spots, stated rather than papered over: `filter: drop-shadow()` (two ship, both
zero-offset glows of a signal colour; an offset one would pass unread); a shadow arriving from
markup; whether a surface that *should* float actually took the treatment — the rule is
one-directional, the count catches a panel that quietly loses it, and a **swap** (a card gaining it
while a panel loses it) leaves both counts where they are; a cast that needs two custom properties
off their winning values at the same time, since each name is tried against its own alternatives
one at a time; and the rendered result, because a blurred penumbra is not a flat colour and the
ratios score the drop's **core**, which is the number the review page was read from.

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

Every one of these was measured again after round 1 and none of them moved: 1.645 / 1.440,
1.297 / 1.225, 1.199 / 1.438, 5.600 / 6.112 and 5.378 / 5.075, with light's drop core landing on
`#d1d2d8` exactly. The refactor moved the treatment's *composition*, not its arithmetic — the
drops and both line colours are the same values in the same order.

**Frames.** `docs/evidence/295-floating/`, thirty-two of them, before and after, light and dark,
1440 and 390. Two subjects are the review page's — the kit's dropdown panel held open over a card,
and a popover holding a small form. Two were added in round 1, because they are the surfaces that
carry their own inner line rather than the neutral one: the drawer, whose line runs in one
direction, and the three toast styles, each of which re-points that line at its own status.

The producer is committed with them: `scripts/evidence/float.mjs` and `float.html`, a sibling of
the rail's rig. One static server over one checkout, the kit's own factories imported as modules,
one Chrome, one viewport — the before side is the same page pointed at a `main` worktree, so the
only thing that can differ between the two sides is what the kit's stylesheet paints. Nothing in
`float.html` writes a shadow. It captures `.fl-cell` rather than the viewport, because a drop falls
outside the card it is over and a frame cropped to the card would cut off the thing the pair is
about; the drawer is the exception and is clipped out of the viewport, because what its frame has
to show is the top and bottom of a full-height panel, where there is no edge and no line belongs.

The eight neutral frames are byte-for-byte what they were. Shot again against this branch *and*
against `55b2df2`, the pre-round-1 commit, the two are pixel-identical in both directions — 0
differing pixels of 210,840 at 1440 and 179,716 at 390 — so composing the line at the call site
moved nothing on a surface that does not re-point its edge, and the rig reproduces what is on disk.

**Checks.**

| | |
| --- | --- |
| `npm test` | 1535 tests, 1532 pass, 2 skipped, **1 fail** — see below |
| `npm run build` (React, tsup) | pass — ESM 39.58 KB, DTS 8.49 KB |
| `npx vitest run` (react) | 18 files, 355 tests, pass |
| `node --test` over the five colour and elevation gates and the reader's own tests | 148 tests, pass |
| gitleaks 8.30.1, `--log-opts origin/main..HEAD` | no leaks, 14 commits |
| gitleaks 8.30.1, `--no-git` over the tree | no leaks, 3.59 MB |
| internal-terms denylist (`security.yml`'s own grep, verbatim) | clean |
| AI-slop detector, paranoid, over every file this branch touched | 0 errors, 5 medium, 7 warnings — what `55b2df2` reported, same files |

The five gates run individually for the record are `stories/accent-contrast.test.js` (`--accent` at
AA on every ground, every theme×accent, including the 3:1 ring),
`stories/signal-contrast.test.js` (the five toast statuses, danger never `var(--accent)`),
`stories/danger-colour.test.js`, `stories/guidelines/accessibility-floor.test.js` (which discovers
every accessibility gate in the tree, the elevation one included) and
`stories/elevation.test.js`, plus `scripts/lib/box-shadow.test.js`, new in round 1.

The two skips are the opt-in `CONTRAST_ACCENTS=1` matrix, behind an environment variable on `main`
too.

**The one failure is the contrast walk's wall-clock ceiling, and `main` fails it the same way on
this host.** `stories/contrast.test.js` asserts the walk finishes inside 120s, a number set at
~2.5x a measured 47.6s worst case on a contended 10-core laptop. Paired runs, back to back,
nothing else running, this branch against a detached `origin/main` worktree on the same 8-core box:

| | this branch | `origin/main` |
| --- | --- | --- |
| the walk | **141.8s** — over the ceiling | **147.6s** — over the ceiling |
| wall clock | 143.9s | 149.5s |
| pairs judged | 16,000 | 15,478 |
| per pair | **8.86ms** | 9.54ms |
| style-cache miss rate | 0.1948 | 0.1986 |

The pairing was taken at `ad5cd79`; the two commits after it are prose, and one of them — a line
added to the accessibility floor page — puts the branch at **16,002** pairs in the final `npm test`
on the same host.

`main` is over the bar before this branch touches anything, and in this pairing it was the slower
of the two. The branch adds work — **+524 pairs, +3.4%** — and the source is named rather than
waved at: the accessibility floor page's row registering `stories/elevation.test.js` and the blind
spots it states, plus the rail's flyout, which now has a shadow and a firmer border for the walk to
read. Per pair the branch is *faster* than `main`, so the extra pairs are the whole of the extra
work.

The deterministic half of that pair passes on both: the style cache's miss rate is 0.195 against a
0.30 ceiling. The gate's own comment says the two are kept apart precisely so a busy or slow
machine cannot be mistaken for a regression, and nothing here adds a theme×accent cell.

**Three counts moved, each in a commit that says why.** The elevation gate's sweep (42 → 38 → 40)
and its floating declarations (15 → 11 → 13): down first, because the drawer's four edge rules set
a custom property instead of writing a fifth and sixth `box-shadow`; up again in round 1, because
the rail's flyout label takes the treatment in both of its rules. And
`scripts/font-loading.test.js`'s loader count (8 → 9), because the evidence page loads the kit's
faces — a shot taken in the fallback faces is a shot of a different kit. Both elevation moves are
rows in `CONTRIBUTING.md`'s ledger, which is where that gate records a number rather than editing
one.

**Nine `file:line` citations this branch shifted are repaired.** One of them — the topbar's pointer
at the dropdown's hover rule — was already stale on `main`, pointing at `border: 0` rather than at
the rule it describes. Four more moved in round 1: three into `src/styles/layout.css`, which the
flyout's own `box-shadow` pushed down six lines, and one into `stories/lib/contrast.js`.

## Review round 1

An independent review of `274c33f` returned **FIX FIRST**: three blockers, three should-fixes,
three nits. All nine are addressed here. The reviewer's own reproduction is used where it was
sharper than anything this PR had.

**Finding 1, BLOCKER — `--elev-edge` never resolved.** Written inside a `:root` custom property, it was
substituted at `:root`, so five component overrides were dead: the drawer drew a 1px ring across
the top, bottom and outer edge of a full-height panel — the thing `src/styles/drawer.css` says in
prose it prevents — and all three toasts drew the neutral hairline, the solid one putting a grey
rim on a filled surface. *Fixed:* the treatment stops being one token. `--elev-drop` keeps the
drops, one place per theme; the line is written at each call site, where the element setting
`--elev-edge` is the element it is substituted on. The drawer writes no ring at all, so its dead
`--elev-edge: transparent` goes with it and `--drawer-line` becomes load-bearing.

**Finding 2, BLOCKER — the gate could not see finding 1,** because it modelled the same token a third
way: first-declaration-wins gave `--elev-edge` the drawer's `transparent` on every surface, where
the browser painted `--border` on every surface. *Fixed:* the reader is cascade-aware (finding 4),
and two new cases hold the *shape* rather than a value — either would have caught this. **A
`:root` token may not read a hook a component re-points** — a name the palette never gives a
value, so the read always takes the fallback. **A component may not re-point `--elev-edge` on an
element that writes no line to tint** — which is exactly what the drawer was doing. Two more check
the composition itself: the line in front of the drops at every call site, and every neutral
surface writing the same line. Counts re-pinned, 38 → 40 and 11 → 13.

**Finding 3, BLOCKER — `npm test` failed two tests, not the one PR.md reported.** This file named the
dropdown's hover rule by bare filename, with no directory in front of it, and
`scripts/code-refs.test.js` refuses that rather than guessing a directory. *Already repaired on
the branch in `55b2df2`, and verified here:* `node --test scripts/code-refs.test.js` → 53 pass,
0 fail, on the branch as it stands.

**Finding 4, SHOULD-FIX — the sweep was defeatable by a custom property redeclared after its first
declaration,** which is the shape this PR introduced. The reviewer planted a real cast shadow in a
second `--drawer-line` and the gate stayed green. *Fixed:* `stories/lib/contrast.js` keeps every
declaration of every name in the order the sheets declare them, and `tokensFor()` picks the winner
off that — a token file over a component, and among components the last declared. The sweep goes
further and judges each layer against every value the kit gives the names it reads, one name at a
time, so a cast planted in a *middle* declaration is caught too. The reviewer's mutation fails the
gate now; reverted, it passes.

**Finding 5, SHOULD-FIX — the spec contradicted itself about the hover readout.** Its new opening said
the floating step was "the `--bg-elevated` step and nothing below it"; its ladder table put the
readout a rung above that, on `--surface-3`, where the kit casts on it and the decision on #309
named it. *Decided with the ladder, and the ladder says the readout floats:* what casts is decided
by the surface's **job**, not by its rung. The spec says that now, the enumeration names every
floating surface including the readout and the command palette, and the table carries the note
that two of its top-step surfaces float and the rest of that step does not.

**Finding 6, SHOULD-FIX — the collapsed rail's flyout label is the hover readout's twin and was treated
the opposite way:** this PR took its dead `--shadow-md` off and gave it nothing, while giving the
readout the full treatment. *Decided with finding 5, and it takes the treatment.* Same step, same
job, same shape — a readout placed over the page for as long as a pointer rests on a row — and the
ladder gives no reason to separate them. Both of its rules, because it is one surface at two
widths; its border firms to `--border-strong` with the rest of the floating step.

**Finding 7, NIT — `--drawer-line` painted nothing of its own while finding 1 stood,** so the four edges
had to be re-shot rather than trusted. *Done, and committed:* the drawer is one of the two subjects
added to `scripts/evidence/float.mjs`, and all four edges are verified in both themes below.

**Finding 8, NIT — `geometryOf` misread a layer whose offsets come from a `var()`.** `0 var(--y) 10px
black` read as `{x: 0, y: 10, blur: 0}`, so `isCast` cleared an offset layer as flat, while the
reader is documented as working on a raw value as well as a substituted one. *Fixed:* a `var()`
standing where a length belongs is `NaN` — every comparison against it is false, so the layer is
taken **for** a cast rather than cleared as one. A `var()` in the last slot is the colour, which is
how the drawer writes its line, and a colour function is never a length. The reader gets its own
tests, `scripts/lib/box-shadow.test.js`.

**Finding 9, NIT — the evidence README's opening paragraph ran past the file's wrap width.** Rewrapped;
nothing in that file is over 90 columns now.

**Finding 1, proven in Chrome.** The reviewer's isolation probe, run again against both shapes:

| | dark | light |
| --- | --- | --- |
| a hook read inside a `:root` custom property | `overrideWorks: false` | `overrideWorks: false` |
| the same hook read at the call site, as the kit writes it | **`overrideWorks: true`** | **`overrideWorks: true`** |

The CSS rule has not been worked around — it is the same rule, asked at a place where it gives the
answer the design needs. `getComputedStyle(document.documentElement)` has no `--elev-floating` left
to bake anything into; `--elev-drop` carries the two drops and no colour that belongs to a surface.

**All four drawer edges, both themes** — one directional line in the direction its border runs, and
no ring:

```
dark  right  → rgb(51,47,69)  1px 0 0 0 inset, <drop>, <drop>
dark  left   → rgb(51,47,69) -1px 0 0 0 inset, <drop>, <drop>
dark  top    → rgb(51,47,69)  0 -1px 0 0 inset, <drop>, <drop>
dark  bottom → rgb(51,47,69)  0  1px 0 0 inset, <drop>, <drop>
(light identical with rgb(228,231,238))
```

**All three toast tints, both themes** — each surface's own inner line, which is what was dead:

| style | dark | light |
| --- | --- | --- |
| soft, the status at 11% | `color(srgb 0.596 1 0.561 / 0.11)` | `color(srgb 0.110 0.541 0.173 / 0.11)` |
| solid, no inner line | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` |
| outline, the status at 20% | `color(srgb 0.125 0.863 0.961 / 0.2)` | `color(srgb 0.047 0.561 0.659 / 0.2)` |

The rail's flyout resolves the same way in both themes and both widths: `--border-strong` on the
border, `rgb(51,47,69)` — `--border` — as the inner line, and the two drops behind it.

## The version bump

**0.33.1.** `main` is at 0.33.0, tagged `v0.33.0`. A patch: no API moves, no class is renamed,
nothing a consumer imports changes shape. The changelog entry in `site/changelog.mjs` names the
decision, the reason and the numbers.

#296 takes the next patch after this one.
