# The command palette

What belongs in it, how its list is ordered, and the six keys it owes the reader.

## Put something in the palette only if a reader can name it.

<!-- rule: named-things -->

**Except:** A setting the palette changes in one step is a command—“Switch to the light theme” is something somebody types. One needing a choice is a page: name the page.

**Do:** Commands a reader would say aloud and records they know by number. Every item is also reachable by clicking through the product—the palette is the short way, never the only way.

**Don't:** Four rows nobody would type. “Advanced…” and “More” name menus, not actions; the frequency setting needs a form, so the palette can open its page but not replace it; the third row leads where the reader already is.

## Group results by what they are, using the product’s own word for each group.

<!-- rule: groups -->

**Why:** GitHub, VS Code, and Slack use prefixes instead—#, @, /, and > narrow the palette to one kind before searching. Each product owns its vocabulary, so the kit provides groups instead: a product wanting > can give the palette a different group set when it sees one.

**Do:** Three scannable headings instead of nine rows: what this does, where this goes, and what I had open. Use sentence case at 13px, the kit’s label role—a group name is a signpost, not a shout.

**Don't:** The same nine rows without groups. An invoice, page, and command promise different results from Enter, but nothing says which is which.

## Rank by how the query matches the name, and let the caller break every tie.

<!-- rule: ranking -->

**Why:** Ties keep the caller’s order. That is the kit’s entire ordering opinion, letting a product put its four most-used commands first and keep them there. This is not a use count: the kit does not remember what a reader ran yesterday; a product that does should pass recent items as a group.

**Except:** A server-fed palette ranks on the server—pass `rank: false`, answer the `ui-command-query` event, and the kit renders the supplied order instead of ranking results from a page when it cannot see the rest.

**Do:** Typed “inv”. A whole word beats a fragment, a name beats a note, and the group containing the best row comes first—so the row under Enter is the page’s best answer, not merely the first group’s.

**Don't:** The same query sorted alphabetically. INV-4809 is first because it contains a digit; “New invoice”, the only row named after what was typed, is last.

## Answer six keys, and leave every other key to the text box.

<!-- rule: keyboard -->

**Why:** Cmd+K opens it; arrows move and wrap; Enter runs the active row; Escape closes the top overlay; and Tab does not leave. Home and End stay with the caret, as the ARIA combobox pattern requires—cmdk rebinds them to the first and last row, along with Ctrl+N/P/J/K and Alt+Arrow. That is a second undocumented keyboard. This list is the whole contract; a key answered by code but not listed fails the build.

**Except:** Ctrl+K inside another text box is left alone: there it means kill-to-end-of-line, and capturing it breaks a keystroke the reader had first.

## Put focus in the text box, announce the result count, and return focus afterward.

<!-- rule: say-it -->

**Why:** The caret never leaves the box. aria-activedescendant names the current row, as the combobox pattern requires and as the only option that lets arrows move a selection while letters continue arriving. Put the count, but not rows, in a polite live region; otherwise the list region reads the whole list on every keystroke. When the palette closes, return focus to the opener, even if the command removed it from the page.

## Never let the palette run a delete by itself.

<!-- rule: ask-first -->

**Why:** The palette is the product’s fastest surface and where the reader looks at the box, not the list. A destructive item without a confirmation cannot run here: it renders aria-disabled, making the refusal visible instead of silent.

**Do:** The ellipsis signals an upcoming question, the ink uses the kit’s danger colour rather than the accent, and Enter opens confirmation. The confirmation appears above the palette and answers the first Escape.

**Don't:** The same two commands marked destructive without saying what to ask. The component refuses them there—aria-disabled, greyed out, and skipped by arrows—one row from “Export rows as CSV” in a list that reorders as the reader types. The visible refusal is the most the kit can do about a row written this way.
