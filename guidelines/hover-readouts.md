# Hover readouts

## Keep readouts off the layout

<!-- rule: overlay -->

**Rule:** Show the hover value in its figure or beside its mark, never in a new line.

**Why:** A changing readout must not move the page.

**Do:** Show a sparkline point in its figure. Float other values beside the mark.

**Don't:** Add a value line that pushes content down.

## Prefer above the mark

<!-- rule: above-the-mark -->

**Rule:** Open the readout above the mark. Open it below only when the space above is clipped and below has more room.

**Why:** The mark and pointer path stay clear, and the readout stays on screen.

**Do:** Open a readout below a tall bar near the top of a clipping region.

## Give one useful comparison

<!-- rule: contents -->

**Rule:** Name the point, show its value, and add one comparison at most.

**Why:** A short readout stays readable and does not cover nearby marks.

**Do:** Use three short lines: point, value, one comparison.

**Except:** Match the page's currency and precision.

## Tap to open or close

<!-- rule: on-touch -->

**Rule:** On a touch screen, tap a mark to open the readout. Tap again to move or close it.

**Why:** Hover is not readable under a finger.

**Do:** Tap another mark to move the readout. Tap the same mark or elsewhere to close it.

**Except:** The opening tap blocks the mark's click but still reaches page listeners. The closing tap can also drill down.

## Provide another access method

<!-- rule: not-only-hover -->

**Rule:** Never make hover the only way to reach a value.

**Why:** Pointer, focus and tap must all give access, and Escape must close the readout.

**Do:** Let focus or tap open the readout. Also give the leading figure and a table or labelled series summary.

**Don't:** Require pointing at a sparkline point to find its value.

**Except:** On touch screens, focus without a tap must support screen-reader arrival. Pointer detection must support laptop mouse hover, finger or pen tap, and keyboard focus restoration. Whether chart marks are tab stops is undecided. The kit adds none.
