# Proposed-value field, second set, issue 888

Apply sets the value and opens no menu. Set and empty use a ghost select. The gradient is still: `--accent` to `--chip-info-ink`.

**G1, `g1-gradient-chip.html`.** A pill has a gradient edge and a 12% gradient ground. The value keeps the body ink.

**G2, `g2-gradient-ink.html`.** The value is written in the gradient. It draws no box.

**G3, `g3-gradient-mark.html`.** A gradient `sparkle` stands before the value in body ink. Apply moves the value 22px.

Lowest contrast, Chromium colours, four accents:

| Pair | Light | Dark |
| --- | --- | --- |
| G1 value on its ground | 15.87 | 12.68 |
| G1 edge, G2 ink, G3 mark | 6.24 | 5.47 |
| None on the hover fill | 5.36 | 5.37 |

## Rules

The gradient is the owner's exception (rev_ce5c10633f49/d23) to:

- G1: Accessibility minimums "Measurable pairs".
- G2: "Measurable pairs", "Body contrast", Labels and titles "Use body ink", Density and accents "Give accents a job". The slop scan flags gradient text.
- G3: Iconography "State and action".

Proposed design-system change: a ghost trigger for `Dropdown`, a proposed-value part, a `tap-zone.css` entry, and for G3 a `sparkle` meaning.

## Recommendation

Build G1. It breaks one rule and shows the state by shape. Forced colours give it P2's dashed edge.
