# 0006. The accent is measured against its own wash, not against the surfaces

- **Date:** 2026-08-12
- **Status:** accepted
- **Code:** `src/tokens/tokens.css`, `src/tokens/accents.css`, `stories/accent-contrast.test.js`
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
| `--surface-2` | 4.45 | 3.58 |

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
counted:

| cell | before | after |
|---|---|---|
| dark default | fails, worst 3.32 | **passes, worst 4.54** |
| dark phoenix | fails, worst 4.31 | unchanged |
| dark ocean | fails, worst 4.28 | unchanged |
| dark emerald | passes, worst 5.35 | unchanged |
| light default | passes, worst 5.89 | unchanged |
| light phoenix | passes, worst 5.31 | unchanged |
| light ocean | fails, worst 4.27 | unchanged |
| light emerald | fails, worst 4.45 | unchanged |

Every worst above is the accent on the wash over a surface, never on a flat one.

The four cells that still fail all fail on the wash and nowhere else, and all four are closed by
lowering that cell's alpha rather than by moving a hue: dark Phoenix and dark Ocean from `0.18` to
`0.15`, light Ocean from `0.10` to `0.06`, light Emerald from `0.10` to `0.08`.

**Light's `--accent` does not move.** `#6a2dcc` already clears every ground, washed and flat, at
worst 5.89.

**The floor is held by a test, not by this record.** `stories/accent-contrast.test.js` measures all
eight cells on every `npm test`. It derives the accents from the `[data-accent="…"]` blocks in
`src/tokens/accents.css`, so a fifth accent is judged the day it is declared, and it refuses to run
if that derivation stops matching. It composites at 8 bits, because that is what the browser paints —
which is the harsher reading on the pair that binds the dark default accent, 4.54 against 4.56 at
full precision.

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
a cell needed it.

**Whether the colour is right.** AA is a floor. This record says the dark accent now clears it; it
does not say the violet is the correct violet.
