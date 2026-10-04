# Accessibility minimums

## Minimum target size

<!-- rule: target-size -->

**Rule:** Give every pointer target at least 24x24 CSS px.

**Do:** The dashed square is the hit area the box declares, not a drawing of one.

**Don't:** The target stops where the 19x19 box stops.

**Except:** WCAG 2.5.8 permits spacing, equivalent controls, inline text, user-agent sizes and essential presentation. An overlay must not reach its neighbours.

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

**Do:** The solid band, with a surface-coloured gap around an accent-filled control.

**Don't:** The halo on its own, with no solid band inside it to measure.

**Except:** The band must clear the bar against the gap and halo pixels too, not only against flat ground.

## Disabled control legibility

<!-- rule: disabled-legibility -->

**Rule:** Give a disabled control its own ink, surface and edge, and take the accent off it.

**Do:** Unavailable reads as unavailable with the pointer nowhere near it.

**Don't:** Unavailable keeps the live paint, so only the cursor reports the state.

**Except:** A disabled label must stay legible, so the pair changes rather than fades. Only the label-free switch track may fade, and a control that draws no box when it is on — a ghost button — draws none when it is off, so its ink carries the state alone.

## Touch field text

<!-- rule: touch-field-size -->

**Rule:** Set coarse-pointer field text to 16px without scaling it down.

**Why:** iOS Safari zooms into a field under 16px and does not zoom out. There is no specimen pair because the size answers to the pointer rather than the width, so both halves would draw the desktop size.

**Do:** Real 16px text in the field itself.

**Don't:** 16px scaled down, or a smaller computed size.

**Except:** A host field above 16px keeps its size. Checkbox, radio, range, colour, file and button types do not zoom. Never take pinch-zoom away; the host owns the viewport tag.

## Body contrast

<!-- rule: body-contrast -->

**Rule:** Keep body text close to 7:1 at every size, not merely at 4.5:1.

**Why:** Stronger contrast supports comfortable reading at every size. There is no specimen pair because a pale example would break this rule in front of the reader.

**Do:** Body ink at every size, with size, weight and spacing carrying the hierarchy.

**Don't:** Pale ink propped up by larger text.

## Status labels

<!-- rule: status-label -->

**Rule:** Name every status in words, not by its colour.

**Why:** Colour alone is not reliably distinguishable.

**Do:** The word carries the status; the tone fill agrees with it.

**Don't:** A tone fill with the word taken out of it.

**Except:** A status badge needs no glyph or dot. A callout or toast keeps its glyph, because its words sit in a sentence rather than in a fill.

## Measurable pairs

<!-- rule: measurable-pair -->

**Rule:** Keep text on opaque grounds so its contrast can be measured.

**Why:** A gradient, filter or translucent layer puts the ink on more than one ground, so no single pair can be read off it.

**Do:** One opaque ground under the whole sentence.

**Don't:** The same sentence crossing a gradient, where each word sits on a different pair.

## Keyboard first

<!-- rule: keyboard-first -->

**Rule:** Build keyboard behaviour before pointer behaviour and styling.

**Why:** Keyboard access defines the interaction before visual polish. There is no specimen pair because this is an order of work: both halves look the same once they are finished.

**Do:** Focus, order and keyboard actions working before anything is styled.

**Don't:** Pointer styling first and keyboard behaviour afterwards.
