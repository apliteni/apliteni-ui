# Iconography

## Icon-only controls

<!-- rule: icon-only -->

**Rule:** Remove a control’s label only for an action on the closed list.

**Why:** Without a legend, readers need labels for unfamiliar glyphs.

**Except:** New entries require a decision and pass Earn a wordless button on Button labels. Allowed: close, copy, overflow, expand, collapse and export. Theme and sidebar toggles and collapsed-rail links have separate approval. On [#729](https://github.com/apliteni/apliteni-ui/issues/729), the owner chose a glyph-only React AppShell search trigger below 560px for one light row of icons. Its sentence stays the accessible name: phones have no hover title. On [#742](https://github.com/apliteni/apliteni-ui/issues/742), the owner asked for a chart's icon-only Chart and Table switch.

**Do:** A wordless overflow menu and a labelled Settings.

**Don't:** A wordless cog, even with a perfect `aria-label`.

## State and action

<!-- rule: meaning -->

**Rule:** A circled glyph is a state; a bare glyph is an action.

**Why:** Two meanings make readers guess from context.

**Except:** Most glyphs, such as `globe`, `database` and `layers`, show a thing, not a state or action. The split guides component choice only.

**Do:** `circleX` reports the failure; the bare `x` closes the toast.

**Don't:** The same `x` carries both meanings.

## Preserve glyph paths

<!-- rule: provenance -->

**Rule:** Use the Lucide path unchanged, and record any rename.

**Why:** One source keeps the set consistent, and a recorded rename stays traceable.

**Except:** Vendor marks with no Lucide original, such as `github` and `linkedin`, are allowed in BRAND.

**Do:** `circleCheck`: Lucide’s circle-check-big, same path, rename recorded.

**Don't:** A redrawn path or an unrecorded rename.

## Status stroke width

<!-- rule: stroke-earns-the-bar -->

**Rule:** Stroke a status glyph at 1.5 CSS px or wider, or use 4.5:1 text contrast, not 3:1.

**Why:** Visible width is `stroke-width × box ÷ 24`. A thinner stroke reads as a text stem and needs 4.5:1. A wider one gets WCAG 1.4.11’s 3:1 graphic bar.

**Except:** Non-status glyphs, such as close buttons and chevrons, have no five-status pair. Their control owns their contrast.

**Do:** A 1.5 CSS px stroke, held to 3:1.

**Don't:** A thinner stroke, still only 3:1.
