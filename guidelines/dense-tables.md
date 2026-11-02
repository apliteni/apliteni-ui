# Dense tables

## Use the right surface

<!-- rule: surface -->

**Why:** Grey or tinted backgrounds make dense rows harder to separate from the interface around the table.

**Rule:** Put tables on a white surface in light mode and the base canvas in dark mode.

**Do:** Let the row edge show hover.

**Don't:** Add a grey zebra fill or a hover fill.

## Choose density without shrinking type

<!-- rule: density -->

**Why:** Compact rows save space, and the values stay easy to read.

**Rule:** Choose compact spacing without changing the type size.

**Do:** Keep readable values at the small text rank. Use compact vertical spacing only when necessary.

**Don't:** Make the type smaller to fit more rows.

## Align numeric values

<!-- rule: numbers -->

**Why:** A shared edge lets readers compare the sizes of values quickly.

**Rule:** Right-align numeric headers and values.

**Do:** Use tabular numerals. Keep text left-aligned.

**Don't:** Align numbers to their labels, or sort formatted strings.

## Name the comparison

<!-- rule: delta -->

**Why:** A sign shows direction, so colour does not have to do all the work.

**Rule:** Print the sign and name the comparison.

**Do:** Show the sign. Name the comparison. Let the caller decide if the change is good or bad.

**Don't:** Use only colour, or treat a missing comparison as zero.

## Keep units readable

<!-- rule: units -->

**Why:** If a value has no readable unit, readers must guess if it means euros, percent or a count.

**Rule:** Keep units smaller and in body ink.

**Do:** Make units smaller and keep them in body ink. Explain abbreviations in text that readers can reach.

**Don't:** Hide units in muted text, or make readers guess the meaning of an abbreviation.

## Size the table to its content

<!-- rule: content-width -->

**Why:** Large gaps separate labels from their values.

**Rule:** Limit each column to its longest cell plus the cell inset.

**Do:** Put each amount next to its reference.

**Don't:** Stretch short tables across the page.

**Except:** A text column that is intended to grow, such as a name or a title, takes the remaining width.

## Scroll instead of squeezing

<!-- rule: overflow -->

**Why:** No single column limit keeps every dataset readable.

**Rule:** Scroll columns instead of squeezing them.

**Do:** Use a named, keyboard-focusable scroll region with a sticky header and a pinned identity column.

**Don't:** Make columns narrow until values are unreadable, or remove data without notice.

**Except:** On a phone, a table stays a table and scrolls sideways. Never change its rows into cards.

## Keep identity sub-lines as text

<!-- rule: pinned-identity-sub-lines -->

**Why:** An ellipsis cannot cut a flex or grid box, so the name goes past the edge of the cell.

**Rule:** A pinned identity sub-line is running text.

**Do:** Write it as a sentence, and put any link inside it.

**Don't:** Put a badge, a control or a picture next to it, or make it a flex or grid box.

## Keep updates stable

<!-- rule: states -->

**Why:** Stable rows and clear states help readers keep their place when results change.

**Rule:** Keep the table stable while results update.

**Do:** Keep rows during a refresh and show the busy state. Show different states for no data, for no matches and for errors. Keep focus when filters change.

**Don't:** Replace the table with a blank state, or move focus and not tell the reader why.

## Give every table its filter bar

<!-- rule: filter-bar -->

**Why:** Readers narrow the rows before they read them, and they look for the bar where other tables put it.

**Rule:** Put a bar with a search field and column filters directly above every table.

**Do:** Put search, then a status filter, on the row above the table.

**Don't:** Leave rows that the reader cannot narrow.

**Except:** Two tables have no bar. The first compares a document line by line, and a filter there hides lines that the reviewer must check. The second is a chart's Table view, which holds only the chart's points.
