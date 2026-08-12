# 0006. The accent is measured against its own wash, not against the surfaces

- **Date:** 2026-08-12
- **Status:** accepted
- **Code:** `src/tokens/tokens.css`, `src/tokens/accents.css`, `src/styles/nav.css`,
  `stories/accent-contrast.test.js`, `stories/foundations/SubThemes.stories.js`
- **Issues:** #157

## What we ran into

The default accent in the dark theme, `#9b5dff`, did not clear WCAG AA as text. Measured against the
five opaque grounds the kit paints under body text, and against `--glow-purple` washed over each of
them:

| ground | `--accent` on it | `--accent` on the wash over it |
|---|---|---|
| `--bg` | 4.65 | 3.76 |
| `--bg-elevated` | 4.40 | 3.53 |
| `--surface` | 4.15 | 3.32 |
| `--surface-2` | 4.45 | 3.57 |
| `--surface-3` | 3.73 | 3.00 |

Two things are visible in that table and only one of them was expected. The flat surfaces are close
to the bar — one of the five clears it. The **wash is a whole point worse than the surface it sits
on**, every time, and it is the wash that decides the cell.

That is not a coincidence of these particular values. `--glow-purple` is the accent's own colour at
low alpha, so painting it over a dark ground moves the ground *toward the ink* while leaving the ink
where it is. Spending more alpha on an accent wash always closes the pair. The surfaces were never
the binding constraint, and a fix aimed at them would have been aimed at the wrong thing.

The story walk agreed: 116 distinct failing pairs in dark, 25 of them with `--accent` as the
foreground, worst 3.20.

The `--surface-3` row of that table is there because a reviewer put it there, after the first version
of this change had shipped with four grounds. That story is its own section below; everything between
here and it is what the first pass saw and decided.

## What we decided

In the dark theme only:

- `--accent` becomes `#b479ff`
- `--glow-purple` becomes `rgba(180, 121, 255, 0.12)` — the new accent's rgb at a lower alpha
- `--ring` follows the accent's rgb, at its existing `0.35`
- the violet ramp moves up a step behind it: `--purple-light` becomes `#b479ff` and `--purple-mid`
  becomes `#bd8cff`

Both halves of the first pair move together. The wash is the accent at low alpha, so re-tinting it is
not an extra change but the same change — `stories/signal-contrast.test.js` already requires that the
dark glow be an exact tint of `--accent`, and a lifted accent with the old wash would have failed it.

`#b479ff` was not a new colour: it was `--purple-mid`, already shipping on the "soon" badge and pill.
Left there, `--accent` and `--purple-mid` would have resolved to one value and the ramp would carry a
duplicate step, so the ramp moves up and `--accent` is `--purple-light` again — the shape light
Nebula and light Ocean already ship, and the one dark Nebula held before this change. `#bd8cff`, the
value rejected as the accent further down, becomes the ramp's top step instead. Light Nebula's ramp
does not move. `--grad-from` is pinned to the literal `#9b5dff` rather than left tracking
`--purple-light`, because following the ramp would lighten the hero gradient's first stop, which
nobody asked for; every `--grad-from` in `accents.css` is already written as a literal.

The result across all eight theme × accent cells: the accent on each of the five flat grounds, and on
the wash over the four base ones. Every number is the worse of the two composite models described
below:

| cell | before | after |
|---|---|---|
| dark default | fails, worst 3.32 | passes, worst 4.54 |
| dark phoenix | fails, worst 4.31 | passes, worst 4.56 |
| dark ocean | fails, worst 4.28 | passes, worst 4.53 |
| dark emerald | passes, worst 5.35 | unchanged |
| light default | passes, worst 5.89 | unchanged |
| light phoenix | passes, worst 5.30 | unchanged |
| light ocean | fails, worst 4.26 | passes, worst 5.10 |
| light emerald | fails, worst 4.44 | passes, worst 4.54 |

Every "before" worst above is the accent on the wash over a surface, never on a flat one; afterwards
the same holds in seven cells, and in light Ocean the flat `--surface-3` and the wash over
`--surface-2` are within a tenth of each other.

The other three accents fail on the wash and nowhere else. Two are closed by lowering that cell's
alpha rather than by moving a hue that #96 chose — dark Phoenix and dark Ocean from `0.18` to `0.15`,
light Emerald from `0.10` to `0.08` — with their hues untouched. Light Ocean took the alpha route
first, to `0.05`, and then took it back: see "the ground we missed". This is a separate commit from
the default accent's move so it can be reverted on its own.

**Light Ocean's accent deepens, and its wash goes back to `0.10`.** `#1568d6` becomes `#005bc8`: hue
and chroma unchanged in OKLCH (H 258, C 0.185), four points of lightness off. That is exactly the
move #96 made on light Phoenix (`#d64a12` → `#a8370c`) and light Emerald (`#0b9c68` → `#087a52`),
and light Ocean is the one light accent it skipped, because that cell happened to clear plain white.
It does not clear the raised grey panel: `#1568d6` read 4.54 on `--surface-3` and 4.25 on the wash
over it, where `#005bc8` reads 5.43 and 5.06. White on the deeper blue is 6.31, so
`--accent-contrast` still clears AA. Because the ink is what closed the pair, the wash no longer has
to be the thing that gives, and it returns to `0.10` where the other light washes sit. Its rgb stays
`21, 104, 214` — `--purple-light`, which is what a light glow tints.

## The ground we missed

The first version of this change measured four opaque grounds. There are five. `--surface-3` is what
paints an **active** sidebar row (`src/styles/nav.css:52`), and the accent counter on that row painted
`--glow-purple` over it (`:100`) — the accent wash laid on an already-raised surface, two tints
stacked. That pair was never in the gate, and no story renders an active nav item with an accent
badge, so the story walk in `stories/contrast.test.js` did not see it either. It failed in five of
the eight cells, on `main` and on the first version of this change alike:

| cell | `--accent` on the wash over `--surface-3` |
|---|---|
| dark default | 4.08 |
| dark phoenix | 4.12 |
| dark ocean | 4.06 |
| light ocean | 4.25 |
| light emerald | 4.23 |
| dark emerald | 4.86 |
| light default | 5.50 |
| light phoenix | 4.95 |

**No alpha reaches it.** Solving for the largest wash that clears with `--surface-3` counted, dark
Nebula needs `0.06` — half the `0.12` this change had chosen — and light Ocean needs `0.00`, which is
no wash at all. Spending the wash to rescue this pair means spending the wash entirely.

So the rule changed rather than the alpha. **The accent wash is painted on a base surface, never
stacked on a raised one.** The accent counter on an active row was the one place in the kit that
stacked it, and `src/styles/nav.css:113` is where it stops: on an active row the counter takes the
row's own `--surface-3`, the same shape the neutral badge two lines above it already had. Read on the
flat surface instead of the stacked pair, every cell clears — 4.92 in dark Nebula, 5.10 Phoenix, 5.15
Ocean, 6.74 Emerald; 6.33 light Nebula, 5.62 Phoenix, 5.43 Ocean, 4.62 Emerald.

`--surface-3` therefore joins `GROUNDS` as a flat ground, and the wash is measured over the four base
grounds only. **That exclusion is a claim about the kit, not a gap in the gate**, and the gate's
header says so in those words: nothing paints the accent wash on a raised surface any more. Its
limit, stated plainly there too: a token gate cannot see a component that stacks the wash again, and
neither can the story walk, for the reason this pair went unmeasured in the first place. Holding that
rule mechanically would need a gate that reads the stylesheets. Nobody has built one.

Two figures moved with the ramp. `--purple-mid` at `#bd8cff` lifts the "soon" badge from 4.10 to 4.81
on the wash over `--surface-3`, and from 3.97 to 4.67 on the accent-tinted card the story walk
actually renders it on — so that row clears and leaves the ledger in `stories/contrast.test.js`
entirely. Bucket B falls from five rows to four; bucket F, which had been lending its dark row to B
while the two tokens were one colour, has no dark row to hold at all now.

**Two composite models, and a value is only chosen when it clears in both.** A wash over a ground can
be composited at full precision, or rounded to 8 bits per layer. The gate does both and judges a pair
on the worse reading. Rounding is in there because it is closer to a framebuffer than full precision
is — but it is not the framebuffer, and neither model is: rendered in headless Chromium and read back
out of the screenshot, `rgba(180, 121, 255, 0.12)` over `#221f2e` paints `rgb(51, 42, 71)`, where
rounding predicts `rgb(52, 42, 71)` and full precision gives `(51.52, 41.80, 71.08)`. The dark
default's binding pair therefore reads 4.555 against the painted pixel, 4.540 rounded and 4.555
exact. The models disagree by at most a few hundredths, which is why taking the worse of them costs
nothing and why no number here is claimed past two decimals.

That rule is what refused light Ocean's `0.06`. It was the largest alpha the first search found,
composited at full precision, where it reads 4.501; rounded it reads 4.491, and the pixel Chromium
paints reads 4.483. It was never a value that had cleared — it was a failing pair reported by
whichever model was asked. `0.05` cleared in all three, at 4.56, and that is where the wash sat until
`--surface-3` was measured and no alpha at all turned out to be enough. Deepening the accent is what
closed the cell in the end, and the wash went back to `0.10`. The refusal still did its work: it is
why a deeper ink was looked for rather than a thinner wash accepted, and the floor is not negotiable
by choosing a model.

**Light's `--accent` does not move.** `#6a2dcc` already clears every ground, washed and flat, at
worst 5.89.

**The floor is held by a test, not by this record.** `stories/accent-contrast.test.js` measures all
eight cells on every `npm test` — the accent on five flat grounds and on the wash over the four base
ones, nine pairs a cell. It derives the accents from the `[data-accent="…"]` blocks in
`src/tokens/accents.css`, so a fifth accent is judged the day it is declared, and it refuses to run
if that derivation stops matching. It composites both ways and takes the worse, so no value can be
chosen by picking the model that flatters it. It carries an exemption mechanism with nothing in it:
an empty list is the correct state for a gate nobody has had to excuse yet, and it makes the gate
harsher, not weaker — every pair is judged on its measurement alone. Nothing was excused to close
`--surface-3`, and nothing should be: the ground was added to the gate at full strength.

**One accent surface the token gate could not see: a story that copies the tokens by hand.**
`stories/foundations/SubThemes.stories.js` pins a whole accent family inline per preview panel, so
all four accents can be shown at once under one toolbar theme. That mirror had drifted twice — two
accents #96 deepened and, in this change, four washes — and it painted `--purple` and `--ring` from
the wrong field in every panel: 23 of its 80 declarations stated a value the kit does not ship, on a
page whose whole subject is what each accent's tokens are. The same test now resolves what that page
paints against the two token files, property by property, deriving both sides rather than restating
either. It earned its keep immediately: the ramp move and light Ocean's deepening moved five values
in that table — dark Nebula's `--purple-light` and `--purple-mid`, light Ocean's `--accent`,
`--accent-strong` and `--glow-purple` — and the check named all five before anything shipped.

## Why not the alternatives

**`--accent: #bd8cff`, leaving the wash at `0.18`.** This passes too, and it was the closer call. It
costs more of the colour: against `#9b5dff` it gives up 27.1% of the violet's chroma in OKLCH, where
`#b479ff` gives up 15.2%. It also leaves the wash as the binding constraint for every future move.
Rejected for the chroma. The third objection at the time — that it introduces a hex the kit does not
otherwise ship — has since been spent: `#bd8cff` is the ramp's top step now, as `--purple-mid`. It is
still not the accent.

**Drop the wash's alpha further — `0.10`, or `0.09`.** Measured, by running the whole story walk at
each. The walk reports the same five surviving failures at `0.12`, `0.10` and `0.09`, with the same
worst at 3.97, and three of those five rows do not move by a single hundredth between the three runs.
Only the "soon" badge on the accent card moves at all, and it still fails at `0.09`. Alpha below
`0.12` buys nothing and spends the wash's visibility.

**Move the flat surfaces instead.** They are not what fails. Darkening `--surface` to rescue the
accent would repaint every card in the dark app to fix a problem the cards do not have.

## What this does not cover

**Grounds mixed from the accent into itself.** A rule that writes
`color-mix(in srgb, var(--accent) N%, transparent)` builds a ground out of the ink that will be read
on it, so the ground rises whenever the accent rises and the pair never opens. Lightening the accent
cannot close these, and neither can lowering `--glow-purple`, which they do not use. Two such rules
remain in dark, over three rows, and they are why bucket B of the ledger in
`stories/contrast.test.js` has four rows rather than none:

- `src/styles/dropdown.css:106` — `.ui-dropdown__badge.is-accent`, at 14%, failing hovered and
  focused, which is two of the rows
- `stories/foundations/Motion.stories.js:95,98` — the story's own `.mz-replay`, at 12% and 20%

The "soon" badge read on an accent-tinted card was a third until the ramp moved up behind the accent;
`--purple-mid` at `#bd8cff` takes it from 3.97 to 4.67 and it has left the ledger.

`.ui-nav__badge.is-accent` (`src/styles/nav.css:100`) is the counter-example, and not the one this
record originally claimed. It was cited here as a rule that takes `var(--glow-purple)` and had been
closed by lifting the accent. It had not been: on an active row it stacked that wash on `--surface-3`
and read 4.08 in dark Nebula, below the floor, unmeasured by either gate. What actually closed it was
a change to the rule, made after a reviewer found the ground — the badge takes the active row's own
surface instead of washing over it (`src/styles/nav.css:113`). It is a counter-example to the
color-mix rules either way, because the ground it reads on is a token the kit ships rather than a mix
of the ink itself. That is still the shape the others should take. What it stopped being is evidence
that a token move alone had fixed anything.

A fourth remaining row is not purple at all — the copy control on the green-tinted snippet bar of a
live card, which fails under every accent including Phoenix and Ocean today. It is a surface problem
and not an accent one.

**The token gate cannot see any of them.** It measures tokens against tokens; a ground a component
mixes for itself is only visible to the story walk, and only where a story renders it.

**Nothing enforces the base-surface rule.** "The accent wash is painted on a base surface, never
stacked on a raised one" is the rule this change adopted, and it is held by one edited stylesheet and
a paragraph in the gate's header. A token gate cannot see a component that stacks the wash again. The
story walk could, but only if a story rendered it, and the pair that started all this went unmeasured
precisely because no story does. Enforcing the rule would take a gate that reads the stylesheets for
`--glow-purple` on a raised surface. That is a follow-up, not this change.

**The focus ring.** `--ring` follows the accent's rgb here, and that is all this change does to it. As
a focus indicator it sits far under the 3:1 that WCAG 1.4.11 asks: 1.61 against `--bg` before this
change, 1.81 after. The alpha, not the hue, is what holds it there — `0.35` of a light violet over a
near-black page. Clearing 3:1 would need roughly `0.61`, which is a visible redesign of every focus
state in the kit under every accent, and nothing here decides it.

**The accent hues of Phoenix and Emerald, and dark Ocean's.** Untouched. Only their washes move, and
only where a cell needed it. Whether those accents want a lifted hue the way the default one got is a
question this record leaves open — it closed them the cheap way, on the wash alone. Light Ocean is
the exception, and it is deepened rather than lifted: `#005bc8` at the same OKLCH hue and chroma, the
move #96 made on the other two light accents.

**Whether light Ocean's deeper blue reads as the same blue.** Hue and chroma are held exactly and
lightness comes down four points, which is the change #96 twice made and nobody objected to. That is
an argument from precedent, not from anyone having looked at the two side by side under the light
theme's surfaces.

**The exemption mechanism has nothing proving it works.** Its list is empty, so the test that fails a
stale entry currently measures nothing. That is the price of a gate with no excuses in it, and the
cheaper half of the trade — the alternative was leaving a failing pair in the list to keep the
mechanism exercised.

**Whether the colour is right.** AA is a floor. This record says the dark accent now clears it; it
does not say the violet is the correct violet.
