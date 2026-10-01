# Dense tables

## Use the right surface

<!-- rule: surface -->

**Why:** Grey or tinted table backgrounds make dense rows harder to separate from the surrounding interface.

**Rule:** Put tables on a white surface in light mode and the base canvas in dark mode.

**Do:** Use a white surface in light mode and the base canvas in dark mode; let the row edge mark hover.

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

**Do:** Right-align numeric headers and values, use tabular numerals, and keep text left-aligned.

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

<!-- rule: width -->

**Why:** A short table stretched to the page width leaves a gap between a label and its value, and the reader has to cross it to pair them.

**Rule:** Let a table end where its values end, and keep no column wider than its longest cell plus the cell inset.

**Do:** Let a two-column table size to its content, so each amount sits beside its reference.

**Don't:** Stretch a short table to the width of the page and leave the middle empty.

**Except:** A table with a text column meant to grow — a name or a title — gives that column the width left over.

## Scroll instead of squeezing

<!-- rule: overflow -->

**Why:** There is no universal column limit that keeps every dataset readable.

**Rule:** Scroll columns instead of squeezing them.

**Do:** Use a named keyboard-focusable scroll region with a sticky header and pinned identity column.

**Don't:** Squeeze columns until values are unreadable or silently remove data.

## Keep updates stable

<!-- rule: states -->

**Why:** Stable rows and clear states help readers keep their place while results change.

**Rule:** Keep the table stable while results update.

**Do:** Retain rows while refreshing, report busy state, distinguish no data from no matches and errors, and preserve focus when filters change.

**Don't:** Replace the table with a blank state or move focus without telling the reader why.
