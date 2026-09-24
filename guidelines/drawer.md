# Drawers

When to open a panel over a list and how few lines it needs to separate its parts.

## Open a drawer to view or change one record without leaving its list.

<!-- rule: one-record -->

**Why:** The list stays behind the scrim, so closing returns to the opened row; two-answer questions use confirm, while work needing an address, multiple screens or steps uses a page. Polaris deprecated its sheet and Atlassian says “Please use Modal instead”; this kit keeps drawers for one record in place ([#272](https://github.com/apliteni/apliteni-ui/issues/272)).

**Except:** Short forms fit: filters, a new key or reclassification (see Component choice). Forms needing steps or more than one screen use a page.

## Group drawer content under headings. Never put a card inside it.

<!-- rule: no-cards -->

**Why:** The panel already supplies the edge and raised surface a card would add. None of the systems studied for [#272](https://github.com/apliteni/apliteni-ui/issues/272) nests cards; the reported transaction drawer had three bordered cards inside a bordered panel.

**Do:** Three groups, each a heading over rows, separated by one line.

**Don't:** Each group has a card, adding boxes and edges inside the panel.

## Draw three lines: under the header, over the footer, and between each group and the next. Draw no others.

<!-- rule: three-lines -->

**Why:** Header and footer rules mark the ends of scrolling; body rules separate groups, never rows ([#272](https://github.com/apliteni/apliteni-ui/issues/272)). Ant and Primer use header/footer rules (Primer once scrolling); Material separates unrelated sections, not rows within them.

## Set each value beside its label, and separate rows with space.

<!-- rule: rows -->

**Why:** The UK government design system keeps summary-list row rules because zoom can separate labels and values across a page. In a drawer at most 560px wide, adjacent labels and values stay together at any zoom without rules.

**Except:** Figures a reader compares down the panel, such as a list of amounts, are a table. Use table() and right-align them there.

**Do:** Adjacent label and value: a short eye movement needs no guide.

**Don't:** Far-edge values need row rules to guide the eye back.
