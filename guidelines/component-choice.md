# Component choice

## Interrupt with a question

<!-- rule: interrupt -->

**Rule:** Stop the page for a question, and keep a statement on the page.

**Why:** A confirm keeps the keyboard focus until it gets an answer. A callout does not interrupt the reader.

**Except:** For a short form, use a content-sized modal or a drawer. For a long form, use a page.

**Do:** Ask “Rotate this token?” in a confirm with the “Keep token” and “Rotate token” buttons.

**Don't:** Put “Rotate this token?” in a callout that has no answer buttons.

## Show lasting conditions

<!-- rule: transient -->

**Rule:** Use a toast for an event that occurred and a callout for a condition that is still true.

**Why:** A toast closes itself, so an active condition goes away too soon.

**Except:** A toast with an action can stay, because the event occurred and it can still get an answer.

**Do:** Keep a lasting warning on the page.

**Don't:** Let the same warning close itself.

## Match controls to panels

<!-- rule: panels -->

**Rule:** Use `tabs()` to switch panels, and use `segmented()` for a choice that has no panel, such as a value, a filter or a sort order.

**Why:** A tablist promises a panel and arrow-key support. A strip without these two things fails the reader.

**Except:** Links between locations are neither of these. The kit’s nav uses `aria-current`, not a tablist.

**Do:** Use a segmented control to filter one list by Any, Verified or Pending.

**Don't:** Give those same list filters tab roles when they have no separate panels.

## Group one category at a time

<!-- rule: one-category -->

**Rule:** Give views, filters, sorting and actions separate groups and separate styles.

**Why:** Identical controls in one bar hide a difference. One control re-draws every row, but the control next to it only filters them to fewer rows.

**Do:** Keep the filter chips in one bar, the views in a separate strip, and the action at the right end.

**Don't:** Put three saved views and a filter control in one bar as four buttons with the same size and style.

**Except:** Use a segmented strip for saved views that re-draw one table. Use tabs for views that swap panels.

## Match confirmation scale

<!-- rule: scale -->

**Rule:** Use `successPanel()` for a confirmation inside a page, and use `success()` for a full-page confirmation or a next action.

**Why:** `successPanel()` is a block in a page. `success()` is the full page, and it tells the reader where to go next.

**Except:** If a block needs a next location for the reader, use `success()` for it too. `successPanel()` takes two strings.

**Do:** Use `successPanel()` to confirm sent feedback inside a card.

**Don't:** Put the full-page `success()` layout inside that card.

## Add dropdown search

<!-- rule: dropdown-search -->

**Rule:** Give a dropdown a search field at ten options, or when data supplies its options.

**Why:** Ten options need scrolling. A list from data needs search at any count. A match anywhere in a label also finds its later words.

**Except:** Below six options, search adds an unnecessary step. At six to nine, the author decides. Add search for rows with descriptions that scroll from the sixth row.

**Do:** For twenty-nine currencies, type “dollar” instead of scrolling.

**Don't:** Show only seven of twenty-nine currencies without search when the dollars are spread through the list.
