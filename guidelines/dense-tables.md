# Dense tables

Keep numbers comparable when the dataset needs many rows and columns.

## Use the right surface

<!-- rule: surface -->

**Why:** Grey or tinted table backgrounds make dense rows harder to separate from the surrounding interface.

**Do:** Use a white surface in light mode and the base canvas in dark mode; let the row edge mark hover.

**Don't:** Add a grey zebra or hover fill.

## Choose density without shrinking type

<!-- rule: density -->

**Why:** Compact rows save space without making values harder to read.

**Do:** Keep readable values at the small text rank and use compact vertical spacing only when needed.

**Don't:** Shrink the type to fit more rows.

## Align numeric values

<!-- rule: numbers -->

**Why:** A shared edge lets readers compare magnitudes quickly.

**Do:** Right-align numeric headers and values, use tabular numerals, and keep text left-aligned.

**Don't:** Align numbers to their labels or sort formatted strings.

## Name the comparison

<!-- rule: delta -->

**Why:** A sign carries direction without making colour do all the work.

**Do:** Print the sign, name the comparison, and let the caller choose whether the change is good or bad.

**Don't:** Use colour alone or treat a missing comparison as zero.

## Keep units readable

<!-- rule: units -->

**Why:** Units carry information even when they are secondary to the value.

**Do:** Keep units smaller and in body ink, and explain abbreviations in reachable text.

**Don't:** Hide units in muted text or make readers guess what an abbreviation means.

## Scroll instead of squeezing

<!-- rule: overflow -->

**Why:** There is no universal column limit that keeps every dataset readable.

**Do:** Use a named keyboard-focusable scroll region with a sticky header and pinned identity column.

**Don't:** Squeeze columns until values are unreadable or silently remove data.

## Keep updates stable

<!-- rule: states -->

**Why:** Stable rows and clear states help readers keep their place while results change.

**Do:** Retain rows while refreshing, report busy state, distinguish no data from no matches and errors, and preserve focus when filters change.

**Don't:** Replace the table with a blank state or move focus without telling the reader why.
