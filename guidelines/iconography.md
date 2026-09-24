# Iconography

When controls may have no words, what glyphs mean, and what adding one costs.

## Remove a control’s label only for an action on the closed list.

<!-- rule: icon-only -->

**Why:** Readers meet other glyphs without a legend, so they need labels.

**Except:** The list grows by decision, not review debate. Today: x (close or dismiss), copy (copy to clipboard), moreHorizontal (overflow menu), moreVertical (overflow menu), chevronDown (expand or collapse), and chevronUp (expand or collapse).

**Do:** An overflow menu has no words; settings keeps its label.

**Don't:** A cog with a perfect aria-label is still a cog.

## A circled glyph is a state; a bare glyph is an action.

<!-- rule: meaning -->

**Why:** If a shape has two meanings, readers must decide from context each time.

**Except:** Most of the set shows a thing, not a state or action — `globe`, `database`, and `layers`. This split controls which glyphs a component chooses for readers, not catalogue organisation.

**Do:** circleX reports the failure; the bare x closes the toast.

**Don't:** The same x used twice to mean different things.

## Declare each glyph once, in the group matching what it depicts.

<!-- rule: one-group -->

**Why:** The flat map silently keeps the last duplicate, while the catalogue lists one glyph under two headings. See [#199](https://github.com/apliteni/apliteni-ui/issues/199) for `card`, `chart` and `doc`.

**Except:** Group by what the glyph depicts: `chart` belongs to data even in a comms panel.

## Use the Lucide path unchanged, and say so when names differ.

<!-- rule: provenance -->

**Why:** The set looks consistent because every path came from the same source. A traced glyph and a copied glyph look the same a year later, so only the commit preserves the difference.

**Except:** A brand mark has no Lucide original. `github` and `linkedin` are the vendor’s own marks and therefore belong in BRAND.

## Stroke a glyph carrying status at 1.5 CSS px or wider, or hold it to the text bar instead of the graphic bar.

<!-- rule: stroke-earns-the-bar -->

**Why:** Visible width is `stroke-width × box ÷ 24`: below 1.5 CSS px, a stroke reads as a text stem and needs 4.5:1, above WCAG 1.4.11’s 3:1 graphic bar. The toast’s 2 at 13px yielded 1.08 CSS px and passed 3:1 by a tenth but looked smudged ([#206](https://github.com/apliteni/apliteni-ui/issues/206)).

**Except:** Non-status glyphs, such as close buttons and chevrons, have no five-status pair to measure; their control owns their contrast.
