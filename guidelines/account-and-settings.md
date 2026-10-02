# Account and settings

## Put the account area on pages

<!-- rule: pages -->

**Rule:** Draw account and personal settings as pages inside the same shell the rest of the product uses.

**Why:** A page has an address to link, a row in the rail and the shell’s way back; a sheet or a panel over the product has none of the three.

**Do:** Open the account pages in the shell, with the rail and the bar still on screen.

**Don't:** Slide the account area in over the product as a full-width sheet with columns inside it.

## Keep an overlay to one short setting

<!-- rule: one-setting -->

**Rule:** Let an overlay carry one short setting, opened from the account page that setting belongs to, and send anything larger to a page of its own.

**Why:** An overlay holds keyboard focus until it is answered, which one setting earns and a screen of settings does not.

**Do:** Ask for a sign-in code in a `confirm()`, with “Not now” beside “Require a code”.

**Don't:** Put the account area in an overlay divided into panes.

**Except:** Component choice settles which overlay — a `confirm()` for a question, a content-sized modal for a short form, a drawer for a long one. A field that sits in a list row is changed in that row, with no overlay at all.

## Limit the account menu to identity and links

<!-- rule: menu -->

**Rule:** Keep the account menu to the reader’s name and address, the links into the account pages, and Sign out.

**Why:** The menu is on every screen and holds no page, so a setting answered inside it is one nobody can link, search or come back to.

**Do:** Name the reader, link the account pages, and end with Sign out.

**Don't:** Answer the settings in the menu, a row per setting under the reader’s name.

## Split the pages by what the reader changes

<!-- rule: split -->

**Rule:** Give the account area one page for each thing a reader arrives to change: profile, security and sessions, agents and API tokens, appearance, and notifications.

**Why:** A reader already knows which of them they came for, and a list of names in the rail is quicker to read than the same groups stacked down one page.

**Do:** List the pages in the rail and show the one the reader asked for.

**Don't:** Stack profile, sessions, tokens and appearance on one account page.

**Except:** Merge two when neither fills a page alone, as the kit merges appearance and notifications into its Preferences page. The kit falls short of the rest: it ships no profile page and no security page, so a product that needs those writes them itself.

## Name the action after its change

<!-- rule: one-action -->

**Rule:** Name an account page’s action after the change it makes, such as Save profile, Sign out other sessions or Create token.

**Why:** On a page of tokens and the agents holding them, Save does not say which of them the press is about to change; the kit’s own agents page says Create token.

**Do:** End the tokens page with “Create token”.

**Don't:** End the same page with “Save”, which names no change.

**Except:** A page whose choices apply as they are made carries no action at all, which is what the kit’s Preferences page does.
