# The full state set

States beyond rest: focus, busy, error, pending.

## Give every focusable control the same --ring; show it only on :focus-visible.

<!-- rule: focus-visible -->

**Why:** One separated solid band and halo show focus consistently; the browser decides when focus is visible.

**Except:** Text-entry controls may match :focus-visible on mouse focus. Surface backgrounds set the gap colour and recompose --ring; adjust width and colour at the root.

**Do:** Button and input share one ring.

**Don't:** The input draws its own.

## Make busy mean disabled: use aria-busy and a real disabled state from one flag.

<!-- rule: busy -->

**Why:** A working control that still accepts clicks can submit twice.

**Except:** A disabled control is excluded from the WCAG 1.4.3 contrast gate, so a busy control must remain visually legible.

**Do:** Disabled and aria-busy together.

**Don't:** Says “Saving…”, still takes clicks.

## State errors in markup, not only paint, and connect the message.

<!-- rule: error-in-markup -->

**Why:** Red alone shows the state only to sighted readers.

**Except:** Put required in the attribute, not the label’s wording: the asterisk is decoration and hidden from assistive tech.

**Do:** The reason is read with the field.

**Don't:** Same red, reason attached to nothing.

## Design pending for the whole screen, not only its button, and announce it.

<!-- rule: loading -->

**Why:** Silent loading gives screen-reader users no event.

**Except:** A toast has its own live region, so a screen reporting through the toast stack needs no second one.

**Do:** The coming shape is announced in a status region.

**Don't:** Only the button knows; the page reads as finished.
