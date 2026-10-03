# Account and settings

## Open the account area in one modal

<!-- rule: modal -->

**Rule:** Open account and settings in one modal over the product, carrying its own navigation beside the pane it shows.

**Why:** A reader changing their own settings has not left the work they were doing, and one modal keeps the work behind it and every setting inside it.

**Do:** Open a modal over the product, its navigation standing beside the pane the reader asked for.

**Don't:** Slide the account area in over the product as a full-width sheet with columns inside it.

**Except:** On a phone the navigation stands above the pane rather than beside it, because a column of names beside the pane leaves the pane narrower than the rows inside it. Both are on screen at once there, so the one Close is still the whole way out.

**Gap #553:** The vanilla kit’s only modal is `confirm()`, a fixed question with two answers, and React’s `Modal` is one pane; neither takes a navigation pane or a width, so this shape has to be built by hand today. The kit published an account preset that drew these settings as a page, and retired it in 0.76.0 rather than keep shipping the shape this rule rejects.

## Give the modal its own navigation

<!-- rule: nav -->

**Rule:** List one entry in the modal's navigation for each thing a reader arrives to change: profile, security and sessions, agents and API tokens, appearance, and notifications.

**Why:** A reader already knows which of them they came for, and a list of names is quicker to read than every group scrolled past in turn.

**Do:** Stand the entries beside the pane — above it on a phone — and mark the one on screen.

**Don't:** Drop the navigation and run all five groups down one scroll inside the modal.

**Except:** Merge two when neither fills a pane alone, as the kit merges appearance and notifications into its Preferences page. It ships no profile and no security page at all, so a product that needs those writes them itself.

## Limit the account menu to identity and the way in

<!-- rule: menu -->

**Rule:** Keep the account menu to the reader’s name and address, the one row that opens the account modal, and Sign out.

**Why:** The menu is on every screen and holds no pane of its own, so a setting answered inside it is one nobody can link, search or come back to.

**Do:** Name the reader, open the account modal from one row, and end with Sign out.

**Don't:** Answer the settings in the menu, a row per setting under the reader’s name.

## Change a single field where it sits

<!-- rule: in-row -->

**Rule:** Change a single field in the row that names it, with no overlay at all, and open the account modal when the reader came to change more than one thing.

**Why:** Opening the account area to flip one switch costs the reader two presses to get back to the row they were already looking at.

**Do:** Flip the weekly digest in the row that names it.

**Don't:** Open the account modal on its notifications pane to flip that one switch.

**Except:** A question that has to be answered before anything else still stops the page, which component choice settles rather than this page.

## Name the action after its change

<!-- rule: one-action -->

**Rule:** Name an account pane’s action after the change it makes, such as Save profile, Sign out other sessions or Create token.

**Why:** On a pane of tokens and the agents holding them, Save does not say which of them the press is about to change; the kit’s own agents page says Create token.

**Do:** End the tokens pane with “Create token”.

**Don't:** End the same pane with “Save”, which names no change.

**Except:** A pane whose choices apply as they are made carries no action at all, which is what the kit’s Preferences page does.
