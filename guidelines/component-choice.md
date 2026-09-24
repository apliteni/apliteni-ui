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

**Except:** A toast with an action outlives its message: something happened and can still be answered.

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

**Why:** The 300px panel shows five described rows or seven plain rows, so ten requires scrolling; the US Veterans Affairs threshold of 16 suits a native select showing about twenty ([#283](https://github.com/apliteni/apliteni-ui/issues/283)). Data-fed lists need search at any count, and matching anywhere in a label also finds later words.

**Except:** Below six, search adds an unnecessary stop; at six to nine, the author decides, adding search for described rows that scroll from the sixth.

**Do:** Twenty-nine currencies: type “dollar” instead of scrolling.

**Don't:** Without search, only seven of twenty-nine currencies show at once; dollars are scattered through the list.
