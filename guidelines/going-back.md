# Going back

When a page has a way back up, where it goes, and what it says.

## Give a page a back link only when it sits under another page.

<!-- rule: below-a-list -->

**Why:** The sidebar moves between sections and appears on every page. A back link handles the one move it cannot: from a record to its list.

**Do:** A record opened from the invoice list. The link goes to its parent.

**Don't:** Invoices is a sidebar section, not a child page. Nothing is above it, so the link must guess where the reader came from and names a page one click away in the rail.

## Name the destination. Never use just “Back”.

<!-- rule: name-it -->

**Why:** The arrow and its position above the title already mean “back”, so the words can name the destination. The UK government design system allows bare Back for a short, straight-line journey, but asks for “Go back to” plus a named page when the journey branches. A portal of lists and records branches.

**Except:** A multi-screen form goes back one step, not up one level, and says “Back”. That is a form button, not this link.

**Do:** The destination matches the sidebar spelling. A screen reader hears “Back to Invoices”; the arrow is decoration.

**Don't:** A direction without a destination could lead anywhere. After a reload, nobody can check where it goes before pressing it.

## Link to the parent’s address, including its state. Leave history to the browser.

<!-- rule: address-not-history -->

**Why:** A history link fails when a page opens in a new tab, from a bookmark, or from a shared address, and cannot itself open in a new tab. The browser’s Back button already handles history and remains the way back to wherever the reader was. This link goes to the record’s list, with its filters, sort, and page in the address, so going up costs nothing. The UK government design system asks for the same: “in the state they last saw it”. backLink() takes only an address and rejects a javascript: one. There is nothing to photograph here, so this rule has no pair.

**Except:** If the reader came from a search or another record, the link still goes to the parent, where the page lives. The browser’s Back button still knows where the reader was.

## Put it above the title, in the trail’s place. Draw a trail or a back link, never both.

<!-- rule: one-or-the-other -->

**Why:** A trail helps when several levels are useful; a back link helps when only one step up matters. The UK government design system states: “Never use the back link component together with the Breadcrumbs component.” Given both, appShell() draws the link and omits the trail.

**Do:** One line above the title, aligned with its start. It is first on entry and last on exit.

**Don't:** The trail and link answer the same question—what is this page under—so the space above the title answers it twice, and the current page is named three times.

## Keep the section lit in the sidebar and use its name.

<!-- rule: section-lit -->

**Why:** A record opened from a list remains in that list’s section. Keeping the row lit keeps the rail accurate. Using aria-current="true" instead of "page" also keeps it accurate for screen readers; otherwise it announces the list as the page on screen. appShell() does both with a back link.

**Do:** The reader’s row stays lit, and the link uses the same word. Two signals name one place.

**Don't:** Nothing is lit, so the rail no longer shows the current section, and the link gives it another name.

## Keep it quiet. It is the way out, not the page’s purpose.

<!-- rule: quiet -->

**Why:** The back link appears on every record page and is viewed once. The accent or host link colour would compete with the title and page action on every screen, which led to this complaint. .ui-back uses --text, and its colour rule outranks a host a:link, so page link colours leave it unchanged. Decided in #270.

**Do:** Body ink, no box until pointer hover, and smaller than the title. The page’s own action keeps the colour.

**Don't:** Two filled buttons, with the more prominent one taking readers away from the record they opened.
