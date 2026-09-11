# A hover readout overlays the page and never reflows it: a tooltip, and the guideline

Closes #282.

## What this is about

In the finance portal, hovering a KPI sparkline writes its readout into the card as a line of
its own. The card grows by that line, and everything below it moves, every time the pointer lands
on a point. The bar chart on the same screen overlays its readout and nothing moves. The report
asks for the second behaviour to become the rule: "use onhover value in tooltip, do not move the
all screen". The kit had no tooltip to point either surface at.

## What changed

**A component.** `tooltip()` in `src/components/tooltip.js`, with its own stylesheet
`src/styles/tooltip.css`, in the kit's usual shape: an HTML-string factory, a `wireTooltip(root)`
that binds the behaviour, and `showTooltip` / `hideTooltip` for a chart that does its own
hit-testing.

- The readout is one element, rendered once inside its host and absolutely placed there in every
  state. Opening it changes `opacity` and `visibility` and nothing else. The wiring fills and
  places that element and never inserts one on hover.
- It opens above its mark, flips below only when the room above is too small and the room below
  is larger, and slides inward at an edge. Room is measured inside the viewport and inside every
  ancestor whose overflow clips.
- It takes no pointer events, so it cannot steal the hover and flicker.
- Its content is text only: a label, a value and one detail, written with `textContent`.
- Focus on a mark shows it and describes the mark with `aria-describedby` while it shows. Escape
  dismisses it.
- It is themed entirely by tokens: a lighter raised surface in dark, white over a hairline in
  light, and no accent of its own, so every accent re-themes the chart around it.

A mark is any element carrying `data-tip-value`, with `data-tip-label` and `data-tip-detail`
beside it. A `[data-tip-anchor]` inside a mark moves the anchor from the mark's box to that
element, which is how a sparkline's full-height slice opens on its dot.

**A guideline.** Guidelines / Hover readouts, four rules in the collection's usual shape — a
live do/don't pair, a why, and the line of kit code that keeps the rule:

1. Show a hover value over the page, never in it. The pair is the finance portal's own KPI card,
   readout overlaid against readout inserted, with the next card under each.
2. Open the readout above the mark, and below it only where above is clipped.
3. Name the point, give its value, and stop at one comparison.
4. Never make hover the only way to a value. This one carries the open question below.

**The contract.** A new section, [The hover readout](docs/specification.md#the-hover-readout), and
a catalogue row in `docs/library.md`.

**Storybook.** Components / Tooltip: Chart, a live page of three KPI sparklines over a bar chart
with a card underneath that must not move, plus Playground and Placement rendered with the
readout open so the a11y and contrast gates can read it.

## The layout proof

Measured in Chromium on the built Storybook, Components / Tooltip / Chart, before the pointer
arrives and with it resting on a sparkline point and then on the first bar:

| | 1440 dark | 1440 light | 390 dark | 390 light |
|---|---|---|---|---|
| page height, all three states | 900 | 900 | 1174 | 1182 |
| KPI card height, all three states | 236.70 | 238.23 | 225.03 | 226.56 |
| bar-chart card height, all three states | 419.11 | 420.56 | 214.41 | 215.86 |
| "Below the charts" top, off → on a point | 735.81 → 735.81 | 738.80 → 738.80 | 1009.50 → 1009.50 | 1015.55 → 1015.55 |

At 390 the first bar is scrolled into view before it is hovered, so that card's viewport top
changes with the scroll; the page height beside it does not.

## Held by

`src/components/tooltip.test.js`, 24 tests:

- The stylesheet is read as text: the readout is out of flow in every state, the open state
  changes only `opacity` and `visibility`, it takes no pointer, and both placements read one gap.
- The page is watched with a `MutationObserver` while marks are hovered and left.
- Placement is fed measured rects: above, flipped at the viewport, flipped by a clipping
  ancestor, not flipped when below is no roomier, an author's below, the edge slide, and the anchor.

Each of these four mutations was put on disk, confirmed in the diff, and turned the suite red
before being reverted:

- `position: relative` on the base readout
- a margin in the open state
- a node inserted on hover
- a flip test that ignores the clip box

## Open question for Artur

The wiring adds no tab stop to a mark, and treats touch like any other pointer, so on a touch
screen a tap shows the readout only while the finger is down. Should a chart's marks take focus —
a year of daily points would be 365 tab stops — and should a tap pin the readout, or a finger
scrub along the line? Until that is settled, rule 4 asks pages not to make hover the only way to
a value.

## Not in this pull request

- No version bump and no changelog entry, matching the other open branches; the release that
  carries this writes them.
- No change to the finance portal. This gives it a component to move its sparklines onto.
- No chart component. The charts in the stories are specimens in `stories/_chart.js`; the kit
  ships the readout, and a consumer brings the chart.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01RTbM6UF7B7dLUPbtyvrHfc
