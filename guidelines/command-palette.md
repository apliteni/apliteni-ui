# The command palette

## Named things

<!-- rule: named-things -->

**Rule:** Put an item in the palette only if a reader can name it.

**Why:** Readers can search for “New invoice”, but not for “More”.

**Do:** Include known commands and numbered records that readers also reach by clicking through the product.

**Don't:** Include “Advanced…”, “More”, a frequency option, or a row that opens the current page.

**Except:** A setting that has one step is a command, such as “Switch to the light theme”. A setting that needs a choice opens a named page.

## Product-owned groups

<!-- rule: groups -->

**Rule:** Group results by what they are, and use the product’s own word for each group.

**Why:** Groups tell readers if a result opens a record, changes location or runs a command.

**Do:** Use sentence-case headings at the 13px label rank, such as Actions, Destinations and Recent items.

**Don't:** Show nine rows without groups, so that readers cannot see if Enter runs a command, opens an invoice or goes to a page.

## Query-based ranking

<!-- rule: ranking -->

**Rule:** Rank results by how the query matches the name, and let the caller decide the order of results that have the same rank.

**Why:** The caller order keeps the preferred commands first, and the kit stores no usage history.

**Do:** For “inv”, rank whole-word matches above fragments and names above notes. Put the group of the best row first.

**Don't:** Put INV-4809 first because of its digits, with the matching name “New invoice” in the last position.

**Except:** For server results, pass `rank: false`. Then respond to `ui-command-query`. The server ranks the full result, and the kit keeps that order.

## Send destructive actions to their page

<!-- rule: danger-page -->

**Rule:** Keep a destructive action on its settings page, and give the palette one row that opens that section.

**Why:** On this fast surface readers look at the text box, so a delete needs the page that shows what it removes.

**Do:** Show one Go to row, such as “Danger zone in Settings”, that opens that section.

**Don't:** List “Delete workspace…” and “Revoke every API key…” as rows, even with a confirmation.
