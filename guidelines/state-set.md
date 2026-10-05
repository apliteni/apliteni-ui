# The full state set

## Focus rings

<!-- rule: focus-visible -->

**Rule:** Give every focusable control the same `--ring`, and show it only on `:focus-visible`.

**Why:** One solid band keeps focus consistent while the browser decides when to show it.

**Do:** Apply `--ring`, with `--ring-offset`, to both the button and input on keyboard focus.

**Don't:** Give the input a separate muted outline while the button uses `--ring`.

**Except:** A scroll region inside a surface takes `--ring-scroll`: the same band drawn inward, with `--ring-scroll-offset`. An inset shadow is painted under a box's own children, so a table scrolled sideways under one erases the band; an outline survives it. A box that is itself the outermost surface — a panel, a card — keeps `--ring`. Text-entry controls may match `:focus-visible` on mouse focus. Both bands are declared once at the root and recomposed nowhere: an outline leaves its offset unpainted, so the 1px between a control and its band is whatever surface the control is standing on. Adjust the width and the colour at the root.

## Busy controls

<!-- rule: busy -->

**Rule:** Make busy controls disabled: use `aria-busy` and a real disabled state from one flag.

**Why:** A control that still accepts clicks can submit twice.

**Do:** Set `disabled` and `aria-busy` together.

**Don't:** Show “Saving…” while still accepting clicks.

**Except:** Disabled controls are excluded from the WCAG 1.4.3 contrast gate, so busy controls must remain visually legible.

## Marked errors

<!-- rule: error-in-markup -->

**Rule:** Put errors in markup, not only in paint, and connect each message to its field.

**Why:** Red alone communicates the state only to sighted readers.

**Do:** Mark the field `aria-invalid="true"` and connect its error message with `aria-describedby`.

**Don't:** Paint the field red and show an error elsewhere without connecting the message to the field.

**Except:** Put `required` in the attribute, not the label wording; the asterisk is decoration and hidden from assistive technology.

## Screen loading

<!-- rule: loading -->

**Rule:** Design pending state for the whole screen, not only its button, and announce it.

**Why:** Silent loading gives screen-reader users no event.

**Do:** Mark the loading region busy and announce “Loading…” in its status region.

**Don't:** Show a spinner only in the button while the loading region has no busy state or announcement.

**Except:** A toast has its own live region, so a screen reporting through the toast stack needs no second one.
