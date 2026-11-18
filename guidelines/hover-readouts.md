# Hover readouts

## Keep readouts over the page

<!-- rule: overlay -->

**Rule:** Show hover values beside their marks, never inside page layout.

**Why:** A changing readout must not move the page.

**Do:** Float the value beside a chart point, sparkline, heatmap cell, or truncated cell.

**Don't:** Add a value line that grows the card and pushes content down.

## Prefer above the mark

<!-- rule: above-the-mark -->

**Rule:** Open the readout above the mark; place it below only when space above is clipped and below has more room.

**Why:** It keeps the mark and pointer approach clear and the readout on-screen.

**Do:** Open a readout below a tall bar near the top of a clipping region.

**Don't:** Force it above until the month and value are clipped.

## Give one useful comparison

<!-- rule: contents -->

**Rule:** Name the point, show its value, and give at most one comparison.

**Why:** Short readouts stay readable and clear of nearby marks.

**Do:** Use three short lines: point, value, one comparison.

**Don't:** Wrap long text or place controls in the readout.

**Except:** Match the page’s currency and precision. A readout that shows the full text of a cut cell wraps.

## Tap to open or close

<!-- rule: on-touch -->

**Rule:** On touch screens, tap a mark to open the readout and tap again to move or close it.

**Why:** Hover is not readable under a finger.

**Do:** Tap another mark to move the readout. Tap the same mark or anywhere else to close it.

**Don't:** Require a hover gesture on a touch screen.

**Except:** The opening tap blocks the mark’s click but reaches page listeners. The closing tap may also drill down.

## Provide another access method

<!-- rule: not-only-hover -->

**Rule:** Never make hover the only way to reach a value.

**Why:** Pointer, focus, and tap must all support access, and Escape must dismiss the readout.

**Do:** Let focus or tap open the readout. Give the leading figure and a table or labelled series summary.

**Don't:** Require pointing at one of 365 daily points for its value.

**Except:** Touch-screen focus without a tap must support screen-reader arrival; pointer detection must support laptop mouse hover, finger or pen tap, and keyboard focus restoration. Tab stops on chart marks remain undecided; the kit adds none.
