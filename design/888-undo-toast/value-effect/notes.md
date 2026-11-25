# Undo notice with the value effect, issue 888

Direction A stays. The effect is finance2's ink: `--accent`, `--pink` and `--chip-info-ink` in one 4 s sweep.

**V1, `v1-value-ink.html`.** The changed value ("Groceries") moves in the ink, and the line stays green. Reduced motion gives the value a still `--accent` ink, and forced colours give it CanvasText.

**V2, `v2-line-ink.html`.** The timer line moves in the ink, and the text keeps body ink. Reduced motion draws no line, so no effect shows, and forced colours draw the line in CanvasText.

**V3, `v3-both.html`.** The value and the line move in one phase. Reduced motion and forced colours act as in V1 and V2.

Chromium pixels at 80 sweep points, worst of four accents:

| Part | Light | Dark | Floor |
| --- | --- | --- | --- |
| Value, moving | 6.21 | 5.32 | 4.5 |
| Value, still | 6.47 | 5.53 | 4.5 |
| Ink line | 4.51 | 4.22 | 3 |
| Green line | 3.50 | 10.12 | 3 |

## Rules

- Exception record for V1 and V3: "Owner decision (#888): the changed value of an undo notice moves in a slow gradient ink, against motion 'Move after load', accessibility-floor 'Measurable pairs' and 'Body contrast', and labels-and-titles 'Use body ink'. The owner: 'Use for the text and more kick ass'."
- V2 and V3 remove the success hue from the line.
- All put `--pink`, the error hue of "Stable signals", in a success notice.
- Proposed design-system change: the kit owns the effect as one class with three ink tokens, annotated ambient.
- Proposed design-system change: the kit's timer line draws in CanvasText with forced colours. Plain A and V1 show no timeout there.

## Recommendation

Build V1. It is the owner's effect on the text, the green line keeps the success tone, and reduced motion keeps a mark on the value. V3 moves six gradients in a stack of three. Risk: the ink means "suggested" in finance2 and "applied" here.
