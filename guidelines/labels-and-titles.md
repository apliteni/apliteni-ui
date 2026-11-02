# Labels and titles

## Use body ink

<!-- rule: text-ink -->

**Rule:** Use body ink for all words at every size, with contrast near 7:1 and not only 4.5:1, and show hierarchy with size, weight and spacing.

**Why:** Muted text can look decorative at small sizes, even when the contrast passes. Strong contrast keeps text comfortable to read at every size. A closed list of exceptions prevents faded text from becoming a way to show hierarchy.

**Except:** Use muted or dim ink only for four classes. (1) Glyphs that are not words, such as arrows, chevrons and dismiss marks. (2) Colour that shows off, unset, disabled or archived. (3) A slot with no value, such as an empty field or cell. (4) The furniture of a drawing, such as a chart’s axis, period row and legend, when its values stay reachable in full. Unselected options, counts, timestamps, shortcuts, enabled actions and empty-state text are information. They are not exceptions.

**Do:** Use body ink at every size, and let size show hierarchy.

**Don't:** Use muted ink at different sizes to show rank.

## Use sentence case

<!-- rule: sentence-case -->

**Rule:** Write every label in sentence case, and never use capitals as a style.

**Why:** Capitals are slower to read and use more space. They also make labels louder than their figures.

**Except:** Keep words that always have capitals as they are written. These include acronyms, currency codes and key names, such as USD, API and Esc.

**Do:** Write “Total revenue” and show it without a `text-transform` override.

**Don't:** Show “TOTAL REVENUE” above the figure.

## Say the noun once

<!-- rule: no-repeated-noun -->

**Rule:** Do not put a noun in a label when the frame of the label already names that noun.

**Why:** Extra words hide the action that is available.

**Do:** The chips name the filters, and the button tells what it does.

**Don't:** The same noun shows twice.

## Rank card titles

<!-- rule: title-rank -->

**Rule:** Set a card title one rank below the page title and one rank above the body text.

**Why:** A card title at page size divides the page. A title at body size does not look like a title.

**Do:** Use `--text-2xl` for the page title and `--text-lg` for the card title.

**Don't:** Give the card title the same `--text-2xl` size as the page title.

## Name the kind above

<!-- rule: eyebrow-names-the-kind -->

**Rule:** Put an eyebrow above a title to show what kind of thing it is, but never use it in place of the title.

**Why:** An eyebrow alone cannot describe the content of the card.

**Do:** Use the eyebrow for the period and the title for what the card shows.

**Don't:** Use a label-sized eyebrow as the only title.
