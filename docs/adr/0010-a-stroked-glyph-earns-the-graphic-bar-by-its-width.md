# 0010. A stroked glyph earns the graphic bar by its width

- **Date:** 2026-08-14
- **Status:** accepted
- **Code:** `src/styles/callout.css`, `stories/signal-contrast.test.js`
- **Issues:** #206

## What we ran into

The kit paints a status as a mark in two places, and both marks are stroked outlines rather
than filled shapes:

```
.ui-toast__icon    a 13px glyph on an opaque 22px --toast-accent circle
.ui-callout__icon  an 18px glyph straight on the callout's own translucent wash
```

`signal-contrast.test.js` gated the first of those at 3:1, the bar WCAG 1.4.11 sets for a
graphical object, and was green. It measured ten pairs and left the callout family unmeasured
altogether. In the light theme the ten it did measure cleared by very little — the neutral
circle at 3.16:1, its dark counterpart at 3.11:1 — and the four it did not were worse: the warn
callout icon read 3.10:1 on its own wash over `--surface-2`, the info one 3.15:1.

Every one of those passes 1.4.11. They still read as smudges, which is what got the issue
filed, and the gate's own blind-spot list had named the case twice without anybody deciding it.

## What we decided

**3:1 is the right bar for a graphic, and a stroke has to be wide enough to be one.**

A stroke-width is stated in the glyph's own 24-unit box, so what a reader actually sees is
`stroke-width × box ÷ 24`. The two families rendered at **1.35 CSS px** (1.8 at 18px) and
**1.08 CSS px** (2 at 13px). Under **1.5 CSS px** a stroke cannot put three quarters of its
colour into any device pixel row at 1× — worst-case sub-pixel phase splits a stroke of width
*w* evenly across two rows, so its peak coverage is `w ÷ 2` — and a ratio computed from the
nominal colour is then not the ratio that reaches the eye. Below that width the mark is
optically a text stem, and it takes the text bar of 4.5:1 instead.

Both families were widened until they are graphics: **2.1 at 18px** (1.58 CSS px) and **2.8 at
13px** (1.52 CSS px). The circle has no room for a bigger glyph, so on the toast the weight
came out of the stroke.

`barFor(px)` in `signal-contrast.test.js` is that rule as code, and it decides the bar for
twenty pairs — two families × five statuses × two themes, all three of those lists discovered
from the stylesheet rather than typed into the gate ([0004](0004-the-gates-discover-their-subjects.md)).

**The pairs moved too, where a pair was free.** Two changes, no token value touched:

- The callout icons take `--chip-*-ink` rather than the raw signal. The reasoning is already in
  `callout.css` for the toast's trailing action: in light the raw signal is a graphic colour and
  not one text can be set in, and the chip inks are the text-grade version of the same five
  statuses. In dark the two are the same value by construction, so only light moves.
- `--toast-on` for neutral is `--signal-solid-ink` rather than `--strong`. The neutral circle
  *is* `--signal-solid-neutral` — both resolve to `--muted` — so it is the same pair the solid
  toast already chose, and it was taking a different ink for no reason anyone had written down.
  That fixes the two worst cells in the table, and it makes true a claim the gate's comment was
  already making: in dark, one ink clears all five accents.

Measured after, worst ground per cell (light / dark):

| | success | danger | warn | info | neutral |
|---|---|---|---|---|---|
| toast circle | 4.40 / 15.87 | 5.78 / 7.35 | 5.05 / 13.40 | 5.13 / 11.75 | 6.11 / 6.29 |
| callout wash | 4.40 / 8.42 | 4.82 / 4.65 | 4.57 / 8.03 | 4.62 / 7.20 | 5.66 / 5.56 |

**`GLYPH_FLOOR = 4.39` is a ratchet, not a second bar.** Every one of the twenty landed above
4.39:1, so the gate holds them there: a token that moves one of these pairs under where it was
measured is a decision somebody writes down, not a drift nobody notices. It is not a design
target for a sixth status — the bar is the bar.

## Why not the alternatives

**Declare the bar 4.5:1 and be done.** This was the first answer and it is measurably out of
reach. `--green` in light is `#1c8a2c`, whose relative luminance is 0.1862; the luminance at
which a near-black ink and a white ink are equally bad is 0.1867. It sits within a thousandth
of the worst possible value for carrying any ink at all, and caps at 4.43:1 against near-black
and 4.45:1 against white. Declaring 4.5 means moving `--green`, which is also the string colour
in `.ui-snippet pre .s` and a fill in five other components, plus either `--chip-success-ink` or
`--glow-green`, which are a gated chip pair. That is a token change with its own blast radius
and its own issue; it is not this one.

**Model the antialiasing and measure the glyph at reduced coverage.** Compositing the ink at
`α = min(1, w ÷ 2)` before measuring is the honest version of the argument above, and it demands
a 2 CSS px stroke for the ratio to be read at full strength — `stroke-width: 3.7` on a 13px
check, 15% of its own box, which is a blob rather than a check. It is also pessimistic about the
display: it assumes the worst sub-pixel phase at 1×, and at 2× a 1.08 px stroke already covers
two device rows. A width threshold takes the same argument and stops it short of absurdity.

**Grow the glyph instead of the stroke.** A 22px circle with an 18px glyph in it leaves 2px of
ring. There was room in one family and none in the other, and one rule beats two.

**Leave 3:1 and record the measurements beside the gate**, which is what #206 offered as the
other outcome. Rejected because the two worst cells sat 0.16 above a floor while a free change —
the neutral ink — moved them to 6.11 and 6.29. Recording a number nobody had to accept would
have been recording the wrong thing.

## What this does not cover

- **Every other stroked glyph in the kit**, including `.ui-toast__close` three lines from one of
  the two. This ruling is about the glyphs that carry a *status*, and the list that stood here
  was hand-written and named six of the ten that were under the line. #217 measured the rest and
  [0013](0014-a-glyphs-stroke-is-decided-where-its-box-is.md) rules on them: the same 1.5 px
  line, held by a gate that renders the kit rather than reading it.
- **The cascade.** [0003](0003-an-icons-size-is-measured-not-reasoned-about.md) mounts icon
  `width`/`height` and reads them back; `stroke-width` is not one of its subjects, and this gate
  reads the declaration in `callout.css` instead of resolving it. The reset in `base.css` is
  wrapped in `:where()` and cannot beat these rules, which is why reading is safe today and not
  why it is right.
- **Device pixels.** Everything above is CSS px. `zoom`, a transform, and the reader's actual
  device pixel ratio all change what is drawn and none is modelled.
- **1× as the case that decides.** The 1.5 px line comes from the worse display, not the common
  one. On a 2× screen the old widths already painted at full strength, and the marks were merely
  thin rather than dishonest.
- **The wash under a callout.** Three opaque surfaces are named — `--bg`, `--surface`,
  `--surface-2` — and every pair is held on all three. A callout dropped on a fourth ground is
  not measured.
