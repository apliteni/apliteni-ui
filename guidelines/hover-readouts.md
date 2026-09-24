# Hover readouts

Where a hover value appears, what it says, what a tap does, and why it never moves the page.

## Show a hover value over the page, never inside it.

<!-- rule: overlay -->

**Why:** A readout lasts only while the pointer rests on a mark, so inserting it makes the page jump at pointer speed. For charts, sparklines, heatmaps and truncated cells, keep the value beside its mark—not below the chart or in its headline, which describes the card.

**Do:** The readout floats beside its point; the card and content below keep their positions.

**Don't:** An extra value line grows the card, pushes the next card down and moves the next target.

## Open the readout above the mark, and below it only when the space above is clipped.

<!-- rule: above-the-mark -->

**Why:** Above keeps the readout clear of the mark and a pointer approaching from below. The kit measures the viewport and clipping ancestors, flips only when above is too tight and below roomier, and slides along the mark’s edge to stay on-screen.

**Do:** Near a clipping region’s top, a tall bar has too little room above: the whole readout opens below its top edge.

**Don't:** Forced above, the readout loses its month and value to clipping; only the meaningless comparison remains.

## Name the point, give its value, and stop after one comparison.

<!-- rule: contents -->

**Why:** A readout takes no pointer and closes when it leaves the mark, so put controls on the page. Match the page’s currency and precision so the readout agrees with the figure beside the chart.

**Do:** Three short lines: point, value, one comparison.

**Don't:** Too much text wraps and covers nearby bars; a control disappears as the pointer approaches it.

## On a touch screen, open the readout with a tap and close it with the next tap.

<!-- rule: on-touch -->

**Why:** Hover flashes unread under a finger: tap a mark to open, another to move, or the same mark or elsewhere to close; closing on the mark and on chart ground works alike. The opening tap blocks the mark’s click but reaches page listeners to close menus; the closing tap allows drill-down one tap later, while pointer detection lets a laptop’s mouse hover, finger or pen tap, and a key restore focus behaviour.

## Never make hover the only way to reach a value.

<!-- rule: not-only-hover -->

**Why:** A pointer is one of three ways to reach a chart and the one the readout is built around; focus or tap also opens it, Escape dismisses it, and touch-screen focus without a tap supports screen-reader arrival. Wiring adds no tab stops (daily points would add 365): the leading figure and a table or labelled series summary carry what matters without pointing, while mark focus remains open on [#282](https://github.com/apliteni/apliteni-ui/issues/282).
