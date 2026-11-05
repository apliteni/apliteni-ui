# The full state set

## Marked errors

<!-- rule: error-in-markup -->

**Rule:** Show each error in the markup, not only in the visual style, and connect each error message to its field.

**Why:** A red color alone shows the error state only to readers who can see it.

**Do:** Mark the field `aria-invalid="true"` and connect its error message to it with `aria-describedby`.

**Don't:** Make the field red and show an error in a different location, with no connection between the message and the field.

**Except:** Put `required` in the attribute, not in the label text. The asterisk is only decoration, and it is hidden from assistive technology.

## Screen loading

<!-- rule: loading -->

**Rule:** Design the pending state for the full screen, not only for its button, and announce the pending state.

**Why:** Loading with no announcement gives no event to screen-reader users.

**Do:** Mark the loading region as busy and announce “Loading…” in its status region.

**Don't:** Show the busy state only in the button while the loading region has no busy state or announcement.

**Except:** A toast has its own live region, so a screen that reports through the toast stack does not need a second live region.
