# Accessibility minimums

## Minimum target size

<!-- rule: target-size -->

**Rule:** Give every pointer target at least 24x24 CSS px.

**Why:** Larger targets are easier to activate accurately.

**Do:** Use a centred 24x24 `::before` hit area for a 19x19 checkbox.

**Don't:** Leave a 19x19 target unchanged.

**Except:** WCAG 2.5.8 permits spacing, equivalent controls, inline text, user-agent sizes and essential presentation. Overlays must not reach neighbours.

## Focus ring contrast

<!-- rule: ring-contrast -->

**Rule:** Keep a focus indicator at least 3:1 against every ground it reaches.

**Why:** A solid band remains visible where glow alone may disappear.

**Do:** Use G2’s solid band with a surface-coloured gap around accent-filled controls.

**Don't:** Use the halo alone as the focus indicator.

**Except:** The band must reach 4.22:1 on flat ground and 3:1 against actual gap and halo pixels.

## Disabled control legibility

<!-- rule: disabled-legibility -->

**Rule:** Paint disabled controls with a different ink/surface pair from enabled controls.

**Why:** Opaque colours keep disabled text and surfaces readable.

**Do:** Use opaque `--disabled-ink`, `--disabled-surface` and `--disabled-border`.

**Don't:** Fade the label and box together.

**Except:** Labels must reach 3:1. Boxless ghosts use `--disabled-ink-bare`, floored at 4.89:1. Disabled controls must look weaker by changing the pair and removing accent. Only the label-free switch track may fade.

## Touch field text

<!-- rule: touch-field-size -->

**Rule:** Set coarse-pointer field text to 16px without scaling it down.

**Why:** iOS Safari zooms fields below 16px and does not zoom out.

**Do:** Apply real 16px text to `input`, `select` and `textarea`, including host fields.

**Don't:** Scale 16px down with transforms or smaller computed text.

**Except:** Preserve host fields above 16px with `!important` on a more specific selector. Checkbox, radio, range, colour, file and button types do not zoom. Do not remove pinch-zoom with `user-scalable=no` or `maximum-scale=1`. The host owns the viewport tag.

## Body contrast

<!-- rule: body-contrast -->

**Rule:** Aim for body text contrast close to 7:1, not merely 4.5:1.

**Why:** Stronger contrast supports comfortable reading at every size.

**Do:** Use body ink at every size, then vary size, weight or spacing for hierarchy.

**Don't:** Use pale body ink and rely on larger text for hierarchy.

## Status labels

<!-- rule: status-label -->

**Rule:** Show every status with both a mark and a word.

**Why:** Colour alone is not reliably distinguishable.

**Do:** Pair a status icon with text such as “Paused.”

**Don't:** Show success using green colour alone.

## Measurable pairs

<!-- rule: measurable-pair -->

**Rule:** Prefer opaque grounds behind text so contrast can be measured.

**Why:** Gradients, filters and translucent layers make contrast uncertain.

**Do:** Place text on an opaque surface with a measurable ink pair.

**Don't:** Place text over a gradient, filter or translucent layer.

## Keyboard first

<!-- rule: keyboard-first -->

**Rule:** Implement keyboard behaviour before pointer behaviour and styling.

**Why:** Keyboard access defines the interaction before visual polish.

**Do:** Make focus, order and keyboard actions work before styling controls.

**Don't:** Style pointer interactions before implementing keyboard behaviour.
