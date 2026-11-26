# Proposed-value field, issue 888

One anatomy: the select's box without a chevron, Apply, a dismiss mark. It is 98px wider than the select, and 177px in P3.

**P1, `p1-soft-ink.html`.** The value moves in the soft ink S2. Reduced motion keeps the still ink.

**P2, `p2-dashed-field.html`.** The box has a dashed accent edge. The value keeps the body ink.

**P3, `p3-suggested-word.html`.** The word Suggested stands before the value in the info status ink. A switch shows the muted ink.

Lowest contrast against the field ground, Chromium colours, four accents:

| Mark | Light | Dark |
| --- | --- | --- |
| P1 ink | 9.48 | 7.72 |
| P2 edge | 6.47 | 5.53 |
| P3 info word | 8.57 | 9.79 |
| P3 muted word | 6.11 | 6.24 |
| Body ink | 19.30 | 16.30 |

## Rules

- P1 breaks Motion "Move after load" and Density and accents "Give accents a job".
- P3 in muted ink breaks Labels and titles "Limit muted ink".
- The slop scan warns that Apply repeats. Button labels "Earn a wordless button" keeps the word.
- Proposed design-system change: a proposed-value part, a 32px table select, a `tap-zone.css` entry.

## Recommendation

Build P2. It breaks no rule and it stays still. P1 moves in each row. P3 cuts a long value on a phone.
