# 0013. The focus ring is the accent at full opacity, declared once

- **Date:** 2026-08-14
- **Status:** accepted
- **Code:** `src/tokens/tokens.css`, `src/tokens/accents.css`, `stories/guidelines/accessibility-floor.test.js`

## What we ran into

`--ring` is the kit's only focus indicator, and it did not clear the 3:1 that WCAG 1.4.11 asks
of one. Not narrowly, and not in one theme: nowhere.

Two things had gone wrong at once, and the second hid the first.

The ring was translucent. Every declaration was an `rgba()` of the accent at an alpha between
0.25 and 0.38, composited onto whatever sat under the control. A band at 0.35 over a dark
surface is a slightly lighter dark surface. #201 measured the default accent's landings — every
rule in the stylesheets whose body consumes `var(--ring)`, against the ground each story puts
under it — and found the whole spread between 1.50:1 and 1.82:1.

The ring was also written out eight times: twice in `tokens.css`, once per theme, and six more
in `accents.css`, one per `data-accent` sub-theme per theme. #201 measured two of the eight, and
`accessibility-floor.test.js` swept two of the eight, so the number the kit believed about
itself came from a quarter of the kit. The six nobody measured were worse than the two that were
measured. Light `emerald` was 1.35:1 — below the 1.50 the ledger recorded as the floor, and
below it for as long as the sub-theme had existed.

## What we decided

One declaration, in `tokens.css`, and it is the accent itself:

```css
--ring: 0 0 0 3px var(--accent);
```

Two consequences, and both are the point.

**Opaque.** Alpha was the entire gap. No alpha under 0.75 clears 3:1 in dark and none under 0.63
clears it in light, and both of those sit on the bar with nothing to spare — a surface moving a
step would put them back under. At full opacity the worst of the eight cells measures 4.22:1 and
the best 8.40:1. A focus ring is a graphic, and a translucent one is a glow. The kit has a glow
and it is `--glow-purple`, which #157 settled and this did not move.

**Derived, not copied.** `--ring` is `var(--accent)`, so re-pointing `--accent` re-points the
ring. Light declares an accent and inherits the ring; each sub-theme declares an accent and
inherits the ring. The seven other declarations are deleted rather than corrected, because a
correct copy is still a copy and the six in `accents.css` are what drifting looks like after a
while. `tokens.css` had claimed since #157 that the ring "moves whenever `--accent` moves"; the
value beside that comment was a literal that moved when somebody remembered to move it. The
claim is now true.

The gate sweeps all eight theme × accent cells, taking the accents from `accents.css` rather
than from a list (ADR 0004), and carries two numbers: the 3:1 the standard asks, and a 4.22
ratchet at what the kit actually reaches. The ratchet sits above the bar deliberately — it fires
while the ring is still legal, which is the only warning anyone gets before it is not.

## Why not the alternatives

**Raise the alpha and keep the glow.** Preserves how focus looks today, and needs eight
hand-tuned alphas — one per cell, since the cells fail by different amounts — every one of them
within 0.05 of the bar. It keeps the eight copies that caused the problem, and it re-breaks the
moment a surface or an accent moves.

**Make each of the eight literals opaque, keeping its own ink.** Passes, and preserves the
lighter ring inks the light sub-themes had chosen (`#d64a12` where the accent is `#a8370c`). It
leaves light `emerald` at 3.04:1, on the bar, and leaves eight literals to keep in sync — the
shape that produced six unmeasured rings in the first place.

**A second contrasting band — a dark inner stroke under a light outer one.** This is the
technique for a ring that has to survive an unknown ground, and it is what to reach for if one
ever appears. It was not needed: every ground the kit paints under a focus ring is a flat
surface token, all of them within a narrow band of luminance, and one opaque colour clears all
of them with 1.4 stops to spare. It would also have cost the gate its footing — a multi-band
ring has an inner edge and an outer one, and the gate reads a single colour.

## What this does not cover

**The ring's inner edge.** A ring is painted outside the border box, so it has a second pair —
the ring against the control's own border. Only the outer pair is measured, because that is the
pair the ring is composited onto and so the worse of the two. That holds for a single band and
would stop holding for a layered one.

**Grounds no story renders.** The landings are discovered from the stylesheets and the grounds
from the stories that render them. A control focused over a ground no story puts it on is not in
the sweep, and a ground that is an image is reported unjudgeable rather than passed.

**The React workspace.** `react/src` declares its own ring and has its own gates. Nothing here
reaches it, and it was not measured for this.

**Whether the accent is always the right ink for a ring.** It is here because the ring is the
accent's relative and every accent the kit ships clears the bar against every ground. An accent
added later that does not clear it would have to break this record rather than bend it — which
is the gate's job to notice, and it will.
