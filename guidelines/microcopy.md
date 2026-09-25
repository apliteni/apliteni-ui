# Microcopy and tone

## Name the current state

<!-- rule: state-not-destination -->

**Rule:** Name a control for its current state, and rename it when the state changes.

**Why:** A checked switch named “Turn off” describes the next action instead of its current state.

**Do:** Name the checked switch “In-app notifications, on.”

**Don't:** Name the checked switch “Turn off in-app notifications.”

**Except:** An icon-only toggle may add the result: “Theme: Dark. Switch to light.”

## Name every control

<!-- rule: never-nameless -->

**Rule:** Give every control a name, including controls without visible text.

**Why:** The glyph is aria-hidden, so the label is the control’s only accessible name.

**Do:** Name the button “Dismiss.”

**Don't:** Leave the icon button unnamed.

**Except:** An identifier is not a name: the `name` option of `segmented()` seeds a data hook and is never read aloud.
