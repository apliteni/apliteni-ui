# Motion

## Move after load

<!-- rule: after-load -->

**Rule:** Animate all content that appears or goes away after the page loads.

**Why:** Motion shows where content comes from, and content that is on the page at load does not move.

**Do:** Slide a panel in from its edge.

**Don't:** Make new content appear in one frame.

**Except:** Update counts, ranges and status lines immediately.

## Match duration to motion

<!-- rule: durations -->

**Rule:** Use 150ms for controls, 250ms for surfaces, 400ms for entrances and 80ms (`--dur-instant`) for presses.

**Why:** If all screens use the same durations, the same interaction takes the same time everywhere in the product.

**Do:** Use `--dur-fast` for controls, `--dur-med` for surfaces, `--dur-slow` for entrances and `--dur-instant` for presses.

**Don't:** Use a duration that is not one of these, such as 300ms.

## Use the kit curves

<!-- rule: easing -->

**Rule:** Use `--ease` for surfaces that come and go, `--ease-out` for content that arrives and stays, and `linear` for visibility.

**Why:** Visibility keeps its old value during a transition, so easing gives no benefit.

**Do:** Use `--ease` for the drawer transition and `linear` for its visibility.

**Don't:** Use CSS `ease` for both the drawer transition and its visibility.
