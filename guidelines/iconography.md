# Iconography

## State and action

<!-- rule: meaning -->

**Rule:** A circled glyph shows a state, and a bare glyph shows an action.

**Why:** If one glyph has two meanings, the reader must guess the meaning from the context.

**Except:** Most glyphs, such as `globe`, `database` and `layers`, show a thing, not a state or an action. Use this split only to choose a component.

**Do:** `circleX` reports the failure, and the bare `x` closes the toast.

**Don't:** The same `x` has both meanings.

## Status stroke width

<!-- rule: stroke-earns-the-bar -->

**Rule:** Give a status glyph a stroke of 1.5 CSS px or wider, or use 4.5:1 text contrast, not 3:1.

**Why:** The visible width is `stroke-width × box ÷ 24`. A thinner stroke looks like a text stem, so it needs 4.5:1 contrast. A wider stroke can use the 3:1 minimum for graphics in WCAG 1.4.11.

**Except:** Glyphs that do not show a status, such as close buttons and chevrons, have no five-status pair. Their control sets their contrast.

**Do:** A 1.5 CSS px stroke, kept at 3:1 contrast.

