# The page

## Keep one shell

<!-- rule: layout -->

**Rule:** Use the same shell layout on all screens of the product: the rail alone, or the rail with a bar above the page for search and the reader’s menu.

**Why:** Readers learn the location of search and the account controls only once.

**Do:** Use the same shell on every screen.

**Don't:** Show search or the account menu in a different place on different pages.

## Choose content width

<!-- rule: width -->

**Rule:** Use the wide column for pages with mostly tables and boards, and use the centred column for pages with mostly text and forms.

**Why:** Tables need space, but readers can only follow text when its lines have a suitable length.

**Do:** In the wide column, show all table columns at the same time.

**Don't:** Put the same table in the centred column if its last column then goes off the screen.

## Order page headings

<!-- rule: head -->

**Rule:** Put the way back first, then the page title and a short introduction, and put all other items below them.

**Why:** Readers need to know which page they are on before they choose filters.

**Do:** Back link, then title, then introduction, then filters.

**Don't:** Put filters above the title.

**Except:** Small tools for the full page, such as a version badge, go at the end of the title row.

## Use one page title

<!-- rule: one-h1 -->

**Rule:** Give each page exactly one page title.

**Why:** Readers who use heading navigation need one clear place to go to.

**Do:** Use one h1 for the page.

**Don't:** Use more than one page title, or no page title.

## Follow heading levels

<!-- rule: outline -->

**Rule:** Use headings in order, do not skip levels, and stop at h3: page, then section, then group. Make a card title a heading one level below the heading above it, and let its class set its appearance.

**Why:** Skipped levels hide the structure, and a fourth level usually shows that the page needs to be split. A card title in a div is not in the page outline.

**Except:** A card in a section that has its own h2 uses level 3.

**Do:** Use a page heading, then section headings, then group headings.

**Don't:** Go from the page heading directly to a group heading, or add a fourth heading level.

## Emphasize one action

<!-- rule: one-primary -->

**Rule:** Use one filled button for the main action, and give less emphasis to all other actions with secondary or ghost buttons. In a pair, fill the action that commits, such as Save next to a ghost Cancel. Keep labels and values in neutral ink.

**Why:** If all actions have equal emphasis, the main action is not clear, and readers find one accented action more easily than many.

**Except:** Badge success, pending and danger keep their named statuses. Do not use the accent in place of these signals.

**Do:** Make Create token primary, and make Import agents and Export less prominent.

**Don't:** Give the same emphasis to all three actions.

## Limit card stacks

<!-- rule: stacking -->

**Rule:** Stack a maximum of six cards, and never put a card inside a different card.

**Why:** If there are too many cards, readers must scroll past other content to find their target.

**Do:** Show a maximum of six cards.

**Don't:** Show twelve cards, or put cards inside cards.

## Leave pages closed

<!-- rule: at-rest -->

**Rule:** Show the page with nothing over it until the reader chooses to open something.

**Why:** An overlay that opens when the reader arrives stops their reading and can move the keyboard focus.

**Do:** Let the reader open a menu or a dialog.

**Don't:** Open a menu or a dialog automatically when the page loads.

## Keep table density consistent

<!-- rule: density -->

**Rule:** Use compact rows in all tables on the page, or use compact rows in no table on the page.

**Why:** When all tables have the same row height, the tables look like parts of one page.

**Do:** Use compact rows in the two tables.

**Don't:** Use compact rows in one table and taller rows in a different table.

**Except:** Use the spacing that the busiest table needs.

## Write a useful introduction

<!-- rule: lede -->

**Rule:** A page can start with only its title. If it has an introduction, use a maximum of two sentences, and give only a purpose or a step that the title and the controls do not make clear.

**Why:** An introduction that repeats the title wastes the reader’s time and makes them lose their place on the page.

**Do:** Below “Payouts”, write “Payouts arrive within three business days.”

**Don't:** Write “This is the payouts page” below “Payouts,” or keep a line there only because the page looks empty without it.
