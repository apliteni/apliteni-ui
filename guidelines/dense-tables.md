# Dense tables

## Use the right surface

<!-- rule: surface -->

**Why:** On grey or tinted backgrounds, it is harder to see dense rows as separate from the interface around the table.

**Rule:** Put tables on a white surface in light mode and on the base canvas in dark mode.

**Do:** Let the row edge show hover.

**Don't:** Add a grey zebra fill or a hover fill.

## Choose density without shrinking type

<!-- rule: density -->

**Why:** Compact rows save space, and the values stay easy to read.

**Rule:** Choose compact spacing, but do not change the type size.

**Do:** Keep readable values at the small text rank. Use compact vertical spacing only when necessary.

**Don't:** Make the type smaller to fit more rows.

## Align numeric values

<!-- rule: numbers -->

**Why:** When values share an edge, readers can compare their sizes quickly.

**Rule:** Right-align numeric headers and numeric values.

**Do:** Use tabular numerals. Keep text left-aligned.

**Don't:** Align numbers to their labels, or sort formatted strings.

## Name the comparison

<!-- rule: delta -->

**Why:** A sign shows the direction of a change, so colour does not have to give all the information.

**Rule:** Show the sign and name the comparison.

**Do:** Show the sign. Name the comparison. Let the caller decide if the change is good or bad.

**Don't:** Use only colour, or show a missing comparison as zero.

## Keep units readable

<!-- rule: units -->

**Why:** If a value has no readable unit, readers must guess if it is euros, percent or a count.

**Rule:** Make units smaller and keep them in body ink.

**Do:** Make units smaller and keep them in body ink. Explain abbreviations in text that readers can get to.

**Don't:** Hide units in muted text, or make readers guess what an abbreviation means.

## Size the table to its content

<!-- rule: content-width -->

**Why:** Large gaps separate labels from their values.

**Rule:** Make each column no wider than its longest cell plus the cell inset.

**Do:** Put each amount next to its reference.

**Don't:** Stretch short tables across the page.

**Except:** A text column that is intended to grow, such as a name or a title, gets the remaining width.

## Scroll instead of squeezing

<!-- rule: overflow -->

**Why:** No single column limit keeps every dataset readable.

**Rule:** Let columns scroll, and do not squeeze them.

**Do:** Use a scroll region that has a name and keyboard focus, with a sticky header and a pinned identity column.

**Don't:** Make columns so narrow that values become unreadable, or remove data without notice.

**Except:** On a phone, a table stays a table and scrolls sideways. Never change its rows into cards.

## Keep identity sub-lines as text

<!-- rule: pinned-identity-sub-lines -->

**Why:** An ellipsis cannot cut a flex or grid box, so the name goes past the edge of the cell.

**Rule:** Write a pinned identity sub-line as running text.

**Do:** Write it as a sentence, and put any link inside it.

**Don't:** Put a badge, a control or a picture next to it, or make it a flex or grid box.

## Keep updates stable

<!-- rule: states -->

**Rule:** Keep the table stable while results update. During the next page load, keep the rows, the pager controls, their positions and their heights, and keep the range readable.

**Why:** Stable rows and clear states help readers keep their place when results change. During a load, a reader can press the same control twice.

**Do:** Keep rows during a refresh and show the busy state. Show different states for no data, for no matches and for errors. Keep focus when filters change.

**Don't:** Replace the table with a blank state, or move focus without telling the reader why.

## Give every table its filter bar

<!-- rule: filter-bar -->

**Why:** Readers narrow the rows before they read them, and they look for the bar in the same place as on other tables.

**Rule:** Put a bar with a search field and column filters directly above every table.

**Do:** Put search, then a status filter, on the row above the table.

**Don't:** Leave rows that the reader cannot narrow.

**Except:** Two tables have no bar. The first compares a document line by line, and a filter there hides lines that the reviewer must check. The second is the Table view of a chart, which holds only the points of that chart.
