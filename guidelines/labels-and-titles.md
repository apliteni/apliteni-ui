# Labels and titles

## Use body ink

<!-- rule: text-ink -->

**Rule:** Use body ink for all words; use size, weight and spacing for hierarchy.

**Why:** Muted text can look decorative, especially at small sizes, even when contrast passes.

**Do:** Use body ink at xs, sm and base; let size show hierarchy.

**Don't:** Use muted ink at different sizes to show rank.

## Limit muted ink

<!-- rule: text-ink-exceptions -->

**Rule:** Use muted or dim ink only for the three named exception classes.

**Why:** A closed list prevents fading from becoming a hierarchy cue.

**Do:** Use muted ink for a disabled control or empty field placeholder.

**Don't:** Fade timestamps, counts or enabled actions.

**Except:** Only: (1) non-word glyphs, such as arrows, chevrons or dismiss marks; (2) colour reporting off, unset, disabled or archived state; (3) a valueless slot, such as an empty field or cell placeholder. Unselected options, “No earlier figure” sentences, counts, timestamps, keyboard shortcuts, enabled actions and empty-state instructions are information, not exceptions.

## Use sentence case

<!-- rule: sentence-case -->

**Rule:** Write every label in sentence case; never use capitals as style.

**Why:** Capitals are slower to read, take more space and make labels louder than their figures.

**Except:** Keep inherently capitalised words as written, including acronyms, currency codes and key names such as USD, API and Esc.

**Do:** Written and shown in sentence case.

**Don't:** Use all capitals, which pulls attention from the figures.

## Rank card titles

<!-- rule: title-rank -->

**Rule:** Set a card title one rank below the page title and one above the body.

**Why:** A page-sized card title divides the page, while body-sized text does not read as a title.

**Do:** Use --text-2xl for the page title and --text-lg for the card title.

**Don't:** Use a second h1 for the card; it creates two page titles.

## Use heading levels

<!-- rule: title-is-heading -->

**Rule:** Make a card title a heading one level below the page title, and let the class control its appearance.

**Why:** A div title is missing from the page outline.

**Do:** Use the next heading level for each card.

**Don't:** Put the card title in a div and make it look like a heading.

**Except:** A card inside a section with its own h2 uses level 3.

## Name the kind above

<!-- rule: eyebrow-names-the-kind -->

**Rule:** Place an eyebrow above a title to identify what kind of thing it is, never as a replacement for the title.

**Why:** An eyebrow alone cannot describe the card’s content.

**Do:** Use the eyebrow for the period and the title for what is shown.

**Don't:** Use a label-sized eyebrow as the only title.
