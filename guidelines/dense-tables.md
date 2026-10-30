# Dense tables

## Use the right surface

<!-- rule: surface -->

**Why:** Grey or tinted table backgrounds make dense rows harder to separate from the surrounding interface.

**Rule:** Put tables on a white surface in light mode and the base canvas in dark mode.

**Do:** Let the row edge mark hover.

**Don't:** Add a grey zebra or hover fill.

## Choose density without shrinking type

<!-- rule: density -->

**Why:** Compact rows save space without making values harder to read.

**Rule:** Choose compact spacing without changing the type size.

**Do:** Keep readable values at the small text rank and use compact vertical spacing only when needed.

**Don't:** Shrink the type to fit more rows.

## Align numeric values

<!-- rule: numbers -->

**Why:** A shared edge lets readers compare magnitudes quickly.

**Rule:** Right-align numeric headers and values.

**Do:** Use tabular numerals, and keep text left-aligned.

**Don't:** Align numbers to their labels or sort formatted strings.

## Name the comparison

<!-- rule: delta -->

**Why:** A sign carries direction without making colour do all the work.

**Rule:** Print the sign and name the comparison.

**Do:** Print the sign, name the comparison, and let the caller choose whether the change is good or bad.

**Don't:** Use colour alone or treat a missing comparison as zero.

## Keep units readable

<!-- rule: units -->

**Why:** A value without a readable unit leaves readers guessing whether it means euros, percent or a count.

**Rule:** Keep units smaller and in body ink.

**Do:** Keep units smaller and in body ink, and explain abbreviations in reachable text.

**Don't:** Hide units in muted text or make readers guess what an abbreviation means.

## Size the table to its content

<!-- rule: content-width -->

**Why:** Large gaps separate labels from values.

**Rule:** Limit each column to its longest cell plus the cell inset.

**Do:** Keep amounts beside their references in a two-column table.

**Don't:** Stretch short tables across the page.

**Except:** A text column intended to grow, such as a name or title, takes the remaining width.

## Scroll instead of squeezing

<!-- rule: overflow -->

**Why:** There is no universal column limit that keeps every dataset readable.

**Rule:** Scroll columns instead of squeezing them.

**Do:** Use a named keyboard-focusable scroll region with a sticky header and pinned identity column.

**Don't:** Squeeze columns until values are unreadable or silently remove data.

**Except:** On a phone, a table stays a table and scrolls sideways. Never turn its rows into cards.

## Keep identity sub-lines as text

<!-- rule: pinned-identity-sub-lines -->

**Why:** An ellipsis cannot cut a flex or grid box, so the name spills past the cell. No specimen draws it, because the cut needs a phone viewport.

**Rule:** A pinned identity sub-line is running text.

**Do:** Write it as a sentence, with any link inside.

**Don't:** Lay a badge, a control or a picture along it, or make it a flex or grid box.

## Keep updates stable

<!-- rule: states -->

**Why:** Stable rows and clear states help readers keep their place while results change.

**Rule:** Keep the table stable while results update.

**Do:** Retain rows while refreshing, report busy state, distinguish no data from no matches and errors, and preserve focus when filters change.

**Don't:** Replace the table with a blank state or move focus without telling the reader why.

## Give every table its filter bar

<!-- rule: filter-bar -->

**Why:** Readers narrow rows before reading them, and look for the bar where other tables put it.

**Rule:** Put a bar with a search field and column filters directly above every table.

**Do:** Search, then a status filter, on the row above the table.

**Don't:** Leave rows that the reader cannot narrow.

**Except:** Two tables take no bar: one that compares a document line by line, where a filter hides lines the reviewer must check, and a chart's Table view, which holds only the chart's points.
