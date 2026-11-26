# Radial countdown, issue 888

Direction A, with a 2px ring in the L1 tone for the line. Reduced motion moves the ring one step each second. Forced colours keep it.

**R1, `r1-ring-in-undo.html`.** A 16px ring is the first part of Undo. The title loses 24px.

**R2, `r2-ring-around-check.html`.** A 20px ring is the circle of the check. The title loses nothing.

**R3, `r3-ring-with-seconds.html`.** A 24px ring before Undo holds the seconds. The title loses 36px, so a phone stack grows from 219px to 243px.

Ring against notice ground, Chromium pixels, equal under all four accents:

| Mark | Light | Dark |
| --- | --- | --- |
| Line now | 3.50 | 9.83 |
| Each ring | 3.46 | 3.72 |

## Rules

- Foundations "Icons and glyphs": a 2px stroke uses the 3:1 bar.
- Components "Toast": "Under reduced motion the timer line is not drawn." The ring stays.
- R2, Foundations "A status glyph is circled": the circle empties.
- Proposed design-system change: a ring part for the action notice, with `--toast-timer-mix` (45% dark, 85% light).

## Recommendation

Build R1. Its ring stands in the control that ends, and the status glyph stays whole. R2 spends the status circle. R3 takes the most room.
