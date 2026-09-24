# Drawers

When to open a panel over a list and how few lines it needs to separate its parts.

## Open a drawer to view or change one record without leaving its list.

<!-- rule: one-record -->

**Why:** The list stays behind the scrim, so closing the drawer returns the reader to the opened row. A question with two answers is a confirm. Work needing its own address, more than one screen, or several steps is a page. Polaris deprecated its sheet, and Atlassian's drawer page says "Please use Modal instead". A kit that keeps a drawer must define its purpose: viewing or changing one record in place.

**Except:** A short form is fine in a drawer, as Component choice says: filters, a new key, or a reclassification. A form requiring steps or more than one screen is a page.

## Group drawer content under headings. Never put a card inside it.

<!-- rule: no-cards -->

**Why:** The panel already has an edge and a surface one step above the page, providing everything a card adds. None of the design systems read for #272 nests cards in a drawer. The Finance portal's transaction drawer shows the result of a page pattern: three bordered cards stacked inside a bordered panel.

**Do:** Three groups, each with a heading above its rows and one line between groups. The panel is the container; a heading provides all needed structure.

**Don't:** The same groups, each inside a card: a box inside the panel's box, with every card edge adding another line to read past.

## Draw three lines: under the header, over the footer, and between each group and the next. Draw no others.

<!-- rule: three-lines -->

**Why:** A drawer normally contains a long, scrolling record. Header and footer lines show where scrolling starts and stops. Without them, the first row slides under the title with nothing to meet. In the body, the line only separates one group from the group above. A rule under every row is a common fault. Ant and Primer keep header and footer rules; Primer adds its body rule once the body scrolls. Material draws a divider between unrelated sections and none within one. Decided in #272.

## Set each value beside its label, and separate rows with space.

<!-- rule: rows -->

**Why:** The UK government design system keeps a rule under every summary-list row and warns against removing them: when people zoom in, they can lose the label on one side from the value on the other. That list spans a page. A drawer is at most 560px wide; placing each value beside its label keeps the pair together at any zoom, so the rule has no remaining purpose.

**Except:** Figures a reader compares down the panel, such as a list of amounts, are a table. Use table() and right-align them there.

**Do:** Each value sits beside its label. The eye moves a short way along one line, so nothing must guide it.

**Don't:** Values pushed to the far edge, with a rule under every row guiding the eye back across. The rules compensate for the alignment.
