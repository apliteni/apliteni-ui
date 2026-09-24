# Pagination

What a pager owes a reader when a table is too long to show at once.

## Give the pager the number counted by the server.

<!-- rule: counted-total -->

**Why:** A pager knows only what it receives. The finance portal's transactions drill pays for a count using the page query's conditions, so it can show "1–100 of 4,812" and offer the end. Its invoices list fetches one extra row and infers has-more, so it never knows the total. Both approaches are correct, but neither should be the other's default: one shared helper would silently add a count to the second or remove the total from the first.

**Do:** Show the row range and full-result size. Readers need rows; pages only describe how rows were fetched.

**Don't:** Show the table without a total. That is right for an API unable to count unfetched rows, but wrong here: COUNT(*) already ran and its result was discarded before reaching the component.

## Choose the jump your readers make.

<!-- rule: the-jump -->

**Why:** Steps is the default because these tables are filtered and sorted, not browsed by page: "Forty-nine numbered links is a control nobody uses on a table read by filtering, and it is forty-nine more tab stops between the rows and footer." Numbered and jump both ship. A surface whose readers go deep uses jump, the only variant of the three that reaches page 30 in one move.

**Except:** A short list people browse rather than search—a changelog or gallery—is what numbered pages were made for. Its width stays stable because the count is small.

**Do:** Use four controls in the same place on every page. A ledger reader asks for the start and end; each is one press away.

**Don't:** Show Page 25 of 49 when one press reaches only 1, 24, 26 and 49. Numbered links imply any page is reachable but provide only four pages. They also change width as the reader moves, so Next moves each time.

## Disable a control at an end. Never remove it.

<!-- rule: ends-disable -->

**Why:** Polaris states: "Hint when merchants are at the first or the last page by disabling the corresponding button." Removing a control moves nearby controls, and a reader who cannot see the strip loses the only evidence of being at the start. Four of six finance portal pagers remove controls; a fifth replaces one with a muted span that looks available but does nothing.

**Do:** On the first page, keep First and Prev in place. A screen reader encounters them and reports them unavailable. Tab passes over them: native disabled removes a control from the sequence while making its state real rather than merely announcing it.

**Don't:** On the first page, remove Prev from the DOM. Next and Last slide left while the pointer is already moving toward one.

## Draw no steps for a table that has one page.

<!-- rule: one-page -->

**Why:** The UK government design system states: "Do not show pagination if there's only one page of content." The kit used to render its pager unconditionally, without a page-count branch or way to disable it. Every admin and My Space table in one portal therefore had two dead buttons. The two surfaces where the sentence was also false hid the entire strip in CSS instead of changing it.

**Do:** For twelve rows, leave only the page-size control if it has a job. If no sizes are offered, render nothing.

**Don't:** Show a true but uninformative sentence above two buttons that can never work. This was the kit's output for every table shorter than a page.

## Keep the numbers legible while the next page loads.

<!-- rule: page-turn -->

**Why:** None of the thirteen design systems surveyed says where controls should be during a page turn. The closest example is a spinner over the rows. Readers are most likely to press the same control twice then, so it must not move. The rows above keep their height for the same reason.

**Do:** Disable every control, mark the strip busy, and keep the range readable: it is the number the reader awaits.

**Don't:** Replace the pager with a placeholder. The strip loses height, everything below jumps, and the button the reader was about to press again moves.

## Announce the range. Announce nothing else.

<!-- rule: announce-range -->

**Why:** A page turn replaces every row without moving focus, so a reader who cannot see the table cannot know it changed. WCAG 2.2 draws the line here: new rows are not a status message, but "1–100 of 4,812" is. Announce the range as one polite live-region message. If the pager, size control, and four buttons all announced, one change would be read four times. Only two of thirteen surveyed systems use any live region, and one does so only when the caller supplies the text. There is nothing to photograph here, so this rule has no pair.

**Except:** Moving focus into the new rows is the other defensible answer and the only one Primer documents. The kit leaves focus on the pressed control so the reader can press it again—except at an end, where that control becomes disabled and the browser moves focus to the body. The React pager then focuses the step that still has somewhere to go. The HTML pager cannot: its caller re-renders the strip, so the caller restores focus after the new markup appears.

## Offer the page size. Leave remembering it to the consumer.

<!-- rule: page-size -->

**Why:** The kit names sizes once—25, 50, and 100, starting at 100—so call sites do not repeat them and the scale has one source. The consumer decides which sizes a table offers and remembers the reader's choice. Store that choice in the URL or profile that survives reload, not in a component rebuilt on every render. Nielsen Norman called persistence the most important pager detail in 2013, and no surveyed design system has shipped it since.

**Do:** Show rows per page from the kit's scale between the count and steps, keeping the steps where the reader last left them.

**Don't:** Show a ledger of 4,812 rows with page size fixed at the developer's value. A reader who wants more can only scroll or page; there is no third option.
