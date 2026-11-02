# Button labels

## Keep the words

<!-- rule: words-first -->

**Rule:** Give every button words. Add a glyph only to help them.

**Do:** Export, Rename and Share, named at rest.

**Don't:** The same three, named only on a hover that fingers cannot do.

## Let the glyph repeat the verb

<!-- rule: glyph-repeats-the-verb -->

**Rule:** Add a glyph only when it shows its label’s action. Treat the buttons of a row the same.

**Except:** A dismiss action beside a commit action is not a peer, so it stays plain.

**Do:** The arrow downloads, the sheets copy.

**Don't:** A table is what is exported, not the export. The plain neighbour looks weaker.

## Earn a wordless button

<!-- rule: wordless-earns-it -->

**Rule:** Remove a button’s words only when its glyph is known everywhere, its action is on the closed list, and assistive technology and a hover title get its name.

**Why:** Without a legend, a reader needs words for an unknown glyph.

**Except:** The closed list is close, copy, overflow, expand, collapse, export, and download titled Download PDF. A new entry needs a decision. Theme toggles, sidebar toggles and collapsed-rail links have separate approval. Folded-rail glyphs show names, so they have no title. In [#729](https://github.com/apliteni/apliteni-ui/issues/729), the owner chose a glyph-only React AppShell search trigger below 560px for one light icon row. Its sentence stays the accessible name, because phones have no hover title. In [#742](https://github.com/apliteni/apliteni-ui/issues/742), the owner asked for an icon-only Chart and Table switch.

**Do:** Overflow is on the list, the funnel is not.

**Don't:** A funnel could filter, sort or export. The cog lost the word that said which.

## Put no action on a text selection

<!-- rule: no-action-on-selection -->

**Rule:** Give a text action its own button, which opens a popover or a modal. Never wait for a selection.

**Why:** A reader selects text to copy it. Phones and screen readers seldom select.

**Do:** An Add note button under the clause opens the note form.

**Don't:** A toolbar that appears over the selected words.
