# Layout and density

A page has two widths. Without a density mode, spacing scale sets density.

## Take page width from --container. Do not write the number.

<!-- rule: container -->

**Why:** A literal width cannot follow a shared decision: the kit’s 1180px in three files and the site’s 1120px in three others disagreed, forcing a topbar override.

**Except:** The token definitions declare the scale, so they are not scanned.

**Do:** One token, read by both kit and site.

**Don't:** Four page-scale numbers; no two files agree. Drawn to scale, not size.

## A reading column takes --measure, never --container.

<!-- rule: measure -->

**Why:** --container spans the page gutter to gutter; --measure bounds a reading column beside a sidebar. They serve different axes: a --container main column leaves no sidebar, and treating the two as rivals made nine widths look like one disagreement.

## Keep each width in one place; a test holding copies together signals duplication.

<!-- rule: one-source -->

**Why:** Duplicating 860px in the shell needed a string-comparison test. With no caller width, the shell now leaves CSS to read the token.

**Except:** An explicit maxWidth remains a caller’s override, not a copy.

## Set density with the spacing scale. There is no kit-wide density mode.

<!-- rule: density -->

**Why:** Use the ten-step spacing scale: --space-2 for tight rows, --space-5 for roomy ones. A compact/comfortable mode, data-density attribute or row-height scale would need a surface switching densities at runtime for a reader’s preference; none exists here.

**Except:** .ui-table--dense is component-local because a many-column ledger needs tighter rows: --space-3 across and --space-2 down, inside the base --space-4. It still uses the scale; an old value halfway between steps rounded down to fit more rows.

**Do:** Every gap and pad is a step: --space-3 rows inside a card.

**Don't:** 13px, 9px, 14px, 6px, 17px — each row settled separately, none aligned.

## Below the reading column, use --panel-* in px for a component box, and --prose-* in ch for a line of text.

<!-- rule: below-the-page -->

**Why:** The content chooses the unit: panel sm/md/lg use the drawer’s 320/420/560 widths, also repeated by confirm, the auth card and toast (the reported two 420s were three). Prose steps name text types—caption, lede, body, dense—rather than t-shirt sizes.

**Except:** ch uses its element’s font-size: put it on the paragraph, not a wrapper with two type sizes. The centred .ui-section-head combines a 40px heading and 17px copy, so uses --panel-lg; .ui-footer__brand keeps 300px because its flex track controls footer wrapping.

## Keep breakpoints literal and use one of the specification’s three steps; the gate rejects others.

<!-- rule: breakpoints -->

**Why:** Media queries cannot read custom properties, so @media (max-width: var(--panel-lg)) is invalid; @custom-media is not shipping, and adding a compiler would sacrifice readable published CSS. The gate reads the specification’s three steps directly, replacing six values in ten files; three surfaces moved to the next step up to give reflow more room.

**Except:** 560 also equals --panel-lg and 860 equals --measure, but viewport breakpoints and box widths vary independently. Do not imply a link at the query.
