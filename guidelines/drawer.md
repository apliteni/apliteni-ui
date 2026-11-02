# Drawers

## One-record drawer

<!-- rule: one-record -->

**Rule:** Open a drawer to view or change one record without leaving its list.

**Why:** After the drawer closes, the user is back at the row that they opened.

**Do:** Open a drawer for a quick edit, a new key, a filter, or a look at the details of a row.

**Don't:** Open a drawer for a long form, for several steps, or for a view that has its own address and Back.

**Except:** For a question with two answers, use confirm, not a drawer.

## Drawer or page

<!-- rule: drawer-or-page -->

**Rule:** Use a page to edit more than one group, and use a drawer for one short change.

**Why:** Several groups need space, so that the user can move between them and check them before saving.

**Do:** Edit the roles and the per-unit switches on a page, below a way back to the list.

**Don't:** Edit the same groups in a drawer, stacked in one narrow panel over the list.

**Except:** Change one field inline, without a panel. A drawer can show groups that the reader only reads.

## Grouped content

<!-- rule: no-cards -->

**Rule:** Put the drawer content into groups under headings, and never put a card in the drawer.

**Why:** The drawer already has an edge and a raised surface, so cards add boxes that are not necessary.

**Do:** Use three groups, with a heading above the rows of each group and one line between the groups.

**Don't:** Put each group in a card in the drawer.

## Header and group dividers

<!-- rule: three-lines -->

**Rule:** Add a line below the header and between the groups, and leave the footer with no fill and no line.

**Why:** The header line marks the body that scrolls. The group lines separate the content, and the actions share the surface of the panel.

**Do:** Separate the header and the groups with lines.

**Don't:** Add a line between every row.

## Spaced label rows

<!-- rule: rows -->

**Rule:** Put each value next to its label, and use space to separate the rows.

**Why:** In a drawer that is up to 560px wide, labels and values stay together at any zoom level, with no row lines.

**Do:** Put a short value next to its label, for example `Status — Active`.

**Don't:** Put the value at the far edge and use row lines to guide the eye back.

**Except:** If readers compare figures down the panel, such as amounts, put the figures in a table with `table()` and align them on the right.
