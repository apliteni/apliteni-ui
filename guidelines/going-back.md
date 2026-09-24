# Going back

## Link only for child pages

<!-- rule: below-a-list -->

**Rule:** Add a back link only when the page is under another page.

**Why:** It provides the missing move from a record to its parent list.

**Do:** From an invoice record, link to the invoice list.

**Don't:** Add one to the Invoices sidebar section; it is not a child page.

## Name the destination

<!-- rule: name-it -->

**Rule:** Name the destination instead of using only “Back”.

**Why:** The arrow shows direction, so the words should identify the destination.

**Do:** Say “Back to Invoices”, matching the sidebar spelling; hide the arrow from screen readers.

**Don't:** Use “Back”, which does not identify the destination in a screen reader’s links list.

**Except:** A multi-screen form may use “Back” for the previous step; that is a form button, not this link.

## Link to the parent address

<!-- rule: address-not-history -->

**Rule:** Link to the parent’s address, preserving filters, sort and page; never use history or `javascript:`.

**Why:** Addresses work with new tabs, bookmarks and sharing, while browser Back handles history.

**Do:** Use `backLink()` with the parent list address and its current state.

**Don't:** Use a history link that fails in a new tab or shared address.

**Except:** After search or another record, still link to the parent; browser Back returns to the previous location.

## Choose one navigation method

<!-- rule: one-or-the-other -->

**Rule:** Put one back link or trail above the title, never both.

**Why:** A trail shows several levels; a back link shows one step, and `appShell()` draws only the link when both are provided.

**Do:** Align the single line above the title.

**Don't:** Repeat the hierarchy with both; the current page is then named three times.

## Keep the section active

<!-- rule: section-lit -->

**Rule:** Keep the parent section active with `aria-current="true"`, not `"page"`, and use its name in the link.

**Why:** The record remains in its list’s section without making the list seem like the current page; `appShell()` does this when given a back link.

**Do:** Keep the sidebar row active and say “Back to Invoices”.

**Don't:** Leave the section inactive or give it another name.

## Keep the link quiet

<!-- rule: quiet -->

**Rule:** Style the back link as secondary navigation, using `--text` despite host link colours.

**Why:** It appears on every record page and must not compete with the title or main action.

**Do:** Use body ink, no box until pointer hover, and a size smaller than the title.

**Don't:** Use two filled buttons or make leaving the record more prominent than its main action.
