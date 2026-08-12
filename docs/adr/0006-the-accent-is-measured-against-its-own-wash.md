# 0006. The accent is measured against its own wash, not against the surfaces

- **Date:** 2026-08-12
- **Status:** accepted
- **Code:** `src/tokens/tokens.css`, `src/tokens/accents.css`, `stories/accent-contrast.test.js`,
  `stories/foundations/SubThemes.stories.js`
- **Issues:** #157

## What we ran into

The default accent in the dark theme, `#9b5dff`, did not clear WCAG AA as text. Measured against the
four opaque grounds the kit paints under body text, and against `--glow-purple` washed over each of
them:

| ground | `--accent` on it | `--accent` on the wash over it |
|---|---|---|
| `--bg` | 4.65 | 3.76 |
| `--bg-elevated` | 4.40 | 3.53 |
| `--surface` | 4.15 | 3.32 |
| `--surface-2` | 4.45 | 3.57 |

Two things are visible in that table and only one of them was expected. The flat surfaces are close
to the bar — one of the four clears it. The **wash is a whole point worse than the surface it sits
on**, every time, and it is the wash that decides the cell.

That is not a coincidence of these particular values. `--glow-purple` is the accent's own colour at
low alpha, so painting it over a dark ground moves the ground *toward the ink* while leaving the ink
where it is. Spending more alpha on an accent wash always closes the pair. The surfaces were never
the binding constraint, and a fix aimed at them would have been aimed at the wrong thing.

The story walk agreed: 116 distinct failing pairs in dark, 25 of them with `--accent` as the
foreground, worst 3.20.

## What we decided

In the dark theme only:

- `--accent` becomes `#b479ff`
- `--glow-purple` becomes `rgba(180, 121, 255, 0.12)` — the new accent's rgb at a lower alpha
- `--ring` follows the accent's rgb, at its existing `0.35`

Both halves move together. The wash is the accent at low alpha, so re-tinting it is not an extra
change but the same change — `stories/signal-contrast.test.js` already requires that the dark glow be
an exact tint of `--accent`, and a lifted accent with the old wash would have failed it.

`#b479ff` is not a new colour. It is `--purple-mid`, already shipping on the "soon" badge and pill,
so the ramp gains nothing to maintain.

The result across all eight theme × accent cells, with the flat grounds and the washed grounds both
counted. Every number is the worse of the two composite models described below:

| cell | before | after |
|---|---|---|
| dark default | fails, worst 3.32 | passes, worst 4.54 |
| dark phoenix | fails, worst 4.31 | passes, worst 4.56 |
| dark ocean | fails, worst 4.28 | passes, worst 4.53 |
| dark emerald | passes, worst 5.35 | unchanged |
| light default | passes, worst 5.89 | unchanged |
| light phoenix | passes, worst 5.30 | unchanged |
| light ocean | fails, worst 4.26 | passes, worst 4.56 |
| light emerald | fails, worst 4.44 | passes, worst 4.54 |

Every worst above is the accent on the wash over a surface, never on a flat one. No flat ground fails
in any cell, before or after.

The other three accents fail on the wash and nowhere else, so they are closed the same way, by
lowering that cell's alpha rather than by moving a hue that #96 chose: dark Phoenix and dark Ocean
from `0.18` to `0.15`, light Ocean from `0.10` to `0.05`, light Emerald from `0.10` to `0.08`. Their
hues are untouched. This is a separate commit from the default accent's move so it can be reverted on
its own.

**Two composite models, and a value is only chosen when it clears in both.** A wash over a ground can
be composited at full precision, or rounded to 8 bits per layer. The gate does both and judges a pair
on the worse reading. Rounding is in there because it is closer to a framebuffer than full precision
is — but it is not the framebuffer, and neither model is: rendered in headless Chromium and read back
out of the screenshot, `rgba(180, 121, 255, 0.12)` over `#221f2e` paints `rgb(51, 42, 71)`, where
rounding predicts `rgb(52, 42, 71)` and full precision gives `(51.52, 41.80, 71.08)`. The dark
default's binding pair therefore reads 4.555 against the painted pixel, 4.540 rounded and 4.555
exact. The models disagree by at most a few hundredths, which is why taking the worse of them costs
nothing and why no number here is claimed past two decimals.

That rule is what decided light Ocean. `0.06` was the largest alpha the first search found, composited
at full precision, where it reads 4.501; rounded it reads 4.491, and the pixel Chromium paints reads
4.483. It was never a value that had cleared — it was a failing pair reported by whichever model was
asked. `0.05` clears in both models and in the browser, at 4.56. That is one more step off the wash's
visibility than the search wanted, and how faint the azure wash may get is a colour question this
record does not answer beyond the floor; what it does say is that the floor is not negotiable by
choosing a model.

**Light's `--accent` does not move.** `#6a2dcc` already clears every ground, washed and flat, at
worst 5.89.

**The floor is held by a test, not by this record.** `stories/accent-contrast.test.js` measures all
eight cells on every `npm test`. It derives the accents from the `[data-accent="…"]` blocks in
`src/tokens/accents.css`, so a fifth accent is judged the day it is declared, and it refuses to run
if that derivation stops matching. It composites both ways and takes the worse, so no value can be
chosen by picking the model that flatters it. It carries an exemption mechanism with nothing in it:
an empty list is the correct state for a gate nobody has had to excuse yet, and it makes the gate
harsher, not weaker — every pair is judged on its measurement alone.

**One accent surface the token gate could not see: a story that copies the tokens by hand.**
`stories/foundations/SubThemes.stories.js` pins a whole accent family inline per preview panel, so
all four accents can be shown at once under one toolbar theme. That mirror had drifted twice — two
accents #96 deepened and, in this change, four washes — and it painted `--purple` and `--ring` from
the wrong field in every panel: 23 of its 80 declarations stated a value the kit does not ship, on a
page whose whole subject is what each accent's tokens are. The same test now resolves what that page
paints against the two token files, property by property, deriving both sides rather than restating
either.

## Why not the alternatives

**`--accent: #bd8cff`, leaving the wash at `0.18`.** This passes too, and it was the closer call. It
costs more of the colour: against `#9b5dff` it gives up 27.1% of the violet's chroma in OKLCH, where
`#b479ff` gives up 15.2%. It also leaves the wash as the binding constraint for every future move,
and it introduces a hex the kit does not otherwise ship. Rejected for the chroma.

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
cannot close these, and neither can lowering `--glow-purple`, which they do not use. Three such rules
remain in dark, and they are why bucket B of the ledger in `stories/contrast.test.js` still has five
rows rather than none:

- `src/styles/dropdown.css:106` — `.ui-dropdown__badge.is-accent`, at 14%
- `stories/foundations/Motion.stories.js:95,98` — the story's own `.mz-replay`, at 12% and 20%
- the "soon" badge read on an accent-tinted card

`.ui-nav__badge.is-accent` (`src/styles/nav.css:100`) is the counter-example: it takes
`var(--glow-purple)` and this change closed it. That is the shape the others should take.

A fourth remaining row is not purple at all — the copy control on the green-tinted snippet bar of a
live card, which fails under every accent including Phoenix and Ocean today. It is a surface problem
and not an accent one.

**The token gate cannot see any of them.** It measures tokens against tokens; a ground a component
mixes for itself is only visible to the story walk, and only where a story renders it.

**The focus ring.** `--ring` follows the accent's rgb here, and that is all this change does to it. As
a focus indicator it sits far under the 3:1 that WCAG 1.4.11 asks: 1.61 against `--bg` before this
change, 1.81 after. The alpha, not the hue, is what holds it there — `0.35` of a light violet over a
near-black page. Clearing 3:1 would need roughly `0.61`, which is a visible redesign of every focus
state in the kit under every accent, and nothing here decides it.

**The accent hues of Phoenix, Ocean and Emerald.** Untouched. Only their washes move, and only where
a cell needed it. Whether those three accents want a lifted hue the way the default one got is a
question this record leaves open — it closed them the cheap way, on the wash alone.

**How visible the light Ocean wash should be.** It went to `0.05` because that is where the pair
clears in both models, not because anyone judged the azure wash at that alpha. The floor decided it;
whether it is still doing its job as a tint is a colour question nobody has answered.

**The exemption mechanism has nothing proving it works.** Its list is empty, so the test that fails a
stale entry currently measures nothing. That is the price of a gate with no excuses in it, and the
cheaper half of the trade — the alternative was leaving a failing pair in the list to keep the
mechanism exercised.

**Whether the colour is right.** AA is a floor. This record says the dark accent now clears it; it
does not say the violet is the correct violet.
