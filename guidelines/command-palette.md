# The command palette

## Named things

<!-- rule: named-things -->

**Rule:** Put something in the palette only if a reader can name it.

**Why:** Readers can search for “New invoice”; “More” gives them no name to search for.

**Do:** Include recognisable commands and numbered records that readers can also reach by clicking through the product.

**Don't:** Include “Advanced…”, “More”, a frequency option, or a row that opens the current page.

**Except:** One-step settings are commands, such as “Switch to the light theme”; settings needing a choice open a named page.

## Product-owned groups

<!-- rule: groups -->

**Rule:** Group results by what they are, using the product’s own word for each group.

**Why:** Groups tell readers whether a result opens a record, changes location or runs a command.

**Do:** Use sentence-case headings at the 13px label rank, such as Actions, Destinations and Recent items.

**Don't:** Show nine ungrouped rows that hide whether Enter runs a command, opens an invoice or goes to a page.

## Query-based ranking

<!-- rule: ranking -->

**Rule:** Rank results by how the query matches the name, and let the caller break every tie.

**Why:** Caller order keeps preferred commands first, and the kit stores no usage history.

**Do:** For “inv”, rank whole-word matches above fragments and names above notes; put the best row’s group first.

**Don't:** Put INV-4809 first because of its digits while leaving the matching name “New invoice” last.

**Except:** For server results, pass `rank: false` and answer `ui-command-query`; the server ranks the full result, and the kit keeps that order.

## Six keyboard keys

<!-- rule: keyboard -->

**Rule:** Handle Cmd/Ctrl+K, Up, Down, Enter, Escape and Tab, and leave every other key to the text box.

**Why:** These keys open, navigate, run, close and contain the palette without changing text-box behavior.

**Do:** Wrap arrow navigation, run the active row with Enter, close the top overlay with Escape, and keep focus inside with Tab.

**Don't:** Handle Home, End, Ctrl+N/P/J/K or Alt+Arrow; Home and End belong to the caret under ARIA’s combobox pattern.

**Except:** Leave Ctrl+K alone inside another text box, where it means kill-to-end-of-line.

## Focus and announcements

<!-- rule: say-it -->

**Rule:** Focus the text box, announce the result count, and return focus afterward.

**Why:** `aria-activedescendant` identifies the active row while letters and arrows stay in the text box.

**Do:** Announce only the count in a polite live region and restore focus on close, even if the command removed the opener.

**Don't:** Move focus to each row or reread every row after each keystroke.

## Confirm destructive actions

<!-- rule: ask-first -->

**Rule:** Never let the palette run a delete by itself.

**Why:** A destructive row must be confirmed because readers watch the text box on this fast surface.

**Do:** Show an ellipsis and danger ink, and let Enter open a confirm above the palette that answers the first Escape.

**Don't:** Omit confirmation; the row becomes disabled and arrow navigation skips it.
