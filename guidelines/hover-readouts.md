# Hover readouts

## Keep readouts over the page

<!-- rule: overlay -->

**Rule:** Show the hover value beside its mark, and never put it inside the page layout.

**Why:** A readout that changes must not move the page.

**Do:** Float the value beside a chart point, a sparkline, a heatmap cell or a truncated cell.

**Don't:** Add a value line that makes the card taller and pushes the content down.

## Prefer above the mark

<!-- rule: above-the-mark -->

**Rule:** Open the readout above the mark, or below it only if the space above is clipped and the space below has more room.

**Why:** Then the mark and the pointer path stay clear, and the readout stays on the screen.

**Do:** Open a readout below a tall bar near the top of a clipping region.

**Don't:** Do not force the readout above the mark until the month and the value are clipped.

## Give one useful comparison

<!-- rule: contents -->

**Rule:** Name the point, show its value, and include a maximum of one comparison.

**Why:** A short readout is easy to read and does not cover the marks near it.

**Do:** Use three short lines: the point, the value and one comparison.

**Don't:** Do not wrap long text or put controls in the readout.

**Except:** Use the same currency and precision as the page.

## Tap to open or close

<!-- rule: on-touch -->

**Rule:** On a touch screen, tap a mark to open the readout, and tap again to move or close it.

**Why:** Under a finger, a hover readout is not readable.

**Do:** Tap a different mark to move the readout. Tap the same mark or any other area to close it.

**Don't:** Do not require a hover gesture on a touch screen.

**Except:** The tap that opens the readout blocks the click on the mark, but the page listeners still receive the tap. The tap that closes the readout can also drill down.

## Provide another access method

<!-- rule: not-only-hover -->

**Rule:** Never make hover the only way to get to a value.

**Why:** A pointer, focus and a tap must all give access to the value, and Escape must close the readout.

**Do:** Let focus or a tap open the readout, and also give the leading figure and a table or a labelled series summary.

**Don't:** Do not make the user point at one of 365 daily points to find its value.

**Except:** On a touch screen, focus without a tap must support the arrival of a screen reader. Pointer detection must support mouse hover on a laptop, a tap with a finger or a pen, and the restoration of keyboard focus. It is not decided if chart marks are tab stops. The kit adds no tab stops.
