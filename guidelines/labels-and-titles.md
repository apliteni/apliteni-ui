# Labels and titles

Use body ink for words. Use size, weight and spacing for hierarchy, except as listed.

## Use body ink for words at every size. Use size, weight and spacing for hierarchy.

<!-- rule: text-ink -->

**Why:** Descriptions, timestamps and labels need readable ink even when secondary. Muted text can pass contrast yet look decorative, especially at small sizes.

**Do:** The same sentence at xs, sm and base in body ink; size shows hierarchy.

**Don't:** The same sizes in muted ink; passing contrast does not make fading a hierarchy cue.

## Use muted or dim ink only for the three named exception classes.

<!-- rule: text-ink-exceptions -->

**Why:** A closed list distinguishes intended state or placeholder ink from words faded only to show rank. To add an exception, open an issue; never treat “decorative” as a fourth class.

**Except:** Only: (1) non-word glyphs, such as an arrow, chevron or dismiss mark; (2) colour reporting off, unset, disabled or archived state; (3) a valueless slot, such as an empty field or cell placeholder. An unselected option, “No earlier figure” sentence, count, timestamp, keyboard shortcut, enabled action or empty-state instruction is information, not an exception.

## Write every label in sentence case. Never use capitals as style.

<!-- rule: sentence-case -->

**Why:** Capital letters are slower to read (Carbon, USWDS), use more space per letter and make a label louder than its figure.

**Except:** Type inherently capitalised words as they are: acronyms, currency codes and key names such as USD, API and Esc.

**Do:** Written and shown in sentence case.

**Don't:** The same labels in capitals: the figures lose attention to their captions.

## Set a card title one rank below the page title and one above the body.

<!-- rule: title-rank -->

**Why:** A card title as large as the page title divides the page in two. Body-sized text no longer reads as a title.

**Do:** The page title at --text-2xl and card title at --text-lg.

**Don't:** The card uses a second h1: there are two page titles, and the main one is unclear.

## Make a card title a heading one level below the page title; let the class control its appearance.

<!-- rule: title-is-heading -->

**Why:** A title in a div is absent from the page outline, so readers moving through headings skip every card.

**Except:** A card inside a section with its own h2 uses level 3.

## Place an eyebrow above a title to say what kind of thing it is. Never use it instead of the title.

<!-- rule: eyebrow-names-the-kind -->

**Why:** An eyebrow alone is a caption with nothing below it to describe, and readers cannot find the card’s title.

**Do:** The eyebrow says which period; the title says what is shown.

**Don't:** The eyebrow is the only title: it is set at label size, with no heading behind it.
