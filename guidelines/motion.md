# Motion

## Move after load

<!-- rule: after-load -->

**Rule:** Animate anything that appears or leaves after page load.

**Why:** Motion shows where content comes from; content present at load stays still.

**Do:** Slide a panel in from its edge.

**Don't:** Make new content appear in one frame.

## Every visible change is a smooth transition

<!-- rule: every-change -->

**Rule:** Give every visible change of state a smooth transition with a kit duration and easing.

**Why:** A change that snaps reads as a fault, and one shared timing keeps each change fluent.

**Do:** Cross-fade a count that changes in place in 150ms, and fade a theme change across the page in 250ms.

**Don't:** Leave a value, a drawer or a theme change in one frame.

**Except:** The focus ring and text typed in a field stay in one step on purpose.

## Match duration to motion

<!-- rule: durations -->

**Rule:** Use 150ms for controls, 250ms for surfaces, 400ms for entrances, and 80ms (`--dur-instant`) for presses.

**Why:** Shared durations keep the same interaction from taking different amounts of time across the product.

**Do:** Use `--dur-fast`, `--dur-med`, `--dur-slow`, and `--dur-instant` for controls, surfaces, entrances, and presses respectively.

**Don't:** Use an unrelated duration such as 300ms.

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
