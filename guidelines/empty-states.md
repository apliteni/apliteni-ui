# Empty states

## Explain what is missing and show the next step

<!-- rule: next-action -->

**Rule:** If there is no content, use the kit’s `emptyState()` or React `EmptyState` to say what is missing and to give an action that helps the reader continue, but do not use it for inline “no matches” text in a dropdown or command palette, because that text is a result message, not an empty state.

**Why:** If an area is blank, readers may not know if there is no content or if the page has failed.

**Do:** Show “No projects yet” with a “Create project” action, and use the existing spacing and illustration of the kit.

**Don't:** Show “Nothing here” without an action.
