# Iconography

## Icon-only controls

<!-- rule: icon-only -->

**Rule:** Remove a control’s label only for an action on the closed list.

**Why:** Without a legend, readers need labels for unfamiliar glyphs.

**Except:** The list grows by decision, not review debate. Today: `x` (close or dismiss), `copy` (copy to clipboard), `moreHorizontal` (overflow menu), `moreVertical` (overflow menu), `chevronDown` (expand or collapse), and `chevronUp` (expand or collapse).

**Do:** Show an overflow menu without words; keep the Settings label.

**Don't:** Use a cog without words, even with a perfect `aria-label`.

## State and action

<!-- rule: meaning -->

**Rule:** A circled glyph represents a state; a bare glyph represents an action.

**Why:** Two meanings force readers to decide from context each time.

**Except:** Most glyphs show a thing, not a state or action, including `globe`, `database`, and `layers`. This split guides component choices, not catalogue organisation.

**Do:** Use `circleX` to report failure and the bare `x` to close a toast.

**Don't:** Use the same `x` for two different meanings.

## Preserve glyph paths

<!-- rule: provenance -->

**Rule:** Use the Lucide path unchanged, and state when a glyph name differs.

**Why:** The shared source keeps the set consistent, while the commit records its origin.

**Except:** A brand mark without a Lucide original is allowed. `github` and `linkedin` are the vendor’s own marks and belong in BRAND.

**Do:** Keep the Lucide path unchanged and document a different name.

**Don't:** Redraw a Lucide path or rename the glyph without recording its original name.

## Status stroke width

<!-- rule: stroke-earns-the-bar -->

**Rule:** Stroke a status glyph at 1.5 CSS px or wider, or require 4.5:1 text contrast instead of 3:1 graphic contrast.

**Why:** Visible width is `stroke-width × box ÷ 24`; below 1.5 CSS px, the stroke reads as a text stem and needs 4.5:1, while above it uses WCAG 1.4.11’s 3:1 graphic bar.

**Except:** Non-status glyphs, such as close buttons and chevrons, have no five-status pair to measure; their control owns their contrast.

**Do:** Use a stroke at least 1.5 CSS px wide before using the 3:1 graphic contrast minimum.

**Don't:** Accept a thinner status stroke at only 3:1 contrast.
