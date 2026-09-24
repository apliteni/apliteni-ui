# Iconography

When controls may have no words, what glyphs mean, and what adding one costs.

## Remove a control’s label only for an action on the closed list.

<!-- rule: icon-only -->

**Why:** Judge every other glyph individually; a toolbar is not a legend.

**Except:** The list grows by decision, not review debate. Today: x (close or dismiss), copy (copy to clipboard), moreHorizontal (overflow menu), moreVertical (overflow menu), chevronDown (expand or collapse), and chevronUp (expand or collapse).

**Do:** An overflow menu has no words; settings keeps its label.

**Don't:** A cog with a perfect aria-label is still a cog.

## A circled glyph shows a state; a bare glyph performs an action.

<!-- rule: meaning -->

**Why:** If a shape has two meanings, readers must decide from context each time.

**Except:** Most of the set shows a thing, not a state or action — `globe`, `database`, and `layers`. This split controls which glyphs a component chooses for readers, not catalogue organisation.

**Do:** circleX reports the failure; the bare x closes the toast.

**Don't:** The same x used twice to mean different things.

## Declare each glyph once, in the group matching what it depicts.

<!-- rule: one-group -->

**Why:** A duplicate still resolves because the flat map uses the last one, so nothing fails loudly. The catalogue then lists one glyph under two headings, adding lines readers cannot distinguish from a real glyph. `card`, `chart`, and `doc` were listed that way until #199.

**Except:** Group a glyph by what it depicts, not by who uses it: `chart` is data even when a comms panel renders it.

## Use the Lucide path unchanged, and say so when names differ.

<!-- rule: provenance -->

**Why:** The set looks consistent because every path came from the same source. A traced glyph and a copied glyph look the same a year later, so only the commit preserves the difference.

**Except:** A brand mark has no Lucide original. `github` and `linkedin` are the vendor’s own marks and therefore belong in BRAND.

## Stroke a glyph carrying status at 1.5 CSS px or wider, or hold it to the text bar instead of the graphic bar.

<!-- rule: stroke-earns-the-bar -->

**Why:** WCAG 1.4.11 requires graphics to reach 3:1, the right bar for a graphic. Because stroke-width is stated in the glyph’s 24-unit box, visible width is `stroke-width × box ÷ 24`. The toast check used 2 at 13px, or 1.08 CSS px; it passed 3:1 by a tenth but looked like a smudge. Below 1.5 CSS px, the mark looks optically like a text stem, so it must reach 4.5:1 instead. This is covered by #206 and the specification’s icons-and-glyphs section.

**Except:** A glyph without status — such as a close button or chevron — is outside this measurement: there is no five-status pair to preserve, and the control is responsible for its own contrast.
