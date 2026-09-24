# Hover readouts

Where a hover value appears, what it says, what a tap does, and why it never moves the page.

## Show a hover value over the page, never inside it.

<!-- rule: overlay -->

**Why:** A readout may last only a fraction of a second, so the page must not change shape as the pointer moves. The finance portal shows both patterns: its bar chart floats the readout without moving anything, but each KPI sparkline inserts one and pushes the page down. Put the value beside its mark—not below the chart or in the card headline. The headline explains the card and must not change for a passing pointer. This applies to charts, sparklines, heatmaps, and truncated cells.

**Do:** The readout floats over its mark. The card keeps its height, so content below stays in place.

**Don't:** Adding the value as a card line makes the card grow, moves the card below, and shifts the next target.

## Open the readout above the mark, and below it only when the space above is clipped.

<!-- rule: above-the-mark -->

**Why:** Above is the default: the pointer approaches from below, so the readout covers neither mark nor pointer. The kit positions it by measuring the viewport and every clipping ancestor, switching sides only when the preferred side is too tight and the other has more room, and moving it along the mark's edge rather than off-screen.

**Do:** If a tall bar is near a region's overflow edge and there is not enough room above, open the readout below its top edge with all content visible.

**Don't:** Keeping it above lets the edge cut off the month and value, leaving only a comparison that means nothing alone.

## Name the point, give its value, and stop after one comparison.

<!-- rule: contents -->

**Why:** A readout cannot receive the pointer and disappears when it leaves the mark, so nothing inside can be pressed. Put needed controls on the page. Format the value as elsewhere, using the same currency and precision, so it agrees with the figure beside the chart.

**Do:** Use three short lines—the point, its value, and one comparison—readable while the pointer rests on the bar.

**Don't:** Showing everything known about the point wraps text, covers nearby bars, and asks the reader to click a control that disappears when the pointer moves toward it.

## On a touch screen, open the readout with a tap and close it with the next tap.

<!-- rule: on-touch -->

**Why:** A finger arrives pressing and leaves when it lifts; hover would flash under the tap and never be read. One tap on a mark opens its readout, a tap on another moves it, and a tap on the same mark or anywhere else closes it. Closing on the mark and on chart ground beside it behave identically, regardless of touch location. The opening tap opens the readout but does not trigger the mark's click, so a drill-down chart does not drill down on that tap. The closing tap does trigger the mark, putting drill-down one tap later; this is the one behavior the reader must learn. The page also receives that tap wherever it listens, so an open dropdown or menu closes as after any other tap. The kit detects the active pointer, not the device: a laptop touch screen hovers with its mouse and taps with a finger; a pen taps like a finger rather than hovering with the mouse; a key returns the readout to focus.

## Never make hover the only way to reach a value.

<!-- rule: not-only-hover -->

**Why:** A pointer is one of three ways to reach a chart, but only hover builds the readout around it. The kit also opens it on focus or tap and lets Escape dismiss it. Focus works on touch screens: without a tap, it can mean a screen-reader user arrived rather than a finger approaching a click. The wiring adds no tab stop—a year of daily points would create 365. The card's leading figure, plus a table or labelled series summary, must provide key information without pointing. Whether marks should take focus remains open on #282.
