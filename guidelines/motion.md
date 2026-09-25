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

**Do:** Open drawers and confirmations without internal transitions.

**Don't:** Keep a transition running after reduced motion is requested.

**Except:** Spinners and skeletons also stop; the surrounding region announces the wait.
