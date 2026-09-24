# Microcopy and tone

What a control says about itself and what an empty screen says.

## Name a control for its current state, not the click’s result; rename it when the state changes.

<!-- rule: state-not-destination -->

**Why:** A name correct only once gives the reader no useful information later.

**Except:** An icon-only toggle may add the click’s result after its state: “Theme: Dark. Switch to light.”

**Do:** Named for its current state.

**Don't:** Named for what the click would do.

## Give every control a name, even without visible text.

<!-- rule: never-nameless -->

**Why:** The glyph is aria-hidden; the label is the control’s only accessible name.

**Except:** An identifier is not a name — segmented()’s name seeds a data hook and is never read aloud.

**Do:** The name reads “Dismiss”.

**Don't:** The same button reads “x”.
