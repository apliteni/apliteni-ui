# Component choice

## Interrupt with a question

<!-- rule: interrupt -->

**Rule:** Stop the page for a question; leave a statement on the page.

**Why:** A confirm keeps keyboard focus until answered; a callout does not interrupt.

**Except:** Use a drawer when the answer needs a form instead of two buttons.

**Do:** The question stops the page.

**Don't:** Show the same question with nothing to answer.

## Show lasting conditions

<!-- rule: transient -->

**Rule:** Use a toast for what happened and a callout for what is still true.

**Why:** A toast dismisses itself, so an active condition disappears too soon.

**Except:** A toast with an action may remain because something happened and can still be answered.

**Do:** Keep a standing warning on the page.

**Don't:** Let the same warning dismiss itself.

## Match controls to panels

<!-- rule: panels -->

**Rule:** Use tabs() when the control owns a panel and segmented() when it owns nothing.

**Why:** A tablist promises a panel and arrow-key support; a strip without either fails the reader.

**Except:** Links between locations are neither; the kit’s nav uses aria-current, not a tablist.

**Do:** Use a filter strip that owns no panel.

**Don't:** Use a tablist that owns no panels.

## Match confirmation scale

<!-- rule: scale -->

**Rule:** Choose the confirmation by how much of the screen it owns.

**Why:** successPanel() is a page block; success() is the page and tells the reader where to go next.

**Except:** A block that needs somewhere to go next still uses success(); successPanel() takes two strings.

**Do:** Use a block confirmation inside the page.

**Don't:** Force a page-sized confirmation into a card.

## Add dropdown search

<!-- rule: dropdown-search -->

**Rule:** Give a dropdown a search field at ten options, or whenever its options come from data.

**Why:** Ten options require scrolling, and data-fed lists need search at any count; matching anywhere in a label also finds later words.

**Except:** Below six options, search adds an unnecessary stop; at six to nine, the author decides, adding search for described rows that scroll from the sixth.

**Do:** For twenty-nine currencies, type “dollar” instead of scrolling.

**Don't:** Show only seven of twenty-nine currencies without search when dollars are scattered through the list.
