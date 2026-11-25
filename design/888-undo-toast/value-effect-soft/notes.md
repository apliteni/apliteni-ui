# Softer value effect, issue 888

Each version mixes a kit ink 70% with the body ink (`currentColor`). Reduced motion gives a still mixed `--accent`, and forced colours give CanvasText.

**S1, `s1-two-inks.html`.** The value moves between the mixed `--accent` and the mixed `--chip-info-ink` in 4 s. `--pink` is gone.

**S2, `s2-slow-tint.html`.** The value moves between body ink and the mixed `--accent` in 8 s. It has one hue.

**S3, `s3-shine.html`.** The value keeps body ink. A band of the mixed `--accent` crosses it for 3 s of each 6 s.

Chromium pixels, 80 sweep points, worst of four accents, floor 4.5:

| Look | Moving, light | Moving, dark | Still, light | Still, dark |
| --- | --- | --- | --- | --- |
| V1 | 6.16 | 5.31 | 6.46 | 5.47 |
| S1 | 9.12 | 7.64 | 9.47 | 7.66 |
| S2 | 9.46 | 7.66 | 9.47 | 7.66 |
| S3 | 9.46 | 7.66 | 9.47 | 7.66 |

## Rules

- All three stay above 7:1 without `--pink`, so they obey "Body contrast" and "Stable signals".
- Exception record: "Owner decision (#888): the changed value of an undo notice moves in a soft gradient ink, against motion 'Move after load', accessibility-floor 'Measurable pairs' and labels-and-titles 'Use body ink'. The owner: 'Use for the text and more kick ass', then 'too strong color, try more soft'."
- Proposed design-system change: the kit owns the effect as one class, annotated ambient, with one mixed ink token (S1: two) and the version's period.

## Recommendation

Build S2. Its hue stays calm under all four accents, and the value always has a mark. S1 passes a grey middle under Phoenix. S3 leaves the value plain half the time.
