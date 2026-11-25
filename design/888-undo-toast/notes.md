# Undo notice: directions for issue 888

Each notice lives 8 s. The pointer or the focus in the stack holds every timer.

**A, `a-edge-line.html`.** The kit's 3 px timer line runs on the undo notice, in a column of at most 3. A fourth notice removes the oldest, and reduced motion shows a figure ("6 s") instead.

**B, `b-ring-pile.html`.** A ring with the seconds stands beside Undo, in the kit's `collapse` pile without a maximum. Older notices can end unseen, and reduced motion shows only the figure.

**C, `c-fuse-tray.html`.** One surface holds at most 5 rows of 44 px, and a sixth removes the oldest. Five segments under Undo go out in steps, also with reduced motion.

Contrast floors: 4.5 for text, 3 for an indicator.

| Part | Light | Dark |
| --- | --- | --- |
| Title | 19.30 | 16.30 |
| Undo | 8.33 | 13.22 |
| Seconds figure | 16.68 | 13.32 |
| A line | 3.48 | 9.86 |
| B arc, C lit segment | 8.33 | 13.22 |
| B track, C spent segment (fail) | 1.18 | 1.11 |

## Rules

- Kit conflict, `docs/components.md#toast`: "A notice with an action stays until the user picks the action or closes it." Proposed design-system change: an action notice accepts `timer`.
- `guidelines/motion.md`, "Honor reduced motion": no indicator moves.
- Foundations, "A tap reaches the floor below the phone step": Undo is 44 px high at 390 px.
- Foundations, "Text ink", "Elevation", "Control corners": tokens only.
- Proposed design-system changes: the maximum (A 3, C 5), the hold of all timers, the seconds figure, B's 3 px ring stroke (the line's value, no token), B's pile on touch, C's tray.

## Recommendation

Build A. It uses the indicator of every other timed notice, keeps each Undo visible, and changes the kit least. Cost: three notices cover 172 px of an 844x390 screen.
