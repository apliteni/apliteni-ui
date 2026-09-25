# Pagination

## Use the server count

<!-- rule: counted-total -->

**Rule:** Use the total row count returned by the server when it is available.

**Why:** Readers need accurate ranges and totals, while some APIs can only report whether more rows exist.

**Do:** Show the current row range and the server’s total.

**Don't:** Discard a completed `COUNT(*)` result.

## Choose the main jump

<!-- rule: the-jump -->

**Rule:** Use steps for filtering and sorting, numbers for short browsable lists such as changelogs and galleries, or jump for a specific page.

**Why:** Filtering and sorting usually need quick jumps, while short lists can use numbered pages.

**Do:** Use four fixed controls so a ledger’s first and last pages are one press away.

**Don't:** On page 25 of 49, show only 1, 24, 26, and 49 as direct choices.

## Disable ends in place

<!-- rule: ends-disable -->

**Rule:** Disable controls at each end without removing them.

**Why:** Fixed controls prevent layout shifts and tell screen-reader users when they reached an end.

**Do:** Keep First and Prev in place and mark them unavailable; native `disabled` removes them from Tab order.

**Don't:** Remove Prev on page one and move the other controls left.

## Hide one-page steps

<!-- rule: one-page -->

**Rule:** Do not show pagination steps when a table has one page.

**Why:** One-page controls provide no action.

**Do:** For 12 rows, show only the page-size control, or render nothing if no size choices exist.

**Don't:** Show two permanently useless buttons.

## Keep page turns stable

<!-- rule: page-turn -->

**Rule:** Keep controls, rows, positions, and heights stable while the next page loads.

**Why:** Readers may press the same control twice during loading.

**Do:** Disable the controls, mark the pager busy, and keep the range readable.

**Don't:** Use a placeholder that collapses the pager or moves the next click target.

## Announce only the range

<!-- rule: announce-range -->

**Rule:** Politely announce the complete result range, such as “1–100 of 4,812,” and nothing else.

**Why:** Rows can change without moving focus, so repeating each change creates unnecessary announcements.

**Except:** HTML callers that replace the pager must restore focus themselves; at an end, React restores focus to the remaining step after native `disabled` moves it to the body.

**Do:** Keep focus on the pressed control and announce the new range once.

**Don't:** Announce the same page change through the live region, page-size control, and every button.

## Offer consumer page sizes

<!-- rule: page-size -->

**Rule:** Offer page sizes from 25, 50, and 100, starting at 100, and let consumers choose and persist the selection.

**Why:** Consumers may need different choices and can save them in a URL or profile across reloads.

**Do:** Place rows per page between the count and pagination steps.

**Don't:** Force one size when readers must work through 4,812 rows.
