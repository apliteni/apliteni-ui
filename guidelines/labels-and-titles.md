# Labels and titles

## Use body ink

<!-- rule: text-ink -->

**Rule:** Use body ink for all words, near 7:1 contrast, not only 4.5:1. Show hierarchy with size, weight and spacing.

**Why:** Small muted text looks decorative even when contrast passes. A closed exception list stops fading from becoming hierarchy.

**Except:** Muted or dim ink is only for (1) non-word glyphs such as arrows, chevrons and dismiss marks, (2) colour for off, unset, disabled or archived, (3) an empty field or cell, and (4) chart axes, period rows and legends whose values stay fully reachable. Unselected options, counts, timestamps, shortcuts, enabled actions and empty-state text are information.

**Do:** Use body ink at every size.

**Don't:** Rank text with smaller, muted ink.

## Use sentence case

<!-- rule: sentence-case -->

**Rule:** Write every label in sentence case. Never use capitals as style.

**Why:** Capitals read slower, use more space and make labels louder than figures.

**Except:** Keep acronyms, currency codes and key names as written, such as USD, API and Esc.

**Do:** Write “Total revenue” with no `text-transform` override.

**Don't:** Show “TOTAL REVENUE” above the figure.

## Say the noun once

<!-- rule: no-repeated-noun -->

**Rule:** Leave a noun out of a label when its frame already names it.

**Why:** Extra words hide the available action.

**Do:** Chips name the filters. The button says what it does.

**Don't:** The same noun shows twice.

## Rank card titles

<!-- rule: title-rank -->

**Rule:** Set a card title one rank below the page title and one above the body.

**Why:** A page-sized card title divides the page. A body-sized one does not look like a title.

**Do:** Use `--text-2xl` for the page title and `--text-lg` for the card title.

**Don't:** Give the card title the page title's `--text-2xl`.

## Name the kind above

<!-- rule: eyebrow-names-the-kind -->

**Rule:** Put an eyebrow above a title to name its kind, never in place of it.

**Why:** An eyebrow alone cannot describe the card.

**Do:** Name the period in the eyebrow and the content in the title.

**Don't:** Use a label-sized eyebrow as the only title.
