# Callout tone variants, issue 881

Each `.html` file shows the current look and one variant, with the kit CSS of 0.196.1. The screenshots are full pages. The `state-focus` and `state-hover` files show the action button. No variant needs a new token value or moves a part: 40 measured positions match the current look.

## Variants

- **A, solid glyph.** The glyph becomes a solid disc in the solid signal pair, and the lead takes `--strong`. It changes least, and success needs the closed Lucide `circle-check` glyph, because the kit's check leaves its ring.
- **B, tone line.** A 1px inset line in the signal colour draws the box, and a `b` that starts the body takes the status ink. Neutral gets a box in light, but danger looks near to an invalid field.
- **C, solid fill.** The tone becomes the fill, in the solid signal pair. It is the loudest, and the accent link ink measures 1.10:1 to 2.39:1 on it.

## Contrast

Text/glyph, the minimum on page, card and floating panel. Text needs 4.5:1, the glyph 3:1.

|Tone|Current|A|B|C|
|---|---|---|---|---|
|Neutral light|16.68/6.11|16.68/6.11|16.68/6.11|16.68/6.11|
|Info light|14.80/5.53|14.80/5.53|7.60/5.53|6.24/6.24|
|Success light|14.63/7.31|14.63/7.31|7.31/7.31|8.33/8.33|
|Warning light|14.34/5.34|14.34/5.34|7.32/5.34|6.21/6.21|
|Danger light|14.23/5.12|14.23/5.12|7.30/5.12|6.00/6.00|
|Neutral dark|13.31/6.23|13.31/6.23|13.31/6.23|13.31/6.23|
|Info dark|8.88/6.53|8.88/6.53|6.53/6.53|11.75/11.75|
|Success dark|7.79/7.73|7.79/7.73|7.73/7.73|15.86/15.86|
|Warning dark|8.70/7.29|8.70/7.29|7.29/7.29|13.39/13.39|
|Danger dark|9.28/6.35|9.28/4.27|6.35/6.35|7.35/7.35|

## Rules

- A follows "A status glyph is circled" in Icons and glyphs.
- B follows "A status word has its own ink in light" in Colour and contrast. Elevation gives a line to a level, and this line is not a level.
- C breaks "Text sits on the page, card or floating panel surface" in Elevation. It also sets `--ring` on a surface, which The focus ring forbids.

## Recommendation

B. It is the largest change that keeps the current wash, text ink and control states, and it needs no new glyph.
