# Component choice

## Make the committing action stand out

<!-- rule: paired-actions -->

**Rule:** In a pair of actions, give the committing action more visual weight than the dismissing action.

**Why:** Equal weight makes it harder to see which button commits the change.

**Do:** Use a primary Save button beside a ghost Cancel button.

**Don't:** Give Save and Cancel the same primary style.

## Interrupt with a question

<!-- rule: interrupt -->

**Rule:** Stop the page for a question; leave a statement on the page.

**Why:** A confirm keeps keyboard focus until answered; a callout does not interrupt.

**Except:** Use a content-sized modal or a drawer for a short form, and a page for a long one.

**Do:** Ask “Rotate this token?” in a confirm with “Keep token” and “Rotate token” buttons.

**Don't:** Put “Rotate this token?” in a callout with no answer buttons.

## Show lasting conditions

<!-- rule: transient -->

**Rule:** Use a toast for what happened and a callout for what is still true.

**Why:** A toast dismisses itself, so an active condition disappears too soon.

**Except:** A toast with an action may remain because something happened and can still be answered.

**Do:** Keep a standing warning on the page.

**Don't:** Let the same warning dismiss itself.

## Match controls to panels

<!-- rule: panels -->

**Rule:** Use `tabs()` to switch panels and `segmented()` for a choice that owns no panel, such as a value, filter or sort order.

**Why:** A tablist promises a panel and arrow-key support; a strip without either fails the reader.

**Except:** Links between locations are neither; the kit’s nav uses aria-current, not a tablist.

**Do:** Use a segmented control to filter one list by Any, Verified or Pending.

**Don't:** Give those same list filters tab roles when they have no separate panels.

## Group one category at a time

<!-- rule: one-category -->

**Rule:** Put a control in a group only with others of its own category: views, filters, sorting and actions each get their own group and style.

**Why:** Identical controls in one bar hide that one of them re-draws every row while its neighbour only narrows them.

**Do:** Keep the filter chips in one bar, the views in a strip of their own, and the action at the right-hand end.

**Don't:** Put three saved views and a filter control in one bar as four buttons of the same size and style.

**Except:** Two filters, or two actions, belong together: the categories are what may not mix. Saved views that re-draw one table take a segmented strip; views that swap panels take tabs.

## Match confirmation scale

<!-- rule: scale -->

**Rule:** Use `successPanel()` for a confirmation inside a page and `success()` for a full-page confirmation or a next action.

**Why:** successPanel() is a page block; success() is the page and tells the reader where to go next.

**Except:** A block that needs somewhere to go next still uses success(); successPanel() takes two strings.

**Do:** Use `successPanel()` to confirm sent feedback inside a card.

**Don't:** Put the full-page `success()` layout inside that card.

## Add dropdown search

<!-- rule: dropdown-search -->

**Rule:** Give a dropdown a search field at ten options, or whenever its options come from data.

**Why:** Ten options require scrolling, and data-fed lists need search at any count; matching anywhere in a label also finds later words.

**Except:** Below six options, search adds an unnecessary stop; at six to nine, the author decides, adding search for described rows that scroll from the sixth.

**Do:** For twenty-nine currencies, type “dollar” instead of scrolling.

**Don't:** Show only seven of twenty-nine currencies without search when dollars are scattered through the list.
