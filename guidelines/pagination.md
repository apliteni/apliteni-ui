# Pagination

What a pager owes a reader when a table is too long to show at once.

## Give the pager the number counted by the server.

<!-- rule: counted-total -->

**Why:** A pager knows only what it receives: the transactions drill counts matching rows to show “1–100 of 4,812” and reach the end, while invoices fetch one extra row to infer has-more. Keep both choices; a shared default would add a count to one or remove the other’s total.

**Do:** Row range and total: rows are the reader’s concern, pages describe fetching.

**Don't:** No total is right for an API that cannot count; here COUNT(*) ran and its answer was discarded.

## Choose the jump your readers make.

<!-- rule: the-jump -->

**Why:** Steps suits filtering and sorting: forty-nine numbered links add forty-nine unwanted tab stops. Numbered and jump also ship; jump alone reaches page 30 in one move.

**Except:** Numbered pages suit short browsable lists such as changelogs and galleries, where the small count keeps width stable.

**Do:** Four fixed controls; a ledger’s start and end are each one press away.

**Don't:** On page 25 of 49, numbers reach only 1, 24, 26 and 49 in one press; changing strip width also moves Next.

## Disable a control at an end. Never remove it.

<!-- rule: ends-disable -->

**Why:** Disabling, as Polaris prescribes, keeps nearby controls still and tells screen-reader users they reached an end. Four of six portal pagers removed controls; a fifth substituted an inert muted span.

**Do:** First and Prev stay put and screen readers report them unavailable; native disabled removes them from Tab order.

**Don't:** Removing Prev on page one slides Next and Last left under the approaching pointer.

## Draw no steps for a table that has one page.

<!-- rule: one-page -->

**Why:** With one page, steps offer no action—the UK government design system says to omit pagination. The kit previously offered two dead buttons on admin and My Space tables; two surfaces hid the misleading strip in CSS.

**Do:** Twelve rows: keep only page size; without size choices, render nothing.

**Don't:** An uninformative sentence above two permanently useless buttons, formerly the kit’s output.

## Keep the numbers legible while the next page loads.

<!-- rule: page-turn -->

**Why:** Readers may press the same control twice during a page turn, so controls and rows must hold their positions and height. None of thirteen surveyed systems addressed this beyond a spinner over rows.

**Do:** Controls disabled, strip busy, range readable.

**Don't:** A placeholder collapses the strip and moves content and the next click target.

## Announce the range. Announce nothing else.

<!-- rule: announce-range -->

**Why:** Rows change without moving focus: WCAG 2.2 treats “1–100 of 4,812”, not new rows, as the status, so announce the range whole and politely rather than repeating one change four times through the pager, size control and four buttons. Only two of thirteen surveyed systems use a live region, one requiring caller text.

**Except:** Primer instead documents moving focus into rows. The kit keeps the pressed control focused for reuse; at an end, native disabled drops focus to the body, then React focuses the remaining step. HTML callers replace the strip and must restore focus themselves.

## Offer the page size. Leave remembering it to the consumer.

<!-- rule: page-size -->

**Why:** The kit defines 25, 50 and 100 once, starting at 100; consumers choose which to offer and persist the choice in a URL or profile that survives reload. Nielsen Norman called persistence the key pager detail in 2013, but no surveyed design system ships it.

**Do:** Rows per page sits between count and steps, keeping steps still.

**Don't:** A fixed size leaves readers of 4,812 rows only scrolling or paging.
