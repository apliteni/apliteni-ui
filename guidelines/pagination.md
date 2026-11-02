# Pagination

## Use the server count

<!-- rule: counted-total -->

**Rule:** When available, use the server’s total row count.

**Why:** Readers need accurate ranges and totals. Some APIs only report if more rows exist.

**Do:** Show the row range and the server’s total.

**Don't:** Discard a complete `COUNT(*)` result.

## Choose the main jump

<!-- rule: the-jump -->

**Rule:** Use steps for filtering and sorting, numbers for short browsable lists such as changelogs and galleries, or jump for a specific page.

**Why:** Filtering and sorting usually need quick jumps, but short lists can use numbered pages.

**Do:** Four fixed controls keep the first and last pages of a ledger one press away.

**Don't:** On page 25 of 49, offer only 1, 24, 26 and 49.

## Announce only the range

<!-- rule: announce-range -->

**Rule:** Politely announce only the complete result range, such as “1–100 of 4,812”.

**Why:** Rows can change while focus stays, so repeats are unnecessary.

**Except:** An HTML caller that replaces the pager must restore focus. At an end, native `disabled` moves focus to the body. React then restores it to the remaining step.

**Do:** Keep focus on the pressed control. Announce the new range once.

**Don't:** Announce one page change through the live region, page-size control and every button.

## Offer consumer page sizes

<!-- rule: page-size -->

**Rule:** Offer page sizes 25, 50 and 100, and start at 100. Let consumers choose a size and keep it.

**Why:** Consumers can need different sizes. A URL or a profile keeps their size after a reload.

**Do:** Put rows per page between the count and the steps.

**Don't:** Force one size on 4,812 rows.
