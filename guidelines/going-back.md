# Going back

When a page has a way back up, where it goes, and what it says.

## Give a page a back link only when it sits under another page.

<!-- rule: below-a-list -->

**Why:** The sidebar moves between sections and appears on every page. A back link handles the one move it cannot: from a record to its list.

**Do:** A record opened from the invoice list. The link goes to its parent.

**Don't:** Invoices is a sidebar section, not a child page. Nothing is above it, so the link must guess where the reader came from and names a page one click away in the rail.

## Name the destination. Never use just “Back”.

<!-- rule: name-it -->

**Why:** The arrow and position already say “back”, leaving the words to name the page. The UK government design system allows bare Back for straight-line forms, but asks for “Go back to” a named destination on branching journeys such as portals.

**Except:** A multi-screen form goes back one step, not up one level, and says “Back”. That is a form button, not this link.

**Do:** Match the sidebar’s spelling; a screen reader hears “Back to Invoices”, with the arrow hidden as decoration.

**Don't:** In a screen reader’s links list, “Back” could lead anywhere; after a reload nobody can check where before pressing it.

## Link to the parent’s address, including its state. Leave history to the browser.

<!-- rule: address-not-history -->

**Why:** History links fail on new tabs, bookmarks and shared addresses, and cannot open in a new tab themselves; leave history to the browser’s Back button. backLink() accepts only an address (never javascript:), pointing to the parent list with filters, sort and page preserved—the UK government design system’s “state they last saw it”.

**Except:** Even after arriving from search or another record, the link goes to the parent; browser Back returns to the previous location.

## Put it above the title, in the trail’s place. Draw a trail or a back link, never both.

<!-- rule: one-or-the-other -->

**Why:** Use a trail for several useful levels, a back link for one step up. The UK government design system forbids combining them; given both, appShell() draws only the link.

**Do:** One line aligned above the title, first on the way in and last on the way out.

**Don't:** Both answer “what is this page under” twice and name the current page three times.

## Keep the section lit in the sidebar and use its name.

<!-- rule: section-lit -->

**Why:** A record remains in its list’s section, so keep that row lit with aria-current="true", not "page", to avoid announcing the list as the displayed page. appShell() does both when given a back link.

**Do:** The reader’s row stays lit, and the link uses the same word. Two signals name one place.

**Don't:** Nothing is lit, so the rail no longer shows the current section, and the link gives it another name.

## Keep it quiet. It is the way out, not the page’s purpose.

<!-- rule: quiet -->

**Why:** A back link is seen once on every record page; accent or host link colour competes with the title and main action—the complaint that opened [#270](https://github.com/apliteni/apliteni-ui/issues/270). .ui-back uses --text and outranks a host a:link, so page link colours leave it alone.

**Do:** Body ink, no box until pointer hover, and smaller than the title. The page’s own action keeps the colour.

**Don't:** Two filled buttons, with the more prominent one taking readers away from the record they opened.
