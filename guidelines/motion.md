# Motion

## Move after load

<!-- rule: after-load -->

**Rule:** Animate anything that appears or leaves after page load.

**Why:** Motion shows where content comes from; content present at load stays still.

**Do:** Slide a panel in from its edge.

**Don't:** Make new content appear in one frame.

**Except:** Update counts, ranges, and status lines immediately.

## Match duration to motion

<!-- rule: durations -->

**Rule:** Use 80ms for presses, 150ms for focus and a turning caret, 250ms for surfaces, and 400ms for entrances.

**Why:** Shared durations keep the same interaction from taking different amounts of time across the product.

**Do:** Use the kit's four duration steps for presses, controls, surfaces and entrances.

**Don't:** Use an unrelated duration such as 300ms.

## Change a hover at once

<!-- rule: hover-at-once -->

**Rule:** Change a hover at once, as the one state change that does not fade.

**Why:** A reply within about 0.1 seconds feels instant (Miller, 1968, Nielsen, 1993), and a hover fade trails the pointer.

**Do:** Fill a table row, a button or a menu row in the pointer's first frame.

**Don't:** Fade a hover fill in over 150ms.

**Except:** A press, a focus edge, a turning caret and a lift keep their motion.

## Use the kit curves

<!-- rule: easing -->

**Rule:** Use `--ease` for surfaces that come and go, `--ease-out` for content that arrives and stays, and `linear` for visibility.

**Why:** Visibility keeps its old value during a transition, so easing adds no benefit.

**Do:** Use `--ease` for a drawer transition and `linear` for its visibility.

**Don't:** Use CSS `ease` for both the drawer transition and its visibility.

## Honor reduced motion

<!-- rule: reduced -->

**Rule:** When a reader asks for less motion, change immediately.

**Why:** Published bundles cap animations and transitions at 0.01ms under `prefers-reduced-motion`, so focus reaches a visible control without delay.

**Do:** Open drawers, confirmations, command palettes and dropdown panels without internal transitions.

**Don't:** Keep a transition running after reduced motion is requested.

**Except:** Spinners and skeletons also stop; the surrounding region announces the wait.
