# Soft timer line, issue 888

Each version is direction A with the value in body ink. Reduced motion shows the seconds and no line. Forced colours draw no line. Both are as in A.

**L1, `l1-soft-tone.html`.** The line mixes the success tone into the notice ground: 45% tone in dark, 85% in light. Light equals today's line, because a paler line is under 3:1.

**L2, `l2-thin.html`.** The line is 2px high, not 3px. Its tone stays.

**L3, `l3-neutral.html`.** The line takes `--muted`, as a neutral notice. The glyph and Undo stay green.

Line against notice ground, Chromium pixels, equal under all four accents:

| Line | Light | Dark |
| --- | --- | --- |
| Now | 3.50 | 9.83 |
| L1 | 3.46 | 3.72 |
| L2 | 3.50 | 9.83 |
| L3 | 4.36 | 4.90 |

## Rules

- Each changes `.ui-toast__timer` only.
- Foundations "Icons and glyphs": "At or above **1.5 CSS px**, a mark is a graphic and uses the 3:1 bar." All three meet it.
- Proposed design-system change: `--toast-timer-mix`, 45% dark and 85% light, for L1. Its other tones are not measured.

## Recommendation

Build L1. Only L1 keeps the green and lowers it in dark, from 9.83 to 3.72. L2 stays as bright, and L3 loses the tone.
