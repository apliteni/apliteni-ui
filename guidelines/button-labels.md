# Button labels

## Keep the words

<!-- rule: words-first -->

**Rule:** Give each button words, and add a glyph only to help those words.

**Do:** Export, Rename and Share, with their names visible at rest.

**Don't:** The same three buttons, with names that show only on a hover, and a finger never makes a hover.

## Let the glyph repeat the verb

<!-- rule: glyph-repeats-the-verb -->

**Rule:** Add a glyph only when it shows the action of its label, and give all the buttons in a row the same treatment.

**Except:** A dismiss action next to a commit action is not a peer of that action, and it stays plain.

**Do:** The arrow shows download, and the sheets show copy.

**Don't:** A table shows the thing that is exported, not the export action. The plain button next to it looks weaker.

## Earn a wordless button

<!-- rule: wordless-earns-it -->

**Rule:** Remove the words from a button only when its glyph is familiar everywhere, its action is on the closed list, and its name goes to assistive technology and to a hover title.

**Why:** When there is no legend, a reader needs the words to understand a glyph that they do not know.

**Except:** The closed list is close, copy, overflow, expand, collapse and export. The list also includes the download glyph, with the name and the title Download PDF. A new entry on the list needs a decision. Theme toggles, sidebar toggles and the links of the collapsed rail have a separate approval. The folded rail shows names next to its glyphs, so they have no title. On [#729](https://github.com/apliteni/apliteni-ui/issues/729), the owner chose a glyph-only React AppShell search trigger below 560px. The goal was one light row of icons. The sentence of the trigger stays its accessible name, because phones have no hover title. On [#742](https://github.com/apliteni/apliteni-ui/issues/742), the owner asked for an icon-only Chart and Table switch on a chart.

**Do:** Overflow is on the list, but the funnel is not.

**Don't:** A funnel can filter, sort or export. The cog lost the word that told which action it does.

## Put no action on a text selection

<!-- rule: no-action-on-selection -->

**Rule:** Give a text action its own button that opens a popover or a modal, and never make the action wait for a selection.

**Why:** A reader selects text to copy it. A phone or a screen reader seldom makes a selection.

**Do:** An Add note button below the clause opens the note form.

**Don't:** A toolbar that appears over the selected words.
