# Going back

## Link only for child pages

<!-- rule: below-a-list -->

**Rule:** Add a back link only if the page is under another page.

**Why:** Without the back link, a record has no path to its parent list.

**Do:** On an invoice record, add a link to the invoice list.

**Don't:** Add a back link to the Invoices sidebar section, because it is not a child page.

## Name the destination

<!-- rule: name-it -->

**Rule:** Name the destination in the link, and do not use only “Back”.

**Why:** The arrow shows the direction, so the words must identify the destination.

**Do:** Write “Back to Invoices” with the same spelling as the sidebar. Hide the arrow from screen readers.

**Don't:** Use “Back”, because it does not identify the destination in the links list of a screen reader.

**Except:** A form that has more than one screen can use “Back” for the previous step. That control is a form button, not this link.

## Link to the parent address

<!-- rule: address-not-history -->

**Rule:** Link to the address of the parent and keep its filters, sort and page, and never use history or `javascript:`.

**Why:** Addresses work in new tabs, in bookmarks and when people share them. Browser Back handles history.

**Do:** Use `backLink()` with the address of the parent list and its current state.

**Don't:** Use a history link, because it fails in a new tab or from a shared address.

**Except:** If the record opened from a search or from another record, still link to the parent. Browser Back returns to the previous location.

## Skip the trail

<!-- rule: one-or-the-other -->

**Rule:** Put one back link, to the parent, above the title of a subpage.

**Why:** The sidebar already shows the section, so a trail names the same place a second time.

**Do:** Put a link to Invoices above an invoice.

**Don't:** Stack a link for each level, such as Finance and then Invoices.

## Keep the section active

<!-- rule: section-lit -->

**Rule:** Keep the parent section active with `aria-current="true"`, not `"page"`, and use the section name in the link.

**Why:** The record stays in the section of its list, but the list does not look like the current page. `appShell()` does this when it gets a back link.

**Do:** Keep the sidebar row active and write “Back to Invoices”.

**Don't:** Leave the section inactive or give the section a different name.

## Keep the link quiet

<!-- rule: quiet -->

**Rule:** Style the back link as secondary navigation, and use `--text` instead of the host link colours.

**Why:** The back link is on every record page, and it must not compete with the title or the main action.

**Do:** Use body ink, show no box until the pointer is over the link, and use a size smaller than the title.

**Don't:** Use two filled buttons, or make the exit from the record more visible than its main action.
