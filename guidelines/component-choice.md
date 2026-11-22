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

**Rule:** Put a period control at the end of a tab row; use a separate control for a filter or sort order.

**Why:** A tablist promises panels and arrow keys, but a period or filter changes the whole view.

**Except:** Links between locations are neither; the kit’s nav uses aria-current, not a tablist.

**Do:** Put a month control at the end of a report’s Chart and Table tab row.

**Don't:** Style a report filter as a tab beside Chart and Table.

## Open a panel at its control

<!-- rule: panel-origin -->

**Rule:** A panel opens next to the control that opened it.

**Why:** The eye and pointer are already there; a far-edge drawer looks unrelated to its button.

**Except:** A dialog that asks a question opens in the screen centre.

**Do:** Open a drawer, menu or popover beside its button.

**Don't:** Open that drawer across the page from its button.

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
