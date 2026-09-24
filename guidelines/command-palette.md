# The command palette

What belongs in it, how its list is ordered, and the six keys it owes the reader.

## Put something in the palette only if a reader can name it.

<!-- rule: named-things -->

**Except:** One-step settings are commands, such as “Switch to the light theme”; settings needing a choice open a named page.

**Do:** Recognisable commands and numbered records, also reachable by clicking through the product.

**Don't:** Four unsearchable rows: “Advanced…” and “More” name menus, frequency needs a form, and the third row opens the current page.

## Group results by what they are, using the product’s own word for each group.

<!-- rule: groups -->

**Why:** GitHub, VS Code and Slack use product-owned prefixes (#, @, /, >) to narrow search. The kit supplies groups instead; a product can change those groups when it sees its prefix.

**Do:** Three sentence-case headings at the 13px label rank organise nine rows: actions, destinations and recent items.

**Don't:** Nine ungrouped rows hide whether Enter opens an invoice, goes to a page or runs a command.

## Rank by how the query matches the name, and let the caller break every tie.

<!-- rule: ranking -->

**Why:** Ties keep caller order, so a product’s four preferred commands stay first. The kit tracks no usage; pass recents as a group.

**Except:** For server results, pass `rank: false` and answer `ui-command-query`; the server ranks the whole result, and the kit keeps its order.

**Do:** For “inv”, whole words beat fragments and names beat notes; the best row’s group comes first, making Enter the best answer overall.

**Don't:** Alphabetical order puts INV-4809 first for its digit and “New invoice”, the matching name, last.

## Answer six keys, and leave every other key to the text box.

<!-- rule: keyboard -->

**Why:** Cmd+K opens, arrows move and wrap, Enter runs the active row, Escape closes the top overlay, and Tab stays inside; other handled keys fail the build. Home and End belong to the caret under ARIA’s combobox pattern, unlike cmdk’s row navigation and extra Ctrl+N/P/J/K and Alt+Arrow bindings.

**Except:** Ctrl+K inside another text box is left alone: there it means kill-to-end-of-line, and capturing it breaks a keystroke the reader had first.

## Put focus in the text box, announce the result count, and return focus afterward.

<!-- rule: say-it -->

**Why:** aria-activedescendant names the active row while focus stays in the text box, letting arrows select and letters arrive together. Announce only the count in a polite live region to avoid rereading every row on each keystroke, and restore focus on close, including when the command removed the opener.

## Never let the palette run a delete by itself.

<!-- rule: ask-first -->

**Why:** Readers watch the text box on this fast surface, so a destructive row without a confirm cannot run. It renders aria-disabled, visibly refusing the action.

**Do:** An ellipsis promises a question; danger ink marks it, and Enter opens a confirm above the palette that answers the first Escape.

**Don't:** Two destructive commands name no confirm: grey, aria-disabled and skipped by arrows, one row from “Export rows as CSV” in a reordering list.
