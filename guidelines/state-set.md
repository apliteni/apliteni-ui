# The full state set

## Focus rings

<!-- rule: focus-visible -->

**Rule:** Give every focusable control the same `--ring`, and show it only on `:focus-visible`.

**Why:** One solid band and halo keep focus consistent while the browser decides when to show it.

**Do:** Button and input share one ring.

**Don't:** The input draws its own ring.

**Except:** Text-entry controls may match `:focus-visible` on mouse focus. Surface backgrounds set the gap colour and recompose `--ring`; adjust width and colour at the root.

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

**Do:** The field reads its reason with it.

**Don't:** Use the same red with no connected reason.

**Except:** Put `required` in the attribute, not the label wording; the asterisk is decoration and hidden from assistive technology.

## Screen loading

<!-- rule: loading -->

**Rule:** Design pending state for the whole screen, not only its button, and announce it.

**Why:** Silent loading gives screen-reader users no event.

**Do:** Announce the coming shape in a status region.

**Don't:** Let only the button know while the page reads as finished.

**Except:** A toast has its own live region, so a screen reporting through the toast stack needs no second one.
