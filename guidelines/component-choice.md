# Component choice

Five choices between similar components and their boundaries.

## Stop the page for a question; leave a statement on the page.

<!-- rule: interrupt -->

**Why:** A confirm keeps the keyboard until answered; a callout does not interrupt.

**Except:** A drawer also stops the page when the answer needs a form instead of two buttons.

**Do:** The question stops the page.

**Don't:** The same question, with nothing to answer.

## Use a toast for what happened and a callout for what is still true.

<!-- rule: transient -->

**Why:** A toast dismisses itself, so a current condition disappears while it still applies.

**Except:** A toast with an action remains after its message: something happened and the reader can still respond.

**Do:** A standing warning stays on the page.

**Don't:** The same warning dismisses itself.

## Reach for tabs() when the control owns a panel and segmented() when it owns nothing.

<!-- rule: panels -->

**Why:** A tablist promises a panel and arrow-key support; a strip with neither passes axe but fails the reader.

**Except:** Links between locations are neither: the kit’s nav renders aria-current, not a tablist.

**Do:** A filter strip that owns no panel.

**Don't:** A tablist over panels that holds nothing.

## Choose the confirmation by how much of the screen it owns.

<!-- rule: scale -->

**Why:** successPanel() is a block inside a page; success() is the page and tells the reader where to go next.

**Except:** A block that needs somewhere to go next still uses success(): successPanel() takes two strings.

**Do:** A block confirmation inside the page.

**Don't:** The page-sized one, forced into a card.

## Give a dropdown a search field at ten options, or whenever its options come from data.

<!-- rule: dropdown-search -->

**Why:** Settled on #283: ten is the number and a rule, not a recommendation. The panel stops growing at 300px: five rows with descriptions, seven without. At ten, even the shortest rows no longer fit, so the reader must scroll for a word they could type. The US Veterans Affairs design system changes from a select to a combo box at 16 options, but a native select shows about twenty rows before scrolling, while this panel shows less than half. A query-filled list, such as merchants, accounts or people, gets the field whatever its current count because the author cannot know it. The field matches anywhere in the label, finding every start match plus rows remembered by a later word.

**Except:** Under six options, a field adds one stop between the trigger and rows. From six to nine, it is the author’s choice: add one when rows have descriptions because they scroll from the sixth.

**Do:** Twenty-nine currencies, and the reader types “dollar” instead of scrolling for it.

**Don't:** The same twenty-nine with no field. The panel shows seven at a time, and the dollars are spread across the whole list.
