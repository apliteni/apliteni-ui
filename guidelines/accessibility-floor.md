# Accessibility minimums

## Minimum target size

<!-- rule: target-size -->

**Rule:** Give every pointer target at least 24x24 CSS px.

**Why:** Larger targets are easier to activate accurately.

**Do:** Use a centred 24x24 `::before` hit area for a 19x19 checkbox.

**Don't:** Leave a 19x19 target unchanged.

**Except:** WCAG 2.5.8 permits spacing, equivalent controls, inline text, user-agent sizes and essential presentation. Overlays must not reach neighbours.

## Tap target on a phone

<!-- rule: tap-zone -->

**Rule:** Below the phone step, reach 44x44 with a transparent layer outside the control, never by growing the control.

**Why:** A finger covers more than a cursor, and a control that grows on a phone moves the page a reader already knows.

**Do:** Centre a transparent layer on the control and let it stop at half the gap to the nearest neighbour.

**Don't:** Grow the drawn control to 44 and push out every row that holds one.

**Except:** Only a coarse pointer gets the layer, or a cursor lights a control it is not over. Rows that share an edge — a menu, a dense table, a settings list — have nothing to grow into and stay as they are drawn. Fields generate no layer, so a field reaches the floor by its own height or not at all.

## Space between small targets

<!-- rule: tap-spacing -->

**Rule:** Below the phone step, open a row of small controls to 44 minus their drawn size, so both tap zones fit between the drawn edges.

**Why:** A zone reaches half the gap before it crosses its neighbour's edge, so the gap is what decides whether either control reaches the floor.

**Do:** Open a row of 24px marks to 20px on a phone, where both zones fit and neither mark changes size.

**Don't:** Keep the desktop 8px and let the control written later in the markup win the overlap.

**Except:** A row that is already full opens downward only — widening it across makes the controls narrower, which is the one thing the floor must not do. Rows that share an edge — a menu, a dense table, a settings list — have nothing to open and keep their drawn targets. A row that opens nothing grows no zone at all.

## Focus ring contrast

<!-- rule: ring-contrast -->

**Rule:** Keep a focus indicator at least 3:1 against every ground it reaches.

**Why:** A solid band remains visible where glow alone may disappear.

**Do:** Use G2’s solid band with a surface-coloured gap around accent-filled controls.

**Don't:** Use the halo alone as the focus indicator.

**Except:** The band must reach 4.22:1 on flat ground and 3:1 against actual gap and halo pixels.

## Disabled control legibility

<!-- rule: disabled-legibility -->

**Rule:** Paint disabled controls with a different ink/surface pair from enabled controls.

**Why:** Opaque colours keep disabled text and surfaces readable.

**Do:** Use opaque `--disabled-ink`, `--disabled-surface` and `--disabled-border`.

**Don't:** Fade the label and box together.

**Except:** Labels must reach 3:1. Boxless ghosts use `--disabled-ink-bare`, floored at 4.89:1. Disabled controls must look weaker by changing the pair and removing accent. Only the label-free switch track may fade.

## Touch field text

<!-- rule: touch-field-size -->

**Rule:** Set coarse-pointer field text to 16px without scaling it down.

**Why:** iOS Safari zooms fields below 16px and does not zoom out.

**Do:** Apply real 16px text to `input`, `select` and `textarea`, including host fields.

**Don't:** Scale 16px down with transforms or smaller computed text.

**Except:** Preserve host fields above 16px with `!important` on a more specific selector. Checkbox, radio, range, colour, file and button types do not zoom. Do not remove pinch-zoom with `user-scalable=no` or `maximum-scale=1`. The host owns the viewport tag.

## Body contrast

<!-- rule: body-contrast -->

**Rule:** Aim for body text contrast close to 7:1, not merely 4.5:1.

**Why:** Stronger contrast supports comfortable reading at every size.

**Do:** Use body ink at every size, then vary size, weight or spacing for hierarchy.

**Don't:** Use pale body ink and rely on larger text for hierarchy.

## Status labels

<!-- rule: status-label -->

**Rule:** Name every status in words, not by its colour.

**Why:** Colour alone is not reliably distinguishable.

**Do:** Write “Paused” on the badge and let its tone fill carry the colour.

**Don't:** Show success as a green badge with no word.

**Except:** A status badge needs no glyph or dot: the word carries the status and the tone fill marks it as one. A callout or toast keeps its circled glyph, because its words sit in a sentence rather than in a fill.

## Measurable pairs

<!-- rule: measurable-pair -->

**Rule:** Prefer opaque grounds behind text so contrast can be measured.

**Why:** Gradients, filters and translucent layers make contrast uncertain.

**Do:** Place text on an opaque surface with a measurable ink pair.

**Don't:** Place text over a gradient, filter or translucent layer.

## Keyboard first

<!-- rule: keyboard-first -->

**Rule:** Implement keyboard behaviour before pointer behaviour and styling.

**Why:** Keyboard access defines the interaction before visual polish.

**Do:** Make focus, order and keyboard actions work before styling controls.

**Don't:** Style pointer interactions before implementing keyboard behaviour.
