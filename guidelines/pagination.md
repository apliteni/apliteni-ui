# Pagination

## Use the server count

<!-- rule: counted-total -->

**Rule:** Use the total row count that the server returns when the count is available.

**Why:** Readers need accurate ranges and totals, but some APIs can only report whether more rows exist.

**Do:** Show the current row range and the total from the server.

**Don't:** Discard a `COUNT(*)` result that is complete.

## Choose the main jump

<!-- rule: the-jump -->

**Rule:** Use steps for filtering and sorting, numbers for short browsable lists such as changelogs and galleries, or jump for a specific page.

**Why:** Filtering and sorting usually need quick jumps, but short lists can use numbered pages.

**Do:** Use four fixed controls so that the first and last pages of a ledger are one press away.

**Don't:** On page 25 of 49, show only 1, 24, 26 and 49 as direct choices.

## Announce only the range

<!-- rule: announce-range -->

**Rule:** Politely announce the complete result range, such as “1–100 of 4,812,” and nothing else.

**Why:** Rows can change while focus does not move, so a repeated announcement for each change is unnecessary.

**Except:** If an HTML caller replaces the pager, that caller must restore focus. At an end, native `disabled` moves focus to the body, and then React restores focus to the remaining step.

**Do:** Keep focus on the pressed control. Announce the new range once.

**Don't:** Announce the same page change through the live region, the page-size control and every button.

## Offer consumer page sizes

<!-- rule: page-size -->

**Rule:** Offer page sizes of 25, 50 and 100, start at 100, and let consumers choose a size and keep that selection.

**Why:** Consumers can need different sizes, and they can save a size in a URL or a profile so that it stays after a reload.

**Do:** Put rows per page between the count and the pagination steps.

**Don't:** Force one size when readers must go through 4,812 rows.
