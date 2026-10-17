# Iconography

## Icon-only controls

<!-- rule: icon-only -->

**Rule:** Remove a control’s label only for an action on the closed list.

**Why:** Without a legend, readers need labels for unfamiliar glyphs.

**Except:** New entries require a decision and the three tests in Earn a wordless button. Allowed: close, copy, overflow, expand, collapse and export. Theme toggles, sidebar toggles and collapsed-rail links have separate approval.

**Do:** Show an overflow menu without words; keep the Settings label.

**Don't:** Use a cog without words, even with a perfect `aria-label`.

## State and action

<!-- rule: meaning -->

**Rule:** A circled glyph is a state; a bare glyph is an action.

**Why:** Two meanings force readers to decide from context each time.

**Except:** Most glyphs show a thing, not a state or action, including `globe`, `database` and `layers`. The split guides component choice, not the catalogue.

**Do:** `circleX` reports the failure; the bare `x` closes the toast.

**Don't:** The same `x` carries both meanings.

## Preserve glyph paths

<!-- rule: provenance -->

**Rule:** Use the Lucide path unchanged, and state when a glyph name differs.

**Why:** One source keeps the set consistent, and a recorded rename still traces back to it.

**Except:** A brand mark with no Lucide original is allowed: `github` and `linkedin` are the vendor’s own marks and belong in BRAND.

**Do:** `circleCheck` is Lucide’s circle-check-big, path unchanged and name recorded.

**Don't:** A redrawn path, or a rename nobody recorded.

## Status stroke width

<!-- rule: stroke-earns-the-bar -->

**Rule:** Stroke a status glyph at 1.5 CSS px or wider, or require 4.5:1 text contrast instead of 3:1 graphic contrast.

**Why:** Visible width is `stroke-width × box ÷ 24`; below 1.5 CSS px a stroke reads as a text stem and needs 4.5:1; above it, WCAG 1.4.11’s 3:1 graphic bar applies.

**Except:** Non-status glyphs, such as close buttons and chevrons, have no five-status pair to measure; their control owns their contrast.

**Do:** A 1.5 CSS px stroke, held to 3:1.

**Don't:** A thinner stroke, still only 3:1.
