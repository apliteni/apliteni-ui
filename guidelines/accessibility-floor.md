# Accessibility minimums

## Tap target on a phone

<!-- rule: tap-zone -->

**Rule:** Below the phone step, make a 44x44 tap target with a transparent layer outside the control, not a larger control.

**Why:** A finger covers more area than a cursor. Also, a control that grows on a phone moves a page that the reader already knows.

**Do:** Centre a transparent layer on the control, and stop the layer at half the gap to the nearest neighbour.

**Don't:** Make the drawn control 44 and push out every row that holds one.

**Except:** Only a coarse pointer gets the layer, because otherwise a cursor highlights a control that it is not over. Rows that share an edge, such as a menu, a dense table or a settings list, have no space to grow into, so they stay as they are drawn. A field gets no layer, so a field reaches the 44x44 floor only by its own height, or it does not reach the floor.

## Space between small targets

<!-- rule: tap-spacing -->

**Rule:** Below the phone step, set the gap between small controls to 44 minus their drawn size, so both tap zones fit.

**Why:** A tap zone reaches half the gap before it crosses the edge of its neighbour. So the gap decides if either control can reach the floor.

**Do:** On a phone, open a row of 24px marks to a 20px gap, where both zones fit and no mark changes size.

**Don't:** Keep the 8px desktop gap and let the control that comes later in the markup win the overlap.

**Except:** A row that is already full opens only downward. If the row becomes wider across, the controls become narrower, and that is the one thing that the floor must not do. Rows that share an edge, such as a menu, a dense table or a settings list, have no gap to open, so they keep their drawn targets. A row that opens no gap grows no zone.

## Focus ring contrast

<!-- rule: ring-contrast -->

**Rule:** Keep a focus indicator at a contrast of 3:1 or more against every ground that it reaches.

**Do:** One solid accent band, drawn 1px away from the control that it marks.

**Don't:** A glow alone, with no solid band inside it to measure.

**Except:** The band must meet the 3:1 minimum against the surface that shows through its offset, not only against flat ground.

## Measurable pairs

<!-- rule: measurable-pair -->

**Rule:** Put text on opaque grounds so that its contrast can be measured.

**Why:** A gradient, a filter or a translucent layer puts the text colour on more than one ground, so no single colour pair can be measured from it.

**Do:** One opaque ground under the full sentence.

**Don't:** The same sentence across a gradient, where each word is on a different pair.
